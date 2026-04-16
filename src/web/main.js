import * as Astronomy from 'astronomy-engine';
import * as satellite from 'satellite.js';

// ---------- Storage ----------

const STORE_PREFIX = 'astronomer:';
const STORE_DEFAULTS = {
  apiKeys: { nasa: 'DEMO_KEY' },
  settings: {
    theme: 'dark',
    units: 'metric',
    location: {
      latitude: 39.7392,
      longitude: -104.9903,
      timezone: 'America/Denver',
      name: 'Denver, CO'
    },
    safeMode: false,
    reduceMotion: false
  },
  favorites: [],
  cache: {}
};

function storeGet(key) {
  try {
    const raw = localStorage.getItem(STORE_PREFIX + key);
    if (raw === null) {
      const def = STORE_DEFAULTS[key];
      return def !== undefined ? structuredClone(def) : undefined;
    }
    return JSON.parse(raw);
  } catch (err) {
    console.warn('store-get failed', key, err);
    return STORE_DEFAULTS[key];
  }
}

function storeSet(key, value) {
  try {
    localStorage.setItem(STORE_PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('store-set failed', key, err);
  }
}

function storeDelete(key) {
  localStorage.removeItem(STORE_PREFIX + key);
}

// ---------- NASA / ISS / Horizons / Exoplanet fetch ----------

const ENDPOINTS = {
  'apod': 'https://api.nasa.gov/planetary/apod',
  'nasa-images': 'https://images-api.nasa.gov/search',
  'epic': 'https://api.nasa.gov/EPIC/api/natural',
  'horizons': 'https://ssd.jpl.nasa.gov/api/horizons.api',
  'iss-position': 'https://api.wheretheiss.at/v1/satellites/25544',
  'iss-tle': 'https://tle.ivanstanojevic.me/api/tle/25544',
  'exoplanets': 'https://exoplanetarchive.ipac.caltech.edu/TAP/sync'
};

const responseCache = new Map();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function apiFetch(endpointId, params = {}) {
  const base = ENDPOINTS[endpointId];
  if (!base) throw new Error(`Unknown endpoint: ${endpointId}`);

  const url = new URL(base);
  for (const [k, v] of Object.entries(params || {})) {
    if (v !== undefined && v !== null && v !== '') {
      url.searchParams.append(k, String(v));
    }
  }

  const cacheKey = url.toString();
  const cached = responseCache.get(cacheKey);
  if (cached && cached.expires > Date.now()) return cached.data;

  const resp = await fetch(url.toString(), {
    method: 'GET',
    headers: { Accept: 'application/json' }
  });

  if (resp.status === 429) {
    throw new Error('RATE_LIMITED');
  }
  if (resp.status === 403) {
    throw new Error(
      'HTTP 403 Forbidden — your NASA API key is invalid or DEMO_KEY has hit its hourly limit. Add a free key in Settings (api.nasa.gov).'
    );
  }
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
  }

  const ct = resp.headers.get('content-type') || '';
  const data = ct.includes('json') ? await resp.json() : await resp.text();

  responseCache.set(cacheKey, { data, expires: Date.now() + CACHE_TTL_MS });
  return data;
}

function clearCache() {
  responseCache.clear();
}

// ---------- Astronomy compute (ported from src/main/astronomy.ts) ----------

const RISE = 1;
const SET = -1;
const SEARCH_DAYS = 1;

function isoOrNull(t) {
  return t ? t.date.toISOString() : null;
}

function moonPhaseName(deg) {
  const p = ((deg % 360) + 360) % 360;
  if (p < 22.5) return 'New Moon';
  if (p < 67.5) return 'Waxing Crescent';
  if (p < 112.5) return 'First Quarter';
  if (p < 157.5) return 'Waxing Gibbous';
  if (p < 202.5) return 'Full Moon';
  if (p < 247.5) return 'Waning Gibbous';
  if (p < 292.5) return 'Last Quarter';
  if (p < 337.5) return 'Waning Crescent';
  return 'New Moon';
}

function riseSet(body, observer, start) {
  return {
    rise: isoOrNull(Astronomy.SearchRiseSet(body, observer, RISE, start, SEARCH_DAYS)),
    set: isoOrNull(Astronomy.SearchRiseSet(body, observer, SET, start, SEARCH_DAYS))
  };
}

