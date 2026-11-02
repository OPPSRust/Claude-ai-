import * as gemma from './gemma.js';
import * as stores from './stores.js';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const KEY = 'cartcook.v2';
const MEAL_TYPES = ['Breakfast', 'Lunch', 'Dinner'];
const PREFS = ['Vegetarian', 'Vegan', 'Gluten-free', 'Dairy-free', 'Nut-free', 'No pork', 'Kid-friendly', 'Quick meals'];
const AISLES = ['Produce', 'Meat & Seafood', 'Dairy & Eggs', 'Bakery', 'Pantry', 'Frozen', 'Other'];
const CURRENCIES = {
  USD: { label: 'USD $', name: 'US dollars' },
  CAD: { label: 'CAD $', name: 'Canadian dollars' },
  GBP: { label: 'GBP £', name: 'British pounds' },
  EUR: { label: 'EUR €', name: 'euros' },
  AUD: { label: 'AUD $', name: 'Australian dollars' },
};
const REGION = (() => {
  try { return new Intl.Locale(navigator.language).maximize().region || ''; } catch (e) { return ''; }
})();
const MILES = ['US', 'GB', 'LR', 'MM'].includes(REGION);
const IMPERIAL = ['US', 'LR', 'MM'].includes(REGION);
const DEFAULT_CURRENCY = { US: 'USD', CA: 'CAD', GB: 'GBP', AU: 'AUD' }[REGION]
  || (['DE', 'FR', 'ES', 'IT', 'NL', 'IE', 'PT', 'AT', 'BE', 'FI', 'GR'].includes(REGION) ? 'EUR' : 'USD');
const RADII = MILES
  ? [{ m: 1609, label: '1 mi' }, { m: 4828, label: '3 mi' }, { m: 8047, label: '5 mi' }, { m: 16093, label: '10 mi' }]
  : [{ m: 2000, label: '2 km' }, { m: 5000, label: '5 km' }, { m: 10000, label: '10 km' }, { m: 20000, label: '20 km' }];
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const ICONS = {
  check: '<svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18"/></svg>',
  clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/></svg>',
  people: '<svg viewBox="0 0 24 24"><circle cx="9" cy="8.5" r="3.2"/><path d="M3.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5"/><circle cx="17" cy="9.5" r="2.4"/><path d="M15.8 14.2c2.4.1 4.1 1.7 4.7 4.3"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M12 3.5v11M7.5 8L12 3.5 16.5 8"/><path d="M8 11.5H6.5A1.5 1.5 0 0 0 5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a1.5 1.5 0 0 0-1.5-1.5H16"/></svg>',
  locate: '<svg viewBox="0 0 24 24"><path d="M20.5 3.5L3.5 10.6l7 2.9 2.9 7z"/></svg>',
  search: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/></svg>',
  download: '<svg viewBox="0 0 24 24"><path d="M12 4v11M7 10.5l5 5 5-5M5 20h14"/></svg>',
  chip: '<svg viewBox="0 0 24 24"><path d="M12 3.2l1.9 4.6 4.9.4-3.7 3.2 1.1 4.8L12 13.7l-4.2 2.5 1.1-4.8L5.2 8.2l4.9-.4z"/><path d="M5 19.5h14"/></svg>',
  directions: '<svg viewBox="0 0 24 24"><path d="M12 2.8l9.2 9.2-9.2 9.2L2.8 12z"/><path d="M9.2 14.5v-2.3a1.6 1.6 0 0 1 1.6-1.6h4.4M13.4 8.4l2 2.2-2 2.2"/></svg>',
  pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.1-7-11.5a7 7 0 0 1 14 0C19 14.9 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  leftovers: '<svg viewBox="0 0 24 24"><path d="M4 10h16l-1.5 8a2 2 0 0 1-2 1.6h-9a2 2 0 0 1-2-1.6z"/><path d="M8 10V7.5A1.5 1.5 0 0 1 9.5 6h5A1.5 1.5 0 0 1 16 7.5V10"/></svg>',
  basket: '<svg viewBox="0 0 24 24"><path d="M3.5 9.5h17l-1.6 9a2 2 0 0 1-2 1.6H7.1a2 2 0 0 1-2-1.6z"/><path d="M8 9.5l3-5M16 9.5l-3-5M9 13.5v3M12 13.5v3M15 13.5v3"/></svg>',
  pot: '<svg viewBox="0 0 24 24"><path d="M4.5 10.5h15v4.5a5 5 0 0 1-5 5h-5a5 5 0 0 1-5-5z"/><path d="M2.5 10.5h19M9 7c0-1.2 1.2-1.3 1.2-2.5M13.5 7c0-1.2 1.2-1.3 1.2-2.5"/></svg>',
  skillet: '<svg viewBox="0 0 24 24"><circle cx="10" cy="13" r="6.5"/><circle cx="10" cy="13" r="2.4"/><path d="M15.8 10.6l5.7-2.9"/></svg>',
  tray: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="10" rx="2.5"/><circle cx="8" cy="13" r="1.9"/><circle cx="13" cy="12.4" r="1.4"/><path d="M15.8 14.6h2.7"/></svg>',
  bowl: '<svg viewBox="0 0 24 24"><path d="M3 11.5h18a9 9 0 0 1-18 0z"/><path d="M8.5 20h7M9 8.5c.6-1.8 2.4-2.8 4.3-2.2M14.2 7.3c.9-1.2 2.6-1.6 3.8-.8"/></svg>',
  sandwich: '<svg viewBox="0 0 24 24"><path d="M4 10a8 4.5 0 0 1 16 0z"/><path d="M3.5 13h17M5 16h14l-1 3H6z"/></svg>',
  egg: '<svg viewBox="0 0 24 24"><path d="M12 3.5c3.4 0 6 5.3 6 9.4a6 6 0 0 1-12 0c0-4.1 2.6-9.4 6-9.4z"/><circle cx="12" cy="13.5" r="2.4"/></svg>',
  refresh: '<svg viewBox="0 0 24 24"><path d="M19.5 11a7.5 7.5 0 1 0-2.2 5.5M19.5 4.5V11H13"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M4.5 7h15M9.5 7V4.8h5V7M6.5 7l.9 12a1.5 1.5 0 0 0 1.5 1.4h6.2a1.5 1.5 0 0 0 1.5-1.4l.9-12"/></svg>',
};

