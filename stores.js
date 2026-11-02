// Finds grocery stores near a ZIP code using OpenStreetMap data: Nominatim turns the ZIP
// into a point, Overpass lists the stores around it.

const OVERPASS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

const KIND_LABEL = {
  supermarket: 'Supermarket',
  grocery: 'Grocery store',
  greengrocer: 'Produce market',
  wholesale: 'Warehouse club',
  health_food: 'Health food store',
};

// Rough price level of well-known chains: 1 budget, 2 mid-priced, 3 pricier.
const PRICE_LEVEL = [
  [1, ['aldi', 'lidl', 'winco', 'save a lot', 'save-a-lot', 'grocery outlet', 'food 4 less', 'foodmaxx', 'walmart',
    'costco', "sam's club", 'market basket', 'price rite', 'food lion', 'smart & final', 'fiesta mart', 'el super',
    'no frills', 'freshco', 'food basics', 'real canadian superstore', 'asda', 'iceland', 'bj\'s wholesale']],
  [2, ['kroger', 'meijer', 'publix', 'safeway', 'albertsons', 'stop & shop', 'giant', 'hy-vee', 'target',
    "trader joe's", 'trader joes', "smith's", 'ralphs', 'fred meyer', 'harris teeter', 'wegmans', 'shoprite',
    'piggly wiggly', 'winn-dixie', 'winn dixie', 'h-e-b', 'heb', 'vons', 'jewel-osco', 'king soopers', "fry's",
    'food city', 'ingles', 'weis', 'hannaford', 'price chopper', 'tops', 'acme', 'shaw\'s', 'raley\'s',
    'stater bros', 'schnucks', 'dierbergs', 'festival foods', 'pick \'n save', "mariano's", 'big y', 'brookshire',
    'lowes foods', 'sprouts', 'tesco', "sainsbury's", 'morrisons', 'co-op', 'loblaws', 'sobeys', 'metro',
    'coles', 'woolworths', 'iga', 'safeway', 'save mart', 'food maxx', 'hornbacher']],
  [3, ['whole foods', 'the fresh market', 'fresh market', 'erewhon', "gelson's", 'bristol farms', 'earth fare',
    'new seasons', 'natural grocers', 'waitrose', 'marks & spencer', 'm&s food', 'central market']],
];

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const PRICE_RULES = PRICE_LEVEL.flatMap(([level, names]) =>
  names.map((n) => [level, new RegExp(`(^|[^a-z])${escapeRe(n)}([^a-z]|$)`, 'i')]));

export function priceLevel(name, brand) {
  const text = `${brand || ''} ${name || ''}`;
  for (const [level, re] of PRICE_RULES) if (re.test(text)) return level;
  return 0;
}

// Each chain's own brands (what Gemma should put on the list) and where to see its real prices.
// Store sites were checked to open a search page; chains whose own site has no working search
// link go through their Instacart store page, which shows local prices once an address is set.
const SAFEWAY_DOMAINS = { safeway: 'safeway.com', albertsons: 'albertsons.com', vons: 'vons.com', jewel: 'jewelosco.com', acme: 'acmemarkets.com', shaw: 'shaws.com', 'tom thumb': 'tomthumb.com', randalls: 'randalls.com', pavilions: 'pavilions.com', 'star market': 'starmarket.com' };
const KROGER_DOMAINS = { ralphs: 'ralphs.com', 'fred meyer': 'fredmeyer.com', 'king soopers': 'kingsoopers.com', smith: 'smithsfoodanddrug.com', "fry's": 'frysfood.com', frys: 'frysfood.com', dillons: 'dillons.com', qfc: 'qfc.com', 'food 4 less': 'food4less.com', mariano: 'marianos.com', 'pick': 'picknsave.com', 'city market': 'citymarket.com' };
const domainIn = (map, name, fallback) => {
  const n = name.toLowerCase();
  for (const [key, domain] of Object.entries(map)) if (n.includes(key)) return domain;
  return fallback;
};
const ic = (slug) => (q) => `https://www.instacart.com/store/${slug}/s?k=${q}`;

