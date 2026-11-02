import { test } from 'node:test';
import assert from 'node:assert/strict';
import { onBoot, beginLoad, endLoad } from '../../startup-guard.js';

function memoryStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => { m.set(k, String(v)); },
    removeItem: (k) => { m.delete(k); },
  };
}

const throwingStorage = {
  getItem() { throw new Error('blocked'); },
  setItem() { throw new Error('blocked'); },
  removeItem() { throw new Error('blocked'); },
};

test('first boot auto-loads', () => {
  assert.deepEqual(onBoot(memoryStorage()), { autoLoad: true, crashedLastTime: false, crashes: 0 });
});

test('a load that never ended counts as a crash', () => {
  const s = memoryStorage();
  beginLoad(s, 1000);
  assert.deepEqual(onBoot(s), { autoLoad: false, crashedLastTime: true, crashes: 1 });
});

test('the boot after a crash stays off but is not a new crash', () => {
  const s = memoryStorage();
  beginLoad(s, 1000);
  onBoot(s);
  assert.deepEqual(onBoot(s), { autoLoad: false, crashedLastTime: false, crashes: 1 });
});

test('a successful manual load turns auto-load back on', () => {
  const s = memoryStorage();
  beginLoad(s, 1000);
  onBoot(s);
  beginLoad(s);
  endLoad(s, true);
  assert.deepEqual(onBoot(s), { autoLoad: true, crashedLastTime: false, crashes: 0 });
});

test('a load that failed with an error is not a crash', () => {
  const s = memoryStorage();
  beginLoad(s);
  endLoad(s, false);
  const r = onBoot(s);
  assert.equal(r.crashedLastTime, false);
  assert.equal(r.autoLoad, true);
});

test('download-only sessions never trip the guard', () => {
  const s = memoryStorage();
  // A download never calls beginLoad, so the next launch still auto-loads.
  assert.equal(onBoot(s).autoLoad, true);
  assert.equal(onBoot(s).autoLoad, true);
});

test('throwing storage never throws', () => {
  assert.deepEqual(onBoot(throwingStorage), { autoLoad: true, crashedLastTime: false, crashes: 0 });
  assert.doesNotThrow(() => beginLoad(throwingStorage));
  assert.doesNotThrow(() => endLoad(throwingStorage, true));
});