function computePlanet(name, body, observer, date, searchStart) {
  const rs = riseSet(body, observer, searchStart);
  const eq = Astronomy.Equator(body, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
  const illum = Astronomy.Illumination(body, date);
  return {
    name,
    rise: rs.rise,
    set: rs.set,
    altitude: hor.altitude,
    azimuth: hor.azimuth,
    magnitude: illum.mag,
    distanceAu: eq.dist,
    visible: hor.altitude > 0
  };
}

function computeObservation(location, date) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const searchStart = new Date(date.getTime() - 12 * 60 * 60 * 1000);
  const noonToday = new Date(date);
  noonToday.setHours(12, 0, 0, 0);

  const sunRs = riseSet(Astronomy.Body.Sun, observer, searchStart);
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const sunHor = Astronomy.Horizon(date, observer, sunEq.ra, sunEq.dec, 'normal');
  const sun = {
    rise: sunRs.rise,
    set: sunRs.set,
    altitude: sunHor.altitude,
    azimuth: sunHor.azimuth,
    distanceAu: sunEq.dist
  };

  const moonRs = riseSet(Astronomy.Body.Moon, observer, searchStart);
  const phaseDeg = Astronomy.MoonPhase(date);
  const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const moonEq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
  const moonHor = Astronomy.Horizon(date, observer, moonEq.ra, moonEq.dec, 'normal');
  const moon = {
    phase: moonPhaseName(phaseDeg),
    phaseAngle: phaseDeg,
    illumination: moonIllum.phase_fraction * 100,
    rise: moonRs.rise,
    set: moonRs.set,
    magnitude: moonIllum.mag,
    altitude: moonHor.altitude,
    azimuth: moonHor.azimuth,
    distanceAu: moonEq.dist
  };

  const civilDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, SEARCH_DAYS, -6);
  const nauticalDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, SEARCH_DAYS, -12);
  const astroDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, SEARCH_DAYS, -18);
  const twilight = {
    sunset: sun.set,
    civil: isoOrNull(civilDusk),
    nautical: isoOrNull(nauticalDusk),
    astronomical: isoOrNull(astroDusk)
  };

  const planetDefs = [
    { name: 'Mercury', body: Astronomy.Body.Mercury },
    { name: 'Venus', body: Astronomy.Body.Venus },
    { name: 'Mars', body: Astronomy.Body.Mars },
    { name: 'Jupiter', body: Astronomy.Body.Jupiter },
    { name: 'Saturn', body: Astronomy.Body.Saturn }
  ];
  const planets = planetDefs.map(p => computePlanet(p.name, p.body, observer, date, searchStart));

  return { twilight, sun, moon, planets };
}

// ---------- ISS pass compute (ported from src/main/iss.ts) ----------

let tleCache = null;
const TLE_TTL_MS = 60 * 60 * 1000;

async function fetchIssTle() {
  if (tleCache && Date.now() - tleCache.fetchedAt < TLE_TTL_MS) {
    return tleCache;
  }
  const resp = await fetch('https://tle.ivanstanojevic.me/api/tle/25544', {
    headers: { Accept: 'application/json' }
  });
  if (!resp.ok) throw new Error(`TLE fetch failed: HTTP ${resp.status}`);
  const parsed = await resp.json();
  if (!parsed.line1 || !parsed.line2) throw new Error('TLE response missing line1/line2');
  tleCache = {
    line1: parsed.line1,
    line2: parsed.line2,
    name: parsed.name || 'ISS (ZARYA)',
    fetchedAt: Date.now()
  };
  return tleCache;
}

function azimuthToCardinal(az) {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((az % 360 + 360) % 360) / 45) % 8];
}

function observeSat(satrec, t, observerGd) {
  const posVel = satellite.propagate(satrec, t);
  if (!posVel || !posVel.position || typeof posVel.position === 'boolean') return null;
  const gmst = satellite.gstime(t);
  const ecf = satellite.eciToEcf(posVel.position, gmst);
  const look = satellite.ecfToLookAngles(observerGd, ecf);
  const geo = satellite.eciToGeodetic(posVel.position, gmst);
  return {
    altDeg: satellite.radiansToDegrees(look.elevation),
    azDeg: (satellite.radiansToDegrees(look.azimuth) + 360) % 360,
    subLat: satellite.radiansToDegrees(geo.latitude),
    subLon: satellite.radiansToDegrees(geo.longitude),
    satHeightKm: geo.height
  };
}

function sunAltitudeAt(location, date) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
  return hor.altitude;
}

function isSatSunlit(sub, date) {
  return sunAltitudeAt({ latitude: sub.subLat, longitude: sub.subLon }, date) > -18;
}

