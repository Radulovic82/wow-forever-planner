import { formatDeadline, formatCompact } from './countdown.js';
import { PHASES, groupByPhase, phaseProgress, deadlineInfo, nextUp, daysLabel } from './phases.js';
import { togglePick, danglingChoices, pruneChosen, conclusion, phaseSummary } from './picks.js';

// Builds a DOM node. Children are appended as text nodes, never parsed as HTML.
function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (value === false || value == null) continue;
    if (key === 'class') node.className = value;
    else if (key.startsWith('on')) node.addEventListener(key.slice(2), value);
    else node.setAttribute(key, value === true ? '' : value);
  }
  for (const child of children.flat()) {
    if (child == null || child === false) continue;
    node.append(child);
  }
  return node;
}

export function updateCountdown(cd) {
  for (const unit of ['days', 'hours', 'minutes', 'seconds']) {
    const node = document.querySelector(`[data-unit="${unit}"]`);
    node.textContent = unit === 'days' ? String(cd[unit]) : String(cd[unit]).padStart(2, '0');
  }
  document.getElementById('countdown-note').textContent = cd.live
    ? 'WoW Forever is live. Time since launch.'
    : 'until WoW Forever launches';
  const sticky = document.getElementById('sticky-time');
  if (sticky) sticky.textContent = formatCompact(cd);
}

export function updateStickyNext(decisions, nowMs) {
  const node = document.getElementById('sticky-next');
  if (!node) return;
  const [first] = nextUp(decisions, nowMs, 1);
  node.textContent = first ? `Next: ${first.decision.title} ${daysLabel(first)}` : '';
}

export function renderNextUp(container, decisions, nowMs, onOpen) {
  container.replaceChildren();
  const items = nextUp(decisions, nowMs, 4);
  if (items.length === 0) return;
  container.append(
    el('h2', { class: 'section-title' }, 'Next up'),
    el(
      'ul',
      { class: 'next-list' },
      items.map((item) =>
        el(
          'li',
          { class: item.urgent ? 'urgent' : '' },
          el('span', { class: 'when' }, daysLabel(item)),
          el('button', { class: 'link', type: 'button', onclick: () => onOpen(item.decision.id) }, item.decision.title),
          el('span', { class: 'when-abs' }, formatDeadline(item.decision.deadline)),
        ),
      ),
    ),
  );
}

function currentState(decision, ctx) {
  return (
    ctx.drafts.get(decision.id) || {
      status: decision.status,
      chosen: decision.chosen,
      answer: decision.answer,
      reason: decision.reason,
    }
  );
}

function renderOption(decision, option, cur, ctx) {
  const picked = cur.chosen.includes(option.id);
  return el(
    'div',
    { class: `option${picked ? ' picked' : ''}` },
    el('h3', {}, option.name, picked && el('span', { class: 'badge' }, 'Picked')),
    option.pros.length > 0 && el('ul', { class: 'pros' }, option.pros.map((t) => el('li', {}, t))),
    option.cons.length > 0 && el('ul', { class: 'cons' }, option.cons.map((t) => el('li', {}, t))),
    option.note && el('p', { class: 'note' }, option.note),
    option.links.length > 0 &&
      el(
        'p',
        { class: 'links' },
        option.links.map((l) => el('a', { href: l.url, target: '_blank', rel: 'noopener noreferrer' }, l.label)),
      ),
    ctx.isOwner &&
      el(
        'button',
        {
          class: 'pick',
          type: 'button',
          'aria-label': `${picked ? 'Unpick' : 'Pick'} ${option.name}`,
          onclick: () =>
            ctx.onDraft(decision.id, { chosen: togglePick(pruneChosen(decision, cur.chosen), option.id, decision.maxPicks) }, true),
        },
        picked ? 'Unpick' : 'Pick',
      ),
  );
}

