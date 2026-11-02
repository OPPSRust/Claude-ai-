// Gemma 4 on the device: download once, keep it in private storage, run it with WebGPU.
// Uses Google's LiteRT-LM web runtime. Nothing is sent to a server once the model is saved.

import { CONTEXT_TOKENS } from './limits.js';

const LIB_URL = 'https://cdn.jsdelivr.net/npm/@litert-lm/core@0.19.0/+esm';
const DIR = 'models';

// Qwen3 0.6B (Alibaba, Apache 2.0): Gemma 4 E2B (2 GB) crashed every time it loaded in
// iPhone Safari, so the app uses this 343 MB model, which runs on LiteRT-LM 0.19.0 WebGPU.
export const MODEL = {
  name: 'Qwen3 0.6B',
  file: 'Qwen3-0.6B_dynamic_wi4b32_afp32.litertlm',
  // Pinned to one revision so the file never changes under a half-finished download.
  url: 'https://huggingface.co/litert-community/Qwen3-0.6B/resolve/722a0a54c1301a4b07a9856a9590d56362f0969b/Qwen3-0.6B_dynamic_wi4b32_afp32.litertlm',
  size: 343490560,
  // Qwen3 thinks out loud unless told not to; plans don't need it and it costs time.
  noThink: true,
};

// Models this app used before. Deleted at launch to free their space.
const LEGACY_FILES = ['gemma-4-E2B-it-gpu.litertlm'];

/** Deletes old model files. Returns true if anything was deleted. */
export async function removeLegacyModels() {
  let removed = false;
  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle(DIR);
    for (const name of LEGACY_FILES) {
      try {
        await folder.removeEntry(name);
        removed = true;
      } catch (e) { /* not there */ }
    }
  } catch (e) { /* no models folder yet */ }
  return removed;
}

const TOP_P = 2; // LiteRT-LM SamplerType.TOP_P

// Testing only: localStorage 'cartcook.modelOverride' = {"url","file","size","backend":"cpu"} swaps
// the model, so the app can be exercised end to end on a machine without a real GPU.
let backendName = '';
try {
  const o = JSON.parse(localStorage.getItem('cartcook.modelOverride') || 'null');
  if (o && o.url && o.file && o.size) {
    Object.assign(MODEL, { url: o.url, file: o.file, size: Number(o.size) });
    backendName = o.backend === 'cpu' ? 'CPU' : '';
  }
} catch (e) { /* no override */ }

let lib = null;
let engine = null;
let loading = null;

/** Can this browser run the model at all? */
export async function checkSupport() {
  if (!('gpu' in navigator)) return { ok: false, reason: 'webgpu' };
  if (!navigator.storage || !navigator.storage.getDirectory) return { ok: false, reason: 'storage' };
  if (typeof Worker === 'undefined') return { ok: false, reason: 'worker' };
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return { ok: false, reason: 'webgpu' };
  } catch (e) {
    return { ok: false, reason: 'webgpu' };
  }
  return { ok: true };
}

async function modelFileHandle(create = false) {
  const root = await navigator.storage.getDirectory();
  const folder = await root.getDirectoryHandle(DIR, { create });
  return folder.getFileHandle(MODEL.file, { create });
}

/** Bytes of the model already saved on this device (0 if none). */
export async function storedBytes() {
  try {
    const fh = await modelFileHandle(false);
    return (await fh.getFile()).size;
  } catch (e) {
    return 0;
  }
}

export async function isDownloaded() {
  return (await storedBytes()) === MODEL.size;
}

/**
 * Starts or resumes the download. Returns { done, pause }.
 * `done` resolves when the whole file is saved, or rejects with
 * { paused: true } (resumable) or a plain Error (needs attention).
 */
export function download({ onProgress } = {}) {
  const worker = new Worker(new URL('./download-worker.js', import.meta.url));
  let settle;
  const done = new Promise((resolve, reject) => { settle = { resolve, reject }; });
  worker.onmessage = (event) => {
    const m = event.data || {};
    if (m.type === 'progress') {
      if (onProgress) onProgress(m.loaded, m.size);
    } else if (m.type === 'done') {
      worker.terminate();
      settle.resolve();
    } else if (m.type === 'paused') {
      worker.terminate();
      settle.reject(Object.assign(new Error(m.message || 'Paused'), { paused: true }));
    } else if (m.type === 'error') {
      worker.terminate();
      settle.reject(new Error(m.message || 'The download failed.'));
    }
  };
  worker.onerror = (event) => {
    worker.terminate();
    settle.reject(new Error((event && event.message) || 'The download could not start.'));
  };
  worker.postMessage({ type: 'start', url: MODEL.url, size: MODEL.size, dir: DIR, file: MODEL.file });
  return { done, pause: () => worker.postMessage({ type: 'cancel' }) };
}

