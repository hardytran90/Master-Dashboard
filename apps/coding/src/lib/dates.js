const pad = (n) => String(n).padStart(2, '0');

export const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function lastNDays(n) {
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - (n - 1));
  return { from: toKey(from), to: toKey(to) };
}

export function formatDuration(secs) {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function addDaysKey(k, n) {
  const [y, m, d] = k.split('-').map(Number);
  const x = new Date(y, m - 1, d, 12);
  x.setDate(x.getDate() + n);
  return toKey(x);
}

// 'YYYY-MM-DD' → 'Oct 18'
export function shortDate(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function pctChange(now, before) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

// Breakdown periods (from/to are inclusive local dates)
export function breakdownRange(id, today = toKey(new Date())) {
  const [y, m] = today.split('-').map(Number);
  switch (id) {
    case 'week': {
      const [yy, mm, dd] = today.split('-').map(Number);
      const dow = (new Date(yy, mm - 1, dd, 12).getDay() + 6) % 7; // Mon = 0
      return { from: addDaysKey(today, -dow), to: today };
    }
    case 'month': return { from: `${y}-${String(m).padStart(2, '0')}-01`, to: today };
    case '30d': return { from: addDaysKey(today, -29), to: today };
    case '90d': return { from: addDaysKey(today, -89), to: today };
    case 'year': return { from: addDaysKey(today, -364), to: today };
    default: return { from: addDaysKey(today, -6), to: today }; // '7d'
  }
}
