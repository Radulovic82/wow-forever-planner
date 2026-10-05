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
