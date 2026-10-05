import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (name) => readFileSync(new URL(`../js/${name}`, import.meta.url), 'utf8');

for (const name of ['countdown.js', 'phases.js', 'picks.js', 'catalog.js', 'importer.js', 'view.js']) {
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

test('app.js imports through runCatalogImport and never builds the existing set from its own state', () => {
  const src = read('app.js');
  assert.match(src, /runCatalogImport/);
  assert.doesNotMatch(src, /new Map\(state\.decisions/);
});

test('app.js scrolls a new message into view so the owner sees import feedback', () => {
  assert.match(read('app.js'), /function setMessage[\s\S]*?scrollIntoView/);
});

test('store.js reads the existing documents from the server, not from the cache', () => {
  assert.match(read('store.js'), /getDocsFromServer/);
});
