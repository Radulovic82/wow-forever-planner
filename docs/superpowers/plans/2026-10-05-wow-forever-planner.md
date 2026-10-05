# WoW Forever Planner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the static GitHub Pages site from the approved spec: a countdown hero plus phase-grouped decision cards backed by Firestore, with an owner-only Import button and owner-only editing.

**Architecture:** Plain HTML, CSS and ES modules, no framework and no build step. Pure modules (`countdown`, `phases`, `picks`, `catalog`, `view`) hold all logic and are unit tested with `node:test`. One module, `store.js`, is the only code that touches Firebase, and `app.js` loads it lazily so the countdown works even if it fails.

**Tech Stack:** Vanilla JS (ES modules), Node 24 `node:test`, Firebase JS SDK 12.19.0 from the gstatic CDN (Firestore + Auth with Google), GitHub Pages.

**Spec:** `docs/superpowers/specs/2026-10-05-wow-forever-planner-design.md`. Vocabulary: `CONTEXT.md`.

## Global Constraints

- Launch instant is the constant `2026-11-04T23:00:00Z`. It is never stored in Firestore.
- The launch moment is always printed in `Europe/Zagreb`, whatever the viewer's timezone, as `Thu 5 Nov 2026, 00:00 Zagreb time`.
- Firebase project id is `wow-forever-planner-57513`. Hosting is GitHub Pages from `main` at the repo root. No Vercel.
- Firestore collection is `decisions`, one document per decision. Read is public, write only for the owner's Firebase user ID (never an email).
- Phases are exactly `before-launch`, `launch-prep`, `leveling`, `endgame`. Statuses are exactly `open`, `decided`, `revisit`. Kinds are exactly `choice` and `freeform`.
- Import never overwrites `status`, `chosen`, `answer`, `reason` or `updatedAt` of an existing document. A chosen option missing from the new file sets `status: revisit` and keeps `chosen`.
- Never use `innerHTML`, `outerHTML`, `insertAdjacentHTML` or `document.write`. All Firestore text is rendered with `textContent` or text nodes.
- Only `https:` links are allowed in the catalog.
- No service account key, no Firebase CLI login. Rules are deployed by pasting into the Firebase console.
- Layout works from phone width up, 16 px side gutter, no horizontal scroll. Dark theme with Horde reds.
- Commits are short, casual and lowercase, with **no** Co-Authored-By trailer and no Claude attribution (personal repo).
- The Firebase web config lives in `.local/firebase-config.json` (git-ignored) and is copied into `js/config.js` by a script. Do not paste the key into any other file, issue or plan.

## Review Focus

Failure modes the spec implies but no feature test would otherwise pin, most likely first:

1. A viewer in another timezone (or across the 25 Oct EU and 1 Nov US daylight-saving changes) must still see the launch as Zagreb time. Pinned in Task 1 with a child process run under `TZ=Pacific/Auckland`.
2. A sloppy or hostile import file (`javascript:` or `http:` link, duplicate ids, a deadline written as "27 Oct", a freeform decision with options, a choice with one option) must be refused with every problem listed and nothing written. Pinned in Task 4.
3. Re-importing after Filip has picked must keep his picks, and a removed chosen option must flip the decision to `revisit` without losing the pick. Pinned in Task 4.
4. If the CDN or Firestore is unreachable the countdown must still run. Pinned in Task 8 with a structure test that `app.js` loads `store.js` only through a dynamic `import()`.
5. Option text containing HTML (for example `<img onerror=...>`) must show as text. Pinned in Task 8 with a structure test that bans HTML-injection APIs.
6. A deadline that has already passed must show as overdue, not "-2 days left". Pinned in Task 2.
7. Marking a decision `decided` with nothing picked or no written answer must be refused. Pinned in Task 3.

---

## File structure

```
index.html                 page shell, loads js/app.js
css/style.css              all styling
js/countdown.js            pure: launch constant, getCountdown, formatZagreb, formatDeadline
js/phases.js               pure: PHASES, groupByPhase, phaseProgress, deadlineInfo, nextUp
js/picks.js                pure: togglePick, ownerStateError
js/catalog.js              pure: validateCatalog, mergeDecision
js/view.js                 DOM rendering from plain data, no Firebase
js/store.js                the only Firebase module: auth, read, save, import
js/config.js               generated: firebaseConfig, OWNER_UID
js/app.js                  wiring: state, render, owner flows
data/catalog.json          the 10 decisions to import
firestore.rules            rules to paste into the console
dev/preview.html           renders data/catalog.json without Firebase, for screenshots
tests/*.test.js            node:test files
package.json               "type": "module", "test": "node --test"
```

---

### Task 1: Countdown module (with project scaffold)

**Files:**
- Create: `package.json`
- Create: `js/countdown.js`
- Test: `tests/countdown.test.js`

**Interfaces:**
- Produces: `LAUNCH_ISO: string`, `LAUNCH_MS: number`, `getCountdown(nowMs: number, launchMs?: number) -> { live: boolean, days: number, hours: number, minutes: number, seconds: number }`, `formatZagreb(ms: number) -> string`, `formatDeadline(iso: string) -> string`.
- When `live` is true the numbers are time elapsed since launch.

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "wow-forever-planner",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test"
  }
}
```

- [ ] **Step 2: Write the failing test `tests/countdown.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { LAUNCH_MS, getCountdown, formatZagreb, formatDeadline } from '../js/countdown.js';

test('launch instant is 23:00 UTC on 4 Nov 2026', () => {
  assert.equal(new Date(LAUNCH_MS).toISOString(), '2026-11-04T23:00:00.000Z');
});

test('counts down in days, hours, minutes and seconds', () => {
  const now = LAUNCH_MS - (26 * 3600 + 3 * 60 + 4) * 1000; // 1d 2h 3m 4s before
  assert.deepEqual(getCountdown(now), { live: false, days: 1, hours: 2, minutes: 3, seconds: 4 });
});

test('a partial second rounds up so it never reads zero before launch', () => {
  assert.deepEqual(getCountdown(LAUNCH_MS - 500), { live: false, days: 0, hours: 0, minutes: 0, seconds: 1 });
});

test('is live at the launch instant', () => {
  assert.deepEqual(getCountdown(LAUNCH_MS), { live: true, days: 0, hours: 0, minutes: 0, seconds: 0 });
});

test('counts elapsed time after launch', () => {
  const now = LAUNCH_MS + (2 * 86400 + 5 * 3600 + 6 * 60 + 7) * 1000 + 900;
  assert.deepEqual(getCountdown(now), { live: true, days: 2, hours: 5, minutes: 6, seconds: 7 });
});

test('Zagreb label for the launch is midnight on Thursday 5 Nov', () => {
  assert.equal(formatZagreb(LAUNCH_MS), 'Thu 5 Nov 2026, 00:00 Zagreb time');
});

test('Zagreb label uses summer time before 25 Oct', () => {
  assert.equal(formatZagreb(Date.parse('2026-10-20T10:30:00Z')), 'Tue 20 Oct 2026, 12:30 Zagreb time');
});

test('formatDeadline formats an ISO string with an offset', () => {
  assert.equal(formatDeadline('2026-10-27T00:00:00+01:00'), 'Tue 27 Oct 2026, 00:00 Zagreb time');
});

test('the label does not depend on the viewer timezone', () => {
  const code =
    "import { formatZagreb, LAUNCH_MS } from './js/countdown.js'; process.stdout.write(formatZagreb(LAUNCH_MS));";
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', code], {
    cwd: new URL('..', import.meta.url),
    env: { ...process.env, TZ: 'Pacific/Auckland' },
    encoding: 'utf8',
  });
  assert.equal(out, 'Thu 5 Nov 2026, 00:00 Zagreb time');
});
```

- [ ] **Step 3: Run it to confirm it fails**

Run: `cd ~/projects/wow-forever-planner && npm test`
Expected: FAIL, "Cannot find module .../js/countdown.js".

- [ ] **Step 4: Write `js/countdown.js`**

```js
export const LAUNCH_ISO = '2026-11-04T23:00:00Z';
export const LAUNCH_MS = Date.parse(LAUNCH_ISO);

// Before launch the numbers count down (partial seconds round up).
// From the launch instant on they count elapsed time (partial seconds round down).
export function getCountdown(nowMs, launchMs = LAUNCH_MS) {
  const diffMs = launchMs - nowMs;
  const live = diffMs <= 0;
  let rest = live ? Math.floor(-diffMs / 1000) : Math.ceil(diffMs / 1000);
  const days = Math.floor(rest / 86400);
  rest %= 86400;
  const hours = Math.floor(rest / 3600);
  rest %= 3600;
  const minutes = Math.floor(rest / 60);
  const seconds = rest % 60;
  return { live, days, hours, minutes, seconds };
}

const zagreb = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Europe/Zagreb',
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});

export function formatZagreb(ms) {
  const parts = zagreb.formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type).value;
  return `${get('weekday')} ${get('day')} ${get('month')} ${get('year')}, ${get('hour')}:${get('minute')} Zagreb time`;
}

