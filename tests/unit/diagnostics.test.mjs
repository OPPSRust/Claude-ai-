import { test } from 'node:test';
import assert from 'node:assert/strict';
import { logEvent, readLog, report, MAX_ENTRIES } from '../../diagnostics.js';

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

test('keeps the newest 40 entries', () => {
  const s = memoryStorage();
  for (let i = 0; i < 45; i++) logEvent(s, `s${i}`, '', 1000 + i);
  const log = readLog(s);
  assert.equal(MAX_ENTRIES, 40);
  assert.equal(log.length, 40);
  assert.equal(log[0].stage, 's5');
  assert.equal(log[39].stage, 's44');
});

test('report includes env and entries', () => {
  const text = report(
    [{ t: Date.UTC(2026, 10, 2, 5, 6, 7), stage: 'boot', detail: 'navigate' }],
    { userAgent: 'UA', url: 'https://oppsrust.github.io/Claude-ai-/', standalone: true, gpu: 'apple' },
  );
  assert.match(text, /UA/);
  assert.match(text, /standalone: yes/);
  assert.match(text, /05:06:07 boot navigate/);
});

test('throwing storage', () => {
  assert.doesNotThrow(() => logEvent(throwingStorage, 'x'));
  assert.deepEqual(readLog(throwingStorage), []);
});