/** Deletes the saved model and frees its space. */
export async function removeModel() {
  await unload();
  try {
    const root = await navigator.storage.getDirectory();
    const folder = await root.getDirectoryHandle(DIR);
    await folder.removeEntry(MODEL.file);
  } catch (e) { /* nothing to remove */ }
}

export function isLoaded() {
  return !!engine;
}

/**
 * Loads the saved model onto the GPU. Safe to call repeatedly.
 * onStage (optional) hears 'runtime' then 'model' as loading moves along.
 */
export async function load(onStage) {
  if (engine) return engine;
  if (loading) return loading;
  const stage = (s) => { try { if (onStage) onStage(s); } catch (e) { /* display only */ } };
  loading = (async () => {
    const fh = await modelFileHandle(false).catch(() => null);
    const file = fh ? await fh.getFile() : null;
    if (!file || file.size !== MODEL.size) throw codeError('not_downloaded', 'Gemma 4 is not downloaded yet.');
    stage('runtime');
    if (!lib) {
      try {
        lib = await import(LIB_URL);
      } catch (e) {
        throw codeError('runtime', 'The Gemma runtime could not load. Connect to the internet once so it can be saved for offline use.');
      }
    }
    stage('model');
    try {
      engine = await lib.Engine.create({
        model: file,
        ...(backendName ? { backend: lib.Backend[backendName] } : {}),
        mainExecutorSettings: { maxNumTokens: CONTEXT_TOKENS },
      });
    } catch (e) {
      throw codeError('engine', 'Gemma could not start on this phone. Close other apps and Safari tabs, then try again.', e);
    }
    return engine;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

export async function unload() {
  const e = engine;
  engine = null;
  if (e) {
    try { await e.delete(); } catch (err) { /* already gone */ }
  }
}

/**
 * Settings for one conversation. Thinking is switched off in the chat template: Qwen3 otherwise
 * reasons first, and that reasoning counts toward maxOutputTokens, leaving an empty answer.
 */
export function conversationConfig({ temperature = 0.6, maxOutputTokens = 1024 } = {}) {
  return {
    preface: { extra_context: { enable_thinking: false } },
    sessionConfig: {
      samplerParams: { type: TOP_P, temperature, k: 40, p: 0.95 },
      maxOutputTokens,
    },
  };
}

/**
 * Sends one prompt in a fresh conversation and streams the answer.
 * onText receives the whole answer so far. Rejects with { code: 'cancelled' } on abort.
 */
export async function generate(prompt, { onText, signal, temperature = 0.6, maxOutputTokens = 1024 } = {}) {
  const eng = await load();
  if (signal && signal.aborted) throw codeError('cancelled', 'Stopped.');
  const conversation = await eng.createConversation(conversationConfig({ temperature, maxOutputTokens }));
  let text = '';
  let stopped = false;
  const onAbort = () => {
    stopped = true;
    try { conversation.cancel(); } catch (e) { /* not running */ }
  };
  if (signal) signal.addEventListener('abort', onAbort, { once: true });
  try {
    const stream = conversation.sendMessageStreaming(MODEL.noThink ? `${prompt}\n/no_think` : prompt);
    for await (const chunk of stream) {
      if (stopped) break;
      const content = chunk && chunk.content;
      if (typeof content === 'string') {
        text += content;
      } else if (Array.isArray(content)) {
        for (const part of content) {
          if (part && part.type === 'text' && part.text) text += part.text;
        }
      }
      if (onText) onText(text);
    }
    if (stopped) throw codeError('cancelled', 'Stopped.');
    return text;
  } finally {
    if (signal) signal.removeEventListener('abort', onAbort);
    try { await conversation.delete(); } catch (e) { /* already deleted */ }
  }
}

function codeError(code, message, cause) {
  const e = new Error(message);
  e.code = code;
  if (cause) e.cause = cause;
  return e;
}
