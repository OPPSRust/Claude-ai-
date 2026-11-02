import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conversationConfig } from '../../gemma.js';

test('thinking is switched off in every conversation', () => {
  const c = conversationConfig({ temperature: 0.7, maxOutputTokens: 200 });
  assert.equal(c.preface.extra_context.enable_thinking, false);
  assert.equal(c.sessionConfig.maxOutputTokens, 200);
  assert.equal(c.sessionConfig.samplerParams.temperature, 0.7);
});