// A sample so every tab shows something useful before the first plan. Labelled "Example".
const EXAMPLE = {
  id: 'example',
  example: true,
  createdAt: null,
  inputs: { people: 2, days: 3, meals: ['Dinner'], budget: 35, currency: 'USD', storeText: '', area: '', prefs: [], notes: '' },
  store: null,
  meals: [
    {
      day: 1, type: 'Dinner', name: 'Sheet-pan chicken thighs with potatoes and green beans',
      about: 'Crispy thighs roasted over potatoes and onions. Roast the whole pack and save half.', minutes: 45, leftovers: false,
      recipe: {
        ingredients: [
          { qty: 'about 3 lb', item: 'bone-in chicken thighs (the whole pack)' },
          { qty: '1½ lb', item: 'russet potatoes, cut in 1-inch chunks' },
          { qty: '1', item: 'yellow onion, cut in wedges' },
          { qty: '1 lb', item: 'green beans, trimmed' },
          { qty: '3 cloves', item: 'garlic, minced' },
          { qty: '2 tbsp', item: 'vegetable oil' },
          { qty: '2 tsp', item: 'chili powder' },
          { qty: '1 tsp', item: 'salt, plus more to taste' },
          { qty: '½ tsp', item: 'black pepper' },
        ],
        steps: [
          'Heat the oven to 425°F (220°C). Line a large sheet pan with foil if you have it.',
          'Toss the potatoes and onion with 1 tbsp oil, ½ tsp salt and the pepper. Spread them on the pan.',
          'Pat the chicken dry. Rub it with the rest of the oil, the chili powder, the garlic and ½ tsp salt. Set the thighs skin-side up on the vegetables.',
          'Roast for 25 minutes.',
          'Add the green beans around the chicken, stir them into the pan juices, and roast 15 to 20 minutes more, until the skin is crisp and the thickest thigh reads 175°F (80°C).',
          'Serve half the chicken with the vegetables. Cool the rest, pull the meat off the bones and refrigerate it for Day 3.',
        ],
        tip: 'Pulled chicken keeps 3 to 4 days in a sealed container in the fridge.',
      },
    },
    { day: 2, type: 'Dinner', name: 'Black bean and rice burrito bowls', about: 'Seasoned beans over lime rice with salsa and cheddar. Cook a double batch of rice.', minutes: 25, leftovers: false, recipe: null },
    { day: 3, type: 'Dinner', name: 'Chicken fried rice', about: "Day 1's chicken and Day 2's rice, fried with eggs, peas and carrots, and soy sauce.", minutes: 20, leftovers: true, recipe: null },
  ],
  list: [
    { aisle: 'Produce', item: 'Yellow onions', size: '3 lb bag', price: 2.99, uses: [1, 3], got: false },
    { aisle: 'Produce', item: 'Russet potatoes', size: '5 lb bag', price: 3.49, uses: [1], got: false },
    { aisle: 'Produce', item: 'Green beans', size: '1 lb', price: 2.29, uses: [1], got: false },
    { aisle: 'Produce', item: 'Limes', size: '3 count', price: 1.17, uses: [2], got: false },
    { aisle: 'Produce', item: 'Garlic', size: '1 head', price: 0.59, uses: [1, 3], got: false },
    { aisle: 'Meat & Seafood', item: 'Bone-in chicken thighs', size: 'about 3 lb pack', price: 5.97, uses: [1, 3], got: false },
    { aisle: 'Dairy & Eggs', item: 'Large eggs', size: 'dozen', price: 2.99, uses: [3], got: false },
    { aisle: 'Dairy & Eggs', item: 'Shredded cheddar', size: '8 oz bag', price: 2.29, uses: [2], got: false },
    { aisle: 'Pantry', item: 'Long-grain white rice', size: '2 lb bag', price: 1.89, uses: [2, 3], got: false },
    { aisle: 'Pantry', item: 'Black beans', size: '2 × 15 oz cans', price: 1.58, uses: [2], got: false },
    { aisle: 'Pantry', item: 'Salsa', size: '16 oz jar', price: 2.49, uses: [2], got: false },
    { aisle: 'Pantry', item: 'Soy sauce', size: '10 oz bottle', price: 1.79, uses: [3], got: false },
    { aisle: 'Frozen', item: 'Peas and carrots', size: '12 oz bag', price: 1.29, uses: [3], got: false },
  ],
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const $ = (sel, root = document) => root.querySelector(sel);
const clone = (o) => JSON.parse(JSON.stringify(o));

function h(tag, attrs, ...kids) {
  const el = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'style') el.setAttribute('style', v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : String(kid));
  }
  return el;
}
function icon(name, cls = '') {
  const s = document.createElement('span');
  s.className = 'i ' + cls;
  s.setAttribute('aria-hidden', 'true');
  s.innerHTML = ICONS[name] || '';
  return s;
}
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
const clampInt = (v, lo, hi, d) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d;
};
function num(x) {
  if (typeof x === 'number') return Number.isFinite(x) ? Math.max(0, x) : 0;
  const n = parseFloat(String(x == null ? '' : x).replace(/[^0-9.]/g, ''));
  return Number.isFinite(n) ? Math.max(0, n) : 0;
}
const str = (x, max = 300) => (typeof x === 'string' ? x.trim() : typeof x === 'number' ? String(x) : '').slice(0, max);
function moneyFmt(cur) {
  let f;
  try { f = new Intl.NumberFormat(undefined, { style: 'currency', currency: cur || 'USD' }); }
  catch (e) { f = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }); }
  return (n) => f.format(Number(n) || 0);
}
function gb(bytes) { return (bytes / 1e9).toFixed(bytes >= 1e9 ? 2 : 2); }
function hueOf(text) {
  let x = 0;
  for (const c of String(text)) x = (x * 31 + c.charCodeAt(0)) % 360;
  return x;
}
function dishIcon(meal) {
  const t = `${meal.name} ${meal.about}`.toLowerCase();
  if (/\b(egg|omelet|omelette|frittata|scramble|pancake|waffle|french toast|breakfast burrito)/.test(t)) return 'egg';
  if (/\b(soup|stew|chili|curry|chowder|pasta|spaghetti|noodle|mac|lentil|dal|ramen|risotto)/.test(t)) return 'pot';
  if (/\b(sheet[- ]pan|roast|baked|bake|casserole|lasagna|enchilada|meatloaf|pizza)/.test(t)) return 'tray';
  if (/\b(sandwich|wrap|burger|toast|quesadilla|panini|pita|sub|sloppy)/.test(t)) return 'sandwich';
  if (/\b(stir[- ]fry|fried rice|skillet|taco|fajita|hash|saut|pan[- ]fried|fried)/.test(t)) return 'skillet';
  if (/\b(bowl|salad|oat|oatmeal|yogurt|parfait|cereal|grain)/.test(t)) return 'bowl';
  return meal.type === 'Breakfast' ? 'egg' : meal.type === 'Lunch' ? 'bowl' : 'skillet';
}

let toastTimer = 0;
function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 2400);
}

// Keep the screen awake while something long runs (download, planning).
const wakeReasons = new Set();
let wakeLock = null;
async function keepAwake(reason, on) {
  if (on) wakeReasons.add(reason); else wakeReasons.delete(reason);
  try {
    if (wakeReasons.size && !wakeLock && 'wakeLock' in navigator && document.visibilityState === 'visible') {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    } else if (!wakeReasons.size && wakeLock) {
      await wakeLock.release();
      wakeLock = null;
    }
  } catch (e) { /* not allowed right now */ }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------
const DEFAULT_INPUTS = { people: 4, days: 5, meals: ['Dinner'], budget: 75, currency: DEFAULT_CURRENCY, storeText: '', area: '', prefs: [], notes: '' };
const state = {
  inputs: clone(DEFAULT_INPUTS),
  store: null,
  record: clone(EXAMPLE),
  radius: RADII[2].m,
  search: { phase: 'idle', items: [], message: '', origin: null, label: '', query: '' },
  model: { phase: 'checking', loaded: 0, rate: 0, message: '', confirmRemove: false },
  job: null,
};

function loadSaved() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved) return;
    if (saved.inputs) state.inputs = Object.assign(clone(DEFAULT_INPUTS), saved.inputs);
    if (saved.store && typeof saved.store.lat === 'number') state.store = saved.store;
    if (saved.radius) state.radius = saved.radius;
    if (saved.record && Array.isArray(saved.record.meals) && Array.isArray(saved.record.list)) state.record = saved.record;
    if (saved.search && Array.isArray(saved.search.items)) {
      state.search = Object.assign(state.search, { phase: saved.search.items.length ? 'done' : 'idle', items: saved.search.items, origin: saved.search.origin, label: saved.search.label || '' });
    }
  } catch (e) { /* start fresh */ }
}
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({
        inputs: state.inputs, store: state.store, radius: state.radius, record: state.record,
        search: { items: state.search.items.slice(0, 40), origin: state.search.origin, label: state.search.label },
      }));
    } catch (e) { /* storage full or blocked */ }
  }, 200);
}

// ---------------------------------------------------------------------------
// Tabs
// ---------------------------------------------------------------------------
const TABS = ['plan', 'stores', 'meals', 'list'];
function currentTab() {
  const t = location.hash.replace('#', '');
  return TABS.includes(t) ? t : 'plan';
}
function showTab() {
  const tab = currentTab();
  for (const t of TABS) $(`#tab-${t}`).hidden = t !== tab;
  for (const a of document.querySelectorAll('.tabbar a')) {
    if (a.dataset.tab === tab) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  if (tab === 'stores') renderStores();
  if (tab === 'meals') renderMeals();
  if (tab === 'list') renderList();
  window.scrollTo({ top: 0, behavior: 'instant' in window ? 'instant' : 'auto' });
}
function go(tab) {
  if (location.hash === '#' + tab) showTab(); else location.hash = tab;
}
window.addEventListener('hashchange', showTab);

// ---------------------------------------------------------------------------
// Plan form
// ---------------------------------------------------------------------------
function buildForm() {
  const cur = $('#currency');
  for (const [code, c] of Object.entries(CURRENCIES)) cur.append(h('option', { value: code }, c.label));

  const days = $('#days');
  for (let i = 1; i <= 7; i++) {
    days.append(h('button', {
      type: 'button', role: 'radio', 'aria-label': plural(i, 'day', 'days'), 'data-v': String(i),
      onclick: () => { state.inputs.days = i; syncForm(); onChange(); },
    }, String(i)));
  }
  days.addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    e.preventDefault();
    state.inputs.days = clampInt(state.inputs.days + (e.key === 'ArrowLeft' ? -1 : 1), 1, 7, 5);
    syncForm();
    days.children[state.inputs.days - 1].focus();
    onChange();
  });

  const chipGroup = (box, options, key) => {
    for (const opt of options) {
      const b = h('button', {
        type: 'button', class: 'chip', 'aria-pressed': 'false', 'data-v': opt,
        onclick: () => {
          const set = new Set(state.inputs[key]);
          if (set.has(opt)) set.delete(opt); else set.add(opt);
          state.inputs[key] = options.filter((o) => set.has(o));
          syncForm();
          onChange();
        },
      });
      b.append(icon('check'), opt);
      box.append(b);
    }
  };
  chipGroup($('#meals'), MEAL_TYPES, 'meals');
  chipGroup($('#prefs'), PREFS, 'prefs');

  const setPeople = (n) => { state.inputs.people = clampInt(n, 1, 20, 4); syncForm(); onChange(); };
  $('#peopleDown').addEventListener('click', () => setPeople(state.inputs.people - 1));
  $('#peopleUp').addEventListener('click', () => setPeople(state.inputs.people + 1));
  $('#people').addEventListener('input', (e) => { const n = Number(e.target.value); if (n >= 1 && n <= 20) { state.inputs.people = Math.round(n); onChange(); } });
  $('#people').addEventListener('blur', () => setPeople($('#people').value));
  $('#budget').addEventListener('input', (e) => { state.inputs.budget = Math.max(0, Math.round(num(e.target.value) * 100) / 100); onChange(); });
  $('#currency').addEventListener('change', (e) => { state.inputs.currency = e.target.value; onChange(); });
  $('#notes').addEventListener('input', (e) => { state.inputs.notes = e.target.value.slice(0, 500); onChange(); });
  $('#makePlan').addEventListener('click', () => makePlan());

  $('#weekOf').textContent = 'Week of ' + new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric' });
}

