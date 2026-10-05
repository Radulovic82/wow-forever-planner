import test from 'node:test';
import assert from 'node:assert/strict';
import { togglePick, ownerStateError, danglingChoices, pruneChosen, conclusion, phaseSummary } from '../js/picks.js';

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

const pro = { kind: 'choice', maxPicks: 2, options: [{ id: 'alchemy' }, { id: 'mining' }, { id: 'tailoring' }] };

test('danglingChoices lists chosen ids that are no longer offered', () => {
  assert.deepEqual(danglingChoices(pro, ['alchemy', 'removed']), ['removed']);
  assert.deepEqual(danglingChoices(pro, ['alchemy']), []);
});

test('pruneChosen drops ids that are no longer offered and keeps the rest in order', () => {
  assert.deepEqual(pruneChosen(pro, ['removed', 'mining', 'alchemy']), ['mining', 'alchemy']);
});

test('after pruning, a full multi-pick decision accepts a new pick again', () => {
  const chosen = ['alchemy', 'removed']; // full at maxPicks 2, one of them dangling
  assert.deepEqual(togglePick(chosen, 'mining', 2), ['alchemy', 'removed']); // stuck without pruning
  assert.deepEqual(togglePick(pruneChosen(pro, chosen), 'mining', 2), ['alchemy', 'mining']);
});

test('a freeform decision keeps no choices: every chosen id is dangling', () => {
  assert.deepEqual(danglingChoices({ kind: 'freeform', options: [] }, ['orc']), ['orc']);
});

const named = {
  kind: 'choice',
  options: [{ id: 'orc', name: 'Orc' }, { id: 'troll', name: 'Troll' }],
};

test('conclusion of a choice is the names of the picked options in pick order', () => {
  assert.equal(conclusion(named, { chosen: ['troll', 'orc'], answer: '' }), 'Troll, Orc');
});

test('conclusion of a freeform decision is the trimmed written answer', () => {
  assert.equal(conclusion({ kind: 'freeform', options: [] }, { chosen: [], answer: '  Zarg  ' }), 'Zarg');
});

test('conclusion falls back to the id when the option is no longer offered', () => {
  assert.equal(conclusion(named, { chosen: ['gnome'], answer: '' }), 'gnome');
});

test('conclusion is empty when nothing is picked or written', () => {
  assert.equal(conclusion(named, { chosen: [], answer: '' }), '');
  assert.equal(conclusion({ kind: 'freeform', options: [] }, { chosen: [], answer: '   ' }), '');
});

test('phaseSummary joins the conclusions of decided decisions in order and skips the rest', () => {
  const list = [
    { ...named, status: 'decided', chosen: ['orc'], answer: '' },
    { ...named, status: 'open', chosen: ['troll'], answer: '' },
    { kind: 'freeform', options: [], status: 'decided', chosen: [], answer: 'Zarg' },
    { kind: 'freeform', options: [], status: 'decided', chosen: [], answer: '' },
  ];
  assert.equal(phaseSummary(list), 'Orc, Zarg');
  assert.equal(phaseSummary([]), '');
});