function renderStatusControl(decision, cur, ctx) {
  return el(
    'div',
    { class: 'segmented', role: 'group', 'aria-label': 'Status' },
    ['open', 'decided', 'revisit'].map((s) =>
      el(
        'button',
        {
          type: 'button',
          class: `seg${s === cur.status ? ' on' : ''}`,
          'aria-pressed': String(s === cur.status),
          onclick: () => ctx.onDraft(decision.id, { status: s }, true),
        },
        s,
      ),
    ),
  );
}

function renderBody(decision, cur, ctx) {
  const error = ctx.errors.get(decision.id);
  const stale = ctx.isOwner ? danglingChoices(decision, cur.chosen) : [];
  const decided = cur.status === 'decided';
  const showOptions = !decided || ctx.optionsShown.has(decision.id);
  return el(
    'div',
    { class: 'card-body', id: `body-${decision.id}` },
    stale.length > 0 &&
      el(
        'p',
        { class: 'error' },
        `No longer offered: ${stale.join(', ')}. `,
        el(
          'button',
          { class: 'link', type: 'button', onclick: () => ctx.onDraft(decision.id, { chosen: pruneChosen(decision, cur.chosen) }, true) },
          'Remove',
        ),
      ),
    decision.kind === 'choice' &&
      decided &&
      el(
        'button',
        {
          class: 'link toggle-options',
          type: 'button',
          'aria-expanded': String(showOptions),
          onclick: () => ctx.onToggleOptions(decision.id),
        },
        showOptions ? 'Hide the options' : 'Show the options',
      ),
    decision.kind === 'choice' &&
      showOptions &&
      el(
        'div',
        { class: 'options-wrap' },
        decision.maxPicks > 1 && el('p', { class: 'hint' }, `Pick up to ${decision.maxPicks}.`),
        el('div', { class: 'options' }, decision.options.map((o) => renderOption(decision, o, cur, ctx))),
      ),
    decision.kind === 'freeform' &&
      ctx.isOwner &&
      el(
        'label',
        { class: 'field' },
        'Your answer',
        el('textarea', { rows: 4, oninput: (e) => ctx.onDraft(decision.id, { answer: e.target.value }, false) }, cur.answer),
      ),
    decision.kind === 'freeform' && !ctx.isOwner && !decided && el('p', { class: 'answer' }, cur.answer || 'Not answered yet.'),
    ctx.isOwner
      ? el(
          'label',
          { class: 'field' },
          'Why',
          el('textarea', { rows: 3, oninput: (e) => ctx.onDraft(decision.id, { reason: e.target.value }, false) }, cur.reason),
        )
      : !decided && cur.reason && el('p', { class: 'reason' }, `Why: ${cur.reason}`),
    ctx.isOwner &&
      el(
        'div',
        { class: 'owner-row' },
        renderStatusControl(decision, cur, ctx),
        el('button', { class: 'save', type: 'button', onclick: () => ctx.onSave(decision.id) }, 'Save'),
      ),
    error && el('p', { class: 'error', role: 'alert' }, error),
  );
}

