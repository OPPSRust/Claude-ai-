import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitOutput, CONTEXT_TOKENS } from '../../limits.js';

test('context is 3072 tokens', () => {
  assert.equal(CONTEXT_TOKENS, 3072);
});

test('a short prompt keeps the full answer length', () => {
  assert.equal(fitOutput('x'.repeat(300), 2200), 2200);
});

test('a long prompt shrinks the answer to fit the context', () => {
  assert.equal(fitOutput('x'.repeat(6000), 2200), 1008);
});

test('the answer length never drops below 256', () => {
  assert.equal(fitOutput('x'.repeat(9000), 2200), 256);
});
