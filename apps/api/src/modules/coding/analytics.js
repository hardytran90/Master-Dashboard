// Coding Tracker analytics — mounted under /api:
//   GET /coding/overview?today=YYYY-MM-DD        → goal, comparisons, last-30-days series
//   GET /coding/breakdown?kind&from&to           → [{ name, seconds }] (kind = project|language|editor|category)
//   GET /coding/goal   · PUT /coding/goal { dailyMinutes }   (stored in `goals`: domain=coding, period=day)
import { Router } from 'express';
import { prisma } from '../../core/prisma.js';
import { requireAuth } from '../../core/middleware/requireAuth.js';

const router = Router();
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86_400_000;
const GOAL_STEP_MIN = 30;
const GOAL_MAX_MIN = 16 * 60;
const DEFAULT_GOAL_MIN = 60;
const KINDS = new Set(['project', 'language', 'editor', 'category']);

const d = (k) => new Date(`${k}T00:00:00Z`);
const key = (date) => date.toISOString().slice(0, 10);
const addDays = (date, n) => new Date(date.getTime() + n * DAY_MS);
const mondayOf = (date) => addDays(date, -((date.getUTCDay() + 6) % 7));
const monthStart = (date, offset = 0) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offset, 1));
const daysInMonth = (date) => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();

// ───────────── goal ─────────────
function findGoal(userId) {
  return prisma.goal.findFirst({
    where: { userId, domain: 'coding', metricType: 'hours', period: 'day', category: null },
  });
}
const goalMinutes = (g) => (g ? Math.round(Number(g.targetValue) * 60) : DEFAULT_GOAL_MIN);

router.get('/coding/goal', requireAuth, async (req, res) => {
  try {
    const g = await findGoal(req.user.id);
    res.json({ dailyMinutes: goalMinutes(g), isDefault: !g });
  } catch (err) {
    console.error('GET /coding/goal error:', err);
    res.status(500).json({ error: 'Cannot read goal' });
  }
});

router.put('/coding/goal', requireAuth, async (req, res) => {
  const minutes = Number(req.body?.dailyMinutes);
  if (!Number.isInteger(minutes) || minutes < GOAL_STEP_MIN || minutes > GOAL_MAX_MIN || minutes % GOAL_STEP_MIN !== 0) {
    return res.status(400).json({ error: `dailyMinutes must be a multiple of ${GOAL_STEP_MIN} between ${GOAL_STEP_MIN} and ${GOAL_MAX_MIN}` });
  }
  try {
    const targetValue = (minutes / 60).toFixed(2);
    const existing = await findGoal(req.user.id);
    if (existing) {
      await prisma.goal.update({ where: { id: existing.id }, data: { targetValue } });
    } else {
      await prisma.goal.create({
        data: { userId: req.user.id, domain: 'coding', metricType: 'hours', period: 'day', targetValue },
      });
    }
    res.json({ dailyMinutes: minutes, isDefault: false });
  } catch (err) {
    console.error('PUT /coding/goal error:', err);
    res.status(500).json({ error: 'Cannot save goal' });
  }
});

// ───────────── overview ─────────────
router.get('/coding/overview', requireAuth, async (req, res) => {
  const userId = req.user.id;
  const today = d(DATE_RE.test(req.query.today ?? '') ? req.query.today : key(new Date()));

  // Earliest day any comparison needs: previous month start, or 29 days back (last-30 chart)
  const since = new Date(Math.min(monthStart(today, -1).getTime(), addDays(today, -29).getTime()));

  try {
    const [logs, goal, breakdownCount] = await Promise.all([
      prisma.codingLog.findMany({
        where: { userId, logDate: { gte: since, lte: today } },
        select: { logDate: true, secondsCoded: true },
      }),
      findGoal(userId),
      prisma.codingBreakdown.count({ where: { userId } }),
    ]);

    const byDay = {};
    for (const l of logs) {
      const k = key(l.logDate);
      byDay[k] = (byDay[k] ?? 0) + l.secondsCoded;
    }
    const sum = (from, to) => {
      let sec = 0; let active = 0;
      for (let t = from; t <= to; t = addDays(t, 1)) {
        const s = byDay[key(t)] ?? 0;
        sec += s; if (s > 0) active += 1;
      }
      return { sec, activeDays: active, from: key(from), to: key(to) };
    };
    const compare = (current, previous, previousFull) => ({ current, previous, previousFull });

    // This week (Mon → today) vs the same weekdays last week
    const weekStart = mondayOf(today);
    const lastWeekStart = addDays(weekStart, -7);

    // This month (1st → today) vs last month 1st → same day number (clamped to its length)
    const mStart = monthStart(today);
    const lmStart = monthStart(today, -1);
    const lmSameDay = addDays(lmStart, Math.min(today.getUTCDate(), daysInMonth(lmStart)) - 1);
    const lmEnd = addDays(mStart, -1);

    const dailyGoalSec = goalMinutes(goal) * 60;
    const last30 = Array.from({ length: 30 }, (_, i) => {
      const k = key(addDays(today, i - 29));
      return { date: k, sec: byDay[k] ?? 0 };
    });

    const monthSoFar = sum(mStart, today);
    let goalHitDays = 0;
    for (let t = mStart; t <= today; t = addDays(t, 1)) if ((byDay[key(t)] ?? 0) >= dailyGoalSec) goalHitDays += 1;

    res.json({
      today: key(today),
      todaySec: byDay[key(today)] ?? 0,
      goal: { dailyMinutes: goalMinutes(goal), isDefault: !goal },
      goalHit: { days: goalHitDays, of: today.getUTCDate() },
      comparisons: {
        last7: compare(sum(addDays(today, -6), today), sum(addDays(today, -13), addDays(today, -7))),
        week: compare(sum(weekStart, today), sum(lastWeekStart, addDays(today, -7)), sum(lastWeekStart, addDays(weekStart, -1))),
        month: compare(monthSoFar, sum(lmStart, lmSameDay), sum(lmStart, lmEnd)),
      },
      last30,
      hasBreakdown: breakdownCount > 0,
    });
  } catch (err) {
    console.error('GET /coding/overview error:', err);
    res.status(500).json({ error: 'Cannot load coding overview' });
  }
});

// ───────────── breakdown ─────────────
router.get('/coding/breakdown', requireAuth, async (req, res) => {
  const { kind, from, to } = req.query;
  if (!KINDS.has(kind) || !DATE_RE.test(from ?? '') || !DATE_RE.test(to ?? '')) {
    return res.status(400).json({ error: 'kind must be project|language|editor|category, from/to YYYY-MM-DD' });
  }
  try {
    const groups = await prisma.codingBreakdown.groupBy({
      by: ['name'],
      where: { userId: req.user.id, kind, logDate: { gte: d(from), lte: d(to) } },
      _sum: { seconds: true },
      orderBy: { _sum: { seconds: 'desc' } },
    });
    const items = groups.map((g) => ({ name: g.name, seconds: g._sum.seconds ?? 0 }));
    res.json({ kind, from, to, total: items.reduce((s, i) => s + i.seconds, 0), items });
  } catch (err) {
    console.error('GET /coding/breakdown error:', err);
    res.status(500).json({ error: 'Cannot load breakdown' });
  }
});

export default router;
