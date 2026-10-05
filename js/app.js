import { LAUNCH_MS, getCountdown, formatZagreb } from './countdown.js';
import { OWNER_UID } from './config.js';
import { validateCatalog } from './catalog.js';
import { ownerStateError } from './picks.js';
import * as view from './view.js';

const $ = (id) => document.getElementById(id);

const state = {
  decisions: [],
  user: null,
  store: null,
  loaded: false,
  expanded: new Set(),
  drafts: new Map(),
  errors: new Map(),
};

const isOwner = () => Boolean(state.user && OWNER_UID && state.user.uid === OWNER_UID);

function setMessage(text, kind = 'info', lines = []) {
  const box = $('status-msg');
  box.className = `msg ${kind}`;
  box.replaceChildren();
  box.hidden = !text;
  if (!text) return;
  box.append(document.createTextNode(text));
  if (lines.length > 0) {
    const list = document.createElement('ul');
    for (const line of lines) {
      const item = document.createElement('li');
      item.textContent = line;
      list.append(item);
    }
    box.append(list);
  }
}

function tick() {
  view.updateCountdown(getCountdown(Date.now()));
}

function openCard(id) {
  state.expanded.add(id);
  render();
  const card = document.getElementById(`card-${id}`);
  if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function viewContext(nowMs) {
  return {
    isOwner: isOwner(),
    expanded: state.expanded,
    drafts: state.drafts,
    errors: state.errors,
    nowMs,
    onToggle(id) {
      if (state.expanded.has(id)) state.expanded.delete(id);
      else state.expanded.add(id);
      render();
    },
    onDraft(id, patch, rerender) {
      const decision = state.decisions.find((x) => x.id === id);
      const current = state.drafts.get(id) || {
        status: decision.status,
        chosen: [...decision.chosen],
        answer: decision.answer,
        reason: decision.reason,
      };
      state.drafts.set(id, { ...current, ...patch });
      if (rerender) render();
    },
    onSave: save,
  };
}

function render() {
  const nowMs = Date.now();
  $('empty-note').hidden = !(state.loaded && state.decisions.length === 0);
  $('auth-btn').hidden = Boolean(state.user);
  view.renderNextUp($('next-up'), state.decisions, nowMs, openCard);
  view.renderPhases($('phases'), state.decisions, viewContext(nowMs));
  view.renderOwnerPanel($('owner-panel'), {
    user: state.user,
    isOwner: isOwner(),
    onImport: () => $('import-file').click(),
    onSignOut: () => state.store.signOutUser(),
  });
}

async function save(id) {
  const decision = state.decisions.find((x) => x.id === id);
  const draft = state.drafts.get(id);
  if (!decision || !draft) return;
  const problem = ownerStateError(decision, draft);
  if (problem) {
    state.errors.set(id, problem);
    render();
    return;
  }
  try {
    await state.store.saveOwnerState(id, draft);
    state.drafts.delete(id);
    state.errors.delete(id);
  } catch (error) {
    state.errors.set(id, `Could not save: ${error.message}. Your changes are kept, try again.`);
  }
  render();
}

async function runImport(file) {
  let json;
  try {
    json = JSON.parse(await file.text());
  } catch {
    setMessage('That file is not valid JSON. Nothing was written.', 'error');
    return;
  }
  const result = validateCatalog(json);
  if (!result.ok) {
    setMessage('Import refused. Nothing was written.', 'error', result.errors);
    return;
  }
  try {
    const existing = new Map(state.decisions.map((d) => [d.id, d]));
    const out = await state.store.importDecisions(result.decisions, existing);
    setMessage(`Imported. ${out.created} created, ${out.updated} updated, ${out.revisit} marked revisit.`, 'ok');
  } catch (error) {
    setMessage(`Import failed: ${error.message}`, 'error');
  }
}

// The countdown needs no network, so it starts first.
$('launch-label').textContent = formatZagreb(LAUNCH_MS);
tick();
setInterval(tick, 1000);
render();

try {
  state.store = await import('./store.js');
} catch (error) {
  setMessage('Could not load the data service. The countdown still works.', 'error');
}

if (state.store) {
  state.store.watchAuth((user) => {
    state.user = user;
    render();
  });
  state.store.subscribeDecisions(
    (list) => {
      state.decisions = list;
      state.loaded = true;
      render();
    },
    (error) => setMessage(`Could not read the decisions: ${error.message}`, 'error'),
  );
  $('auth-btn').addEventListener('click', async () => {
    try {
      await state.store.signInWithGoogle();
    } catch (error) {
      setMessage(`Sign-in failed: ${error.message}`, 'error');
    }
  });
  $('import-file').addEventListener('change', (event) => {
    const file = event.target.files[0];
    event.target.value = '';
    if (file) runImport(file);
  });
}
