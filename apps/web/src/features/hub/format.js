const pad = (n) => String(n).padStart(2, '0');
export const todayKey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function hm(sec) {
  const t = Math.round(sec || 0);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export const km = (v, digits = 1) => `${(v || 0).toFixed(digits)} km`;

// 'YYYY-MM-DD' → 'Oct 18' (noon avoids timezone date shifts)
export function shortDate(k) {
  if (!k) return '';
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function weekdayShort(k) {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d, 12).toLocaleDateString('en-US', { weekday: 'short' });
}

export function timeAgo(iso) {
  if (!iso) return null;
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const h = Math.round(mins / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// % change vs a previous value; null when there's nothing to compare against
export function delta(now, before) {
  if (!before) return null;
  return Math.round(((now - before) / before) * 100);
}

export const capitalize = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
