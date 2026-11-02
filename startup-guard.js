// Remembers whether loading Gemma finished last time. If the app starts and finds a load
// still marked "in progress", the page crashed while loading (usually out of memory), so
// the app should not load Gemma automatically again and get stuck in a crash loop.

export const GUARD_KEY = 'cartcook.gemmaLoad';

const DEFAULTS = { inProgress: false, startedAt: 0, autoLoad: true, crashes: 0 };

function read(storage) {
  try {
    const raw = storage.getItem(GUARD_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch (e) {
    return { ...DEFAULTS };
  }
}

function write(storage, value) {
  try {
    storage.setItem(GUARD_KEY, JSON.stringify(value));
  } catch (e) { /* storage blocked or full: the guard just can't remember */ }
}

/** Call once at launch. Says whether to load Gemma automatically. */
export function onBoot(storage) {
  const g = read(storage);
  let crashedLastTime = false;
  if (g.inProgress) {
    crashedLastTime = true;
    g.crashes += 1;
    g.autoLoad = false;
    g.inProgress = false;
    write(storage, g);
  }
  return { autoLoad: g.autoLoad, crashedLastTime, crashes: g.crashes };
}

/** Call right before loading Gemma. */
export function beginLoad(storage, now = Date.now()) {
  const g = read(storage);
  g.inProgress = true;
  g.startedAt = now;
  write(storage, g);
}

/** Call when loading finished (ok) or failed with an error (not ok). */
export function endLoad(storage, ok) {
  const g = read(storage);
  g.inProgress = false;
  if (ok) {
    g.autoLoad = true;
    g.crashes = 0;
  }
  write(storage, g);
}
