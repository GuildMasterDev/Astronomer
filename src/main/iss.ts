import { net } from 'electron';
import * as Astronomy from 'astronomy-engine';

const satellite: any = require('satellite.js');

interface LatLon {
  latitude: number;
  longitude: number;
}

interface Pass {
  start: string;       // ISO
  end: string;         // ISO
  durationSec: number;
  maxElevation: number;
  maxElevationAt: string;
  startAzimuth: number;
  endAzimuth: number;
  direction: string;   // e.g. "SW → NE"
}

interface CurrentPosition {
  latitude: number;
  longitude: number;
  altitudeKm: number;
  observerAltitude: number | null;
  observerAzimuth: number | null;
}

interface IssResult {
  tleEpoch: string | null;
  current: CurrentPosition;
  passes: Pass[];
}

interface CachedTle { line1: string; line2: string; name: string; fetchedAt: number }

let tleCache: CachedTle | null = null;
const TLE_TTL_MS = 60 * 60 * 1000;

function fetchIssTle(): Promise<CachedTle> {
  if (tleCache && Date.now() - tleCache.fetchedAt < TLE_TTL_MS) {
    return Promise.resolve(tleCache);
  }
  return new Promise((resolve, reject) => {
    const req = net.request({
      method: 'GET',
      url: 'https://tle.ivanstanojevic.me/api/tle/25544'
    });
    req.setHeader('User-Agent', 'Astronomer/1.0.0');
    req.setHeader('Accept', 'application/json');
    let data = '';
    req.on('response', (response: any) => {
      if (response.statusCode !== 200) {
        reject(new Error(`TLE fetch failed: HTTP ${response.statusCode}`));
        return;
      }
      response.on('data', (chunk: any) => { data += chunk; });
      response.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (!parsed.line1 || !parsed.line2) {
            reject(new Error('TLE response missing line1/line2'));
            return;
          }
          tleCache = {
            line1: parsed.line1,
            line2: parsed.line2,
            name: parsed.name || 'ISS (ZARYA)',
            fetchedAt: Date.now()
          };
          resolve(tleCache);
        } catch (e: any) {
          reject(new Error('TLE response parse error: ' + e.message));
        }
      });
    });
    req.on('error', (err: any) => reject(err));
    req.end();
  });
}

function azimuthToCardinal(azDeg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((azDeg % 360 + 360) % 360) / 45) % 8;
  return dirs[idx];
}

interface SatPoint { altDeg: number; azDeg: number; subLat: number; subLon: number; satHeightKm: number }

function observeSat(satrec: any, t: Date, observerGd: any): SatPoint | null {
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

function sunAltitudeAt(location: LatLon, date: Date): number {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const eq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const hor = Astronomy.Horizon(date, observer, eq.ra, eq.dec, 'normal');
  return hor.altitude;
}

function isSatSunlit(sub: SatPoint, date: Date): boolean {
  // The satellite is sunlit when the sun is above its local horizon, allowing
  // for the ~11.5° horizon dip at ISS altitude. Using sub-satellite point.
  const sunAtSat = sunAltitudeAt({ latitude: sub.subLat, longitude: sub.subLon }, date);
  // Horizon dip at altitude h (km) above Earth radius R:
  // acos(R/(R+h)) ≈ 20° at 400km. Use a conservative -18° threshold so
  // twilight-grazing passes are still flagged visible.
  return sunAtSat > -18;
}

export async function computeIssData(location: LatLon, now: Date = new Date()): Promise<IssResult> {
  const tle = await fetchIssTle();
  const satrec = satellite.twoline2satrec(tle.line1, tle.line2);

  const observerGd = {
    longitude: satellite.degreesToRadians(location.longitude),
    latitude: satellite.degreesToRadians(location.latitude),
    height: 0
  };

  const currentPt = observeSat(satrec, now, observerGd);
  const current: CurrentPosition = currentPt
    ? {
        latitude: currentPt.subLat,
        longitude: currentPt.subLon,
        altitudeKm: currentPt.satHeightKm,
        observerAltitude: currentPt.altDeg,
        observerAzimuth: currentPt.azDeg
      }
    : { latitude: NaN, longitude: NaN, altitudeKm: NaN, observerAltitude: null, observerAzimuth: null };

  const passes: Pass[] = [];
  const stepSec = 30;
  const horizonHours = 48;
  const steps = Math.ceil(horizonHours * 3600 / stepSec);

  let inPass = false;
  let cur: {
    start: Date; end: Date;
    startAz: number; endAz: number;
    maxAlt: number; maxAltAt: Date; maxAltSub: SatPoint | null;
  } | null = null;

  for (let i = 0; i <= steps; i++) {
    const t = new Date(now.getTime() + i * stepSec * 1000);
    const pt = observeSat(satrec, t, observerGd);
    if (!pt) continue;

    if (pt.altDeg > 0) {
      if (!inPass) {
        inPass = true;
        cur = {
          start: t, end: t,
          startAz: pt.azDeg, endAz: pt.azDeg,
          maxAlt: pt.altDeg, maxAltAt: t, maxAltSub: pt
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
      // Pass ended — evaluate visibility at peak.
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

  return {
    tleEpoch: null,
    current,
    passes
  };
}