export function formatDeadline(iso) {
  return formatZagreb(Date.parse(iso));
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, 9 tests.

- [ ] **Step 6: Commit**

```bash
git add package.json js/countdown.js tests/countdown.test.js
git commit -m "countdown module with tests"
```

---

### Task 2: Phases module

**Files:**
- Create: `js/phases.js`
- Test: `tests/phases.test.js`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `PHASES: Array<{ id: string, label: string, range: string, placeholder?: string }>`
  - `groupByPhase(decisions) -> { [phaseId]: decision[] }` (every phase id present, each list sorted by `order`)
  - `phaseProgress(list) -> { decided: number, total: number }`
  - `deadlineInfo(iso: string, nowMs: number) -> { msLeft, daysLeft, urgent, overdue }`
  - `nextUp(decisions, nowMs, limit = 3) -> Array<{ decision, msLeft, daysLeft, urgent, overdue }>`

- [ ] **Step 1: Write the failing test `tests/phases.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASES, groupByPhase, phaseProgress, deadlineInfo, nextUp } from '../js/phases.js';

const DAY = 86400000;
const NOW = Date.parse('2026-10-20T12:00:00Z');
const at = (days) => new Date(NOW + days * DAY).toISOString();
const d = (id, over = {}) => ({ id, phase: 'before-launch', order: 1, status: 'open', deadline: null, ...over });

test('phases come in timeline order and endgame is a placeholder', () => {
  assert.deepEqual(PHASES.map((p) => p.id), ['before-launch', 'launch-prep', 'leveling', 'endgame']);
  assert.ok(PHASES[3].placeholder.length > 0);
});

test('groupByPhase sorts by order and includes empty phases', () => {
  const groups = groupByPhase([d('b', { order: 2 }), d('a', { order: 1 }), d('x', { phase: 'leveling' })]);
  assert.deepEqual(groups['before-launch'].map((x) => x.id), ['a', 'b']);
  assert.deepEqual(groups['leveling'].map((x) => x.id), ['x']);
  assert.deepEqual(groups['endgame'], []);
  assert.deepEqual(groups['launch-prep'], []);
});

test('groupByPhase ignores decisions with an unknown phase', () => {
  const groups = groupByPhase([d('a', { phase: 'nope' })]);
  assert.equal(Object.values(groups).flat().length, 0);
});

test('phaseProgress counts decided decisions', () => {
  assert.deepEqual(phaseProgress([d('a', { status: 'decided' }), d('b'), d('c', { status: 'revisit' })]), {
    decided: 1,
    total: 3,
  });
  assert.deepEqual(phaseProgress([]), { decided: 0, total: 0 });
});

test('deadlineInfo marks anything within 7 days as urgent', () => {
  const near = deadlineInfo(at(3), NOW);
  assert.equal(near.daysLeft, 3);
  assert.equal(near.urgent, true);
  assert.equal(near.overdue, false);
  const far = deadlineInfo(at(10), NOW);
  assert.equal(far.daysLeft, 10);
  assert.equal(far.urgent, false);
});

test('a partial day rounds up in days left', () => {
  assert.equal(deadlineInfo(new Date(NOW + 1.2 * DAY).toISOString(), NOW).daysLeft, 2);
});

test('a passed deadline is overdue and urgent', () => {
  const info = deadlineInfo(at(-2), NOW);
  assert.equal(info.overdue, true);
  assert.equal(info.urgent, true);
  assert.ok(info.msLeft < 0);
});

test('nextUp skips decided and deadline-free decisions and sorts nearest first', () => {
  const list = [
    d('late', { deadline: at(20) }),
    d('done', { deadline: at(1), status: 'decided' }),
    d('none'),
    d('soon', { deadline: at(2) }),
    d('over', { deadline: at(-1) }),
    d('revisit', { deadline: at(5), status: 'revisit' }),
  ];
  assert.deepEqual(nextUp(list, NOW, 10).map((x) => x.decision.id), ['over', 'soon', 'revisit', 'late']);
});

test('nextUp honours the limit', () => {
  const list = [d('a', { deadline: at(1) }), d('b', { deadline: at(2) }), d('c', { deadline: at(3) })];
  assert.equal(nextUp(list, NOW, 2).length, 2);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL, "Cannot find module .../js/phases.js".

- [ ] **Step 3: Write `js/phases.js`**

```js
export const PHASES = [
  { id: 'before-launch', label: 'Before launch', range: 'Until 3 Nov' },
  { id: 'launch-prep', label: 'Launch prep', range: 'Until the evening of 4 Nov' },
  { id: 'leveling', label: 'Leveling', range: 'Levels 1 to 60' },
  { id: 'endgame', label: 'Endgame', range: 'From 9 Dec', placeholder: 'TBD, too far away.' },
];

const DAY_MS = 86400000;
const URGENT_MS = 7 * DAY_MS;

export function groupByPhase(decisions) {
  const groups = Object.fromEntries(PHASES.map((p) => [p.id, []]));
  for (const decision of decisions) {
    if (groups[decision.phase]) groups[decision.phase].push(decision);
  }
  for (const list of Object.values(groups)) list.sort((a, b) => a.order - b.order);
  return groups;
}

export function phaseProgress(list) {
  return { decided: list.filter((x) => x.status === 'decided').length, total: list.length };
}

export function deadlineInfo(iso, nowMs) {
  const msLeft = Date.parse(iso) - nowMs;
  return {
    msLeft,
    daysLeft: Math.ceil(msLeft / DAY_MS),
    urgent: msLeft <= URGENT_MS,
    overdue: msLeft < 0,
  };
}

export function nextUp(decisions, nowMs, limit = 3) {
  return decisions
    .filter((x) => x.status !== 'decided' && x.deadline)
    .map((decision) => ({ decision, ...deadlineInfo(decision.deadline, nowMs) }))
    .sort((a, b) => a.msLeft - b.msLeft)
    .slice(0, limit);
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, all countdown and phases tests.

- [ ] **Step 5: Commit**

```bash
git add js/phases.js tests/phases.test.js
git commit -m "phases module with tests"
```

---

### Task 3: Picks module

**Files:**
- Create: `js/picks.js`
- Test: `tests/picks.test.js`

**Interfaces:**
- Produces:
  - `togglePick(chosen: string[], optionId: string, maxPicks?: number) -> string[]` (returns a new array)
  - `ownerStateError(decision, state: { status, chosen, answer, reason }) -> string | null`

- [ ] **Step 1: Write the failing test `tests/picks.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { togglePick, ownerStateError } from '../js/picks.js';

test('picking replaces the choice when only one pick is allowed', () => {
  assert.deepEqual(togglePick([], 'orc', 1), ['orc']);
  assert.deepEqual(togglePick(['orc'], 'troll', 1), ['troll']);
});

test('picking the chosen option again unpicks it', () => {
  assert.deepEqual(togglePick(['orc'], 'orc', 1), []);
  assert.deepEqual(togglePick(['a', 'b'], 'a', 2), ['b']);
});

test('several picks are allowed up to maxPicks, then nothing more is added', () => {
  assert.deepEqual(togglePick(['a'], 'b', 2), ['a', 'b']);
  assert.deepEqual(togglePick(['a', 'b'], 'c', 2), ['a', 'b']);
});

test('togglePick does not mutate its input', () => {
  const chosen = ['a'];
  togglePick(chosen, 'b', 2);
  assert.deepEqual(chosen, ['a']);
});

const choice = { kind: 'choice', options: [{ id: 'orc' }, { id: 'troll' }] };
const freeform = { kind: 'freeform', options: [] };
const state = (over) => ({ status: 'open', chosen: [], answer: '', reason: '', ...over });

test('a choice cannot be decided with nothing picked', () => {
  assert.match(ownerStateError(choice, state({ status: 'decided' })), /Pick an option/);
});

test('a choice can be decided once something is picked', () => {
  assert.equal(ownerStateError(choice, state({ status: 'decided', chosen: ['orc'] })), null);
});

test('a freeform decision cannot be decided with a blank answer', () => {
  assert.match(ownerStateError(freeform, state({ status: 'decided', answer: '   ' })), /Write your answer/);
});

test('a freeform decision can be decided with an answer', () => {
  assert.equal(ownerStateError(freeform, state({ status: 'decided', answer: 'Zarg, Zarga' })), null);
});

test('open and revisit never need a pick', () => {
  assert.equal(ownerStateError(choice, state({ status: 'open' })), null);
  assert.equal(ownerStateError(choice, state({ status: 'revisit' })), null);
});

test('an unknown status or a chosen option that does not exist is refused', () => {
  assert.match(ownerStateError(choice, state({ status: 'done' })), /status/i);
  assert.match(ownerStateError(choice, state({ chosen: ['gnome'] })), /does not exist/);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL, "Cannot find module .../js/picks.js".

- [ ] **Step 3: Write `js/picks.js`**

```js
export function togglePick(chosen, optionId, maxPicks = 1) {
  if (chosen.includes(optionId)) return chosen.filter((id) => id !== optionId);
  if (maxPicks === 1) return [optionId];
  if (chosen.length >= maxPicks) return [...chosen];
  return [...chosen, optionId];
}

const STATUSES = ['open', 'decided', 'revisit'];

export function ownerStateError(decision, state) {
  if (!STATUSES.includes(state.status)) return 'Unknown status.';
  if (state.chosen.some((id) => !decision.options.some((o) => o.id === id))) {
    return 'A chosen option does not exist.';
  }
  if (state.status === 'decided') {
    if (decision.kind === 'freeform') {
      if (!state.answer.trim()) return 'Write your answer before marking this decided.';
    } else if (state.chosen.length === 0) {
      return 'Pick an option before marking this decided.';
    }
  }
  return null;
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/picks.js tests/picks.test.js
git commit -m "picks module with tests"
```

---

### Task 4: Catalog validation and merge

**Files:**
- Create: `js/catalog.js`
- Test: `tests/catalog.test.js`

**Interfaces:**
- Consumes: `PHASES` from `js/phases.js`.
- Produces:
  - `validateCatalog(input: unknown) -> { ok: boolean, errors: string[], decisions: NormalizedDecision[] }`. `decisions` is empty unless `ok`. Every problem in the file is listed, each prefixed with `decisions[i] (id):`.
  - `mergeDecision(existing | null, incoming: NormalizedDecision) -> { create: boolean, data: object }` where `data` excludes `id`.
- `NormalizedDecision`: `{ id, title, phase, topic, order, deadline: string | null, kind, maxPicks, options: Array<{ id, name, pros: string[], cons: string[], links: Array<{ label, url }>, note: string }> }`.

- [ ] **Step 1: Write the failing test `tests/catalog.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateCatalog, mergeDecision } from '../js/catalog.js';

const option = (id, over = {}) => ({
  id,
  name: id.toUpperCase(),
  pros: ['p'],
  cons: ['c'],
  links: [{ label: 'src', url: 'https://example.com/x' }],
  ...over,
});
const choice = (over = {}) => ({
  id: 'race',
  title: 'Which race?',
  phase: 'before-launch',
  topic: 'character',
  order: 2,
  deadline: '2026-10-27T00:00:00+01:00',
  kind: 'choice',
  maxPicks: 1,
  options: [option('orc'), option('troll')],
  ...over,
});
const freeform = (over = {}) => ({
  id: 'names',
  title: 'Which names?',
  phase: 'before-launch',
  topic: 'character',
  order: 3,
  deadline: null,
  kind: 'freeform',
  ...over,
});
const file = (...decisions) => ({ version: 1, decisions });

test('accepts a valid file and returns normalized decisions', () => {
  const result = validateCatalog(file(choice(), freeform()));
  assert.equal(result.ok, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.decisions.length, 2);
  assert.deepEqual(result.decisions[1].options, []);
  assert.equal(result.decisions[1].maxPicks, 1);
});

test('fills defaults for maxPicks, deadline, option note and links', () => {
  const sparse = choice({ maxPicks: undefined, deadline: undefined, options: [{ id: 'a', name: 'A' }, { id: 'b', name: 'B' }] });
  const { ok, decisions } = validateCatalog(file(sparse));
  assert.equal(ok, true);
  assert.equal(decisions[0].maxPicks, 1);
  assert.equal(decisions[0].deadline, null);
  assert.deepEqual(decisions[0].options[0], { id: 'a', name: 'A', pros: [], cons: [], links: [], note: '' });
});

test('rejects a file that is not an object, has the wrong version, or no decisions', () => {
  assert.equal(validateCatalog(null).ok, false);
  assert.equal(validateCatalog([]).ok, false);
  assert.match(validateCatalog({ version: 2, decisions: [choice()] }).errors.join('\n'), /version/);
  assert.match(validateCatalog({ version: 1, decisions: [] }).errors.join('\n'), /non-empty/);
});

test('rejects a bad id, a duplicate id, an unknown phase and an unknown kind', () => {
  const r = validateCatalog(
    file(choice({ id: 'Bad Id' }), choice({ id: 'x' }), choice({ id: 'x' }), choice({ id: 'y', phase: 'nope' }), choice({ id: 'z', kind: 'maybe' })),
  );
  const text = r.errors.join('\n');
  assert.equal(r.ok, false);
  assert.match(text, /slug/);
  assert.match(text, /duplicate/);
  assert.match(text, /phase/);
  assert.match(text, /kind/);
});

test('rejects a deadline that is not an ISO time with an offset', () => {
  assert.match(validateCatalog(file(choice({ deadline: '27 Oct' }))).errors.join('\n'), /deadline/);
  assert.match(validateCatalog(file(choice({ deadline: '2026-10-27' }))).errors.join('\n'), /deadline/);
  assert.equal(validateCatalog(file(choice({ deadline: '2026-10-27T00:00:00Z' }))).ok, true);
});

test('rejects a choice with fewer than two options or duplicate option ids', () => {
  assert.match(validateCatalog(file(choice({ options: [option('a')] }))).errors.join('\n'), /at least 2/);
  assert.match(validateCatalog(file(choice({ options: [option('a'), option('a')] }))).errors.join('\n'), /duplicate option/);
});

test('rejects maxPicks above the number of options or below one', () => {
  assert.match(validateCatalog(file(choice({ maxPicks: 3 }))).errors.join('\n'), /maxPicks/);
  assert.match(validateCatalog(file(choice({ maxPicks: 0 }))).errors.join('\n'), /maxPicks/);
});

test('rejects javascript: and http: links', () => {
  const bad = (url) => choice({ options: [option('a', { links: [{ label: 'x', url }] }), option('b')] });
  assert.match(validateCatalog(file(bad('javascript:alert(1)'))).errors.join('\n'), /https/);
  assert.match(validateCatalog(file(bad('http://example.com'))).errors.join('\n'), /https/);
  assert.match(validateCatalog(file(bad('not a url'))).errors.join('\n'), /https/);
});

test('rejects a freeform decision that has options', () => {
  assert.match(validateCatalog(file(freeform({ options: [option('a'), option('b')] }))).errors.join('\n'), /freeform/);
});

test('lists every problem and names the decision, and writes nothing when any is bad', () => {
  const r = validateCatalog(file(choice({ title: '' }), choice({ id: 'other', topic: '' })));
  assert.equal(r.ok, false);
  assert.deepEqual(r.decisions, []);
  assert.ok(r.errors.length >= 2);
  assert.match(r.errors[0], /decisions\[0\] \(race\)/);
  assert.match(r.errors[1], /decisions\[1\] \(other\)/);
});

test('mergeDecision creates a new decision as open and empty', () => {
  const incoming = validateCatalog(file(choice())).decisions[0];
  const { create, data } = mergeDecision(null, incoming);
  assert.equal(create, true);
  assert.equal(data.status, 'open');
  assert.deepEqual(data.chosen, []);
  assert.equal(data.answer, '');
  assert.equal(data.reason, '');
  assert.equal('id' in data, false);
  assert.equal(data.title, 'Which race?');
});

test('mergeDecision updates only catalog fields and keeps the owner state', () => {
  const incoming = validateCatalog(file(choice({ title: 'Which race now?' }))).decisions[0];
  const existing = { status: 'decided', chosen: ['orc'], answer: '', reason: 'Blood Fury' };
  const { create, data } = mergeDecision(existing, incoming);
  assert.equal(create, false);
  assert.equal(data.title, 'Which race now?');
  for (const key of ['status', 'chosen', 'answer', 'reason', 'updatedAt']) {
    assert.equal(key in data, false, `${key} must not be written on update`);
  }
});

test('mergeDecision sets revisit when a chosen option disappears and keeps the pick', () => {
  const incoming = validateCatalog(file(choice({ options: [option('troll'), option('undead')] }))).decisions[0];
  const existing = { status: 'decided', chosen: ['orc'], answer: '', reason: '' };
  const { data } = mergeDecision(existing, incoming);
  assert.equal(data.status, 'revisit');
  assert.equal('chosen' in data, false);
});

test('mergeDecision leaves status alone when the chosen option still exists', () => {
  const incoming = validateCatalog(file(choice())).decisions[0];
  const { data } = mergeDecision({ status: 'decided', chosen: ['orc'] }, incoming);
  assert.equal('status' in data, false);
});

test('mergeDecision never sets revisit for freeform decisions', () => {
  const incoming = validateCatalog(file(freeform())).decisions[0];
  const { data } = mergeDecision({ status: 'decided', chosen: [], answer: 'x' }, incoming);
  assert.equal('status' in data, false);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL, "Cannot find module .../js/catalog.js".

- [ ] **Step 3: Write `js/catalog.js`**

```js
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
    let options = [];
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, all tests so far.

- [ ] **Step 5: Commit**

```bash
git add js/catalog.js tests/catalog.test.js
git commit -m "catalog validation and merge with tests"
```

---

### Task 5: The catalog data

**Files:**
- Create: `data/catalog.json`
- Test: `tests/catalog-data.test.js`

**Interfaces:**
- Consumes: `validateCatalog` from `js/catalog.js`.
- Produces: `data/catalog.json` in the import shape `{ "version": 1, "decisions": [...] }` with the ten decisions from spec section 9. Facts come from the two research branches (`research/launch-dates`, `research/warlock-choices`); claims that are not confirmed are labelled in `note`.

- [ ] **Step 1: Write the failing test `tests/catalog-data.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateCatalog } from '../js/catalog.js';

const raw = JSON.parse(readFileSync(new URL('../data/catalog.json', import.meta.url), 'utf8'));

test('the shipped catalog passes validation', () => {
  const result = validateCatalog(raw);
  assert.deepEqual(result.errors, []);
  assert.equal(result.ok, true);
});

test('the catalog has the ten agreed decisions in the agreed phases', () => {
  const { decisions } = validateCatalog(raw);
  const byPhase = (phase) => decisions.filter((d) => d.phase === phase).map((d) => d.id);
  assert.deepEqual(byPhase('before-launch'), ['pack', 'race', 'names']);
  assert.deepEqual(byPhase('launch-prep'), ['addons-ui']);
  assert.deepEqual(byPhase('leveling'), ['spec', 'demon', 'professions', 'route', 'dungeons', 'legacy']);
  assert.deepEqual(byPhase('endgame'), []);
  assert.equal(decisions.length, 10);
});

test('the deadlines match the agreed dates', () => {
  const { decisions } = validateCatalog(raw);
  const deadline = (id) => decisions.find((d) => d.id === id).deadline;
  assert.equal(deadline('pack'), '2026-10-27T00:00:00+01:00');
  assert.equal(deadline('names'), '2026-11-03T23:59:00+01:00');
  assert.equal(deadline('addons-ui'), '2026-11-04T22:00:00+01:00');
});

test('names and addons are freeform and professions allow two picks', () => {
  const { decisions } = validateCatalog(raw);
  const get = (id) => decisions.find((d) => d.id === id);
  assert.equal(get('names').kind, 'freeform');
  assert.equal(get('addons-ui').kind, 'freeform');
  assert.equal(get('professions').maxPicks, 2);
});

test('the order within each phase is unique', () => {
  const { decisions } = validateCatalog(raw);
  for (const phase of ['before-launch', 'launch-prep', 'leveling']) {
    const orders = decisions.filter((d) => d.phase === phase).map((d) => d.order);
    assert.equal(new Set(orders).size, orders.length, phase);
  }
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL, ENOENT `data/catalog.json`.

- [ ] **Step 3: Write `data/catalog.json`**

```json
{
  "version": 1,
  "decisions": [
    {
      "id": "pack",
      "title": "Which pack to buy?",
      "phase": "before-launch",
      "topic": "purchase",
      "order": 1,
      "deadline": "2026-10-27T00:00:00+01:00",
      "kind": "choice",
      "maxPicks": 1,
      "options": [
        {
          "id": "heroic",
          "name": "Skyborne Heroic Pack",
          "pros": [
            "Cheapest pack that includes early name reservation (from 29.99 USD, secondary source)",
            "Name reservation for up to 3 characters"
          ],
          "cons": [
            "No beta access (not wanted anyway)",
            "Only 1 invite code (not needed)"
          ],
          "links": [
            {
              "label": "Blizzard pre-purchase post",
              "url": "https://news.blizzard.com/en-us/article/24301508/pre-purchase-world-of-warcraft-forever-upgrades-and-begin-your-next-journey-in-azeroth"
            }
          ],
          "note": "Unverified: the real price, and whether a subscription is needed from day one. Check the Blizzard shop."
        },
        {
          "id": "epic",
          "name": "Skyborne Epic Pack",
          "pros": [
            "Adds 30 days of game time starting 4 Nov",
            "Name reservation for up to 3 characters"
          ],
          "cons": [
            "Costs more than Heroic (price to check)",
            "Beta access and 3 invite codes are included but not wanted"
          ],
          "links": [
            {
              "label": "Blizzard pre-purchase post",
              "url": "https://news.blizzard.com/en-us/article/24301508/pre-purchase-world-of-warcraft-forever-upgrades-and-begin-your-next-journey-in-azeroth"
            }
          ],
          "note": "Unverified: the real price."
        },
        {
          "id": "collection",
          "name": "Warcraft Forever Collection",
          "pros": [
            "Includes name reservation, beta access and 3 invite codes",
            "Adds 30 days of game time starting 4 Nov"
          ],
          "cons": [
            "Contents and price not checked yet",
            "Available only until 11 Jan 2027"
          ],
          "links": [
            {
              "label": "Blizzard pre-purchase post",
              "url": "https://news.blizzard.com/en-us/article/24301508/pre-purchase-world-of-warcraft-forever-upgrades-and-begin-your-next-journey-in-azeroth"
            }
          ],
          "note": "Unverified: everything beyond the perks named in the Blizzard post."
        }
      ]
    },
    {
      "id": "race",
      "title": "Which race: Orc, Troll or Undead?",
      "phase": "before-launch",
      "topic": "character",
      "order": 2,
      "deadline": "2026-10-27T00:00:00+01:00",
      "kind": "choice",
      "maxPicks": 1,
      "options": [
        {
          "id": "orc",
          "name": "Orc",
          "pros": [
            "Blood Fury: +10% attack power and spell power for 15 s, 2 min cooldown",
            "Shatter Curse: removes Curses and Banes and grants immunity, 3 min cooldown",
            "Hardiness: stun duration reduced by 20%"
          ],
          "cons": [
            "The Classic pet damage racial (Command) is not in the Forever list (from memory, unverified)",
            "Shatter Curse is mostly a PvP tool, its use in Normal PvE is unverified"
          ],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            },
            { "label": "Blizzard hero post", "url": "https://news.blizzard.com/en-us/article/24304075/create-the-hero-you-want-to-be-in-world-of-warcraft-forever" }
          ],
          "note": "Starts in Durotar. Racials are from the beta client data."
        },
        {
          "id": "troll",
          "name": "Troll",
          "pros": [
            "Berserking: +10% cast and attack speed for 10 s every 3 min",
            "New Warlock combination at launch (official)",
            "Rapid Regeneration: heals 50% of max health over 6 s"
          ],
          "cons": [
            "One guide ranks Troll C-tier for Warlock, below Orc and Undead (secondary opinion)",
            "Beast Slaying (+5% damage vs beasts) is situational"
          ],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ],
          "note": "Starts in Durotar. Racials are from the beta client data."
        },
        {
          "id": "undead",
          "name": "Undead",
          "pros": [
            "Will of the Forsaken removes Charm, Fear and Sleep, 2 min cooldown",
            "Cannibalize now restores mana as well as health (official)",
            "Touch of the Grave: 10% chance for casters to drain up to 5% of max health"
          ],
          "cons": [
            "Cannibalize needs a corpse nearby",
            "Starts in Tirisfal Glades instead of Durotar"
          ],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            },
            { "label": "Blizzard deep dive recap", "url": "https://worldofwarcraft.blizzard.com/en-us/news/24303313/world-of-warcraft-forever-deep-dive-panel-recap" }
          ],
          "note": "Undead Warlock already existed in Classic. Racials are from the beta client data."
        }
      ]
    },
    {
      "id": "names",
      "title": "Which names to reserve? Up to 3 characters, each with a first and a second name.",
      "phase": "before-launch",
      "topic": "character",
      "order": 3,
      "deadline": "2026-11-03T23:59:00+01:00",
      "kind": "freeform",
      "maxPicks": 1,
      "options": []
    },
    {
      "id": "addons-ui",
      "title": "Which addons, UI setup and keybinds before launch?",
      "phase": "launch-prep",
      "topic": "logistics",
      "order": 1,
      "deadline": "2026-11-04T22:00:00+01:00",
      "kind": "freeform",
      "maxPicks": 1,
      "options": []
    },
    {
      "id": "spec",
      "title": "Which Warlock spec: Affliction, Demonology or Destruction?",
      "phase": "leveling",
      "topic": "build",
      "order": 1,
      "deadline": null,
      "kind": "choice",
      "maxPicks": 1,
      "options": [
        {
          "id": "affliction",
          "name": "Affliction",
          "pros": [
            "Secondary guides recommend it for leveling (opinion)",
            "DoTs can crit in Forever (secondary)",
            "New Pandemic: DoT crit damage up to +100% at max rank"
          ],
          "cons": [
            "Heavily reworked and there is no official Warlock deep dive yet",
            "Improved Corruption makes Corruption instant only at 5/5"
          ],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            },
            { "label": "Talents Forever data", "url": "https://talentsforever.com/data.json" }
          ],
          "note": "Talent facts are from the beta build and can still change."
        },
        {
          "id": "demonology",
          "name": "Demonology",
          "pros": [
            "Pet centred, called a strong solo leveler by secondary guides",
            "Demonic Knowledge: up to +100% of level as spell damage while a demon is out"
          ],
          "cons": [
            "Several Classic talents removed or folded (Improved Healthstone, Fel Stamina, Improved Firestone)",
            "Depends on the demon staying alive"
          ],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ],
          "note": "Talent facts are from the beta build and can still change."
        },
        {
          "id": "destruction",
          "name": "Destruction",
          "pros": [
            "Fire and Shadow burst, Incinerate learned at level 40",
            "Conflagrate no longer needs Improved Immolate"
          ],
          "cons": [
            "Several Classic talents removed (Devastation, Emberstorm)",
            "Shadowburn only from level 20"
          ],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ],
          "note": "Talent facts are from the beta build and can still change."
        }
      ]
    },
    {
      "id": "demon",
      "title": "Which demon as the main companion?",
      "phase": "leveling",
      "topic": "build",
      "order": 2,
      "deadline": null,
      "kind": "choice",
      "maxPicks": 1,
      "options": [
        {
          "id": "imp",
          "name": "Imp",
          "pros": [
            "Learned at level 1 and needs no Soul Shard",
            "Firebolt and Fire Shield; Master Demonologist gives +10% Fire damage"
          ],
          "cons": ["Fragile, not a tank"],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ]
        },
        {
          "id": "voidwalker",
          "name": "Voidwalker",
          "pros": [
            "Learned at level 10, the tank pet (Torment, Sacrifice, Consume Shadows, Suffering)",
            "Master Demonologist: -10% Physical damage taken"
          ],
          "cons": ["Needs a Soul Shard to summon", "Low damage of its own"],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ],
          "note": "One secondary guide suggests Imp for levels 1 to 10, then the Voidwalker as a personal tank."
        },
        {
          "id": "succubus",
          "name": "Succubus or Incubus",
          "pros": [
            "Learned at level 20, melee damage (Lash of Pain, Soothing Kiss, Seduction)",
            "Master Demonologist: +10% Shadow damage"
          ],
          "cons": ["Needs a Soul Shard to summon", "Squishier than the Voidwalker"],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ],
          "note": "The Incubus is a separate summon at level 20 with the same abilities according to secondary guides."
        },
        {
          "id": "felhunter",
          "name": "Felhunter",
          "pros": [
            "Learned at level 30 (class quest per secondary sources)",
            "Devour Magic, Tainted Blood and Spell Lock (interrupt)",
            "Master Demonologist: -10% Magic damage taken"
          ],
          "cons": ["Not available until level 30", "Needs a Soul Shard to summon"],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ]
        }
      ]
    },
    {
      "id": "professions",
      "title": "Which two main professions?",
      "phase": "leveling",
      "topic": "build",
      "order": 3,
      "deadline": null,
      "kind": "choice",
      "maxPicks": 2,
      "options": [
        {
          "id": "tailoring",
          "name": "Tailoring",
          "pros": ["Crafts cloth gear and bags for a cloth wearer"],
          "cons": ["Eats a lot of cloth to level"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "enchanting",
          "name": "Enchanting",
          "pros": ["Disenchants unwanted gear and enchants your own"],
          "cons": ["Expensive to level without a gold source"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "alchemy",
          "name": "Alchemy",
          "pros": ["Potions and flasks for yourself"],
          "cons": ["Needs a steady herb supply"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "herbalism",
          "name": "Herbalism",
          "pros": ["Gathering that sells well and feeds Alchemy"],
          "cons": ["Gathering only, nothing crafted for you"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "mining",
          "name": "Mining",
          "pros": ["Gathering that feeds Engineering and Blacksmithing"],
          "cons": ["Gathering only, nothing crafted for you"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "engineering",
          "name": "Engineering",
          "pros": ["Gadgets and utility items"],
          "cons": ["Needs ore and other parts"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "skinning",
          "name": "Skinning",
          "pros": ["Gathering from the creatures you already kill while leveling"],
          "cons": ["Gathering only, nothing crafted for you"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "leatherworking",
          "name": "Leatherworking",
          "pros": ["Crafts leather items, pairs with Skinning"],
          "cons": ["A Warlock wears cloth, so little for you directly"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        },
        {
          "id": "blacksmithing",
          "name": "Blacksmithing",
          "pros": ["Crafts weapons and metal items"],
          "cons": ["A Warlock wears cloth, so little for you directly"],
          "links": [{ "label": "forever-ref (client recipe data)", "url": "https://github.com/alcaras/forever-ref" }],
          "note": "Classic Era knowledge, not yet checked against the Forever recipe data."
        }
      ]
    },
    {
      "id": "route",
      "title": "Which leveling route?",
      "phase": "leveling",
      "topic": "build",
      "order": 4,
      "deadline": null,
      "kind": "choice",
      "maxPicks": 1,
      "options": [
        {
          "id": "restedxp",
          "name": "Follow RestedXP's free Forever Horde guides",
          "pros": ["The forever-ref route builder points at it as the route source people use (secondary)"],
          "cons": ["Not opened or checked yet"],
          "links": [{ "label": "forever-ref", "url": "https://github.com/alcaras/forever-ref" }]
        },
        {
          "id": "zone-order",
          "name": "Zone order from the research",
          "pros": [
            "Covers the new Riverglades (around levels 35 to 45) and Shen'dralas",
            "Starts in Durotar or Tirisfal Glades, then the Barrens and Silverpine, Stonetalon, Ashenvale, Hillsbrad, Thousand Needles"
          ],
          "cons": [
            "Secondary sources only, and the sites may not be independent",
            "The Shen'dralas level range has not been announced"
          ],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            }
          ]
        }
      ]
    },
    {
      "id": "dungeons",
      "title": "Which dungeons while leveling?",
      "phase": "leveling",
      "topic": "build",
      "order": 5,
      "deadline": null,
      "kind": "choice",
      "maxPicks": 3,
      "options": [
        {
          "id": "quest-only",
          "name": "Quest only, no dungeons",
          "pros": ["Fully solo and on your own schedule"],
          "cons": ["Skips the new dungeon rewards and quests"],
          "links": []
        },
        {
          "id": "ruins",
          "name": "Ruins of Lordaeron (levels 15 to 20)",
          "pros": ["The new Horde-only dungeon"],
          "cons": ["Needs a group; level range varies by source (11 to 24 in one)"],
          "links": [
            {
              "label": "Warlock research",
              "url": "https://github.com/Radulovic82/wow-forever-planner/blob/research/warlock-choices/research/warlock-choices.md"
            },
            { "label": "Blizzard what's next recap", "url": "https://news.blizzard.com/en-us/article/24303862/world-of-warcraft-forever-whats-next-panel-recap" }
          ]
        },
        {
          "id": "mid-dungeons",
          "name": "Mid-level new dungeons (levels 24 to 45)",
          "pros": [
            "Excavation Site (24 to 29), City of Dalaran (28 to 33), The Drowned City (35 to 40), Krol'dok Stronghold (40 to 45)",
            "Open to both factions"
          ],
          "cons": ["Levels are from a secondary table", "Needs groups"],
          "links": [
            { "label": "Blizzard what's next recap", "url": "https://news.blizzard.com/en-us/article/24303862/world-of-warcraft-forever-whats-next-panel-recap" }
          ]
        }
      ]
    },
    {
      "id": "legacy",
      "title": "How to spend the Legacy points?",
      "phase": "leveling",
      "topic": "build",
      "order": 6,
      "deadline": null,
      "kind": "choice",
      "maxPicks": 4,
      "options": [
        {
          "id": "talented",
          "name": "Talented",
          "pros": ["Talent points start earlier, from level 9 down to level 5 at 5/5"],
          "cons": ["Costs points that other perks also want (16 to spend)"],
          "links": [
            { "label": "Blizzard Legacy post", "url": "https://worldofwarcraft.blizzard.com/en-us/news/24307383/get-to-know-the-world-of-warcraft-forever-legacy-system" }
          ]
        },
        {
          "id": "well-rested",
          "name": "Well Rested",
          "pros": ["Rested XP builds 4% faster per rank, up to 20%"],
          "cons": ["Only helps when you log out and come back"],
          "links": [
            { "label": "Blizzard Legacy post", "url": "https://worldofwarcraft.blizzard.com/en-us/news/24307383/get-to-know-the-world-of-warcraft-forever-legacy-system" }
          ]
        },
        {
          "id": "field-guide",
          "name": "Field Guide",
          "pros": ["Named in the Adventure tree of the data export"],
          "cons": ["Effect not read yet"],
          "links": [{ "label": "Talents Forever data", "url": "https://talentsforever.com/data.json" }],
          "note": "Unverified: what it does. Read the Legacy data before choosing."
        },
        {
          "id": "frequent-flier",
          "name": "Frequent Flier",
          "pros": ["Named in the Adventure tree of the data export"],
          "cons": ["Effect not read yet"],
          "links": [{ "label": "Talents Forever data", "url": "https://talentsforever.com/data.json" }],
          "note": "Unverified: what it does. Read the Legacy data before choosing. Legacy unlocks at level 25, 150 in a non-gathering profession, or exploring the whole map."
        }
      ]
    }
  ]
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS. If validation fails, fix the JSON entry named in the error message, not the validator.

- [ ] **Step 5: Commit**

```bash
git add data/catalog.json tests/catalog-data.test.js
git commit -m "add the catalog of ten decisions"
```

---

### Task 6: Firebase layer (config, store, rules)

**Files:**
- Create: `js/config.js` (generated)
- Create: `js/store.js`
- Create: `firestore.rules`

**Interfaces:**
- Consumes: `mergeDecision` from `js/catalog.js`; `.local/firebase-config.json`.
- Produces from `js/config.js`: `firebaseConfig: object`, `OWNER_UID: string` (empty until bootstrap).
- Produces from `js/store.js`:
  - `watchAuth(cb: (user: { uid: string } | null) => void) -> unsubscribe`
  - `signInWithGoogle() -> Promise<void>`
  - `signOutUser() -> Promise<void>`
  - `subscribeDecisions(onData: (decisions[]) => void, onError: (Error) => void) -> unsubscribe`. Each decision has `deadline` as an ISO string or `null`, plus `id`.
  - `saveOwnerState(id: string, state: { status, chosen, answer, reason }) -> Promise<void>`
  - `importDecisions(decisions: NormalizedDecision[], existingById: Map<string, object>) -> Promise<{ created: number, updated: number, revisit: number }>`

This module cannot be unit tested without the network. It is checked by the structure test in Task 8 and by the live checks in Task 9.

- [ ] **Step 1: Generate `js/config.js` from the local file**

Run:
```bash
cd ~/projects/wow-forever-planner && node --input-type=module -e "
import fs from 'node:fs';
const c = JSON.parse(fs.readFileSync('.local/firebase-config.json', 'utf8'));
fs.writeFileSync('js/config.js',
  '// Public identifiers by design. The Firestore rules protect the data.\n' +
  'export const firebaseConfig = ' + JSON.stringify(c, null, 2) + ';\n\n' +
  '// Filled in during bootstrap (Task 9), after the first sign-in shows the user ID.\n' +
  'export const OWNER_UID = \"\";\n');
"
head -3 js/config.js
```
Expected: the first line is the comment, and `git check-ignore .local/firebase-config.json` still prints the path.

- [ ] **Step 2: Write `js/store.js`**

```js
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  setDoc,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js';
import { firebaseConfig } from './config.js';
import { mergeDecision } from './catalog.js';

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const decisionsRef = collection(db, 'decisions');

export function watchAuth(cb) {
  return onAuthStateChanged(auth, (user) => cb(user ? { uid: user.uid } : null));
}

export async function signInWithGoogle() {
  await signInWithPopup(auth, new GoogleAuthProvider());
}

export function signOutUser() {
  return signOut(auth);
}

function fromDoc(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    title: data.title ?? '',
    phase: data.phase ?? '',
    topic: data.topic ?? '',
    order: data.order ?? 0,
    deadline: data.deadline ? data.deadline.toDate().toISOString() : null,
    kind: data.kind ?? 'choice',
    maxPicks: data.maxPicks ?? 1,
    options: data.options ?? [],
    status: data.status ?? 'open',
    chosen: data.chosen ?? [],
    answer: data.answer ?? '',
    reason: data.reason ?? '',
  };
}

export function subscribeDecisions(onData, onError) {
  return onSnapshot(decisionsRef, (snap) => onData(snap.docs.map(fromDoc)), onError);
}

export async function saveOwnerState(id, state) {
  await setDoc(
    doc(db, 'decisions', id),
    {
      status: state.status,
      chosen: state.chosen,
      answer: state.answer,
      reason: state.reason,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function importDecisions(decisions, existingById) {
  const batch = writeBatch(db);
  const tally = { created: 0, updated: 0, revisit: 0 };
  for (const incoming of decisions) {
    const { create, data } = mergeDecision(existingById.get(incoming.id) ?? null, incoming);
    const payload = {
      ...data,
      deadline: data.deadline ? Timestamp.fromDate(new Date(data.deadline)) : null,
      updatedAt: serverTimestamp(),
    };
    batch.set(doc(db, 'decisions', incoming.id), payload, { merge: !create });
    if (create) tally.created += 1;
    else tally.updated += 1;
    if (data.status === 'revisit') tally.revisit += 1;
  }
  await batch.commit();
  return tally;
}
```

- [ ] **Step 3: Write `firestore.rules`**

The string `OWNER_UID_GOES_HERE` is the one value that cannot exist yet. Task 9 replaces it with the real user ID after Filip's first sign-in.

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /decisions/{id} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == 'OWNER_UID_GOES_HERE';
    }
  }
}
```

- [ ] **Step 4: Check the syntax of the modules that Node can parse**

Run: `node --check js/store.js && node --check js/config.js && echo syntax-ok`
Expected: `syntax-ok`. (`--check` parses without running or fetching the CDN.)

- [ ] **Step 5: Commit**

```bash
git add js/config.js js/store.js firestore.rules
git commit -m "firebase layer, config and rules"
```

---

### Task 7: View, page shell and styles

**Files:**
- Create: `js/view.js`
- Create: `index.html`
- Create: `css/style.css`
- Create: `dev/preview.html`

**Interfaces:**
- Consumes: `formatDeadline` from `js/countdown.js`; `PHASES, groupByPhase, phaseProgress, deadlineInfo, nextUp` from `js/phases.js`; `togglePick` from `js/picks.js`.
- Produces from `js/view.js`:
  - `updateCountdown(cd: { live, days, hours, minutes, seconds })`
  - `renderNextUp(container: HTMLElement, decisions, nowMs: number, onOpen: (id: string) => void)`
  - `renderPhases(container: HTMLElement, decisions, ctx)` where `ctx = { isOwner: boolean, expanded: Set<string>, drafts: Map<string, {status, chosen, answer, reason}>, errors: Map<string, string>, nowMs: number, onToggle(id), onDraft(id, patch, rerender: boolean), onSave(id) }`
  - `renderOwnerPanel(container: HTMLElement, opts: { user: {uid}|null, isOwner: boolean, onImport(), onSignOut() })`
- Required element ids in `index.html`: `countdown`, `countdown-note`, `launch-label`, `next-up`, `empty-note`, `status-msg`, `phases`, `auth-btn`, `owner-panel`, `import-file`. The four numbers carry `data-unit="days|hours|minutes|seconds"`.

- [ ] **Step 1: Write `js/view.js`**

```js
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
```

- [ ] **Step 2: Write `index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>WoW Forever Planner</title>
    <meta name="description" content="Horde Warlock planning for World of Warcraft: Forever, with a countdown to launch." />
    <link rel="stylesheet" href="css/style.css" />
  </head>
  <body>
    <header class="hero">
      <p class="eyebrow">World of Warcraft: Forever</p>
      <h1>Horde Warlock planner</h1>
      <div id="countdown" class="countdown" role="timer" aria-label="Countdown to launch">
        <div class="unit"><span class="num" data-unit="days">--</span><span class="lbl">days</span></div>
        <div class="unit"><span class="num" data-unit="hours">--</span><span class="lbl">hours</span></div>
        <div class="unit"><span class="num" data-unit="minutes">--</span><span class="lbl">minutes</span></div>
        <div class="unit"><span class="num" data-unit="seconds">--</span><span class="lbl">seconds</span></div>
      </div>
      <p id="countdown-note" class="countdown-note">until WoW Forever launches</p>
      <p class="launch-line">Launch: <strong id="launch-label"></strong></p>
    </header>

    <main>
      <section id="next-up" class="next-up"></section>
      <div id="status-msg" class="msg" role="status" hidden></div>
      <p id="empty-note" class="empty" hidden>Nothing here yet.</p>
      <div id="phases"></div>
    </main>

    <footer>
      <button id="auth-btn" class="link" type="button">Sign in with Google</button>
      <div id="owner-panel" class="owner-panel" hidden></div>
      <input id="import-file" type="file" accept="application/json,.json" hidden />
    </footer>

    <script type="module" src="js/app.js"></script>
  </body>
</html>
```

- [ ] **Step 3: Write `css/style.css`**

```css
:root {
  --bg: #120b0b;
  --panel: #1d1313;
  --panel-2: #271919;
  --line: #3a2626;
  --text: #efe6e1;
  --muted: #a89a94;
  --red: #c8102e;
  --red-soft: #e05a6d;
  --gold: #d8b45a;
  --green: #6fb98f;
  --radius: 10px;
}
@media (prefers-color-scheme: light) {
  :root {
    --bg: #f6efe9;
    --panel: #ffffff;
    --panel-2: #f1e6dd;
    --line: #dccbbd;
    --text: #231615;
    --muted: #6b5a53;
    --red: #a30c25;
    --red-soft: #a30c25;
    --gold: #8a6a14;
    --green: #2f7a53;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font: 16px/1.5 system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  padding: 0 16px 48px;
}
main, footer, .hero { max-width: 860px; margin: 0 auto; }
button { font: inherit; color: inherit; cursor: pointer; }
.link { background: none; border: 0; padding: 0; color: var(--red-soft); text-decoration: underline; text-align: left; }
h1, h2, h3, h4 { line-height: 1.2; margin: 0; }

.hero { text-align: center; padding: 32px 0 16px; }
.eyebrow { margin: 0; color: var(--gold); letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.8rem; }
.hero h1 { font-size: clamp(1.6rem, 5vw, 2.4rem); margin: 6px 0 20px; }
.countdown { display: flex; justify-content: center; gap: clamp(8px, 3vw, 24px); }
.unit { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 12px 8px; min-width: 64px; flex: 1; max-width: 140px; }
.num { display: block; font-size: clamp(2rem, 11vw, 4.2rem); font-weight: 800; font-variant-numeric: tabular-nums; color: var(--red-soft); line-height: 1; }
.lbl { display: block; margin-top: 6px; color: var(--muted); font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; }
.countdown-note { color: var(--muted); margin: 12px 0 4px; }
.launch-line { margin: 0; }

main { padding-top: 16px; }
.next-up h2, .phase-head h2 { font-size: 1.15rem; }
.next-list { list-style: none; padding: 0; margin: 8px 0 16px; display: grid; gap: 8px; }
.next-list li { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; display: grid; gap: 2px; }
.next-list li.urgent { border-color: var(--red); }
.when { font-weight: 700; }
.when-abs { color: var(--muted); font-size: 0.85rem; }

.msg { padding: 10px 12px; border-radius: var(--radius); border: 1px solid var(--line); background: var(--panel); margin: 12px 0; }
.msg.error { border-color: var(--red); }
.msg.ok { border-color: var(--green); }
.msg ul { margin: 6px 0 0; padding-left: 20px; }
.empty { color: var(--muted); text-align: center; padding: 24px 0; }

.phase { margin: 24px 0; }
.phase-head { display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 12px; margin-bottom: 8px; }
.range, .progress { color: var(--muted); font-size: 0.85rem; }
.placeholder { color: var(--muted); font-style: italic; margin: 4px 0; }

.card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); margin: 8px 0; }
.card.status-decided { border-left: 4px solid var(--green); }
.card.status-revisit { border-left: 4px solid var(--gold); }
.card-head { width: 100%; text-align: left; background: none; border: 0; padding: 12px; display: grid; gap: 6px; }
.card-title { font-weight: 700; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 0.75rem; padding: 2px 8px; border-radius: 999px; background: var(--panel-2); border: 1px solid var(--line); }
.chip-decided { color: var(--green); }
.chip-revisit { color: var(--gold); }
.chip-deadline.urgent { color: var(--red-soft); border-color: var(--red); }
.summary { color: var(--gold); }
.card-body { padding: 0 12px 12px; display: grid; gap: 12px; }
.options { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
.options .hint { grid-column: 1 / -1; margin: 0; }
.option { background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--radius); padding: 10px 12px; display: grid; gap: 6px; align-content: start; }
.option.picked { border-color: var(--green); }
.tick { color: var(--green); font-weight: 400; font-size: 0.85rem; }
.option ul { margin: 0; padding-left: 18px; }
.pros li::marker { content: '+ '; color: var(--green); }
.cons li::marker { content: '- '; color: var(--red-soft); }
.note { margin: 0; color: var(--muted); font-size: 0.85rem; font-style: italic; }
.links { margin: 0; display: flex; flex-wrap: wrap; gap: 4px 12px; font-size: 0.85rem; }
.links a { color: var(--red-soft); }
.hint { color: var(--muted); font-size: 0.85rem; }
.answer, .reason { margin: 0; }

.field { display: grid; gap: 4px; font-size: 0.85rem; color: var(--muted); }
.field.inline { display: flex; align-items: center; gap: 8px; }
textarea, select { font: inherit; color: var(--text); background: var(--bg); border: 1px solid var(--line); border-radius: 6px; padding: 8px; width: 100%; }
.field.inline select { width: auto; }
.owner-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.pick, .save, .owner-panel button:not(.link) { background: var(--red); color: #fff; border: 0; border-radius: 6px; padding: 8px 14px; }
.error { margin: 0; color: var(--red-soft); font-weight: 600; }

footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid var(--line); color: var(--muted); font-size: 0.9rem; display: grid; gap: 8px; }
.owner-panel { display: grid; gap: 8px; justify-items: start; }
.owner-panel code { word-break: break-all; background: var(--panel); border: 1px solid var(--line); padding: 4px 8px; border-radius: 6px; color: var(--text); }
[hidden] { display: none !important; }
```

- [ ] **Step 4: Write `dev/preview.html`**

This renders the real catalog through the real view with fake owner state and no Firebase, so the design can be checked and screenshotted before bootstrap.

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Preview</title>
    <link rel="stylesheet" href="../css/style.css" />
  </head>
  <body>
    <header class="hero">
      <p class="eyebrow">World of Warcraft: Forever</p>
      <h1>Horde Warlock planner</h1>
      <div id="countdown" class="countdown">
        <div class="unit"><span class="num" data-unit="days">--</span><span class="lbl">days</span></div>
        <div class="unit"><span class="num" data-unit="hours">--</span><span class="lbl">hours</span></div>
        <div class="unit"><span class="num" data-unit="minutes">--</span><span class="lbl">minutes</span></div>
        <div class="unit"><span class="num" data-unit="seconds">--</span><span class="lbl">seconds</span></div>
      </div>
      <p id="countdown-note" class="countdown-note"></p>
      <p class="launch-line">Launch: <strong id="launch-label"></strong></p>
    </header>
    <main>
      <section id="next-up" class="next-up"></section>
      <div id="phases"></div>
    </main>
    <script type="module">
      import { getCountdown, formatZagreb, LAUNCH_MS } from '../js/countdown.js';
      import { validateCatalog } from '../js/catalog.js';
      import * as view from '../js/view.js';

      const params = new URLSearchParams(location.search);
      const owner = params.get('owner') === '1';
      const json = await (await fetch('../data/catalog.json')).json();
      const decisions = validateCatalog(json).decisions.map((d) => ({
        ...d, status: 'open', chosen: [], answer: '', reason: '',
      }));
      decisions.find((d) => d.id === 'race').status = 'decided';
      decisions.find((d) => d.id === 'race').chosen = ['orc'];
      decisions.find((d) => d.id === 'race').reason = 'Blood Fury.';

      const expanded = new Set(params.get('open') ? params.get('open').split(',') : []);
      const drafts = new Map();
      const errors = new Map();
      function render() {
        const ctx = {
          isOwner: owner, expanded, drafts, errors, nowMs: Date.now(),
          onToggle(id) { expanded.has(id) ? expanded.delete(id) : expanded.add(id); render(); },
          onDraft(id, patch, again) {
            const d = decisions.find((x) => x.id === id);
            const cur = drafts.get(id) || { status: d.status, chosen: d.chosen, answer: d.answer, reason: d.reason };
            drafts.set(id, { ...cur, ...patch });
            if (again) render();
          },
          onSave() {},
        };
        view.renderNextUp(document.getElementById('next-up'), decisions, Date.now(), (id) => { expanded.add(id); render(); });
        view.renderPhases(document.getElementById('phases'), decisions, ctx);
      }
      document.getElementById('launch-label').textContent = formatZagreb(LAUNCH_MS);
      view.updateCountdown(getCountdown(Date.now()));
      setInterval(() => view.updateCountdown(getCountdown(Date.now())), 1000);
      render();
    </script>
  </body>
</html>
```

- [ ] **Step 5: Serve it and look at it on a phone-sized and a desktop-sized screen**

Run:
```bash
cd ~/projects/wow-forever-planner && python3 -m http.server 8080 >/tmp/wfp-server.log 2>&1 &
sleep 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SHOTS=/private/tmp/claude-501/-Users-filip/78236f56-4ef0-4f1d-990b-be3a45712c15/scratchpad
"$CHROME" --headless=new --disable-gpu --user-data-dir=$SHOTS/shot-profile --window-size=390,1400 --virtual-time-budget=4000 --screenshot=$SHOTS/preview-phone.png "http://localhost:8080/dev/preview.html?open=pack,race"
"$CHROME" --headless=new --disable-gpu --user-data-dir=$SHOTS/shot-profile --window-size=1100,1400 --virtual-time-budget=4000 --screenshot=$SHOTS/preview-desktop-owner.png "http://localhost:8080/dev/preview.html?owner=1&open=names,professions"
```
Then read both PNGs with the Read tool.
Expected: the countdown hero is at the top with four boxes and the line `Launch: Thu 5 Nov 2026, 00:00 Zagreb time`; "Next up" lists Pack and Race-dependent deadlines (race is decided so it is absent); phases show `0 of 3 decided` style progress; the phone view has no horizontal scroll; the owner view shows Pick buttons, text areas and a Save button. Fix any visual problem in `css/style.css` and re-run. Stop the server afterwards with `kill %1`.

- [ ] **Step 6: Commit**

```bash
git add js/view.js index.html css/style.css dev/preview.html
git commit -m "view, page and styles"
```

---

### Task 8: App wiring and structure tests

**Files:**
- Create: `js/app.js`
- Test: `tests/structure.test.js`

**Interfaces:**
- Consumes: everything above. `store.js` is imported only through `import('./store.js')`.
- Produces: the running page. State object `{ decisions, user, store, loaded, expanded, drafts, errors }`.

- [ ] **Step 1: Write the failing structure test `tests/structure.test.js`**

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../js/${name}`, import.meta.url), 'utf8');

for (const name of ['countdown.js', 'phases.js', 'picks.js', 'catalog.js', 'view.js']) {
  test(`${name} stays free of the data service and remote imports`, () => {
    const src = read(name);
    assert.doesNotMatch(src, /store\.js/);
    assert.doesNotMatch(src, /from\s+['"]https?:/);
  });
}

test('app.js loads the data service only through a dynamic import', () => {
  const src = read('app.js');
  assert.doesNotMatch(src, /^\s*import\b[^;]*['"]\.\/store\.js['"]/m);
  assert.match(src, /import\(\s*['"]\.\/store\.js['"]\s*\)/);
});

test('app.js starts the countdown before it loads the data service', () => {
  const src = read('app.js');
  assert.ok(src.indexOf('setInterval(tick') !== -1);
  assert.ok(src.indexOf('setInterval(tick') < src.indexOf("import('./store.js')"));
});

for (const name of ['view.js', 'app.js']) {
  test(`${name} never injects raw HTML`, () => {
    assert.doesNotMatch(read(name), /innerHTML|outerHTML|insertAdjacentHTML|document\.write/);
  });
}

test('config.js holds an owner id constant', () => {
  assert.match(read('config.js'), /export const OWNER_UID = "[^"]*";/);
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npm test`
Expected: FAIL, ENOENT `js/app.js`.

- [ ] **Step 3: Write `js/app.js`**

```js
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
```

- [ ] **Step 4: Run the tests and confirm they pass**

Run: `npm test`
Expected: PASS, every suite including `structure.test.js`.

- [ ] **Step 5: Check the real page loads without script errors**

Run:
```bash
cd ~/projects/wow-forever-planner && python3 -m http.server 8080 >/tmp/wfp-server.log 2>&1 &
sleep 1
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
SHOTS=/private/tmp/claude-501/-Users-filip/78236f56-4ef0-4f1d-990b-be3a45712c15/scratchpad
"$CHROME" --headless=new --disable-gpu --user-data-dir=$SHOTS/shot-profile --window-size=390,900 --virtual-time-budget=8000 --screenshot=$SHOTS/app-live.png "http://localhost:8080/"
kill %1
```
Read `app-live.png`.
Expected: the countdown hero is ticking-ready and the launch line reads `Thu 5 Nov 2026, 00:00 Zagreb time`. Below it a red message says `Could not read the decisions: Missing or insufficient permissions` (the rules are still locked until Task 9) and the footer shows `Sign in with Google`. That message is correct at this stage. Any other error means a bug in `app.js` or `store.js`.

- [ ] **Step 6: Commit**

```bash
git add js/app.js tests/structure.test.js
git commit -m "wire up the app"
```

---

### Task 9: README, deploy and bootstrap

**Files:**
- Modify: `README.md`
- Modify: `js/config.js` (set `OWNER_UID`)
- Modify: `firestore.rules` (set the user ID)

**Interfaces:**
- Consumes: the finished site and `data/catalog.json`.
- Produces: the live site at `https://radulovic82.github.io/wow-forever-planner/` with the catalog imported.

Steps 4, 6, 7 and 9 need Filip in his own browser.

- [ ] **Step 1: Replace `README.md`**

```markdown
# WoW Forever Planner

A temporary planning site for playing a Horde Warlock in World of Warcraft: Forever, with a countdown to launch (00:00 Thu 5 Nov 2026, Zagreb time).

Live: https://radulovic82.github.io/wow-forever-planner/

Static site on GitHub Pages, Firestore for the decisions. Only the owner can edit, everyone can read.

- Spec: `docs/superpowers/specs/2026-10-05-wow-forever-planner-design.md`
- Plan: `docs/superpowers/plans/2026-10-05-wow-forever-planner.md`
- Glossary: `CONTEXT.md`
- Tests: `npm test`
- Preview without Firebase: serve the folder and open `dev/preview.html` (add `?owner=1` for the edit view)

When it is over: delete the Firebase project and archive the repo.
```

- [ ] **Step 2: Run the whole test suite, then push**

Run: `cd ~/projects/wow-forever-planner && npm test && git add README.md && git commit -m "readme" && git push origin main`
Expected: all tests pass, push succeeds.

- [ ] **Step 3: Turn on GitHub Pages**

Run:
```bash
gh api -X POST repos/Radulovic82/wow-forever-planner/pages -f "source[branch]=main" -f "source[path]=/" --jq '.html_url'
```
Expected: prints `https://radulovic82.github.io/wow-forever-planner/`. Then poll until it is live:
```bash
for i in $(seq 1 30); do code=$(curl -s -o /dev/null -w '%{http_code}' https://radulovic82.github.io/wow-forever-planner/); echo $code; [ "$code" = 200 ] && break; sleep 10; done
```
Expected: ends with `200`.

- [ ] **Step 4: Filip signs in once and reads his user ID (Filip does this)**

Ask Filip to open the live URL in his browser, click `Sign in with Google`, and choose `filipradulovic1@gmail.com`. The footer then shows "Signed in, read only." and a user ID in a box. Filip pastes that ID into the chat.
Expected: a string of about 28 characters. If the popup is blocked or says the domain is not authorized, re-check Firebase Authentication, Settings, Authorized domains for `radulovic82.github.io`.

- [ ] **Step 5: Put the user ID into the config and the rules**

With `<UID>` being the exact string Filip pasted:
```bash
cd ~/projects/wow-forever-planner
sed -i '' 's|export const OWNER_UID = "";|export const OWNER_UID = "<UID>";|' js/config.js
sed -i '' "s|OWNER_UID_GOES_HERE|<UID>|" firestore.rules
grep -n "OWNER_UID" js/config.js; grep -n "auth.uid" firestore.rules
npm test
```
Expected: both files show the real ID, the tests still pass.

- [ ] **Step 6: Publish the rules (Filip does this)**

Ask Filip to open the Firebase console, go to Firestore Database, Rules, replace the contents with the text of `firestore.rules` (print it with `cat firestore.rules`), and click Publish.

- [ ] **Step 7: Check the rules in the Rules Playground (Filip does this)**

In the Rules tab, open the Rules Playground and run these four simulations on the path `/databases/(default)/documents/decisions/test`:
1. `get`, unauthenticated: expected Allow.
2. `create`, unauthenticated: expected Deny.
3. `create`, authenticated with some other user ID such as `someone-else`: expected Deny.
4. `create`, authenticated with Filip's user ID: expected Allow.

If any result differs, fix `firestore.rules` and publish again before continuing.

- [ ] **Step 8: Commit and push the config**

```bash
git add js/config.js firestore.rules
git commit -m "set owner id"
git push origin main
```
Wait for Pages to rebuild (re-run the polling loop from Step 3, then wait about 30 seconds more).

- [ ] **Step 9: Import the catalog and check the site (Filip does this)**

Ask Filip to reload the live site, sign in again, and confirm the footer now says "Signed in as the owner." with `Import catalog` and `Sign out` buttons. He clicks `Import catalog` and selects `data/catalog.json` from the repo. Expected: a green message `Imported. 10 created, 0 updated, 0 marked revisit.` and ten cards under three phases, with Endgame showing "TBD, too far away."
Then walk the manual checklist, ticking each:
- [ ] A private window (not signed in) shows the same cards with no Pick, Save or Import controls.
- [ ] Pick Orc on the race card, set status to decided, add a reason, Save: it persists after a reload and shows in a private window.
- [ ] Marking `pack` decided with nothing picked shows "Pick an option before marking this decided."
- [ ] Import again: the message says `0 created, 10 updated`, and the Orc pick, status and reason are still there.
- [ ] Phone width: no horizontal scroll, readable cards, countdown fits.
- [ ] The launch line reads `Thu 5 Nov 2026, 00:00 Zagreb time`, and the seconds tick.
- [ ] Switching Wi-Fi off and reloading still shows the countdown (cached) or at least the shell with a clear message.

- [ ] **Step 10: Tidy the map**

Run: `gh issue comment 1 --body "Built and live at https://radulovic82.github.io/wow-forever-planner/. Catalog imported." && gh issue close 1`
Expected: the map issue closes. Also update the memory note for this project with the live URL and that the build is done.

---

## Self-review

**Spec coverage**
- Section 2 launch facts and the constant: Task 1 (`LAUNCH_MS`, Zagreb label tests).
- Section 3 scope and out-of-scope: no tasks add voting, backend code or notifications; Tasks 6 to 9 cover read, sign-in, import and owner edits.
- Section 4 architecture and units: file structure plus Tasks 1 to 8 (`countdown`, `catalog`, `store`, `view`, with `phases`, `picks` and `app` added as small pure helpers).
- Section 5 data model: Task 4 normalizes exactly those fields; Task 6 stores them with `deadline` as a Firestore timestamp and `updatedAt` as a server timestamp.
- Section 6 security rules: Task 6 writes `firestore.rules`; Task 9 sets the ID and tests it in the Rules Playground.
- Section 7 bootstrap order: Task 9 Steps 4 to 9.
- Section 8 import rules (validate first, refuse whole file, never overwrite owner state, `revisit` on removed option, re-runnable): Task 4 tests and Task 8 `runImport`.
- Section 9 catalog: Task 5.
- Section 10 interface (hero, next-up strip, phase sections with progress, cards, owner controls, responsive, Zagreb times): Task 7 and Task 8.
- Section 11 error handling: Task 8 `app.js` messages (read denied, load failure, write failure keeps the draft, invalid import, empty collection) and the dynamic import.
- Section 12 testing: unit tests in Tasks 1 to 5 and 8, rules check and manual checklist in Task 9.
- Section 13 deployment and cleanup: Task 9 and the README.
- Section 14 open items: carried into the catalog `note` fields and not turned into tasks.

**Placeholder scan:** the only deliberate placeholder is `OWNER_UID_GOES_HERE` in `firestore.rules`, and `<UID>` in Task 9 Step 5. The user ID does not exist until Filip signs in, so Task 9 Steps 4 and 5 fill both. No "TBD" or "similar to Task N" appears in task steps.

**Type consistency:** `getCountdown`, `formatZagreb`, `formatDeadline` (Task 1) match their use in `view.js` and `app.js`. `nextUp`, `deadlineInfo`, `groupByPhase`, `phaseProgress`, `PHASES` (Task 2) match `view.js`. `togglePick` and `ownerStateError` (Task 3) match `view.js` and `app.js`. `validateCatalog` and `mergeDecision` (Task 4) match `app.js`, `store.js` and the data test. Store function names (`watchAuth`, `signInWithGoogle`, `signOutUser`, `subscribeDecisions`, `saveOwnerState`, `importDecisions`) match their callers in `app.js`. The decision field names are the same in the catalog, the validator, the store and the view.

**Review Focus:** items 1 and 6 are pinned in Tasks 1 and 2, items 2, 3 and 7 in Tasks 4 and 3, and items 4 and 5 in Task 8.