async function computeIssData(location, now = new Date()) {
  const tle = await fetchIssTle();
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

  const observerGd = {
    longitude: satellite.degreesToRadians(location.longitude),
    latitude: satellite.degreesToRadians(location.latitude),
    height: 0
  };

  const currentPt = observeSat(satrec, now, observerGd);
  const current = currentPt
    ? {
        latitude: currentPt.subLat,
        longitude: currentPt.subLon,
        altitudeKm: currentPt.satHeightKm,
        observerAltitude: currentPt.altDeg,
        observerAzimuth: currentPt.azDeg
      }
    : { latitude: NaN, longitude: NaN, altitudeKm: NaN, observerAltitude: null, observerAzimuth: null };

  const passes = [];
  const stepSec = 30;
  const horizonHours = 48;
  const steps = Math.ceil((horizonHours * 3600) / stepSec);

  let inPass = false;
  let cur = null;

  for (let i = 0; i <= steps; i++) {
    const t = new Date(now.getTime() + i * stepSec * 1000);
    const pt = observeSat(satrec, t, observerGd);
    if (!pt) continue;

    if (pt.altDeg > 0) {
      if (!inPass) {
        inPass = true;
        cur = {
          start: t,
          end: t,
          startAz: pt.azDeg,
          endAz: pt.azDeg,
          maxAlt: pt.altDeg,
          maxAltAt: t,
          maxAltSub: pt
        };
      } else if (cur) {
        cur.end = t;
        cur.endAz = pt.azDeg;
        if (pt.altDeg > cur.maxAlt) {
          cur.maxAlt = pt.altDeg;
          cur.maxAltAt = t;
          cur.maxAltSub = pt;
        }
      }
    } else if (inPass && cur) {
      const obsSunAlt = sunAltitudeAt(location, cur.maxAltAt);
      const satLit = cur.maxAltSub ? isSatSunlit(cur.maxAltSub, cur.maxAltAt) : false;
      if (cur.maxAlt >= 10 && obsSunAlt < -6 && satLit) {
        passes.push({
          start: cur.start.toISOString(),
          end: cur.end.toISOString(),
          durationSec: Math.round((cur.end.getTime() - cur.start.getTime()) / 1000),
          maxElevation: cur.maxAlt,
          maxElevationAt: cur.maxAltAt.toISOString(),
          startAzimuth: cur.startAz,
          endAzimuth: cur.endAz,
          direction: `${azimuthToCardinal(cur.startAz)} → ${azimuthToCardinal(cur.endAz)}`
        });
        if (passes.length >= 5) break;
      }
      inPass = false;
      cur = null;
    }
  }

  return { tleEpoch: null, current, passes };
}

// ---------- Favorites ----------

function favoritesGet() {
  return storeGet('favorites') || [];
}

function favoritesAdd(item) {
  const list = favoritesGet();
  if (!list.some(f => f.id === item.id)) {
    list.push(item);
    storeSet('favorites', list);
  }
  return true;
}

function favoritesRemove(id) {
  storeSet('favorites', favoritesGet().filter(f => f.id !== id));
  return true;
}

function favoritesExport() {
  const blob = new Blob([JSON.stringify(favoritesGet(), null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'astronomer-favorites.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return true;
}

// ---------- window.astronomer bridge ----------

async function fetchWithRetry(endpointId, params, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await apiFetch(endpointId, params);
    } catch (err) {
      if (err.message === 'RATE_LIMITED' && attempt < retries - 1) {
        const wait = Math.min(5000 * 2 ** attempt, 30000);
        console.log(`Rate limited. Waiting ${wait / 1000}s before retry…`);
        await new Promise(r => setTimeout(r, wait));
        continue;
      }
      if (attempt === retries - 1) throw err;
    }
  }
}

window.astronomer = {
  api: {
    fetch: fetchWithRetry,
    clearCache: async () => clearCache()
  },
  store: {
    get: async key => storeGet(key),
    set: async (key, value) => {
      storeSet(key, value);
      return true;
    },
    delete: async key => {
      storeDelete(key);
      return true;
    }
  },
  favorites: {
    add: async item => favoritesAdd(item),
    remove: async id => favoritesRemove(id),
    getAll: async () => favoritesGet(),
    export: async () => favoritesExport()
  },
  astronomy: {
    compute: async (location, date) => {
      try {
        const d = date instanceof Date ? date : date ? new Date(date) : new Date();
        return { data: computeObservation(location, d), error: null };
      } catch (err) {
        console.error('astronomy.compute error', err);
        return { data: null, error: err.message || 'Astronomy compute failed' };
      }
    }
  },
  iss: {
    passes: async (location, date) => {
      try {
        const d = date instanceof Date ? date : date ? new Date(date) : new Date();
        return { data: await computeIssData(location, d), error: null };
      } catch (err) {
        console.error('iss.passes error', err);
        return { data: null, error: err.message || 'ISS pass computation failed' };
      }
    }
  },
  system: {
    getLocation: async () => storeGet('settings')?.location || null,
    openExternal: async url => {
      window.open(url, '_blank', 'noopener,noreferrer');
      return true;
    },
    getPlatform: () => 'web'
  }
};

// ---------- Banner + app bootstrap ----------

function setupBanner() {
  const banner = document.getElementById('web-banner');
  if (!banner) return;

  const apiKey = storeGet('apiKeys')?.nasa;
  const dismissed = storeGet('webBannerDismissed');
  if (dismissed || (apiKey && apiKey !== 'DEMO_KEY')) banner.classList.add('hidden');

  const dismiss = document.getElementById('banner-dismiss');
  if (dismiss) {
    dismiss.addEventListener('click', () => {
      banner.classList.add('hidden');
      storeSet('webBannerDismissed', true);
    });
  }

  const link = document.getElementById('banner-settings-link');
  if (link) {
    link.addEventListener('click', e => {
      e.preventDefault();
      const btn = document.querySelector('.tab-button[data-tab="settings"]');
      if (btn) btn.click();
    });
  }
}

setupBanner();

const script = document.createElement('script');
script.src = './app-complete.js';
script.async = false;
document.body.appendChild(script);