function syncForm() {
  const inp = state.inputs;
  $('#people').value = inp.people;
  for (const b of $('#days').children) {
    const on = Number(b.dataset.v) === inp.days;
    b.setAttribute('aria-checked', on ? 'true' : 'false');
    b.tabIndex = on ? 0 : -1;
  }
  for (const b of $('#meals').children) b.setAttribute('aria-pressed', inp.meals.includes(b.dataset.v) ? 'true' : 'false');
  for (const b of $('#prefs').children) b.setAttribute('aria-pressed', inp.prefs.includes(b.dataset.v) ? 'true' : 'false');
  if (document.activeElement !== $('#budget')) $('#budget').value = inp.budget > 0 ? inp.budget : '';
  $('#currency').value = CURRENCIES[inp.currency] ? inp.currency : 'USD';
  if (document.activeElement !== $('#notes')) $('#notes').value = inp.notes || '';
}

function onChange() {
  renderPerServing();
  save();
}

function tierFor(per) {
  if (per < 1.5) return ['Very tight', 'bad'];
  if (per < 3) return ['Thrifty', 'warn'];
  if (per < 5) return ['Comfortable', 'good'];
  return ['Roomy', 'good'];
}
function renderPerServing() {
  const inp = state.inputs;
  const box = $('#perServing');
  box.replaceChildren();
  if (!inp.meals.length) { box.append('Pick at least one meal.'); return; }
  const servings = inp.people * inp.days * inp.meals.length;
  if (!(inp.budget > 0)) { box.append(`${plural(servings, 'serving', 'servings')} to plan. Add a budget to see the cost per serving.`); return; }
  const per = inp.budget / servings;
  const [label, tone] = tierFor(per);
  box.append(
    `${plural(servings, 'serving', 'servings')} · about `,
    h('strong', null, moneyFmt(inp.currency)(per)),
    ' each',
    h('span', { class: `pill ${tone}` }, label),
  );
}

function renderStoreRow() {
  const box = $('#storeRow');
  box.replaceChildren();
  const s = state.store;
  if (s) {
    box.append(h('a', { class: 'row row-link', href: '#stores' },
      h('div', { class: 'store-pick' },
        h('div', { class: 'avatar', style: `--h:${hueOf(s.brand || s.name)}` }, (s.brand || s.name).charAt(0).toUpperCase()),
        h('div', { class: 't' }, h('b', null, s.name), h('span', null, [s.kindLabel, s.distLabel].filter(Boolean).join(' · '))),
        icon('chevron', 'chev')),
    ));
  } else {
    box.append(h('a', { class: 'row row-link', href: '#stores' },
      h('div', { class: 'store-pick' },
        h('div', { class: 'avatar ghost' }, icon('locate')),
        h('div', { class: 't' }, h('b', null, state.inputs.storeText || 'Find stores near me'), h('span', null, state.inputs.storeText ? 'Typed by you · tap to search nearby' : 'Uses your location to list grocery stores')),
        icon('chevron', 'chev')),
    ));
  }
}

// ---------------------------------------------------------------------------
// Gemma model card
// ---------------------------------------------------------------------------
let download = null;
let rateSamples = [];

async function refreshModelState() {
  const support = await gemma.checkSupport();
  if (!support.ok) {
    state.model.phase = 'unsupported';
    state.model.message = support.reason === 'webgpu'
      ? 'This browser has no WebGPU, which Gemma needs. Open Cart & Cook in Safari on iOS 26 or later.'
      : 'This browser cannot store the model. Open Cart & Cook in Safari on iOS 26 or later.';
  } else {
    const bytes = await gemma.storedBytes();
    state.model.loaded = bytes;
    state.model.phase = bytes === gemma.MODEL.size ? (gemma.isLoaded() ? 'loaded' : 'downloaded') : bytes > 0 ? 'paused' : 'absent';
  }
  renderModelCard();
  updateCta();
}

function modelStatus() {
  const m = state.model;
  switch (m.phase) {
    case 'checking': return ['Checking…', ''];
    case 'unsupported': return ["Can't run here", 'bad'];
    case 'absent': return ['Not downloaded', ''];
    case 'paused': return [`${Math.floor((m.loaded / gemma.MODEL.size) * 100)}% downloaded`, 'warn'];
    case 'downloading': return ['Downloading', 'accent'];
    case 'downloaded': return ['On this iPhone', 'good'];
    case 'loading': return ['Waking up', 'accent'];
    case 'loaded': return ['Ready', 'good'];
    case 'error': return ['Needs attention', 'bad'];
    default: return ['', ''];
  }
}

function renderModelCard() {
  const m = state.model;
  const box = $('#modelCard');
  const [statusText, tone] = modelStatus();
  const card = h('div', { class: 'glass model-card' });
  card.append(h('div', { class: 'model-top' },
    h('div', { class: 'model-icon' }, icon('chip')),
    h('div', null, h('div', { class: 'model-name' }, 'Gemma 4'), h('div', { class: 'model-sub' }, 'Google’s AI, on your iPhone')),
    h('span', { class: `pill ${tone}` }, statusText),
  ));

  const pct = Math.min(100, (m.loaded / gemma.MODEL.size) * 100);
  const progress = () => h('div', null,
    h('div', { class: 'bar', role: 'progressbar', 'aria-valuemin': '0', 'aria-valuemax': '100', 'aria-valuenow': String(Math.round(pct)), 'aria-label': 'Gemma 4 download' },
      h('span', { style: `width:${pct.toFixed(1)}%` })),
    h('div', { class: 'progress-meta', style: 'margin-top:8px' },
      h('span', null, `${gb(m.loaded)} of ${gb(gemma.MODEL.size)} GB`),
      h('span', null, m.phase === 'downloading' ? rateText() : '')),
  );

  switch (m.phase) {
    case 'checking':
      card.append(h('p', { class: 'model-text' }, 'Looking for Gemma on this iPhone…'));
      break;
    case 'unsupported':
      card.append(h('p', { class: 'model-text' }, m.message));
      break;
    case 'absent':
      card.append(
        h('p', { class: 'model-text' }, 'Download Gemma once over Wi-Fi (2.0 GB). After that it writes your plans, recipes and prices right here on your phone, even offline.'),
        h('div', { class: 'model-actions' },
          h('button', { type: 'button', class: 'btn primary', onclick: startDownload }, icon('download'), 'Download Gemma 4 · 2.0 GB')),
      );
      break;
    case 'paused':
      card.append(progress(),
        m.message ? h('p', { class: 'model-text' }, m.message) : null,
        h('div', { class: 'model-actions' },
          h('button', { type: 'button', class: 'btn primary', onclick: startDownload }, icon('download'), 'Resume download'),
          removeButton()));
      break;
    case 'downloading':
      card.append(progress(),
        h('p', { class: 'model-text' }, 'Keep Cart & Cook open until it finishes. If it stops, your progress is saved.'),
        h('div', { class: 'model-actions' }, h('button', { type: 'button', class: 'btn plain', onclick: () => download && download.pause() }, 'Pause')));
      break;
    case 'downloaded':
      card.append(h('p', { class: 'model-text' }, 'Saved on this iPhone. It wakes up when you make a plan and works without internet.'),
        h('div', { class: 'model-actions' }, removeButton()));
      break;
    case 'loading':
      card.append(h('div', { class: 'writing' }, h('div', { class: 'spinner' }), 'Waking Gemma up on your iPhone’s GPU…'));
      break;
    case 'loaded':
      card.append(h('p', { class: 'model-text' }, 'Awake and ready. Everything runs on this iPhone.'));
      break;
    case 'error':
      card.append(h('p', { class: 'model-text' }, m.message || 'Something went wrong.'),
        h('div', { class: 'model-actions' },
          h('button', { type: 'button', class: 'btn primary', onclick: startDownload }, icon('refresh'), 'Try again'),
          removeButton()));
      break;
  }
  box.replaceChildren(card);
}

function removeButton() {
  const m = state.model;
  return h('button', {
    type: 'button', class: 'btn small plain',
    onclick: async () => {
      if (!m.confirmRemove) {
        m.confirmRemove = true;
        renderModelCard();
        setTimeout(() => { m.confirmRemove = false; if (state.model.phase !== 'downloading') renderModelCard(); }, 4000);
        return;
      }
      m.confirmRemove = false;
      await gemma.removeModel();
      toast('Gemma removed. 2 GB freed.');
      refreshModelState();
    },
  }, icon('trash'), m.confirmRemove ? 'Tap again to remove' : 'Remove');
}

