import { PHASES } from './phases.js';

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ISO_WITH_OFFSET = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/;
const PHASE_IDS = PHASES.map((p) => p.id);
const KINDS = ['choice', 'freeform'];

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isText = (v) => typeof v === 'string' && v.trim().length > 0;
const isTextList = (v) => Array.isArray(v) && v.every((x) => typeof x === 'string');

function isHttpsUrl(value) {
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}

function fail(errors) {
  return { ok: false, errors, decisions: [] };
}

function checkOption(o, j, err) {
  const at = `options[${j}]`;
  if (!isObject(o)) {
    err(`${at} must be an object.`);
    return null;
  }
  let good = true;
  if (typeof o.id !== 'string' || !SLUG.test(o.id)) {
    err(`${at}: "id" must be a lowercase slug.`);
    good = false;
  }
  if (!isText(o.name)) {
    err(`${at}: "name" must be a non-empty string.`);
    good = false;
  }
  for (const key of ['pros', 'cons']) {
    if (o[key] !== undefined && !isTextList(o[key])) {
      err(`${at}: "${key}" must be a list of strings.`);
      good = false;
    }
  }
  if (o.note !== undefined && typeof o.note !== 'string') {
    err(`${at}: "note" must be a string.`);
    good = false;
  }
  const links = o.links === undefined ? [] : o.links;
  if (!Array.isArray(links)) {
    err(`${at}: "links" must be a list.`);
    good = false;
  } else {
    links.forEach((l, k) => {
      if (!isObject(l) || !isText(l.label) || !isHttpsUrl(l.url)) {
        err(`${at}.links[${k}]: needs a label and an https URL.`);
        good = false;
      }
    });
  }
  if (!good) return null;
  return {
    id: o.id,
    name: o.name,
    pros: o.pros ?? [],
    cons: o.cons ?? [],
    links: links.map((l) => ({ label: l.label, url: l.url })),
    note: o.note ?? '',
  };
}

export function validateCatalog(input) {
  if (!isObject(input)) return fail(['The file must contain a JSON object.']);
  const errors = [];
  if (input.version !== 1) errors.push('"version" must be 1.');
  if (!Array.isArray(input.decisions) || input.decisions.length === 0) {
    errors.push('"decisions" must be a non-empty array.');
    return fail(errors);
  }

  const seen = new Set();
  const decisions = [];

  input.decisions.forEach((d, i) => {
    const label = `decisions[${i}]${isObject(d) && typeof d.id === 'string' ? ` (${d.id})` : ''}`;
    const before = errors.length;
    const err = (msg) => errors.push(`${label}: ${msg}`);
    if (!isObject(d)) {
      err('must be an object.');
      return;
    }

    if (typeof d.id !== 'string' || !SLUG.test(d.id)) err('"id" must be a lowercase slug.');
    else if (seen.has(d.id)) err('duplicate id.');
    else seen.add(d.id);

    if (!isText(d.title)) err('"title" must be a non-empty string.');
    if (!PHASE_IDS.includes(d.phase)) err(`"phase" must be one of ${PHASE_IDS.join(', ')}.`);
    if (!isText(d.topic)) err('"topic" must be a non-empty string.');
    if (typeof d.order !== 'number' || !Number.isFinite(d.order)) err('"order" must be a number.');
    if (!KINDS.includes(d.kind)) err(`"kind" must be one of ${KINDS.join(', ')}.`);

    const deadline = d.deadline === undefined ? null : d.deadline;
    if (deadline !== null && !(typeof deadline === 'string' && ISO_WITH_OFFSET.test(deadline) && !Number.isNaN(Date.parse(deadline)))) {
      err('"deadline" must be null or an ISO time with an offset, like 2026-10-27T00:00:00+01:00.');
    }

    const maxPicks = d.maxPicks === undefined ? 1 : d.maxPicks;
    if (!Number.isInteger(maxPicks) || maxPicks < 1) err('"maxPicks" must be a whole number of at least 1.');

    const rawOptions = d.options === undefined ? [] : d.options;
    const options = [];
    if (!Array.isArray(rawOptions)) {
      err('"options" must be a list.');
    } else if (d.kind === 'freeform') {
      if (rawOptions.length > 0) err('a freeform decision must not have options.');
    } else if (d.kind === 'choice') {
      if (rawOptions.length < 2) err('a choice needs at least 2 options.');
      const optionIds = new Set();
      rawOptions.forEach((o, j) => {
        const normalized = checkOption(o, j, err);
        if (normalized) {
          if (optionIds.has(normalized.id)) err(`duplicate option id "${normalized.id}".`);
          optionIds.add(normalized.id);
          options.push(normalized);
        }
      });
      if (Number.isInteger(maxPicks) && maxPicks > rawOptions.length) err('"maxPicks" cannot be more than the number of options.');
    }

    if (errors.length === before) {
      decisions.push({
        id: d.id,
        title: d.title,
        phase: d.phase,
        topic: d.topic,
        order: d.order,
        deadline,
        kind: d.kind,
        maxPicks,
        options,
      });
    }
  });

  return errors.length === 0 ? { ok: true, errors: [], decisions } : fail(errors);
}

export function mergeDecision(existing, incoming) {
  const { id, ...catalog } = incoming;
  if (!existing) {
    return { create: true, data: { ...catalog, status: 'open', chosen: [], answer: '', reason: '' } };
  }
  const data = { ...catalog };
  if (incoming.kind === 'choice') {
    const ids = new Set(incoming.options.map((o) => o.id));
    if ((existing.chosen || []).some((c) => !ids.has(c))) data.status = 'revisit';
  }
  return { create: false, data };
}
