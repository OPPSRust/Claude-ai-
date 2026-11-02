// How much Gemma holds in memory at once (prompt + answer, in tokens), and how long an
// answer may be so that it fits. A smaller context uses less memory on the phone.

export const CONTEXT_TOKENS = 3072;

/** Answer length (tokens) that fits after this prompt. Roughly 3 characters per token. */
export function fitOutput(prompt, wanted, context = CONTEXT_TOKENS) {
  const room = context - Math.ceil(String(prompt).length / 3) - 64;
  return Math.max(256, Math.min(wanted, room));
}
