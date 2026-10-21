// GET /api/hub/summary?today=YYYY-MM-DD
// One request for the Master Dashboard home: a short summary per app.
// `today` comes from the browser so "this week" matches the user's local calendar
// (activity_date and log_date are stored as local dates).
import { Router } from 'express';
import { prisma } from '../../core/prisma.js';
import { requireAuth } from '../../core/middleware/requireAuth.js';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;

// ───────────── date helpers (UTC-midnight Dates ↔ 'YYYY-MM-DD') ─────────────
const d = (key) => new Date(`${key}T00:00:00Z`);
const key = (date) => date.toISOString().slice(0, 10);
const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);
const mondayOf = (date) => addDays(date, -((date.getUTCDay() + 6) % 7));

function ranges(todayKey) {
  const today = d(todayKey);
  const weekStart = mondayOf(today);
  return {
    today,
    weekStart,
    lastWeekStart: addDays(weekStart, -7),
    lastWeekSameDay: addDays(today, -7), // compare Mon→today with Mon→same weekday last week
    last7Start: addDays(today, -6),
    monthStart: new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1)),
    yearStart: new Date(Date.UTC(today.getUTCFullYear(), 0, 1)),
  };
}

function lastNDays(today, n) {
  return Array.from({ length: n }, (_, i) => key(addDays(today, i - (n - 1))));
}

// ───────────── fitness ─────────────
async function fitnessSummary(userId, r) {
  const since = r.lastWeekStart < r.monthStart ? r.lastWeekStart : r.monthStart;
  const [rows, yearAgg, last, strava] = await Promise.all([
    prisma.activity.findMany({
      where: { userId, activityDate: { gte: since, lte: r.today } },
      select: { type: true, activityDate: true, distanceKm: true, durationSec: true },
    }),
    prisma.activity.aggregate({
      where: { userId, activityDate: { gte: r.yearStart, lte: r.today } },
      _sum: { distanceKm: true },
      _count: true,
    }),
    prisma.activity.findFirst({
      where: { userId },
      orderBy: [{ activityDate: 'desc' }, { id: 'desc' }],
      select: { type: true, activityDate: true, distanceKm: true, durationSec: true },
    }),
    prisma.oAuthConnection.findUnique({
      where: { userId_provider: { userId, provider: 'strava' } },
      select: { lastSyncedAt: true },
    }),
  ]);

  const acts = rows.map((a) => ({
    type: a.type, date: key(a.activityDate), km: Number(a.distanceKm) || 0, sec: a.durationSec || 0,
  }));
  const inRange = (from, to) => acts.filter((a) => a.date >= key(from) && a.date <= key(to));
  const total = (list) => list.reduce((s, a) => ({ km: s.km + a.km, sec: s.sec + a.sec, count: s.count + 1 }),
    { km: 0, sec: 0, count: 0 });

  const week = inRange(r.weekStart, r.today);
  const byType = {};
  for (const a of week) {
    byType[a.type] ??= { km: 0, sec: 0, count: 0 };
    byType[a.type].km += a.km;
    byType[a.type].sec += a.sec;
    byType[a.type].count += 1;
  }

  const kmByDay = {};
  for (const a of acts) kmByDay[a.date] = (kmByDay[a.date] ?? 0) + a.km;

  return {
    stravaConnected: !!strava,
    lastSyncedAt: strava?.lastSyncedAt ?? null,
    week: { ...total(week), activeDays: new Set(week.map((a) => a.date)).size, byType },
    lastWeekToDate: total(inRange(r.lastWeekStart, r.lastWeekSameDay)),
    month: total(inRange(r.monthStart, r.today)),
    year: { km: Number(yearAgg._sum.distanceKm ?? 0), count: yearAgg._count },
    last7: lastNDays(r.today, 7).map((date) => ({ date, km: Math.round((kmByDay[date] ?? 0) * 100) / 100 })),
    lastActivity: last && {
      type: last.type, date: key(last.activityDate), km: Number(last.distanceKm) || 0, sec: last.durationSec,
    },
  };
}

