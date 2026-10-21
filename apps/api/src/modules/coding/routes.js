// Coding Tracker API — mounted under /api:
//   GET    /coding/logs?from&to              → [{ date, seconds, source }]
//   GET    /coding/wakatime/connect-url      → { url }  (frontend then navigates there)
//   GET    /coding/wakatime/callback         ← WakaTime redirects here after the user approves
//   GET    /coding/wakatime/status           → { connected, username, lastSyncedAt }
//   POST   /coding/wakatime/sync             → re-reads the last 14 days of summaries
//   POST   /coding/wakatime/import-history   → full history via a WakaTime "daily" data dump (poll until done)
//   DELETE /coding/wakatime                  → disconnect (keeps the coding_logs already saved)
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { Prisma } from '@prisma/client';
import { prisma } from '../../core/prisma.js';
import { requireAuth } from '../../core/middleware/requireAuth.js';
import { decrypt } from '../../utils/crypto.js';
import {
  buildAuthorizeUrl, exchangeCode, saveTokens, getConnection,
  getValidAccessToken, wakaFetch, revokeToken,
} from './wakatime.js';
import { saveBreakdown } from './breakdown.js';

const router = Router();

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const CODING_PATH = '/coding/';
const SOURCE = 'wakatime';
const SYNC_DAYS = 14;               // free WakaTime plans only keep ~2 weeks of summaries
const SYNC_COOLDOWN_MS = 30 * 1000;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const busyUsers = new Set();        // one sync/import at a time per user

// ───────────── helpers ─────────────

const pad = (n) => String(n).padStart(2, '0');
const toKey = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function signState(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
}
function verifyState(state) {
  try { return jwt.verify(state, process.env.JWT_SECRET); } catch { return null; }
}
function redirectToCoding(res, status) {
  return res.redirect(`${FRONTEND_URL}${CODING_PATH}?wakatime=${status}`);
}

// rows: [{ date: 'YYYY-MM-DD', seconds: number }] → upsert into coding_logs in batches.
async function upsertDays(userId, rows) {
  const clean = rows
    .filter((r) => DATE_RE.test(r.date) && Number.isFinite(r.seconds) && r.seconds > 0)
    .map((r) => ({ date: r.date, seconds: Math.round(r.seconds) }));

  for (let i = 0; i < clean.length; i += 500) {
    const chunk = clean.slice(i, i + 500);
    const values = Prisma.join(
      chunk.map((r) => Prisma.sql`(${userId}, ${r.date}, ${r.seconds}, ${SOURCE})`),
    );
    await prisma.$executeRaw`
      INSERT INTO coding_logs (user_id, log_date, seconds_coded, source)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE seconds_coded = VALUES(seconds_coded)`;
  }
  return clean.length;
}

function sendWakaError(res, err, fallback) {
  if (err.message === 'NOT_CONNECTED') return res.status(400).json({ error: 'WakaTime is not connected.' });
  if (err.message === 'RATE_LIMITED') return res.status(429).json({ error: 'WakaTime rate limit hit, try again in a minute.' });
  if (err.message === 'WAKATIME_UNAUTHORIZED' || err.message === 'TOKEN_EXCHANGE_FAILED') {
    return res.status(401).json({ error: 'WakaTime connection expired. Please reconnect.', code: 'WAKATIME_RECONNECT' });
  }
  console.error(fallback, err);
  return res.status(500).json({ error: fallback });
}

// ───────────── logs ─────────────

router.get('/coding/logs', requireAuth, async (req, res) => {
  const { from, to } = req.query;
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) {
    return res.status(400).json({ error: 'from and to must be YYYY-MM-DD' });
  }
  try {
    const rows = await prisma.codingLog.findMany({
      where: {
        userId: req.user.id,
        logDate: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) },
      },
      orderBy: { logDate: 'asc' },
      select: { logDate: true, secondsCoded: true, source: true },
    });
    res.json(rows.map((r) => ({
      date: r.logDate.toISOString().slice(0, 10),
      seconds: r.secondsCoded,
      source: r.source,
    })));
  } catch (err) {
    console.error('GET /coding/logs error:', err);
    res.status(500).json({ error: 'Cannot read coding logs' });
  }
});

// ───────────── WakaTime connection ─────────────

router.get('/coding/wakatime/connect-url', requireAuth, (req, res) => {
  if (!process.env.WAKATIME_CLIENT_ID || !process.env.WAKATIME_REDIRECT_URI) {
    return res.status(500).json({ error: 'WakaTime app is not configured on the server.' });
  }
  res.json({ url: buildAuthorizeUrl(signState({ purpose: 'wakatime_connect', userId: req.user.id })) });
});

router.get('/coding/wakatime/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const payload = verifyState(state);
  if (error) return redirectToCoding(res, 'denied');
  if (!code || payload?.purpose !== 'wakatime_connect') return redirectToCoding(res, 'error');

  try {
    const tokenData = await exchangeCode(code);
    const me = await wakaFetch('/users/current', tokenData.access_token);
    const accountId = me?.data?.id || tokenData.uid;

    if (accountId) {
      const linked = await prisma.oAuthConnection.findUnique({
        where: { provider_providerAccountId: { provider: 'wakatime', providerAccountId: String(accountId) } },
      });
      if (linked && linked.userId !== payload.userId) return redirectToCoding(res, 'already_linked');
    }

    await saveTokens(payload.userId, tokenData, accountId);
    return redirectToCoding(res, 'connected');
  } catch (err) {
    console.error('GET /coding/wakatime/callback error:', err);
    return redirectToCoding(res, 'error');
  }
});