function rateText() {
  const r = state.model.rate;
  if (!r) return 'Starting…';
  const left = (gemma.MODEL.size - state.model.loaded) / r;
  const mins = Math.ceil(left / 60);
  return `${(r / 1e6).toFixed(r > 1e7 ? 0 : 1)} MB/s · ${left < 60 ? 'under a minute' : `about ${mins} min`} left`;
}

let cardTick = 0;
async function startDownload() {
  if (download) return;
  state.model.message = '';
  try { if (navigator.storage && navigator.storage.persist) await navigator.storage.persist(); } catch (e) { /* optional */ }
  try {
    const est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null;
    const need = gemma.MODEL.size - (await gemma.storedBytes());
    if (est && est.quota && est.quota - (est.usage || 0) < need + 50e6) {
      state.model.phase = 'error';
      state.model.message = 'There isn’t enough free space for Gemma (about 2 GB). Free up some space on your iPhone, then try again.';
      renderModelCard();
      return;
    }
  } catch (e) { /* estimate unavailable */ }

  state.model.phase = 'downloading';
  state.model.rate = 0;
  rateSamples = [];
  renderModelCard();
  updateCta();
  keepAwake('download', true);
  download = gemma.download({
    onProgress: (loaded) => {
      state.model.loaded = loaded;
      const now = performance.now();
      rateSamples.push([now, loaded]);
      while (rateSamples.length > 2 && now - rateSamples[0][0] > 4000) rateSamples.shift();
      const [t0, b0] = rateSamples[0];
      if (now - t0 > 500) state.model.rate = ((loaded - b0) / (now - t0)) * 1000;
      if (now - cardTick > 300) { cardTick = now; renderModelCard(); }
    },
  });
  try {
    await download.done;
    state.model.phase = 'downloaded';
    state.model.loaded = gemma.MODEL.size;
    toast('Gemma 4 is on your iPhone');
  } catch (e) {
    state.model.loaded = await gemma.storedBytes();
    if (e && e.paused) {
      state.model.phase = 'paused';
      state.model.message = e.message === 'Paused' ? '' : e.message;
      state.model.autoResume = !!e.message && e.message !== 'Paused';
    } else {
      state.model.phase = 'error';
      state.model.message = (e && e.message) || 'The download failed.';
    }
  } finally {
    download = null;
    keepAwake('download', false);
    renderModelCard();
    updateCta();
  }
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') return;
  if (wakeReasons.size) keepAwake([...wakeReasons][0], true);
  if (state.model.phase === 'paused' && state.model.autoResume && navigator.onLine !== false) {
    state.model.autoResume = false;
    startDownload();
  }
});
window.addEventListener('online', () => {
  if (state.model.phase === 'paused' && state.model.autoResume) {
    state.model.autoResume = false;
    startDownload();
  }
});

function modelReady() {
  return state.model.phase === 'downloaded' || state.model.phase === 'loaded' || state.model.phase === 'loading';
}

function updateCta() {
  const btn = $('#makePlan');
  btn.disabled = !!state.job;
  btn.textContent = state.job && state.job.kind === 'plan' ? 'Gemma is cooking…' : 'Make my meal plan';
}

// ---------------------------------------------------------------------------
// Prompts and parsing
// ---------------------------------------------------------------------------
function slotsFor(inp) {
  const out = [];
  for (let d = 1; d <= inp.days; d++) for (const t of MEAL_TYPES) if (inp.meals.includes(t)) out.push({ day: d, type: t });
  return out;
}

function storeLine(inp, store) {
  if (store) {
    const level = ['', 'a budget store', 'a mid-priced store', 'a pricier store'][store.level || 0];
    const where = store.city || inp.area;
    return `${store.name}${level ? ` (${level})` : ''}${where ? ` in ${where}` : ''}`;
  }
  if (inp.storeText) return `${inp.storeText}${inp.area ? ` in ${inp.area}` : ''}`;
  return `a typical mid-priced supermarket${inp.area ? ` in ${inp.area}` : ''}`;
}

function planPrompt(inp, store, wanted, already) {
  const money = moneyFmt(inp.currency);
  const per = inp.budget / (inp.people * inp.days * inp.meals.length);
  const lines = [
    'You are a home cook who plans tasty, budget-friendly meals.',
    '',
    `Plan meals for ${plural(inp.people, 'person', 'people')}.`,
    `Grocery budget for the whole plan: ${money(inp.budget)} (${CURRENCIES[inp.currency].name}). That is about ${money(per)} per serving, so choose dishes that fit.`,
    `They shop at ${storeLine(inp, store)}.`,
    `Diet: ${inp.prefs.length ? inp.prefs.join(', ') : 'no restrictions'}.`,
    `Notes from the cook: ${inp.notes || 'none'}.`,
    '',
    'Rules:',
    `- Every meal feeds all ${inp.people}.`,
    '- Reuse ingredients across meals so nothing goes to waste.',
    '- When it saves money, make a meal from an earlier meal\'s leftovers and set "leftovers" to true.',
    '- Dinners are all different. Breakfasts and lunches can be simple and can repeat.',
  ];
  if (already && already.length) {
    lines.push('', 'Already planned (do not repeat these lines):', ...already.map((m) => `- Day ${m.day} ${m.type}: ${m.name}`));
  }
  lines.push(
    '',
    `Write exactly ${wanted.length} lines of JSON, one line per meal, in this order: ${wanted.map((s) => `Day ${s.day} ${s.type}`).join(', ')}.`,
    'Write nothing else. Each line looks like this:',
    '{"day":1,"meal":"Dinner","name":"Sheet-pan chicken and potatoes","about":"Crispy thighs roasted with potatoes and onions.","minutes":40,"leftovers":false}',
  );
  return lines.join('\n');
}

function listPrompt(inp, store, meals, cheaper) {
  const money = moneyFmt(inp.currency);
  const sizes = IMPERIAL ? '"3 lb bag", "dozen", "15 oz can", "1 lb pack"' : '"1 kg bag", "dozen", "400 g can", "500 g pack"';
  const lines = [
    `You are writing the grocery list for this meal plan for ${plural(inp.people, 'person', 'people')}:`,
    ...meals.map((m, i) => `${i + 1}. Day ${m.day} ${m.type}: ${m.name}`),
    '',
    `They shop at ${storeLine(inp, store)}.`,
    `Budget: ${money(inp.budget)} in total (${CURRENCIES[inp.currency].name}).`,
  ];
  if (cheaper) {
    lines.push(`The last list came to ${money(cheaper)}, which is ${money(cheaper - inp.budget)} over budget. Make this list cheaper: smaller sizes, store brands, and cheaper proteins such as eggs, beans, lentils, chicken thighs or ground turkey.`);
  }
  lines.push(
    '',
    'Rules:',
    '- One line per item. Combine what several meals share into one item.',
    `- Use package sizes stores sell, like ${sizes}.`,
    `- Use realistic ${new Date().getFullYear()} store-brand prices in ${CURRENCIES[inp.currency].name}, as plain numbers.`,
    `- Keep the total at or under ${money(inp.budget)}.`,
    '- Skip salt, pepper, cooking oil and dried spices.',
    '- "uses" lists the numbers of the meals that need the item.',
    '- "aisle" is one of: Produce, Meat & Seafood, Dairy & Eggs, Bakery, Pantry, Frozen.',
    '',
    'Write one line of JSON per item and nothing else. Each line looks like this:',
    IMPERIAL
      ? '{"aisle":"Produce","item":"Yellow onions","size":"3 lb bag","price":2.99,"uses":[1,3]}'
      : '{"aisle":"Produce","item":"Brown onions","size":"1 kg bag","price":1.20,"uses":[1,3]}',
  );
  return lines.join('\n');
}

function recipePrompt(rec, idx) {
  const inp = rec.inputs;
  const meal = rec.meals[idx];
  const own = rec.list.filter((it) => (it.uses || []).includes(idx + 1)).map((it) => it.item);
  const groceries = (own.length ? own : rec.list.map((it) => it.item)).join(', ');
  const earlier = rec.meals.slice(0, idx).map((m) => m.name).join('; ');
  const later = rec.meals.slice(idx + 1).filter((m) => m.leftovers).map((m) => `Day ${m.day} ${m.type}: ${m.name}`).join('; ');
  const lines = [
    'Write a home recipe.',
    `Dish: ${meal.name}. ${meal.about || ''}`.trim(),
    `Serves ${inp.people}. About ${meal.minutes || 30} minutes. Diet: ${inp.prefs.length ? inp.prefs.join(', ') : 'no restrictions'}.`,
    `Notes from the cook: ${inp.notes || 'none'}.`,
    `Groceries to use: ${groceries}. Also salt, pepper, cooking oil and basic dried spices.`,
  ];
  if (meal.leftovers && earlier) lines.push(`This meal uses leftovers from earlier meals: ${earlier}.`);
  if (later) lines.push(`Later meals reuse leftovers (${later}), so say in a step how much extra to cook and save.`);
  lines.push(
    `Give exact amounts for ${inp.people}. Give oven and doneness temperatures in °F and °C.`,
    '',
    'Use exactly this layout and nothing else:',
    'INGREDIENTS',
    IMPERIAL ? '- 1 lb | ground turkey' : '- 500 g | minced turkey',
    '- 2 cloves | garlic, minced',
    'STEPS',
    '1. First step.',
    '2. Next step.',
    'TIP',
    'One sentence about leftovers or saving money.',
  );
  return lines.join('\n');
}

