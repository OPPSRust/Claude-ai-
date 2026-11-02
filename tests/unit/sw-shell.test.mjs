import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (f) => fs.readFileSync(new URL('../../' + f, import.meta.url), 'utf8');
test('every module the app imports is precached for offline start', () => {
  const sw = read('sw.js');
  const mods = new Set([...(read('app.js') + read('gemma.js')).matchAll(/from '\.\/([\w-]+\.js)'/g)].map((m) => m[1]));
  for (const m of mods) assert.ok(sw.includes(`'./${m}'`), `${m} missing from sw.js SHELL`);
});
test('launch warm-up is inside the crash guard', () => {
  const boot = read('app.js').split('async function boot()')[1];
  assert.match(boot, /beginLoad\(store\);\s*await warmUp\(\);\s*endLoad\(store, true\);/);
});