// ───────────── coding ─────────────
async function codingSummary(userId, r) {
  const [rows, conn, goal] = await Promise.all([
    prisma.codingLog.findMany({
      where: { userId, logDate: { gte: addDays(r.today, -400), lte: r.today } },
      select: { logDate: true, secondsCoded: true },
    }),
    prisma.oAuthConnection.findUnique({
      where: { userId_provider: { userId, provider: 'wakatime' } },
      select: { lastSyncedAt: true },
    }),
    prisma.goal.findFirst({
      where: { userId, domain: 'coding', metricType: 'hours', period: 'day', category: null },
      select: { targetValue: true },
    }),
  ]);

  const secByDay = {};
  for (const row of rows) {
    const k = key(row.logDate);
    secByDay[k] = (secByDay[k] ?? 0) + row.secondsCoded;
  }
  const sumRange = (from, to) => {
    let sec = 0; let days = 0;
    for (let t = from; t <= to; t = addDays(t, 1)) {
      const s = secByDay[key(t)] ?? 0;
      sec += s; if (s > 0) days += 1;
    }
    return { sec, activeDays: days };
  };

  // Streak = consecutive days with coding, ending today (or yesterday if today is still empty)
  let streak = 0;
  let cursor = (secByDay[key(r.today)] ?? 0) > 0 ? r.today : addDays(r.today, -1);
  while ((secByDay[key(cursor)] ?? 0) > 0) { streak += 1; cursor = addDays(cursor, -1); }

  let best = null;
  for (const [date, sec] of Object.entries(secByDay)) {
    if (date >= key(addDays(r.today, -364)) && (!best || sec > best.sec)) best = { date, sec };
  }

  return {
    connected: !!conn,
    lastSyncedAt: conn?.lastSyncedAt ?? null,
    dailyGoalSec: goal ? Math.round(Number(goal.targetValue) * 3600) : 3600,
    today: secByDay[key(r.today)] ?? 0,
    week: sumRange(r.weekStart, r.today),
    lastWeekToDate: sumRange(r.lastWeekStart, r.lastWeekSameDay),
    month: sumRange(r.monthStart, r.today),
    streak,
    bestDay: best,
    last7: lastNDays(r.today, 7).map((date) => ({ date, sec: secByDay[date] ?? 0 })),
  };
}

// ───────────── blog & books (apps not built yet — counts from existing tables) ─────────────
async function blogSummary(userId) {
  const [published, drafts, latest] = await Promise.all([
    prisma.post.count({ where: { userId, type: 'blog', status: 'published' } }),
    prisma.post.count({ where: { userId, type: 'blog', status: 'draft' } }),
    prisma.post.findFirst({
      where: { userId, type: 'blog', status: 'published' },
      orderBy: { publishedAt: 'desc' },
      select: { title: true, publishedAt: true },
    }),
  ]);
  return { published, drafts, latest };
}

async function booksSummary(userId) {
  const reviews = await prisma.bookReview.findMany({
    where: { post: { userId } },
    select: { bookTitle: true, author: true, readingStatus: true, rating: true },
  });
  const count = (s) => reviews.filter((b) => b.readingStatus === s).length;
  return {
    reading: reviews.filter((b) => b.readingStatus === 'reading').slice(0, 2)
      .map(({ bookTitle, author }) => ({ title: bookTitle, author })),
    readingCount: count('reading'),
    toRead: count('to_read'),
    finished: count('finished'),
  };
}

// Each section fails on its own, so one broken app doesn't blank the whole hub.
const settle = (p) => p.then((data) => data, (err) => {
  console.error('hub summary section failed:', err);
  return { error: true };
});

router.get('/hub/summary', requireAuth, async (req, res) => {
  const todayKey = DATE_RE.test(req.query.today ?? '') ? req.query.today : key(new Date());
  const r = ranges(todayKey);
  const userId = req.user.id;

  const [fitness, coding, blog, books] = await Promise.all([
    settle(fitnessSummary(userId, r)),
    settle(codingSummary(userId, r)),
    settle(blogSummary(userId)),
    settle(booksSummary(userId)),
  ]);
  res.json({ today: todayKey, fitness, coding, blog, books });
});

export default router;
