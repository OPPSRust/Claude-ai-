// Talks to Qwen through an OpenAI-compatible chat API and turns the answer into speech.
const SYSTEM_PROMPT =
  'You are Qwen, a voice assistant on an Amazon Echo. Your answer is read aloud, so reply in ' +
  'plain spoken sentences: no markdown, lists, emoji, links or code. Keep it to two to four ' +
  'short sentences unless the user asks for more.';

function buildMessages(history, question) {
  return [{ role: 'system', content: SYSTEM_PROMPT }, ...history, { role: 'user', content: question }];
}

// Remove thinking blocks and markdown so Alexa reads clean text.
function cleanForSpeech(text) {
  return String(text || '')
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/<think>[\s\S]*$/i, '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[*_#`>]+/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Escape characters that break Alexa's SSML.
function escapeSsml(text) {
  return text.replace(/&/g, 'and').replace(/[<>]/g, ' ');
}

function trimHistory(history, turns) {
  return history.slice(-turns * 2);
}

async function askQwen(question, history, cfg, fetchImpl = fetch) {
  if (!cfg.apiKey) throw new Error('missing_key');
  const body = {
    model: cfg.model,
    messages: buildMessages(history, question),
    max_tokens: cfg.maxTokens,
    temperature: 0.7,
  };
  // Thinking makes answers too slow for Alexa, so turn it off.
  if (cfg.baseUrl.includes('openrouter.ai')) body.reasoning = { enabled: false };
  else body.enable_thinking = false;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), cfg.timeoutMs);
  try {
    const res = await fetchImpl(`${cfg.baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${cfg.apiKey}` },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error(`http_${res.status}`);
    const data = await res.json();
    const answer = cleanForSpeech(data?.choices?.[0]?.message?.content);
    if (!answer) throw new Error('empty');
    return answer;
  } finally {
    clearTimeout(timer);
  }
}

function errorSpeech(err) {
  const msg = String(err && err.message);
  if (msg === 'missing_key') return 'Qwen is not set up yet. Add your API key in the skill code.';
  if (msg === 'http_401' || msg === 'http_403') return 'Qwen rejected the API key. Please check it.';
  if (msg === 'http_402') return 'Your Qwen account is out of credit.';
  if (err && err.name === 'AbortError') return 'Qwen took too long to answer. Try a shorter question.';
  return 'Sorry, I could not reach Qwen just now. Please try again.';
}

module.exports = { SYSTEM_PROMPT, buildMessages, cleanForSpeech, escapeSsml, trimHistory, askQwen, errorSpeech };