const CHAINS = [
  { re: /walmart/i, brands: 'Great Value (pantry, dairy, frozen, canned), Marketside (produce, salads, bakery), Freshness Guaranteed (bakery)', search: (q) => `https://www.walmart.com/search?q=${q}`, site: 'Walmart' },
  { re: /target/i, brands: 'Good & Gather (most groceries), Favorite Day (bakery, snacks)', search: (q) => `https://www.target.com/s?searchTerm=${q}`, site: 'Target' },
  { re: /costco/i, brands: 'Kirkland Signature', search: (q) => `https://www.costco.com/s?keyword=${q}`, site: 'Costco' },
  { re: /sam'?s club/i, brands: "Member's Mark", search: (q) => `https://www.samsclub.com/search?q=${q}`, site: "Sam's Club" },
  { re: /\baldi\b/i, brands: "Goldhen (eggs), Friendly Farms (milk, yogurt), Happy Farms (cheese), Countryside Creamery (butter), Kirkwood (chicken), Never Any! (meat), Simply Nature (organic), Specially Selected (premium), Baker's Corner (baking), Millville (cereal), Season's Choice (frozen vegetables), Reggano (pasta, sauce), Dakota's Pride (canned beans), Casa Mamita (Mexican), Carlini (oil), Stonemill (spices), L'oven Fresh (bread)", search: ic('aldi'), site: 'Instacart' },
  { re: /\blidl\b/i, brands: 'Lidl, Preferred Selection (premium)' },
  { re: /trader joe/i, brands: "Trader Joe's", search: (q) => `https://www.traderjoes.com/home/search?q=${q}&section=products`, site: "Trader Joe's" },
  { re: /whole foods/i, brands: '365 by Whole Foods Market', search: (q) => `https://www.wholefoodsmarket.com/search?text=${q}`, site: 'Whole Foods' },
  { re: /publix/i, brands: 'Publix, GreenWise (organic)', search: (q) => `https://www.publix.com/search?searchTerm=${q}`, site: 'Publix' },
  { re: /\bh-?e-?b\b/i, brands: 'H-E-B, Hill Country Fare (value)', search: (q) => `https://www.heb.com/search?q=${q}`, site: 'H-E-B' },
  { re: /hy-?vee/i, brands: 'Hy-Vee', search: (q) => `https://www.hy-vee.com/aisles-online/search?search=${q}`, site: 'Hy-Vee' },
  { re: /sprouts/i, brands: 'Sprouts', search: ic('sprouts'), site: 'Instacart' },
  { re: /wegmans/i, brands: 'Wegmans', search: ic('wegmans'), site: 'Instacart' },
  { re: /meijer/i, brands: 'Meijer, True Goodness (organic)', search: ic('meijer'), site: 'Instacart' },
  { re: /food lion/i, brands: "Food Lion, Nature's Promise (organic)", search: ic('food-lion'), site: 'Instacart' },
  { re: /harris teeter/i, brands: 'Harris Teeter' },
  { re: /giant eagle|market district/i, brands: 'Giant Eagle, Market District (premium)' },
  { re: /stop ?& ?shop|\bgiant\b|hannaford/i, brands: "the store's own name brand, Nature's Promise (organic)" },
  { re: /shoprite/i, brands: 'Bowl & Basket, Wholesome Pantry (organic)' },
  { re: /ingles/i, brands: 'Laura Lynn' },
  { re: /winco/i, brands: 'WinCo Foods' },
  { re: /dollar general/i, brands: 'Clover Valley' },
  { re: /smart ?& ?final/i, brands: 'First Street' },
  { re: /safeway|albertsons|vons|jewel|acme|shaw'?s|tom thumb|randalls|pavilions|star market/i, brands: 'Signature Select, Signature Farms (meat, produce), Lucerne (dairy), O Organics (organic)', search: (q, name) => `https://www.${domainIn(SAFEWAY_DOMAINS, name, 'safeway.com')}/shop/search-results.html?q=${q}`, site: 'store' },
  { re: /kroger|ralphs|fred meyer|king soopers|smith'?s|fry'?s|dillons|qfc|food 4 less|mariano|pick ?'?n ?save|city market/i, brands: 'Kroger, Simple Truth (organic), Private Selection (premium), Heritage Farm (chicken)', search: (q, name) => `https://www.${domainIn(KROGER_DOMAINS, name, 'kroger.com')}/search?query=${q}`, site: 'store' },
];

/** The chain a store belongs to, with its own brands, or null if unknown. */
export function chainFor(store) {
  if (!store) return null;
  const text = `${store.brand || ''} ${store.name || ''}`;
  return CHAINS.find((c) => c.re.test(text)) || null;
}

/** Where to see the real price of an item: the store's site, its Instacart page, or a web search. */
export function priceLink(store, query, zip) {
  const q = encodeURIComponent(query.trim());
  const chain = chainFor(store);
  if (chain && chain.search) {
    const site = chain.site === 'store' ? store.name : chain.site;
    return { url: chain.search(q, store.name || ''), label: chain.site === 'Instacart' ? 'Price on Instacart' : `Price at ${site}`, instacart: chain.site === 'Instacart' };
  }
  const where = store ? store.name : zip ? `near ${zip}` : '';
  return { url: `https://www.google.com/search?q=${encodeURIComponent(`${query} price ${where}`.trim())}`, label: 'Look up price', instacart: false };
}

/** Turns a ZIP code, postcode or city into a point. */
export async function geocode(query, countryCode, signal) {
  const q = query.trim();
  const usZip = /^\d{5}(-\d{4})?$/.test(q);
  const base = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1';
  const urls = [];
  if (usZip) urls.push(`${base}&postalcode=${q.slice(0, 5)}&countrycodes=us`);
  else if (countryCode) urls.push(`${base}&q=${encodeURIComponent(q)}&countrycodes=${countryCode.toLowerCase()}`);
  urls.push(`${base}&q=${encodeURIComponent(q)}${usZip ? '&countrycodes=us' : ''}`);
  for (const url of urls) {
    const res = await fetch(url, { signal, headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error('The place search is busy. Try again in a moment.');
    const data = await res.json();
    if (Array.isArray(data) && data.length) {
      const hit = data[0];
      const a = hit.address || {};
      const label = [a.city || a.town || a.village || a.suburb || a.county, a.state].filter(Boolean).join(', ') || hit.display_name;
      return { lat: Number(hit.lat), lon: Number(hit.lon), label, postcode: a.postcode || '' };
    }
  }
  throw new Error(`No place with ZIP code “${query}” was found. Check the number and try again.`);
}

/** Asks the phone for its location. Rejects with a friendly message. */
export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This phone can’t share its location with Cart & Cook. Type your ZIP code instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => {
        if (err && err.code === 1) {
          reject(new Error('Location is off for Cart & Cook. Turn it on in Settings › Privacy & Security › Location Services, or type your ZIP code.'));
        } else {
          reject(new Error('Your location couldn’t be found just now. Try again, or type your ZIP code.'));
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/** The ZIP code and town at a point, for display and prices. */
export async function reverseZip(lat, lon, signal) {
  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=16&addressdetails=1`, { signal });
    if (!res.ok) return { postcode: '', label: '' };
    const a = (await res.json()).address || {};
    return { postcode: (a.postcode || '').slice(0, 10), label: [a.city || a.town || a.village || a.suburb || a.county, a.state].filter(Boolean).join(', ') };
  } catch (e) {
    if (signal && signal.aborted) throw e;
    return { postcode: '', label: '' };
  }
}

const sleep = (ms, signal) => new Promise((resolve, reject) => {
  const t = setTimeout(resolve, ms);
  if (signal) signal.addEventListener('abort', () => { clearTimeout(t); reject(new DOMException('Aborted', 'AbortError')); }, { once: true });
});

async function overpassStores(origin, radiusM, signal) {
  const r = Math.round(radiusM);
  const query = `[out:json][timeout:20];nwr["shop"~"^(supermarket|grocery|greengrocer|wholesale|health_food)$"](around:${r},${origin.lat},${origin.lon});out center tags 150;`;
  const ctl = new AbortController();
  const budget = setTimeout(() => ctl.abort(), 9000);
  const relay = () => ctl.abort();
  if (signal) signal.addEventListener('abort', relay, { once: true });
  try {
    for (const endpoint of OVERPASS) {
      try {
        const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: query }), signal: ctl.signal });
        if (!res.ok) continue;
        const data = await res.json();
        if (Array.isArray(data.elements)) return data.elements;
      } catch (e) {
        if (ctl.signal.aborted) break;
      }
    }
    return null;
  } finally {
    clearTimeout(budget);
    if (signal) signal.removeEventListener('abort', relay);
  }
}

// Nominatim answers "supermarket" inside a box, plus big chains by name. Its policy asks for
// at most one request a second, so the queries are spaced out.
async function nominatimStores(origin, radiusM, signal) {
  const box = (m) => {
    const dLat = m / 111320;
    const dLon = m / (111320 * Math.cos((origin.lat * Math.PI) / 180));
    return `${origin.lon - dLon},${origin.lat + dLat},${origin.lon + dLon},${origin.lat - dLat}`;
  };
  const ask = async (q, m) => {
    const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&bounded=1&limit=40&addressdetails=1&extratags=1&viewbox=${box(m)}&q=${encodeURIComponent(q)}`;
    const res = await fetch(url, { signal });
    if (!res.ok) throw new Error(`Place search answered ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  };
  const out = [];
  const first = await ask('supermarket', radiusM);
  out.push(...first);
  if (first.length >= 40) { await sleep(1100, signal); out.push(...(await ask('supermarket', radiusM / 2.5))); }
  for (const name of ['Walmart', 'Costco']) {
    await sleep(1100, signal);
    try { out.push(...(await ask(name, radiusM))); } catch (e) { if (signal && signal.aborted) throw e; }
  }
  const SHOPS = new Set(['supermarket', 'grocery', 'greengrocer', 'wholesale', 'department_store', 'health_food']);
  return out
    .filter((x) => x && x.category === 'shop' && SHOPS.has(x.type) && x.name)
    .map((x) => {
      const a = x.address || {};
      const e = x.extratags || {};
      return {
        type: x.osm_type, id: x.osm_id, lat: Number(x.lat), lon: Number(x.lon),
        tags: {
          shop: x.type === 'department_store' ? 'supermarket' : x.type, name: x.name, brand: e.brand || '',
          'addr:housenumber': a.house_number || '', 'addr:street': a.road || '',
          'addr:city': a.city || a.town || a.village || '', 'addr:postcode': a.postcode || '',
          opening_hours: e.opening_hours || '',
        },
      };
    });
}

/**
 * Grocery stores within radiusM meters of a point, nearest first. Asks two OpenStreetMap
 * services at once and merges what they find, so one being busy doesn't break the search.
 */
export async function findStores(origin, radiusM, signal) {
  const [a, b] = await Promise.allSettled([overpassStores(origin, radiusM, signal), nominatimStores(origin, radiusM, signal)]);
  if (signal && signal.aborted) throw new DOMException('Aborted', 'AbortError');
  const elements = [];
  if (a.status === 'fulfilled' && a.value) elements.push(...a.value);
  if (b.status === 'fulfilled' && b.value) elements.push(...b.value);
  if (!elements.length && (a.status === 'rejected' || !a.value) && b.status === 'rejected') {
    throw new Error('The store map didn’t answer. Check your internet connection and try again.');
  }
  return parseStores(elements, origin).filter((s) => s.dist <= radiusM * 1.2);
}

export function parseStores(elements, origin) {
  const seen = new Set();
  const out = [];
  for (const el of elements) {
    const t = el.tags || {};
    const lat = el.lat != null ? el.lat : el.center && el.center.lat;
    const lon = el.lon != null ? el.lon : el.center && el.center.lon;
    const name = (t.name || t.brand || '').trim();
    if (!name || lat == null || lon == null) continue;
    const dist = distanceM(origin.lat, origin.lon, lat, lon);
    const id = `${el.type}/${el.id}`;
    const key = name.toLowerCase() + '|' + Math.round(dist / 150);
    if (seen.has(key) || seen.has(id)) continue;
    seen.add(key);
    seen.add(id);
    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
    out.push({
      id,
      name,
      brand: (t.brand || '').trim(),
      kind: t.shop,
      kindLabel: KIND_LABEL[t.shop] || 'Grocery store',
      lat,
      lon,
      dist,
      address: [street, t['addr:city']].filter(Boolean).join(', '),
      city: t['addr:city'] || '',
      postcode: t['addr:postcode'] || '',
      hours: t.opening_hours || '',
      level: priceLevel(name, t.brand),
    });
  }
  out.sort((a, b) => a.dist - b.dist);
  return out.slice(0, 40);
}

export function distanceM(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function formatDistance(m, miles) {
  if (miles) {
    const mi = m / 1609.344;
    return mi < 0.1 ? `${Math.round(m * 3.28084 / 10) * 10} ft` : `${mi < 10 ? mi.toFixed(1) : Math.round(mi)} mi`;
  }
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`;
}

export function directionsUrl(store) {
  return `https://maps.apple.com/?daddr=${store.lat},${store.lon}&q=${encodeURIComponent(store.name)}`;
}

/** A short, human reading of an OSM opening_hours value, or '' if it's complicated. */
export function hoursLabel(hours) {
  if (!hours) return '';
  if (/^24\/7$/.test(hours.trim())) return 'Open 24 hours';
  const m = /^Mo-Su\s+(\d{2}):(\d{2})-(\d{2}):(\d{2})$/.exec(hours.trim());
  if (m) return `Daily ${clock(m[1], m[2])}–${clock(m[3], m[4])}`;
  return '';
}

function clock(h, min) {
  const d = new Date(2000, 0, 1, Number(h) % 24, Number(min));
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: min === '00' ? undefined : '2-digit' });
}
