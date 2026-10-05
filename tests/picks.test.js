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