/** Pulls every complete top-level {...} object out of streamed text. */
function extractObjects(text) {
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

function mealType(v) {
  const s = String(v || '').toLowerCase();
  if (s.startsWith('break')) return 'Breakfast';
  if (s.startsWith('lunch')) return 'Lunch';
  if (s.startsWith('din') || s.startsWith('sup')) return 'Dinner';
  return null;
}
function normMeal(o, inp) {
  const day = Math.round(num(o.day));
  const type = mealType(o.meal || o.type);
  const name = str(o.name || o.dish, 120);
  if (!day || day > inp.days || !type || !inp.meals.includes(type) || !name) return null;
  return {
    day, type, name,
    about: str(o.about || o.description, 220),
    minutes: clampInt(num(o.minutes), 0, 600, 0),
    leftovers: o.leftovers === true || o.leftovers === 'true',
    recipe: null,
  };
}
function mergeMeals(inp, lists) {
  const byKey = new Map();
  for (const list of lists) for (const m of list) {
    const k = `${m.day}|${m.type}`;
    if (!byKey.has(k)) byKey.set(k, m);
  }
  return slotsFor(inp).map((s) => byKey.get(`${s.day}|${s.type}`)).filter(Boolean);
}
function normAisle(a) {
  const s = String(a || '').toLowerCase();
  if (/produce|fruit|veg/.test(s)) return 'Produce';
  if (/meat|seafood|fish|poultry|deli|butcher/.test(s)) return 'Meat & Seafood';
  if (/dairy|egg|milk|cheese/.test(s)) return 'Dairy & Eggs';
  if (/bak|bread/.test(s)) return 'Bakery';
  if (/frozen/.test(s)) return 'Frozen';
  if (/pantry|dry|can|grain|pasta|rice|baking|condiment|spice|snack|cereal/.test(s)) return 'Pantry';
  return 'Other';
}
function normItem(o, mealCount) {
  const item = str(o.item || o.name, 80);
  if (!item) return null;
  const rawUses = Array.isArray(o.uses) ? o.uses : String(o.uses || '').split(/[^\d]+/);
  const uses = [...new Set(rawUses.map((n) => Math.round(Number(n))).filter((n) => n >= 1 && n <= mealCount))];
  return { aisle: normAisle(o.aisle), item, size: str(o.size || o.qty, 40), price: Math.min(num(o.price), 999), uses, got: false };
}
function dedupeItems(items) {
  const seen = new Set();
  return items.filter((it) => {
    const k = it.item.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function parseRecipe(text) {
  const r = { ingredients: [], steps: [], tip: '' };
  let section = null;
  for (const raw of text.split('\n')) {
    let line = raw.trim().replace(/^#+\s*/, '').replace(/\*\*/g, '');
    if (!line) continue;
    const head = line.replace(/[:*_]/g, '').trim().toUpperCase();
    if (head === 'INGREDIENTS') { section = 'i'; continue; }
    if (['STEPS', 'INSTRUCTIONS', 'METHOD', 'DIRECTIONS'].includes(head)) { section = 's'; continue; }
    if (head === 'TIP' || head === 'TIPS') { section = 't'; continue; }
    if (section === 'i') {
      line = line.replace(/^[-*•]\s*/, '');
      const parts = line.split('|');
      if (parts.length > 1) r.ingredients.push({ qty: parts[0].trim(), item: parts.slice(1).join('|').trim() });
      else {
        const m = /^([\d½¼¾⅓⅔⅛.\/\s-]+(?:\s*(?:lb|lbs|oz|g|kg|ml|l|cups?|tbsp|tsp|cloves?|cans?|pinch|bunch|slices?|heads?|large|medium|small)\b\.?)?)\s+(.+)$/i.exec(line);
        r.ingredients.push(m ? { qty: m[1].trim(), item: m[2].trim() } : { qty: '', item: line });
      }
    } else if (section === 's') {
      r.steps.push(line.replace(/^(\d+[.)]|[-*•])\s*/, ''));
    } else if (section === 't') {
      r.tip = (r.tip ? r.tip + ' ' : '') + line;
    }
  }
  return r;
}

// ---------------------------------------------------------------------------
// Running Gemma
// ---------------------------------------------------------------------------
function friendlyError(e) {
  if (!e) return 'Something went wrong. Try again.';
  if (e.code === 'not_downloaded') return 'Download Gemma 4 first (the card at the top of this page).';
  if (e.code === 'runtime' || e.code === 'engine') return e.message;
  if (e.code === 'parse') return e.message;
  const detail = String((e && e.message) || '').slice(0, 160);
  if (/timed out/i.test(detail)) {
    return 'Gemma took too long on this phone. Close other apps, try fewer days or meals, then try again.';
  }
  return `Gemma stopped unexpectedly${detail ? ` (${detail})` : ''}. Close other apps, then try again.`;
}

async function ensureLoaded() {
  if (gemma.isLoaded()) return;
  state.model.phase = 'loading';
  renderModelCard();
  try {
    await gemma.load();
    state.model.phase = 'loaded';
  } catch (e) {
    state.model.phase = e.code === 'not_downloaded' ? 'absent' : 'downloaded';
    throw e;
  } finally {
    renderModelCard();
  }
}

let renderQueued = false;
function queueProgress() {
  if (renderQueued) return;
  renderQueued = true;
  requestAnimationFrame(() => { renderQueued = false; renderProgress(); });
}

async function makePlan() {
  if (state.job) return;
  const inp = clone(state.inputs);
  const err = $('#planError');
  err.hidden = true;
  const fail = (msg) => { err.replaceChildren(h('strong', null, 'Can’t make the plan. '), msg); err.hidden = false; };
  if (!inp.meals.length) return fail('Pick at least one meal each day.');
  if (!(inp.budget > 0)) { $('#budget').focus(); return fail('Enter a grocery budget above zero.'); }
  if (state.model.phase === 'unsupported') return fail(state.model.message);
  if (!modelReady()) {
    $('#modelCard').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    return fail('Download Gemma 4 first. It only takes one download, then it works offline.');
  }

  const store = state.store ? clone(state.store) : null;
  const job = state.job = { kind: 'plan', step: 'wake', abort: new AbortController(), meals: [], items: [], wanted: slotsFor(inp) };
  updateCta();
  renderProgress();
  keepAwake('job', true);
  $('#progress').scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });

  try {
    await ensureLoaded();
    if (job.abort.signal.aborted) throw Object.assign(new Error('Stopped'), { code: 'cancelled' });

    job.step = 'meals';
    queueProgress();
    const runMeals = async (wanted, already) => {
      const text = await gemma.generate(planPrompt(inp, store, wanted, already), {
        signal: job.abort.signal,
        temperature: 0.7,
        maxOutputTokens: Math.min(2400, 80 * wanted.length + 200),
        onText: (t) => {
          const found = extractObjects(t).map((o) => normMeal(o, inp)).filter(Boolean);
          job.meals = mergeMeals(inp, [already || [], found]);
          queueProgress();
        },
      });
      return extractObjects(text).map((o) => normMeal(o, inp)).filter(Boolean);
    };
    let meals = mergeMeals(inp, [await runMeals(job.wanted, null)]);
    const missing = job.wanted.filter((s) => !meals.some((m) => m.day === s.day && m.type === s.type));
    if (missing.length && meals.length) {
      const more = await runMeals(missing, meals);
      meals = mergeMeals(inp, [meals, more]);
    }
    if (!meals.length) throw Object.assign(new Error('Gemma’s answer didn’t come out as a meal plan. Tap Make my meal plan to try again.'), { code: 'parse' });
    job.meals = meals;

    job.step = 'list';
    queueProgress();
    const items = await runList(inp, store, meals, null, job);
    if (!items.length) throw Object.assign(new Error('Gemma’s shopping list didn’t come out right. Tap Make my meal plan to try again.'), { code: 'parse' });

    state.record = { id: String(Date.now()), example: false, createdAt: new Date().toISOString(), inputs: inp, store, meals, list: items };
    save();
    job.step = 'done';
    toast('Your plan is ready');
    go('meals');
  } catch (e) {
    if (e && e.code !== 'cancelled') fail(friendlyError(e));
  } finally {
    state.job = null;
    keepAwake('job', false);
    renderProgress();
    updateCta();
    updateBadge();
  }
}

async function runList(inp, store, meals, cheaper, job) {
  const text = await gemma.generate(listPrompt(inp, store, meals, cheaper), {
    signal: job.abort.signal,
    temperature: 0.3,
    maxOutputTokens: 2200,
    onText: (t) => {
      job.items = dedupeItems(extractObjects(t).map((o) => normItem(o, meals.length)).filter(Boolean));
      queueProgress();
    },
  });
  return dedupeItems(extractObjects(text).map((o) => normItem(o, meals.length)).filter(Boolean));
}

async function makeCheaper() {
  const rec = state.record;
  if (state.job || rec.example) return;
  if (!modelReady()) { go('plan'); return; }
  const total = listTotal(rec);
  const job = state.job = { kind: 'cheaper', step: 'list', abort: new AbortController(), meals: rec.meals, items: [], wanted: [] };
  keepAwake('job', true);
  renderMeals();
  try {
    await ensureLoaded();
    const items = await runList(rec.inputs, rec.store, rec.meals, total, job);
    if (!items.length) throw Object.assign(new Error('Gemma’s new list didn’t come out right. Try again.'), { code: 'parse' });
    rec.list = items;
    save();
    toast(`New list: ${moneyFmt(rec.inputs.currency)(listTotal(rec))}`);
  } catch (e) {
    if (e && e.code !== 'cancelled') toast(friendlyError(e));
  } finally {
    state.job = null;
    keepAwake('job', false);
    renderMeals();
    updateBadge();
    updateCta();
  }
}

function renderProgress() {
  const box = $('#progress');
  const job = state.job;
  if (!job || job.kind !== 'plan') { box.replaceChildren(); return; }
  const money = moneyFmt(state.inputs.currency);
  const order = ['wake', 'meals', 'list'];
  const at = order.indexOf(job.step);
  const stepRow = (key, label, detail) => {
    const i = order.indexOf(key);
    const cls = i < at || job.step === 'done' ? 'done' : i === at ? 'active' : '';
    const mark = cls === 'done' ? h('span', { class: 'dot' }, icon('check')) : cls === 'active' ? h('span', { class: 'spinner' }) : h('span', { class: 'dot' });
    return h('li', { class: cls }, mark, h('div', null, label, detail ? h('small', null, detail) : null));
  };
  const itemsTotal = job.items.reduce((a, it) => a + it.price, 0);
  const card = h('div', { class: 'glass job' },
    h('div', { class: 'job-head' },
      h('div', { class: 'job-title' }, 'Gemma is cooking up your week'),
      h('button', { type: 'button', class: 'btn small plain', onclick: () => job.abort.abort() }, 'Stop')),
    h('ul', { class: 'steps' },
      stepRow('wake', 'Waking Gemma on your iPhone', job.step === 'wake' ? 'Loading the model onto the GPU' : null),
      stepRow('meals', 'Planning meals', job.meals.length ? `${job.meals.length} of ${job.wanted.length}` : null),
      stepRow('list', 'Pricing your shopping list', job.items.length ? `${plural(job.items.length, 'item', 'items')} · ${money(itemsTotal)} so far` : null)),
    job.meals.length ? h('ul', { class: 'feed', 'aria-label': 'Meals so far' },
      job.meals.map((m) => h('li', null, h('span', null, `Day ${m.day} · ${m.type}`), h('span', null, m.name)))) : null,
  );
  box.replaceChildren(card);
}

// ---------------------------------------------------------------------------
// Stores tab
// ---------------------------------------------------------------------------
let searchCtl = null;

async function searchNearMe() {
  const s = state.search;
  if (searchCtl) searchCtl.abort();
  searchCtl = new AbortController();
  const signal = searchCtl.signal;
  s.phase = 'locating'; s.message = '';
  renderStores();
  try {
    const pos = await stores.locate();
    s.origin = { lat: pos.lat, lon: pos.lon };
    s.label = 'your location';
    await runStoreSearch(signal);
  } catch (e) {
    if (signal.aborted) return;
    s.phase = 'error'; s.message = e.message;
    renderStores();
  }
}

async function searchPlace(query) {
  const s = state.search;
  const q = query.trim();
  if (!q) return;
  if (searchCtl) searchCtl.abort();
  searchCtl = new AbortController();
  const signal = searchCtl.signal;
  s.phase = 'searching'; s.message = ''; s.query = q;
  renderStores();
  try {
    const place = await stores.geocode(q, REGION, signal);
    s.origin = { lat: place.lat, lon: place.lon };
    s.label = place.label;
    state.inputs.area = place.postcode || q;
    await runStoreSearch(signal);
  } catch (e) {
    if (signal.aborted) return;
    s.phase = 'error'; s.message = e.message || 'That search didn’t work. Try again.';
    renderStores();
  }
}

async function runStoreSearch(signal) {
  const s = state.search;
  s.phase = 'searching';
  renderStores();
  const items = await stores.findStores(s.origin, state.radius, signal);
  s.items = items;
  s.phase = 'done';
  save();
  renderStores();
}

function pickStore(st) {
  if (state.store && state.store.id === st.id) {
    state.store = null;
  } else {
    state.store = {
      id: st.id, name: st.name, brand: st.brand, kindLabel: st.kindLabel, lat: st.lat, lon: st.lon,
      city: st.city, level: st.level, distLabel: stores.formatDistance(st.dist, MILES),
    };
    if (st.postcode || st.city) state.inputs.area = st.postcode || st.city;
    toast(`Shopping at ${st.name}`);
  }
  save();
  renderStores();
  renderStoreRow();
}

function renderStores() {
  const box = $('#storesBody');
  const s = state.search;
  const busy = s.phase === 'locating' || s.phase === 'searching';
  const placeInput = h('input', { type: 'search', id: 'placeQuery', placeholder: 'ZIP code or city', autocomplete: 'postal-code', enterkeyhint: 'search', value: s.query || '' });
  placeInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); searchPlace(placeInput.value); } });

  const radius = h('div', { class: 'segmented', role: 'radiogroup', 'aria-label': 'Search distance' },
    RADII.map((r) => h('button', {
      type: 'button', role: 'radio', 'aria-checked': state.radius === r.m ? 'true' : 'false',
      onclick: () => {
        state.radius = r.m;
        save();
        if (s.origin && !busy) {
          if (searchCtl) searchCtl.abort();
          searchCtl = new AbortController();
          const sig = searchCtl.signal;
          runStoreSearch(sig).catch((e) => { if (!sig.aborted) { s.phase = 'error'; s.message = e.message; renderStores(); } });
        } else renderStores();
      },
    }, r.label)));

  const search = h('div', { class: 'glass search-card' },
    h('button', { type: 'button', class: 'btn primary block', disabled: busy, onclick: searchNearMe }, icon('locate'), s.phase === 'locating' ? 'Finding you…' : 'Find stores near me'),
    h('div', { class: 'or' }, 'or'),
    h('div', { class: 'search-row' }, placeInput,
      h('button', { type: 'button', class: 'btn tinted', disabled: busy, onclick: () => searchPlace(placeInput.value) }, icon('search'), 'Search')),
    h('div', { class: 'radius' }, h('span', { class: 'row-label', style: 'font-size:15px' }, 'Within'), radius),
  );

  const parts = [search];
  if (s.phase === 'error') {
    parts.push(h('div', { class: 'alert', role: 'alert' }, s.message));
  }
  if (busy) {
    parts.push(h('div', { class: 'results-head' }, h('h2', null, s.phase === 'locating' ? 'Finding your location' : 'Looking for grocery stores')),
      h('div', { class: 'glass group', 'aria-busy': 'true' }, [1, 2, 3, 4].map(() => h('div', { class: 'skeleton' }))));
  } else if (s.phase === 'done') {
    const radiusLabel = (RADII.find((r) => r.m === state.radius) || RADII[2]).label;
    parts.push(h('div', { class: 'results-head' },
      h('h2', null, s.items.length ? plural(s.items.length, 'grocery store', 'grocery stores') : 'No stores found'),
      h('span', null, `within ${radiusLabel} of ${s.label || 'you'}`)));
    if (!s.items.length) {
      parts.push(h('div', { class: 'glass empty' }, icon('basket'), h('p', null, 'No grocery stores are mapped that close. Try a wider distance.')));
    } else {
      parts.push(h('div', { class: 'glass group' }, s.items.map((st) => storeRow(st))));
    }
  } else if (s.phase === 'idle') {
    parts.push(h('div', { class: 'glass empty', style: 'margin-top:16px' }, icon('pin'),
      h('p', null, 'Find the grocery stores around you, then pick the one you’ll shop at. Gemma prices your list for that store.')));
  }

  const typed = h('input', { type: 'text', id: 'storeText', placeholder: 'Type a store name', value: state.inputs.storeText || '', autocomplete: 'off' });
  typed.addEventListener('input', () => {
    state.inputs.storeText = typed.value.slice(0, 60);
    if (typed.value.trim() && state.store) { state.store = null; renderStoreRowOnly(); }
    save();
    renderStoreRow();
  });
  parts.push(
    h('h2', { class: 'group-label' }, 'Not on the list?'),
    h('div', { class: 'glass group' }, h('div', { class: 'row stack' }, h('label', { class: 'row-label', for: 'storeText' }, 'Store you’ll shop at'), typed)),
    h('p', { class: 'attribution' }, 'Store data © ', h('a', { href: 'https://www.openstreetmap.org/copyright', target: '_blank', rel: 'noopener' }, 'OpenStreetMap'), ' contributors'),
  );
  box.replaceChildren(...parts);
}
function renderStoreRowOnly() {
  for (const el of document.querySelectorAll('.store.selected')) el.classList.remove('selected');
}

