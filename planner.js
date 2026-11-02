// Plans meals one at a time. A small on-device model is much more reliable asked for one
// meal than for a whole week at once, and the app (not the model) decides the day and meal,
// so a plan always has every day that was asked for.

/** Pulls every complete top-level {...} object out of (possibly streamed) model text. */
export function extractObjects(text) {
  const out = [];
  let depth = 0;
  let start = -1;
  let inStr = false;
  let esc = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === '\\') esc = true;
      else if (c === '"') inStr = false;
      else if (c === '\n') { inStr = false; depth = 0; start = -1; }
      continue;
    }
    if (c === '"') { if (depth > 0) inStr = true; continue; }
    if (c === '{') { if (depth === 0) start = i; depth++; }
    else if (c === '}' && depth > 0) {
      depth--;
      if (depth === 0 && start >= 0) {
        const obj = tryParse(text.slice(start, i + 1));
        if (obj && typeof obj === 'object' && !Array.isArray(obj)) out.push(obj);
        start = -1;
      }
    }
  }
  return out;
}

function tryParse(s) {
  try { return JSON.parse(s); } catch (e) { /* try a light repair */ }
  try { return JSON.parse(s.replace(/[“”]/g, '"').replace(/,\s*([}\]])/g, '$1')); } catch (e) { return null; }
}

const text = (x, max) => (typeof x === 'string' ? x.trim() : typeof x === 'number' ? String(x) : '').slice(0, max);
function minutes(x) {
  const n = Math.round(parseFloat(String(x == null ? '' : x).replace(/[^0-9.]/g, '')));
  return Number.isFinite(n) ? Math.min(600, Math.max(0, n)) : 0;
}

/** The meal in the model's answer for this slot, or null. Day and meal type come from the slot. */
export function mealFromText(answer, slot) {
  for (const o of extractObjects(answer)) {
    const name = text(o.name || o.dish, 120);
    if (!name) continue;
    return {
      day: slot.day,
      type: slot.type,
      name,
      about: text(o.about || o.description, 220),
      minutes: minutes(o.minutes),
      leftovers: false, // only the app's fallback makes leftover nights; the model's flag is unreliable
      recipe: null,
    };
  }
  return null;
}

function leftoverMeal(slot, done) {
  const from = [...done].reverse().find((m) => m.type === slot.type && !m.leftovers) || [...done].reverse().find((m) => !m.leftovers);
  if (!from) return null;
  return {
    day: slot.day,
    type: slot.type,
    name: `Leftover ${from.name}`,
    about: `Reheat what’s left from Day ${from.day}.`,
    minutes: 10,
    leftovers: true,
    recipe: null,
  };
}

/**
 * ask(slot, doneSoFar, attempt) -> Promise<string> returns the model's answer for one slot.
 * Returns one meal per slot, in slot order. Errors from ask (like cancelled) propagate.
 */
export async function planMeals({ slots, ask, onMeal = () => {}, attempts = 3 }) {
  const done = [];
  for (const slot of slots) {
    let meal = null;
    for (let attempt = 0; attempt < attempts && !meal; attempt++) {
      const candidate = mealFromText(await ask(slot, done.slice(), attempt), slot);
      // A small model often repeats itself; a repeat counts as no answer.
      if (candidate && !done.some((m) => m.name.toLowerCase() === candidate.name.toLowerCase())) meal = candidate;
    }
    if (!meal) meal = leftoverMeal(slot, done);
    if (!meal) {
      throw Object.assign(new Error('The AI’s answer didn’t come out as a meal plan. Tap Make my meal plan to try again.'), { code: 'parse' });
    }
    done.push(meal);
    onMeal(done.slice());
  }
  return done;
}

/**
 * Builds the shopping list one meal at a time. ask(meal, n) -> Promise<string> returns the
 * model's answer for meal number n (1-based); toItems(answer, meal) turns it into items.
 * Leftover meals need no shopping. Items with the same name are merged, and `uses` lists the
 * meals that need them.
 */
export async function planList({ meals, ask, toItems, onItems = () => {} }) {
  const items = [];
  for (let i = 0; i < meals.length; i++) {
    const n = i + 1;
    if (meals[i].leftovers) { onItems(items.slice()); continue; }
    for (const item of toItems(await ask(meals[i], n), meals[i])) {
      const same = items.find((x) => x.item.toLowerCase() === item.item.toLowerCase());
      if (same) {
        if (!same.uses.includes(n)) same.uses.push(n);
      } else {
        items.push({ ...item, uses: [n] });
      }
    }
    onItems(items.slice());
  }
  return items;
}
