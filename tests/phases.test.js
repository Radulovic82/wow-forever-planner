import test from 'node:test';
import assert from 'node:assert/strict';
import { PHASES, groupByPhase, phaseProgress, deadlineInfo, nextUp, loadStatus, daysLabel, donePhases } from '../js/phases.js';

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

test('an empty answer served from the cache means the backend was not reached', () => {
  assert.equal(loadStatus(0, true), 'unreachable');
  assert.equal(loadStatus(0, false), 'ready');
  assert.equal(loadStatus(3, true), 'ready');
});

test('daysLabel says overdue, due now, or how many days are left', () => {
  assert.equal(daysLabel({ overdue: true, daysLeft: -2 }), 'overdue');
  assert.equal(daysLabel({ overdue: false, daysLeft: 0 }), 'due now');
  assert.equal(daysLabel({ overdue: false, daysLeft: 1 }), '1 day left');
  assert.equal(daysLabel({ overdue: false, daysLeft: 22 }), '22 days left');
});

test('donePhases lists phases where every decision is decided', () => {
  const list = [
    d('a', { phase: 'before-launch', status: 'decided' }),
    d('b', { phase: 'before-launch', status: 'decided' }),
    d('c', { phase: 'launch-prep', status: 'decided' }),
    d('x', { phase: 'leveling', status: 'decided' }),
    d('y', { phase: 'leveling', status: 'open' }),
    d('z', { phase: 'endgame', status: 'revisit' }),
  ];
  assert.deepEqual(donePhases(list), ['before-launch', 'launch-prep']);
});

test('donePhases ignores phases that have no decisions', () => {
  assert.deepEqual(donePhases([]), []);
});
