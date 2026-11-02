// Finds grocery stores near a point using OpenStreetMap data (Overpass API),
// and turns a ZIP code or city into a point (Nominatim).

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

/** Asks the phone for its location. Rejects with a friendly message. */
export function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('This browser cannot share your location. Search by ZIP code or city instead.'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude, accuracy: pos.coords.accuracy }),
      (err) => {
        if (err && err.code === 1) {
          reject(new Error('Location is turned off for Cart & Cook. Allow it in Settings › Privacy & Security › Location Services › Safari Websites, or search by ZIP code below.'));
        } else {
          reject(new Error('Your location could not be found just now. Try again, or search by ZIP code below.'));
        }
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 5 * 60 * 1000 },
    );
  });
}

/** Turns a ZIP code, postcode or city into a point. */
export async function geocode(query, countryCode, signal) {
  const base = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&addressdetails=1&q=' + encodeURIComponent(query);
  const urls = countryCode ? [base + '&countrycodes=' + countryCode.toLowerCase(), base] : [base];
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
  throw new Error(`No place called “${query}” was found. Check the spelling or try a nearby city.`);
}

/** Grocery stores within radiusM meters of a point, nearest first. */
export async function findStores(origin, radiusM, signal) {
  const r = Math.round(radiusM);
  const query = `[out:json][timeout:25];nwr["shop"~"^(supermarket|grocery|greengrocer|wholesale|health_food)$"](around:${r},${origin.lat},${origin.lon});out center tags 150;`;
  let elements = null;
  let lastError = null;
  for (const endpoint of OVERPASS) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 20000);
    const relay = () => ctl.abort();
    if (signal) signal.addEventListener('abort', relay, { once: true });
    try {
      const res = await fetch(endpoint, { method: 'POST', body: new URLSearchParams({ data: query }), signal: ctl.signal });
      if (!res.ok) { lastError = new Error(`Map server answered ${res.status}`); continue; }
      const data = await res.json();
      elements = Array.isArray(data.elements) ? data.elements : [];
      break;
    } catch (e) {
      if (signal && signal.aborted) throw e;
      lastError = e;
    } finally {
      clearTimeout(timer);
      if (signal) signal.removeEventListener('abort', relay);
    }
  }
  if (!elements) {
    const e = new Error('The store map is busy right now. Wait a few seconds and try again.');
    e.cause = lastError;
    throw e;
  }
  return parseStores(elements, origin);
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
    const key = name.toLowerCase() + '|' + Math.round(dist / 60);
    if (seen.has(key)) continue;
    seen.add(key);
    const street = [t['addr:housenumber'], t['addr:street']].filter(Boolean).join(' ');
    out.push({
      id: `${el.type}/${el.id}`,
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