function storeRow(st) {
  const selected = state.store && state.store.id === st.id;
  const level = ['', '$ Budget', '$$', '$$$'][st.level || 0];
  const hours = stores.hoursLabel(st.hours);
  return h('div', { class: 'store' + (selected ? ' selected' : '') },
    h('div', { class: 'avatar', style: `--h:${hueOf(st.brand || st.name)}` }, (st.brand || st.name).charAt(0).toUpperCase()),
    h('div', { class: 'store-info' },
      h('div', { class: 'store-name' }, st.name),
      h('div', { class: 'store-meta' }, `${st.kindLabel} · ${stores.formatDistance(st.dist, MILES)}`),
      st.address ? h('div', { class: 'store-addr' }, st.address) : null,
      h('div', { class: 'store-tags' },
        level ? h('span', { class: `pill ${st.level === 1 ? 'good' : ''}` }, level) : null,
        hours ? h('span', { class: 'pill' }, hours) : null,
        h('a', { href: stores.directionsUrl(st), target: '_blank', rel: 'noopener' }, icon('directions'), 'Directions'))),
    h('button', {
      type: 'button', class: 'pick', 'aria-pressed': selected ? 'true' : 'false',
      'aria-label': selected ? `Stop shopping at ${st.name}` : `Shop at ${st.name}`,
      onclick: () => pickStore(st),
    }, icon('check')),
  );
}