function renderCard(decision, ctx) {
  const cur = currentState(decision, ctx);
  const decided = cur.status === 'decided';
  // A decided freeform card has nothing more to show a visitor, so it does not open.
  const expandable = !(decided && decision.kind === 'freeform' && !ctx.isOwner);
  const open = expandable && ctx.expanded.has(decision.id);
  const info = decision.deadline ? deadlineInfo(decision.deadline, ctx.nowMs) : null;
  const text = conclusion(decision, cur);
  return el(
    'article',
    { class: `card status-${cur.status}${open ? ' open' : ''}`, id: `card-${decision.id}` },
    el(
      'button',
      {
        class: `card-head${expandable ? '' : ' static'}`,
        type: 'button',
        'aria-expanded': expandable ? String(open) : false,
        'aria-controls': expandable ? `body-${decision.id}` : false,
        onclick: expandable ? () => ctx.onToggle(decision.id) : false,
      },
      el('span', { class: 'card-title' }, decision.title),
      el(
        'span',
        { class: 'chips' },
        el('span', { class: `chip chip-${cur.status}` }, cur.status),
        info &&
          el(
            'span',
            { class: `chip chip-deadline${info.urgent && !decided ? ' urgent' : ''}` },
            info.overdue && !decided ? 'overdue' : `due ${formatDeadline(decision.deadline)}`,
          ),
      ),
      decided && text
        ? el(
            'span',
            { class: 'conclusion' },
            el('span', { class: 'conclusion-label' }, 'Conclusion'),
            el('span', { class: 'conclusion-pick' }, text),
            cur.reason && el('span', { class: 'conclusion-why' }, cur.reason),
          )
        : text && el('span', { class: 'summary' }, text),
    ),
    open && renderBody(decision, cur, ctx),
  );
}

export function renderTools(container, { visible, onExpandAll, onCollapseAll }) {
  container.replaceChildren();
  container.hidden = !visible;
  if (!visible) return;
  container.append(
    el('button', { class: 'link', type: 'button', onclick: onExpandAll }, 'Expand all'),
    el('button', { class: 'link', type: 'button', onclick: onCollapseAll }, 'Collapse all'),
  );
}

export function renderPhases(container, decisions, ctx) {
  container.replaceChildren();
  const groups = groupByPhase(decisions);
  for (const phase of PHASES) {
    const list = groups[phase.id];
    const progress = phaseProgress(list);
    const folded = ctx.foldedPhases.has(phase.id);
    const state =
      progress.total > 0 && progress.decided === progress.total ? 'done' : progress.decided > 0 ? 'going' : 'idle';
    const percent = progress.total > 0 ? Math.round((progress.decided / progress.total) * 100) : 0;
    const summary = folded ? phaseSummary(list) : '';
    container.append(
      el(
        'section',
        { class: `phase phase-${state}${folded ? ' folded' : ''}` },
        el('span', { class: 'node', 'aria-hidden': 'true' }),
        el(
          'header',
          { class: 'phase-head' },
          el(
            'h2',
            {},
            el(
              'button',
              {
                class: 'phase-toggle',
                type: 'button',
                'aria-expanded': String(!folded),
                'aria-controls': `phase-${phase.id}`,
                onclick: () => ctx.onTogglePhase(phase.id),
              },
              phase.label,
            ),
          ),
          el('span', { class: 'range' }, phase.range),
          list.length > 0 &&
            el(
              'span',
              { class: 'progress' },
              el('span', { class: 'meter', 'aria-hidden': 'true' }, el('span', { style: `width:${percent}%` })),
              `${progress.decided} of ${progress.total} decided`,
            ),
        ),
        folded
          ? summary && el('p', { class: 'phase-summary' }, summary)
          : el(
              'div',
              { class: 'phase-list', id: `phase-${phase.id}` },
              list.length === 0 && phase.placeholder && el('p', { class: 'placeholder' }, phase.placeholder),
              list.map((d) => renderCard(d, ctx)),
            ),
      ),
    );
  }
}

export function renderOwnerPanel(container, { user, isOwner, onImport, onSignOut }) {
  container.replaceChildren();
  container.hidden = !user;
  if (!user) return;
  if (isOwner) {
    container.append(
      el('p', {}, 'Signed in as the owner.'),
      el('button', { type: 'button', onclick: onImport }, 'Import catalog'),
      el('button', { type: 'button', class: 'link', onclick: onSignOut }, 'Sign out'),
    );
  } else {
    container.append(
      el('p', {}, 'Signed in, read only.'),
      el('p', { class: 'hint' }, 'Your user ID, for the owner setup:'),
      el('code', {}, user.uid),
      el('button', { type: 'button', class: 'link', onclick: onSignOut }, 'Sign out'),
    );
  }
}
