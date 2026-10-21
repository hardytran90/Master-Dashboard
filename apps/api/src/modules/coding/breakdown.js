// Stores the per-day split of coding time (projects / languages / editors / categories)
// from WakaTime summaries and data-dump days into `coding_breakdowns`.
import { prisma } from '../../core/prisma.js';

export const KINDS = { projects: 'project', languages: 'language', editors: 'editor', categories: 'category' };
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// Summaries API items: { name, total_seconds } · data dump items may nest it in grand_total
const secondsOf = (item) => item?.total_seconds ?? item?.grand_total?.total_seconds ?? 0;

// day = one WakaTime summary / dump day → rows for createMany
export function breakdownRows(userId, date, day) {
  if (!DATE_RE.test(date || '')) return [];
  const merged = new Map(); // same name twice in a day (rare) → sum
  for (const [field, kind] of Object.entries(KINDS)) {
    for (const item of day?.[field] || []) {
      const name = String(item?.name || 'Unknown').slice(0, 191);
      const seconds = Math.round(secondsOf(item));
      if (seconds <= 0) continue;
      const k = `${kind}\u0000${name.toLowerCase()}`; // unique index is case-insensitive (utf8mb4_unicode_ci)
      const prev = merged.get(k);
      if (prev) prev.seconds += seconds;
      else merged.set(k, { userId, logDate: new Date(`${date}T00:00:00Z`), kind, name, seconds });
    }
  }
  return [...merged.values()];
}

// Replace the breakdown of the given days (delete + insert keeps removed projects from lingering)
export async function saveBreakdown(userId, days) {
  const valid = days.filter((d) => DATE_RE.test(d.date || ''));
  let saved = 0;
  for (let i = 0; i < valid.length; i += 60) {
    const chunk = valid.slice(i, i + 60);
    const rows = chunk.flatMap((d) => breakdownRows(userId, d.date, d.day));
    await prisma.$transaction([
      prisma.codingBreakdown.deleteMany({
        where: { userId, logDate: { in: chunk.map((d) => new Date(`${d.date}T00:00:00Z`)) } },
      }),
      prisma.codingBreakdown.createMany({ data: rows, skipDuplicates: true }),
    ]);
    saved += rows.length;
  }
  return saved;
}