// ---------------------------------------------------------------------------
// Meals tab
// ---------------------------------------------------------------------------
function listTotal(rec) {
  return rec.list.reduce((a, it) => a + (Number(it.price) || 0), 0);
}
function mealCosts(rec) {
  const n = rec.meals.length;
  const costs = new Array(n).fill(0);
  if (!n) return costs;
  for (const it of rec.list) {
    const targets = (it.uses || []).filter((u) => u >= 1 && u <= n);
    const use = targets.length ? targets : rec.meals.map((_, i) => i + 1);
    for (const u of use) costs[u - 1] += (Number(it.price) || 0) / use.length;
  }
  return costs;
}

function recordMeta(rec) {
  const inp = rec.inputs;
  const bits = [plural(inp.people, 'person', 'people'), plural(inp.days, 'day', 'days'), inp.meals.join(', ')];
  const where = rec.store ? rec.store.name : inp.storeText;
  if (where) bits.push(where);
  return bits.join(' · ');
}

function renderMeals() {
  const box = $('#mealsBody');
  const rec = state.record;
  const inp = rec.inputs;
  const money = moneyFmt(inp.currency);
  const total = listTotal(rec);
  const servings = Math.max(1, inp.people * rec.meals.length);
  const ratio = inp.budget > 0 ? total / inp.budget : 0;
  const diff = inp.budget - total;
  const tone = diff < -0.005 ? 'bad' : ratio > 0.93 ? 'warn' : 'good';
  const verdict = tone === 'bad' ? `${money(-diff)} over budget` : tone === 'warn' ? `${money(diff)} to spare` : `${money(diff)} under budget`;
  const costs = mealCosts(rec);

  const C = 2 * Math.PI * 41;
  const ring = h('div', { class: `ring ${tone}`, role: 'img', 'aria-label': `Cart is ${Math.round(ratio * 100)} percent of the budget` });
  ring.innerHTML = `<svg viewBox="0 0 96 96"><circle class="track" cx="48" cy="48" r="41"/><circle class="val" cx="48" cy="48" r="41" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.min(1, ratio))).toFixed(1)}"/></svg>`;
  ring.append(h('div', { class: 'ring-label' }, h('div', null, h('b', null, `${Math.round(ratio * 100)}%`), h('small', null, 'of budget'))));

  const cheaperBusy = state.job && state.job.kind === 'cheaper';
  const parts = [
    h('header', { class: 'hero' },
      h('p', { class: 'kicker' }, rec.example ? 'Example plan' : rec.createdAt ? 'Made ' + new Date(rec.createdAt).toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }) : 'Your plan'),
      h('h1', { class: 'large-title', id: 'meals-title' }, 'Meals'),
      h('p', { class: 'meta-line' }, recordMeta(rec))),
  ];
  if (rec.example) {
    parts.push(h('div', { class: 'example-banner' }, h('span', null, h('b', null, 'This is a sample. '), 'Set up your week on the Plan tab and Gemma will make yours.')));
  }
  parts.push(h('div', { class: 'glass summary' },
    ring,
    h('div', { class: 'sum-stats' },
      h('div', { class: 'stat' }, h('span', null, 'Est. cart'), h('b', null, money(total))),
      h('div', { class: 'stat' }, h('span', null, 'Budget'), h('b', null, money(inp.budget))),
      h('div', { class: 'stat' }, h('span', null, 'Per serving'), h('b', null, money(total / servings))),
      h('div', { class: 'stat' }, h('span', null, 'Items'), h('b', null, String(rec.list.length)))),
    h('div', { class: 'sum-verdict' },
      h('span', { class: `pill ${tone}` }, verdict),
      tone === 'bad' && !rec.example
        ? h('button', { type: 'button', class: 'btn small tinted', disabled: !!state.job, onclick: makeCheaper },
          cheaperBusy ? h('span', { class: 'spinner', style: 'width:16px;height:16px;border-width:2px' }) : icon('refresh'),
          cheaperBusy ? 'Gemma is trimming…' : 'Make it cheaper')
        : null),
  ));

  let lastDay = 0;
  let group = null;
  rec.meals.forEach((meal, idx) => {
    if (meal.day !== lastDay) {
      lastDay = meal.day;
      parts.push(h('h2', { class: 'day-title' }, `Day ${meal.day}`));
      group = h('div', { class: 'glass group' });
      parts.push(group);
    }
    group.append(h('button', { type: 'button', class: 'meal', onclick: () => openMeal(idx) },
      h('div', { class: `plate ${meal.type.toLowerCase()}` }, icon(dishIcon(meal))),
      h('div', { class: 'meal-text' },
        h('span', { class: 'meal-type' }, meal.type),
        h('span', { class: 'meal-name' }, meal.name),
        meal.about ? h('span', { class: 'meal-about' }, meal.about) : null,
        (meal.minutes || meal.leftovers || meal.recipe) ? h('span', { class: 'meal-chips' },
          meal.minutes ? h('span', { class: 'pill' }, icon('clock'), `${meal.minutes} min`) : null,
          meal.leftovers ? h('span', { class: 'pill accent' }, icon('leftovers'), 'Leftovers') : null,
          meal.recipe ? h('span', { class: 'pill good' }, icon('check'), 'Recipe') : null) : null),
      h('span', { class: 'meal-price' }, h('b', null, money(costs[idx])), icon('chevron', 'chev')),
    ));
  });

  parts.push(h('div', { class: 'foot-actions' },
    h('button', { type: 'button', class: 'btn plain block', onclick: () => go('list') }, icon('basket'), 'Shopping list'),
    h('button', { type: 'button', class: 'btn tinted block', onclick: () => go('plan') }, rec.example ? 'Make my own plan' : 'Make a new plan'),
    h('p', { class: 'fine' }, 'Meal prices split the shopping list across the meals that use each item. Prices are Gemma’s estimates.')));
  box.replaceChildren(...parts);
}

// ---------------------------------------------------------------------------
// Recipe sheet
// ---------------------------------------------------------------------------
let sheetCtl = null;
const sheet = $('#sheet');
sheet.addEventListener('close', () => { if (sheetCtl) sheetCtl.abort(); });
sheet.addEventListener('click', (e) => { if (e.target === sheet) sheet.close(); });

