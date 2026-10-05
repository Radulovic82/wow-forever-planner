import { formatDeadline } from './countdown.js';
import { PHASES, groupByPhase, phaseProgress, deadlineInfo, nextUp } from './phases.js';
import { togglePick } from './picks.js';

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
}

export function renderNextUp(container, decisions, nowMs, onOpen) {
  container.replaceChildren();
  const items = nextUp(decisions, nowMs, 4);
  if (items.length === 0) return;
  container.append(
    el('h2', {}, 'Next up'),
    el(
      'ul',
      { class: 'next-list' },
      items.map(({ decision, daysLeft, overdue, urgent }) =>
        el(
          'li',
          { class: urgent ? 'urgent' : '' },
          el('button', { class: 'link', type: 'button', onclick: () => onOpen(decision.id) }, decision.title),
          el('span', { class: 'when' }, overdue ? 'overdue' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`),
          el('span', { class: 'when-abs' }, formatDeadline(decision.deadline)),
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
    el('h4', {}, option.name, picked && el('span', { class: 'tick' }, ' (picked)')),
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
          onclick: () => ctx.onDraft(decision.id, { chosen: togglePick(cur.chosen, option.id, decision.maxPicks) }, true),
        },
        picked ? 'Unpick' : 'Pick',
      ),
  );
}

function renderBody(decision, cur, ctx) {
  const error = ctx.errors.get(decision.id);
  return el(
    'div',
    { class: 'card-body' },
    decision.kind === 'choice' &&
      el(
        'div',
        { class: 'options' },
        decision.maxPicks > 1 && el('p', { class: 'hint' }, `Pick up to ${decision.maxPicks}.`),
        decision.options.map((o) => renderOption(decision, o, cur, ctx)),
      ),
    decision.kind === 'freeform' &&
      (ctx.isOwner
        ? el(
            'label',
            { class: 'field' },
            'Your answer',
            el('textarea', { rows: 4, oninput: (e) => ctx.onDraft(decision.id, { answer: e.target.value }, false) }, cur.answer),
          )
        : el('p', { class: 'answer' }, cur.answer || 'Not answered yet.')),
    ctx.isOwner
      ? el(
          'label',
          { class: 'field' },
          'Why',
          el('textarea', { rows: 3, oninput: (e) => ctx.onDraft(decision.id, { reason: e.target.value }, false) }, cur.reason),
        )
      : cur.reason && el('p', { class: 'reason' }, `Why: ${cur.reason}`),
    ctx.isOwner &&
      el(
        'div',
        { class: 'owner-row' },
        el(
          'label',
          { class: 'field inline' },
          'Status',
          el(
            'select',
            { onchange: (e) => ctx.onDraft(decision.id, { status: e.target.value }, false) },
            ['open', 'decided', 'revisit'].map((s) => el('option', { value: s, selected: s === cur.status }, s)),
          ),
        ),
        el('button', { class: 'save', type: 'button', onclick: () => ctx.onSave(decision.id) }, 'Save'),
      ),
    error && el('p', { class: 'error', role: 'alert' }, error),
  );
}

function renderCard(decision, ctx) {
  const cur = currentState(decision, ctx);
  const open = ctx.expanded.has(decision.id);
  const info = decision.deadline ? deadlineInfo(decision.deadline, ctx.nowMs) : null;
  const summary =
    decision.kind === 'freeform'
      ? cur.answer
      : cur.chosen.map((id) => (decision.options.find((o) => o.id === id) || {}).name || id).join(', ');
  return el(
    'article',
    { class: `card status-${cur.status}${open ? ' open' : ''}`, id: `card-${decision.id}` },
    el(
      'button',
      { class: 'card-head', type: 'button', 'aria-expanded': String(open), onclick: () => ctx.onToggle(decision.id) },
      el('span', { class: 'card-title' }, decision.title),
      el(
        'span',
        { class: 'chips' },
        el('span', { class: `chip chip-${cur.status}` }, cur.status),
        info &&
          el(
            'span',
            { class: `chip chip-deadline${info.urgent && cur.status !== 'decided' ? ' urgent' : ''}` },
            info.overdue ? 'overdue' : `due ${formatDeadline(decision.deadline)}`,
          ),
      ),
      summary && el('span', { class: 'summary' }, summary),
    ),
    open && renderBody(decision, cur, ctx),
  );
}

export function renderPhases(container, decisions, ctx) {
  container.replaceChildren();
  const groups = groupByPhase(decisions);
  for (const phase of PHASES) {
    const list = groups[phase.id];
    const progress = phaseProgress(list);
    container.append(
      el(
        'section',
        { class: 'phase' },
        el(
          'header',
          { class: 'phase-head' },
          el('h2', {}, phase.label),
          el('span', { class: 'range' }, phase.range),
          list.length > 0 && el('span', { class: 'progress' }, `${progress.decided} of ${progress.total} decided`),
        ),
        list.length === 0 && phase.placeholder && el('p', { class: 'placeholder' }, phase.placeholder),
        list.map((d) => renderCard(d, ctx)),
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
