import * as Astronomy from 'astronomy-engine';

interface LatLon {
  latitude: number;
  longitude: number;
}

const RISE = 1;
const SET = -1;
const SEARCH_DAYS = 1;

const CACHE_TTL_MS = 5 * 60 * 1000;
const CACHE_MAX = 32;

interface PlanetData {
  name: string;
  rise: string | null;
  set: string | null;
  altitude: number;
  azimuth: number;
  magnitude: number;
  visible: boolean;
}

interface ObservationData {
  twilight: { sunset: string | null; civil: string | null; nautical: string | null; astronomical: string | null };
  sun: { rise: string | null; set: string | null; altitude: number; azimuth: number };
  moon: {
    phase: string;
    phaseAngle: number;
    illumination: number;
    rise: string | null;
    set: string | null;
    magnitude: number;
    altitude: number;
    azimuth: number;
  };
  planets: PlanetData[];
}

const cache = new Map<string, { expires: number; value: ObservationData }>();

function cacheKey(location: LatLon, date: Date): string {
  const lat = location.latitude.toFixed(3);
  const lon = location.longitude.toFixed(3);
  // Bucket by minute — rise/set/phase don't meaningfully change sub-minute
  // and the cache is also bounded by CACHE_TTL_MS.
  const bucket = Math.floor(date.getTime() / 60000);
  return `${lat},${lon},${bucket}`;
}

function toIso(t: Astronomy.AstroTime | null): string | null {
  return t ? t.date.toISOString() : null;
}

function moonPhaseName(phaseDegrees: number): string {
  const p = ((phaseDegrees % 360) + 360) % 360;
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

function riseSet(body: Astronomy.Body, observer: Astronomy.Observer, start: Date) {
  const rise = Astronomy.SearchRiseSet(body, observer, RISE, start, SEARCH_DAYS);
  const set = Astronomy.SearchRiseSet(body, observer, SET, start, SEARCH_DAYS);
  return { rise: toIso(rise), set: toIso(set) };
}

function computePlanet(
  name: string,
  body: Astronomy.Body,
  observer: Astronomy.Observer,
  date: Date,
  searchStart: Date
) {
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
    visible: hor.altitude > 0
  };
}

export async function computeObservation(location: LatLon, date: Date): Promise<ObservationData> {
  const key = cacheKey(location, date);
  const hit = cache.get(key);
  const now = Date.now();
  if (hit && hit.expires > now) return hit.value;

  // Planet calculations are independent — run them off the synchronous path
  // so the event loop isn't blocked as long. astronomy-engine itself is
  // synchronous, but scheduling each planet on a microtask lets the sun/moon
  // work and planet work interleave fairly and keeps IPC responsive.
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const searchStart = new Date(date.getTime() - 12 * 60 * 60 * 1000);
  const noonToday = new Date(date);
  noonToday.setHours(12, 0, 0, 0);

  const planetDefs: Array<{ name: string; body: Astronomy.Body }> = [
    { name: 'Mercury', body: Astronomy.Body.Mercury },
    { name: 'Venus', body: Astronomy.Body.Venus },
    { name: 'Mars', body: Astronomy.Body.Mars },
    { name: 'Jupiter', body: Astronomy.Body.Jupiter },
    { name: 'Saturn', body: Astronomy.Body.Saturn }
  ];

  const [sun, moon, twilight, planets] = await Promise.all([
    Promise.resolve().then(() => {
      const rs = riseSet(Astronomy.Body.Sun, observer, searchStart);
      const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
      const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
      return { rise: rs.rise, set: rs.set, altitude: hor.altitude, azimuth: hor.azimuth };
    }),
    Promise.resolve().then(() => {
      const rs = riseSet(Astronomy.Body.Moon, observer, searchStart);
      const phaseDeg = Astronomy.MoonPhase(date);
      const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
      const eq = Astronomy.Equator(Astronomy.Body.Moon, date, observer, true, true);
      const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
      return {
        phase: moonPhaseName(phaseDeg),
        phaseAngle: phaseDeg,
        illumination: illum.phase_fraction * 100,
        rise: rs.rise,
        set: rs.set,
        magnitude: illum.mag,
        altitude: hor.altitude,
        azimuth: hor.azimuth
      };
    }),
    Promise.resolve().then(() => {
      const civilDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, SEARCH_DAYS, -6);
      const nauticalDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, SEARCH_DAYS, -12);
      const astroDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, SEARCH_DAYS, -18);
      return {
        civil: toIso(civilDusk),
        nautical: toIso(nauticalDusk),
        astronomical: toIso(astroDusk)
      };
    }),
    Promise.all(
      planetDefs.map(p =>
        Promise.resolve().then(() => computePlanet(p.name, p.body, observer, date, searchStart))
      )
    )
  ]);

  const value = {
    twilight: { sunset: sun.set, ...twilight },
    sun,
    moon,
    planets
  };

  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, { expires: now + CACHE_TTL_MS, value });
  return value;
}
