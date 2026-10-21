// Categorical slots for dark surfaces (validated: adjacent CVD ΔE ≥ 8.4, contrast ≥ 3:1 on #0f172a).
// Fixed order — slice i always gets slot i; anything past the top 5 folds into "Other".
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181'];
export const OTHER = '#64748b';
export const ACCENT = '#14b8a6'; // Coding Tracker accent (single-series charts)

export function topN(items, n = SERIES.length) {
  const head = items.slice(0, n);
  const rest = items.slice(n);
  const restSec = rest.reduce((s, i) => s + i.seconds, 0);
  return restSec > 0 ? [...head, { name: `Other (${rest.length})`, seconds: restSec, other: true }] : head;
}
