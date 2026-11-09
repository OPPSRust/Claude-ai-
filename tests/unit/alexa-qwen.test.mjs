import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const q = require('../../alexa-qwen/lambda/qwen.js');

const cfg = { apiKey: 'k', baseUrl: 'https://openrouter.ai/api/v1/', model: 'qwen/qwen3.5-35b-a3b', maxTokens: 50, timeoutMs: 1000 };

function fakeFetch(content, status = 200, seen = {}) {
  return async (url, opts) => {
    seen.url = url;
    seen.body = JSON.parse(opts.body);
    seen.auth = opts.headers.Authorization;
    return { ok: status < 400, status, json: async () => ({ choices: [{ message: { content } }] }) };
  };
}

test('cleans thinking and markdown for speech', () => {
  assert.equal(q.cleanForSpeech('<think>hmm</think>**Hi** there\n- one\n[link](http://x)'), 'Hi there one link');
  assert.equal(q.cleanForSpeech('Answer <think>cut off'), 'Answer');
});

test('escapes SSML-breaking characters', () => {
  assert.equal(q.escapeSsml('salt & pepper <b>'), 'salt and pepper  b ');
});

test('keeps only the newest turns', () => {
  const h = Array.from({ length: 10 }, (_, i) => ({ role: 'user', content: String(i) }));
  assert.deepEqual(q.trimHistory(h, 2).map((m) => m.content), ['6', '7', '8', '9']);
});

test('sends the question with history and turns thinking off on OpenRouter', async () => {
  const seen = {};
  const hist = [{ role: 'user', content: 'a' }, { role: 'assistant', content: 'b' }];
  const answer = await q.askQwen('why?', hist, cfg, fakeFetch('Because.', 200, seen));
  assert.equal(answer, 'Because.');
  assert.equal(seen.url, 'https://openrouter.ai/api/v1/chat/completions');
  assert.equal(seen.auth, 'Bearer k');
  assert.equal(seen.body.model, 'qwen/qwen3.5-35b-a3b');
  assert.deepEqual(seen.body.reasoning, { enabled: false });
  assert.deepEqual(seen.body.messages.map((m) => m.role), ['system', 'user', 'assistant', 'user']);
});

test('uses enable_thinking for other servers', async () => {
  const seen = {};
  await q.askQwen('x', [], { ...cfg, baseUrl: 'http://localhost:11434/v1' }, fakeFetch('ok', 200, seen));
  assert.equal(seen.body.enable_thinking, false);
  assert.equal(seen.body.reasoning, undefined);
});

test('reports clear errors', async () => {
  await assert.rejects(q.askQwen('x', [], { ...cfg, apiKey: '' }), /missing_key/);
  await assert.rejects(q.askQwen('x', [], cfg, fakeFetch('', 401)), /http_401/);
  assert.match(q.errorSpeech(new Error('missing_key')), /API key/);
  assert.match(q.errorSpeech(new Error('http_401')), /rejected/);
  const abort = new Error('x'); abort.name = 'AbortError';
  assert.match(q.errorSpeech(abort), /too long/);
});
