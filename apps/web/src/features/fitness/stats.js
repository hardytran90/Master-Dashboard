
export const SPORTS = ['run', 'ride'];

const pad = (n) => String(n).padStart(2, '0');
export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
// // Use 12:00 noon so the date doesn't shift when the timezone / DST changes

export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};
export const addDays = (d, n) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export function startOfWeek(d) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7)); // Thứ Hai
  return x;
}

// period: 'week' | 'month' | 'year' — offset: 0 = current period, -1 = previous period
export function periodRange(period, offset = 0, today = new Date()) {
  let start;
  let end;
  if (period === 'week') {
    start = addDays(startOfWeek(today), 7 * offset);
    end = addDays(start, 6);
  } else if (period === 'month') {
    start = new Date(today.getFullYear(), today.getMonth() + offset, 1, 12);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 0, 12);
  } else {
    start = new Date(today.getFullYear() + offset, 0, 1, 12);
    end = new Date(start.getFullYear(), 11, 31, 12);
  }
  return {
    start,
    end,
    from: toKey(start),
    to: toKey(end),
    days: Math.round((end - start) / 86_400_000) + 1,
  };
}

// Prisma returns Decimal values as strings → convert them to numbers once, here
export function normalize(a) {
  return {
    id: a.id,
    type: a.type,
    key: toKey(new Date(a.activityDate)),
    km: Number(a.distanceKm) || 0,
    sec: Number(a.durationSec) || 0,
    elev: a.elevationGainM == null ? null : Number(a.elevationGainM),
  };
}

// Aggregate one sport within [from, to] (keys are YYYY-MM-DD, so string comparison works)
export function summarize(rows, type, from, to) {
  const s = { count: 0, km: 0, sec: 0, elev: null, bestPace: null, bestSpeed: null, days: new Set() };
  for (const r of rows) {
    if (r.type !== type || r.key < from || r.key > to) continue;
    s.count += 1;
    s.km += r.km;
    s.sec += r.sec;
    s.days.add(r.key);
    if (r.elev != null) s.elev = (s.elev ?? 0) + r.elev;
    // Skip activities under 0.5 km so junk data doesn't skew the pace
    if (r.km >= 0.5 && r.sec > 0) {
      const pace = r.sec / r.km; // seconds / km
      if (s.bestPace == null || pace < s.bestPace) s.bestPace = pace;
      const speed = r.km / (r.sec / 3600); // km/h
      if (s.bestSpeed == null || speed > s.bestSpeed) s.bestSpeed = speed;
    }
  }
  return s;
}

export function formatDuration(sec) {
  const t = Math.round(sec || 0);
  if (!t) return '0s';
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = t % 60;
  if (h) return `${h}h ${m}m`;
  if (m) return `${m}m ${s}s`;
  return `${s}s`;
}

export const formatKm = (km, digits = 1) => `${Number(km.toFixed(digits))} km`;
export const formatKmFixed = (km) => `${km.toFixed(2)} km`;
export const formatElev = (m) => (m == null ? '—' : `${Math.round(m)} m`);

export function formatPace(secPerKm) {
  if (secPerKm == null) return '—';
  let m = Math.floor(secPerKm / 60);
  let s = Math.round(secPerKm % 60);
  if (s === 60) {
    m += 1;
    s = 0;
  }
  return `${m}:${pad(s)} /km`;
}

export const formatSpeed = (kmh) => (kmh == null ? '—' : `${kmh.toFixed(1)} km/h`);
