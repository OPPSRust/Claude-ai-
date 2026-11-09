// Settings for the Qwen Alexa skill.
// Paste your OpenRouter key between the quotes below IN THE ALEXA DEVELOPER CONSOLE ONLY.
// Never commit a real key to GitHub.
module.exports = {
  apiKey: process.env.QWEN_API_KEY || '',
  // Any OpenAI-compatible server works: OpenRouter, Alibaba Model Studio, or Ollama on your own PC.
  baseUrl: process.env.QWEN_BASE_URL || 'https://openrouter.ai/api/v1',
  // Qwen3.5 35B-A3B is fast enough to answer inside Alexa's 8-second limit.
  model: process.env.QWEN_MODEL || 'qwen/qwen3.5-35b-a3b',
  maxTokens: 220,
  timeoutMs: 6500,
  historyTurns: 6,
};