router.get('/coding/wakatime/status', requireAuth, async (req, res) => {
  try {
    const conn = await getConnection(req.user.id);
    if (!conn) return res.json({ connected: false });

    let username = null;
    try {
      const me = await wakaFetch('/users/current', decrypt(conn.accessTokenEnc));
      username = me?.data?.username || me?.data?.display_name || null;
    } catch (e) {
      if (e.message === 'WAKATIME_UNAUTHORIZED') {
        return res.json({ connected: false, expired: true });
      }
      // network hiccup → still report connected
    }
    res.json({ connected: true, username, lastSyncedAt: conn.lastSyncedAt });
  } catch (err) {
    console.error('GET /coding/wakatime/status error:', err);
    res.status(500).json({ error: 'Cannot read WakaTime status' });
  }
});

router.delete('/coding/wakatime', requireAuth, async (req, res) => {
  try {
    const conn = await getConnection(req.user.id);
    if (conn) {
      await revokeToken(decrypt(conn.accessTokenEnc));
      await prisma.oAuthConnection.delete({ where: { id: conn.id } });
    }
    res.json({ connected: false });
  } catch (err) {
    console.error('DELETE /coding/wakatime error:', err);
    res.status(500).json({ error: 'Cannot disconnect WakaTime' });
  }
});

// ───────────── sync: last 14 days ─────────────

router.post('/coding/wakatime/sync', requireAuth, async (req, res) => {
  const userId = req.user.id;
  if (busyUsers.has(userId)) return res.status(409).json({ error: 'A sync is already running.' });
  busyUsers.add(userId);
  try {
    const { accessToken, conn } = await getValidAccessToken(userId);

    if (conn.lastSyncedAt && Date.now() - conn.lastSyncedAt.getTime() < SYNC_COOLDOWN_MS) {
      return res.json({ skipped: true, lastSyncedAt: conn.lastSyncedAt });
    }

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - (SYNC_DAYS - 1));
    const json = await wakaFetch(`/users/current/summaries?start=${toKey(start)}&end=${toKey(end)}`, accessToken);

    const rows = (json?.data || []).map((d) => ({
      date: d.range?.date,
      seconds: d.grand_total?.total_seconds ?? 0,
    }));
    const saved = await upsertDays(userId, rows);
    await saveBreakdown(userId, (json?.data || []).map((d) => ({ date: d.range?.date, day: d })));

    const lastSyncedAt = new Date();
    await prisma.oAuthConnection.update({ where: { id: conn.id }, data: { lastSyncedAt } });
    res.json({ days: rows.length, saved, lastSyncedAt });
  } catch (err) {
    return sendWakaError(res, err, 'Syncing WakaTime failed');
  } finally {
    busyUsers.delete(userId);
  }
});

// ───────────── full history via data dump ─────────────
// WakaTime builds the export in the background. The frontend calls this every few seconds:
//   → { status: 'processing', percent }   keep polling
//   → { status: 'done', imported }         history saved to coding_logs

router.post('/coding/wakatime/import-history', requireAuth, async (req, res) => {
  const userId = req.user.id;
  if (busyUsers.has(userId)) return res.json({ status: 'processing', percent: null });
  busyUsers.add(userId);
  try {
    const { accessToken } = await getValidAccessToken(userId);

    const list = await wakaFetch('/users/current/data_dumps', accessToken);
    const dumps = (list?.data || [])
      .filter((d) => d.type === 'daily' && !d.has_failed && !d.is_stuck)
      .filter((d) => !d.expires || new Date(d.expires).getTime() > Date.now())
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    const dump = dumps[0];

    if (!dump) {
      await wakaFetch('/users/current/data_dumps', accessToken, {
        method: 'POST',
        body: JSON.stringify({ type: 'daily', email_when_finished: false }),
      });
      return res.json({ status: 'processing', percent: 0 });
    }

    if (dump.is_processing || !dump.download_url) {
      return res.json({ status: 'processing', percent: dump.percent_complete ?? null });
    }

    // download_url is a pre-signed link; it doesn't need (and may reject) our bearer token
    const r = await fetch(dump.download_url);
    if (!r.ok) throw new Error(`DUMP_DOWNLOAD_${r.status}`);
    const exportJson = await r.json();

    const rows = (exportJson?.days || []).map((d) => ({
      date: d.date,
      seconds: d.grand_total?.total_seconds ?? 0,
    }));
    const imported = await upsertDays(userId, rows);
    const breakdownRows = await saveBreakdown(userId, (exportJson?.days || []).map((d) => ({ date: d.date, day: d })));
    res.json({ status: 'done', imported, breakdownRows, from: rows[0]?.date ?? null, to: rows.at(-1)?.date ?? null });
  } catch (err) {
    return sendWakaError(res, err, 'Importing WakaTime history failed');
  } finally {
    busyUsers.delete(userId);
  }
});

export default router;
