import test from 'node:test';
import assert from 'node:assert/strict';
import { runCatalogImport } from '../js/importer.js';

const opt = (id) => ({ id, name: id, pros: [], cons: [], links: [] });
const dec = (id, over = {}) => ({
  id,
  title: `${id}?`,
  phase: 'before-launch',
  topic: 'character',
  order: 1,
  kind: 'choice',
  options: [opt('orc'), opt('troll')],
  ...over,
});
const file = (...decisions) => ({ version: 1, decisions });

function deps(existing = new Map()) {
  const calls = { read: 0, commits: [] };
  return {
    calls,
    readExisting: async () => {
      calls.read += 1;
      return existing;
    },
    commit: async (writes) => {
      calls.commits.push(writes);
    },
  };
}

test('an invalid file is refused before anything is read or written', async () => {
  const d = deps();
  const out = await runCatalogImport({ version: 1, decisions: [{}] }, d);
  assert.equal(out.ok, false);
  assert.ok(out.errors.length > 0);
  assert.equal(d.calls.read, 0);
  assert.equal(d.calls.commits.length, 0);
});

test('existing documents are read fresh and their owner state is kept', async () => {
  const d = deps(new Map([['race', { status: 'decided', chosen: ['orc'], answer: '', reason: 'Blood Fury' }]]));
  const out = await runCatalogImport(file(dec('race', { title: 'Race now?' })), d);
  assert.equal(out.ok, true);
  assert.equal(d.calls.read, 1);
  const [write] = d.calls.commits[0];
  assert.equal(write.id, 'race');
  assert.equal(write.create, false);
  assert.equal(write.data.title, 'Race now?');
  for (const key of ['status', 'chosen', 'answer', 'reason']) assert.equal(key in write.data, false, key);
});

test('a document that does not exist yet is created open and empty', async () => {
  const d = deps();
  await runCatalogImport(file(dec('race')), d);
  const [write] = d.calls.commits[0];
  assert.equal(write.create, true);
  assert.equal(write.data.status, 'open');
  assert.deepEqual(write.data.chosen, []);
});

test('if the existing documents cannot be read, nothing is written', async () => {
  const calls = { commits: 0 };
  const d = {
    readExisting: async () => {
      throw new Error('offline');
    },
    commit: async () => {
      calls.commits += 1;
    },
  };
  await assert.rejects(() => runCatalogImport(file(dec('race')), d), /offline/);
  assert.equal(calls.commits, 0);
});

test('the result counts created, updated and revisit', async () => {
  const existing = new Map([
    ['race', { status: 'decided', chosen: ['gnome'] }], // gnome is not offered, so revisit
    ['pack', { status: 'open', chosen: [] }],
  ]);
  const d = deps(existing);
  const out = await runCatalogImport(file(dec('race'), dec('pack'), dec('names', { kind: 'freeform', options: [] })), d);
  assert.deepEqual({ created: out.created, updated: out.updated, revisit: out.revisit }, { created: 1, updated: 2, revisit: 1 });
});
