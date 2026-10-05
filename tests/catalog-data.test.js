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
