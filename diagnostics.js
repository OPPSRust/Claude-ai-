// A short log of what the app did at launch and while loading Gemma, kept on the phone,
// so a crash can be understood afterwards from a copied report.

export const LOG_KEY = 'cartcook.log';
export const MAX_ENTRIES = 40;

export function readLog(storage) {
  try {
    const list = JSON.parse(storage.getItem(LOG_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch (e) {
    return [];
  }
}

export function logEvent(storage, stage, detail = '', now = Date.now()) {
  try {
    const list = readLog(storage);
    list.push({ t: now, stage: String(stage), detail: String(detail).slice(0, 300) });
    storage.setItem(LOG_KEY, JSON.stringify(list.slice(-MAX_ENTRIES)));
  } catch (e) { /* storage blocked or full */ }
}

export function report(log, env) {
  const head = [
    'Cart & Cook details',
    `app: ${env.url}`,
    `standalone: ${env.standalone ? 'yes' : 'no'}`,
    `gpu: ${env.gpu}`,
    `device: ${env.userAgent}`,
    '',
  ];
  const lines = log.map((e) => `${new Date(e.t).toISOString().slice(11, 19)} ${e.stage}${e.detail ? ' ' + e.detail : ''}`);
  return head.concat(lines).join('\n');
}