function openMeal(idx) {
  const rec = state.record;
  const meal = rec.meals[idx];
  if (!meal) return;
  const money = moneyFmt(rec.inputs.currency);
  const cost = mealCosts(rec)[idx];
  const body = h('div', { class: 'sheet-body', style: 'display:flex;flex-direction:column;gap:16px' });
  const scroll = h('div', { class: 'sheet-scroll' },
    h('div', { class: 'sheet-head' },
      h('div', { class: `plate ${meal.type.toLowerCase()}` }, icon(dishIcon(meal))),
      h('div', null,
        h('span', { class: 'meal-type' }, `Day ${meal.day} · ${meal.type}`),
        h('h2', { id: 'sheetTitle' }, meal.name),
        meal.about ? h('p', null, meal.about) : null),
      h('button', { type: 'button', class: 'close', 'aria-label': 'Close', onclick: () => sheet.close() }, icon('close'))),
    h('div', { class: 'facts' },
      h('span', { class: 'pill' }, icon('people'), `Serves ${rec.inputs.people}`),
      meal.minutes ? h('span', { class: 'pill' }, icon('clock'), `${meal.minutes} min`) : null,
      h('span', { class: 'pill good' }, `≈ ${money(cost)} of groceries`),
      meal.leftovers ? h('span', { class: 'pill accent' }, icon('leftovers'), 'Uses leftovers') : null),
    body,
  );
  sheet.replaceChildren(h('div', { class: 'handle', 'aria-hidden': 'true' }), scroll);
  if (!sheet.open) sheet.showModal();
  fillRecipe(rec, idx, body);
}

function recipeView(r, people, writing) {
  const nodes = [];
  if (r.ingredients.length) {
    nodes.push(h('h3', { class: 'rx-h' }, `Ingredients for ${people}`),
      h('ul', { class: 'rx-ing' }, r.ingredients.map((i) => h('li', null, h('span', { class: 'q' }, i.qty || '—'), h('span', null, i.item)))));
  }
  if (r.steps.length) {
    nodes.push(h('h3', { class: 'rx-h' }, 'Steps'), h('ol', { class: 'rx-steps' }, r.steps.map((s, i) =>
      h('li', { class: writing && i === r.steps.length - 1 && !r.tip ? 'cursor' : '' }, h('span', null, s)))));
  }
  if (r.tip) nodes.push(h('p', { class: 'rx-tip' }, h('b', null, 'Tip: '), r.tip));
  return nodes;
}

async function fillRecipe(rec, idx, body) {
  const meal = rec.meals[idx];
  const people = rec.inputs.people;
  if (meal.recipe) { body.replaceChildren(...recipeView(meal.recipe, people, false)); return; }
  if (state.job) {
    body.replaceChildren(h('p', { class: 'model-text' }, 'Gemma is busy with your plan. Open this meal again when it’s done and the recipe will be written then.'));
    return;
  }
  if (!modelReady()) {
    body.replaceChildren(
      h('p', { class: 'model-text' }, 'Recipes are written by Gemma 4 on your iPhone. Download it first on the Plan tab.'),
      h('button', { type: 'button', class: 'btn primary', onclick: () => { sheet.close(); go('plan'); } }, icon('download'), 'Get Gemma 4'));
    return;
  }
  sheetCtl = new AbortController();
  const signal = sheetCtl.signal;
  const status = h('div', { class: 'writing' }, h('div', { class: 'spinner' }), gemma.isLoaded() ? 'Gemma is writing this recipe…' : 'Waking Gemma up…');
  body.replaceChildren(status);
  keepAwake('recipe', true);
  try {
    await ensureLoaded();
    status.lastChild.textContent = 'Gemma is writing this recipe…';
    const text = await gemma.generate(recipePrompt(rec, idx), {
      signal, temperature: 0.5, maxOutputTokens: 900,
      onText: (t) => {
        const r = parseRecipe(t);
        if (r.ingredients.length || r.steps.length) body.replaceChildren(...recipeView(r, people, true));
      },
    });
    const r = parseRecipe(text);
    if (!r.ingredients.length || !r.steps.length) throw Object.assign(new Error('The recipe didn’t come out right. Close this and open the meal again to retry.'), { code: 'parse' });
    meal.recipe = r;
    save();
    body.replaceChildren(...recipeView(r, people, false));
    if (currentTab() === 'meals') renderMeals();
  } catch (e) {
    if (e && e.code === 'cancelled') return;
    body.replaceChildren(h('p', { class: 'alert' }, friendlyError(e)),
      h('button', { type: 'button', class: 'btn tinted', onclick: () => fillRecipe(rec, idx, body) }, icon('refresh'), 'Try again'));
  } finally {
    keepAwake('recipe', false);
    sheetCtl = null;
  }
}

// ---------------------------------------------------------------------------
// List tab
// ---------------------------------------------------------------------------
function updateBadge() {
  const left = state.record.example ? 0 : state.record.list.filter((it) => !it.got).length;
  const b = $('#listBadge');
  b.hidden = !left;
  b.textContent = String(left);
}

function listText(rec) {
  const money = moneyFmt(rec.inputs.currency);
  const lines = [`Shopping list${rec.store ? ` for ${rec.store.name}` : ''}`, ''];
  for (const aisle of AISLES) {
    const items = rec.list.filter((it) => it.aisle === aisle);
    if (!items.length) continue;
    lines.push(aisle.toUpperCase());
    for (const it of items) lines.push(`${it.got ? '✓' : '○'} ${it.item}${it.size ? ` (${it.size})` : ''} ${money(it.price)}`);
    lines.push('');
  }
  lines.push(`Estimated total: ${money(listTotal(rec))}`);
  return lines.join('\n');
}

function renderList() {
  const box = $('#listBody');
  const rec = state.record;
  const money = moneyFmt(rec.inputs.currency);
  const total = listTotal(rec);
  const got = rec.list.filter((it) => it.got);
  const gotTotal = got.reduce((a, it) => a + it.price, 0);
  const pct = rec.list.length ? (got.length / rec.list.length) * 100 : 0;

  const parts = [
    h('header', { class: 'hero' },
      h('p', { class: 'kicker' }, rec.store ? rec.store.name : rec.inputs.storeText || 'Your store'),
      h('h1', { class: 'large-title', id: 'list-title' }, 'Shopping list'),
      h('p', { class: 'meta-line' }, recordMeta(rec))),
  ];
  if (rec.example) parts.push(h('div', { class: 'example-banner' }, h('span', null, h('b', null, 'Sample list. '), 'Your own list appears here after Gemma makes your plan.')));
  const summaryText = h('span', null, `${got.length} of ${rec.list.length} in your cart`);
  const summaryBar = h('span', { style: `width:${pct.toFixed(1)}%` });
  parts.push(h('div', { class: 'glass list-summary' },
    h('div', { class: 'top' }, h('b', null, money(total)), h('span', null, 'estimated total')),
    h('div', { class: 'bar good' }, summaryBar),
    h('div', { class: 'progress-meta' }, summaryText, h('span', null, `${money(gotTotal)} picked up`))));

  for (const aisle of AISLES) {
    const items = rec.list.filter((it) => it.aisle === aisle);
    if (!items.length) continue;
    parts.push(h('h2', { class: 'group-label' }, aisle));
    parts.push(h('div', { class: 'glass group' }, items.map((it) => {
      const cb = h('input', { type: 'checkbox', 'aria-label': `${it.item}${it.size ? `, ${it.size}` : ''}` });
      cb.checked = !!it.got;
      const row = h('label', { class: 'item' + (it.got ? ' got' : '') },
        cb, h('span', { class: 'check' }, icon('check')),
        h('span', { class: 'item-text' }, h('b', null, it.item), it.size ? h('span', null, it.size) : null),
        h('span', { class: 'item-price' }, money(it.price)));
      cb.addEventListener('change', () => {
        it.got = cb.checked;
        row.classList.toggle('got', cb.checked);
        const g = rec.list.filter((x) => x.got);
        summaryText.textContent = `${g.length} of ${rec.list.length} in your cart`;
        summaryText.nextSibling.textContent = `${money(g.reduce((a, x) => a + x.price, 0))} picked up`;
        summaryBar.style.width = `${((g.length / rec.list.length) * 100).toFixed(1)}%`;
        if (navigator.vibrate) navigator.vibrate(8);
        save();
        updateBadge();
      });
      return row;
    })));
  }

  const shareBtn = h('button', { type: 'button', class: 'btn primary' }, icon('share'), 'Share list');
  shareBtn.addEventListener('click', async () => {
    const text = listText(rec);
    if (navigator.share) {
      try { await navigator.share({ title: 'Shopping list', text }); return; } catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(text); toast('List copied'); } catch (e) { toast('Couldn’t copy the list'); }
  });
  const untick = h('button', { type: 'button', class: 'btn plain' }, 'Untick all');
  untick.addEventListener('click', () => {
    rec.list.forEach((it) => { it.got = false; });
    save();
    updateBadge();
    renderList();
  });
  parts.push(h('div', { class: 'list-actions' }, shareBtn, untick),
    h('p', { class: 'fine', style: 'margin-top:14px' }, 'Prices are Gemma’s estimates for your store. Check shelf prices as you shop.'));
  box.replaceChildren(...parts);
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
loadSaved();
buildForm();
syncForm();
renderPerServing();
renderStoreRow();
renderModelCard();
updateCta();
updateBadge();
showTab();
refreshModelState();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch(() => { /* offline support is optional */ });
}

// For automated checks only.
window.__cartcook = { state, extractObjects, parseRecipe, normMeal, normItem, mealCosts, planPrompt, listPrompt, recipePrompt, makePlan, renderStores, renderMeals, renderList, go };
