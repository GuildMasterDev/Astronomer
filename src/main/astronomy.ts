import * as Astronomy from 'astronomy-engine';

interface LatLon {
  latitude: number;
  longitude: number;
}

const RISE = 1;
const SET = -1;

function toTimeString(t: Astronomy.AstroTime | null): string | null {
  if (!t) return null;
  return t.date.toISOString();
}

function moonPhaseName(phaseDegrees: number): string {
  // phaseDegrees: 0=new, 90=first quarter, 180=full, 270=last quarter
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
  const rise = Astronomy.SearchRiseSet(body, observer, RISE, start, 1);
  const set = Astronomy.SearchRiseSet(body, observer, SET, start, 1);
  return { rise: toTimeString(rise), set: toTimeString(set) };
}

export function computeObservation(location: LatLon, date: Date) {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, 0);
  const searchStart = new Date(date.getTime());
  // For twilight searches, start from local noon-ish to bias toward the upcoming evening/morning.
  const noonToday = new Date(date);
  noonToday.setHours(12, 0, 0, 0);

  const sunRiseSet = riseSet(Astronomy.Body.Sun, observer, searchStart);

  // Twilight: sun center below horizon at -6, -12, -18 degrees. Search forward 1 day from noon
  // with direction -1 (descending through altitude) to get the evening events.
  const civilDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, 1, -6);
  const nauticalDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, 1, -12);
  const astroDusk = Astronomy.SearchAltitude(Astronomy.Body.Sun, observer, -1, noonToday, 1, -18);

  // Current sun altitude.
  const sunEq = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);
  const sunHor = Astronomy.Horizon(date, observer, sunEq.ra, sunEq.dec, 'normal');

  // Moon.
  const moonRiseSet = riseSet(Astronomy.Body.Moon, observer, searchStart);
  const moonPhaseDeg = Astronomy.MoonPhase(date);
  const moonIllum = Astronomy.Illumination(Astronomy.Body.Moon, date);

  // Planets.
  const planetBodies: Array<{ name: string; body: Astronomy.Body }> = [
    { name: 'Mercury', body: Astronomy.Body.Mercury },
    { name: 'Venus', body: Astronomy.Body.Venus },
    { name: 'Mars', body: Astronomy.Body.Mars },
    { name: 'Jupiter', body: Astronomy.Body.Jupiter },
    { name: 'Saturn', body: Astronomy.Body.Saturn }
  ];

  const planets = planetBodies.map(({ name, body }) => {
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
  });

  return {
    twilight: {
      sunset: sunRiseSet.set,
      civil: toTimeString(civilDusk),
      nautical: toTimeString(nauticalDusk),
      astronomical: toTimeString(astroDusk)
    },
    sun: {
      rise: sunRiseSet.rise,
      set: sunRiseSet.set,
      altitude: sunHor.altitude,
      azimuth: sunHor.azimuth
    },
    moon: {
      phase: moonPhaseName(moonPhaseDeg),
      phaseAngle: moonPhaseDeg,
      illumination: moonIllum.phase_fraction * 100,
      rise: moonRiseSet.rise,
      set: moonRiseSet.set,
      magnitude: moonIllum.mag
    },
    planets
  };
}
