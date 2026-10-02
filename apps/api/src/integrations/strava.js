// Calls the Strava API (OAuth + REST v3) directly with fetch, no third-party wrapper library.
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../core/prisma.js';
import { requireAuth } from '../core/middleware/requireAuth.js'; // keep the same path your current file uses
import { encrypt, decrypt } from '../utils/crypto.js';

const router = Router();

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const SYNC_COOLDOWN_MS = 60 * 1000; // prevent spamming Sync: at least 60s between two syncs
const PER_PAGE = 200;               // maximum page size Strava allows
const MAX_PAGES = 50;               // safety cap: at most 10,000 activities per sync

const syncingUsers = new Set();     // prevent two syncs running in parallel for the same user

// ───────────────────────── Helpers ─────────────────────────

// state is signed as a JWT (expires in 10 minutes) → nobody can forge a state
// to attach their Strava account to someone else's user
function signState(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '10m' });
}

function verifyState(state) {
  try {
    return jwt.verify(state, process.env.JWT_SECRET);
  } catch {
    return null;
  }
}

// Same token format as /auth/login → works with requireAuth out of the box
function signAppToken(userId) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '7d' });
}

function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.STRAVA_CLIENT_ID,
    redirect_uri: process.env.STRAVA_REDIRECT_URI,
    response_type: 'code',
    approval_prompt: 'auto', // once approved, Strava won't ask again next time
    scope: 'read,activity:read_all',
    state,
  });
  return `${STRAVA_AUTH_URL}?${params.toString()}`;
}

function redirectToFrontend(res, path) {
  return res.redirect(`${FRONTEND_URL}${path}`);
}

async function exchangeCode(code) {
  const r = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error('Strava token exchange failed:', data);
    throw new Error('TOKEN_EXCHANGE_FAILED');
  }
  return data; // { access_token, refresh_token, expires_at, athlete: { id, firstname, ... } }
}

async function saveTokens(userId, tokenData, athleteId) {
  const data = {
    accessTokenEnc: encrypt(tokenData.access_token),
    refreshTokenEnc: encrypt(tokenData.refresh_token),
    expiresAt: new Date(tokenData.expires_at * 1000), // Strava returns epoch seconds
    ...(athleteId && { providerAccountId: String(athleteId) }),
  };
  return prisma.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider: 'strava' } },
    create: { userId, provider: 'strava', ...data },
    update: data,
  });
}

// Returns a valid access token; refreshes it automatically if it expires in < 60s
async function getValidAccessToken(userId) {
  const conn = await prisma.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: 'strava' } },
  });
  if (!conn) throw new Error('NOT_CONNECTED');

  const stillValid = conn.expiresAt && conn.expiresAt.getTime() - Date.now() > 60 * 1000;
  if (stillValid) return { accessToken: decrypt(conn.accessTokenEnc), conn };

  const r = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      grant_type: 'refresh_token',
      refresh_token: decrypt(conn.refreshTokenEnc),
    }),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error('Strava token refresh failed:', data);
    throw new Error('REFRESH_FAILED');
  }
  const updated = await saveTokens(userId, data);
  return { accessToken: data.access_token, conn: updated };
}

async function stravaGet(path, accessToken) {
  const r = await fetch(`${STRAVA_API_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (r.status === 429) throw new Error('RATE_LIMITED');
  if (r.status === 401) throw new Error('STRAVA_UNAUTHORIZED');
  const data = await r.json();
  if (!r.ok) {
    console.error(`Strava GET ${path} failed:`, data);
    throw new Error('STRAVA_ERROR');
  }
  return data;
}

const RUN_TYPES = new Set(['Run', 'TrailRun', 'VirtualRun']);
const RIDE_TYPES = new Set(['Ride', 'VirtualRide', 'MountainBikeRide', 'GravelRide', 'EBikeRide', 'EMountainBikeRide']);

function mapType(a) {
  const t = a.sport_type || a.type;
  if (RUN_TYPES.has(t)) return 'run';
  if (RIDE_TYPES.has(t)) return 'ride';
  return t.toLowerCase();
}

function mapActivity(a, userId) {
  return {
    userId,
    type: mapType(a),
    distanceKm: (a.distance / 1000).toFixed(2), // Strava returns meters
    durationSec: a.moving_time,
    elevationGainM: a.total_elevation_gain ?? null,
    activityDate: new Date(a.start_date_local), // local date where the activity happened, matches the @db.Date column
    source: 'strava',
    stravaActivityId: String(a.id),
    summaryPolyline: a.map?.summary_polyline || null,
    // Only present when the activity was recorded with a heart rate sensor
    avgHeartRate: a.has_heartrate && a.average_heartrate ? Math.round(a.average_heartrate) : null,
  };
}

// ───────────────────────── Routes ─────────────────────────

// 1. Login with Strava — the browser navigates straight here (no JWT)
router.get('/auth/strava/login', (req, res) => {
  res.redirect(buildAuthorizeUrl(signState({ purpose: 'login' })));
});

// 2. Connect Strava for a user who is logged in with email.
//    Returns the URL as JSON (instead of redirecting) because the browser
//    can't send a Bearer header during a page navigation.
router.get('/strava/connect-url', requireAuth, (req, res) => {
  res.json({ url: buildAuthorizeUrl(signState({ purpose: 'connect', userId: req.user.id })) });
});

// 3. Shared callback for both login and connect — distinguished by state.purpose
router.get('/strava/callback', async (req, res) => {
  const { code, state, error, scope = '' } = req.query;
  const payload = verifyState(state);
  const failPath = payload?.purpose === 'connect' ? '/fitness?strava=error' : '/login?error=strava';

  try {
    if (error || !code || !payload) return redirectToFrontend(res, failPath);

    // The user may untick the activity permission on the Strava screen → sync would not work
    if (!scope.includes('activity:read')) {
      const scopePath = payload.purpose === 'connect' ? '/fitness?strava=scope' : '/login?error=strava_scope';
      return redirectToFrontend(res, scopePath);
    }

    const tokenData = await exchangeCode(code);
    const athleteId = String(tokenData.athlete.id);

    const linked = await prisma.oAuthConnection.findUnique({
      where: { provider_providerAccountId: { provider: 'strava', providerAccountId: athleteId } },
    });

    if (payload.purpose === 'connect') {
      if (linked && linked.userId !== payload.userId) {
        return redirectToFrontend(res, '/fitness?strava=already_linked');
      }
      await saveTokens(payload.userId, tokenData, athleteId);
      return redirectToFrontend(res, '/fitness?strava=connected');
    }

    // purpose === 'login': find the user linked to this athlete, create one if none exists
    let userId = linked?.userId;
    if (!userId) {
      const user = await prisma.user.create({ data: {} }); // email = null, passwordHash = null
      userId = user.id;
    }
    await saveTokens(userId, tokenData, athleteId);

    // Token goes after the # → never sent to the server or written to logs,
    // only readable by frontend JS
    const token = signAppToken(userId);
    return redirectToFrontend(res, `/auth/strava/callback#token=${encodeURIComponent(token)}`);
  } catch (err) {
    console.error('GET /strava/callback error:', err);
    return redirectToFrontend(res, failPath);
  }
});

// 4. Connection status — the frontend uses it to decide between "Connect" and "Sync Data"
router.get('/strava/status', requireAuth, async (req, res) => {
  try {
    const conn = await prisma.oAuthConnection.findUnique({
      where: { userId_provider: { userId: req.user.id, provider: 'strava' } },
    });
    if (!conn) return res.json({ connected: false });

    // Old connection (created before the providerAccountId column existed) → backfill the athlete id
    // so that "Login with Strava" recognizes this account next time instead of creating a new user
    if (!conn.providerAccountId) {
      try {
        const { accessToken } = await getValidAccessToken(req.user.id);
        const athlete = await stravaGet('/athlete', accessToken);
        await prisma.oAuthConnection.update({
          where: { id: conn.id },
          data: { providerAccountId: String(athlete.id) },
        });
      } catch (e) {
        console.warn('Could not backfill athlete id:', e.message);
      }
    }

    res.json({ connected: true, lastSyncedAt: conn.lastSyncedAt });
  } catch (err) {
    console.error('GET /strava/status error:', err);
    res.status(500).json({ error: 'Cannot read Strava status' });
  }
});

// 5. Sync — only runs when the user clicks the button. Fetches ALL activities (paginated),
//    creates new ones and updates existing ones
router.post('/strava/sync', requireAuth, async (req, res) => {
  const userId = req.user.id;

  if (syncingUsers.has(userId)) {
    return res.status(409).json({ error: 'Syncing in progress. Please wait!' });
  }
  syncingUsers.add(userId);

  try {
    let auth;
    try {
      auth = await getValidAccessToken(userId);
    } catch (e) {
      if (e.message === 'NOT_CONNECTED') {
        return res.status(400).json({ error: 'Not connect with Strava' });
      }
      throw e;
    }
    const { accessToken, conn } = auth;

    if (conn.lastSyncedAt) {
      const waitMs = SYNC_COOLDOWN_MS - (Date.now() - conn.lastSyncedAt.getTime());
      if (waitMs > 0) {
        return res.status(429).json({ error: `Sync done. Please try later ${Math.ceil(waitMs / 1000)} seconds` });
      }
    }

    // Keep fetching pages until a page returns fewer than PER_PAGE items
    const all = [];
    for (let page = 1; page <= MAX_PAGES; page++) {
      const batch = await stravaGet(`/athlete/activities?per_page=${PER_PAGE}&page=${page}`, accessToken);
      all.push(...batch);
      if (batch.length < PER_PAGE) break;
    }

    // A single query to find which activities already exist (instead of findUnique one by one)
    const existing = await prisma.activity.findMany({
      where: { stravaActivityId: { in: all.map((a) => String(a.id)) } },
      select: { stravaActivityId: true, userId: true },
    });
    const ownerById = new Map(existing.map((e) => [e.stravaActivityId, e.userId]));

    const toCreate = [];
    const toUpdate = [];
    let skipped = 0;
    for (const a of all) {
      const data = mapActivity(a, userId);
      const owner = ownerById.get(data.stravaActivityId);
      if (owner === undefined) toCreate.push(data);
      else if (owner === userId) toUpdate.push(data);
      else skipped++; // already belongs to another user, leave it untouched
    }

    if (toCreate.length) {
      await prisma.activity.createMany({ data: toCreate, skipDuplicates: true });
    }
    // Update in batches of 100 records per transaction — picks up edits made on Strava
    // (changed type, corrected distance, ...)
    for (let i = 0; i < toUpdate.length; i += 100) {
      await prisma.$transaction(
        toUpdate.slice(i, i + 100).map((d) =>
          prisma.activity.update({ where: { stravaActivityId: d.stravaActivityId }, data: d })
        )
      );
    }

    const lastSyncedAt = new Date();
    await prisma.oAuthConnection.update({ where: { id: conn.id }, data: { lastSyncedAt } });

    res.json({
      total: all.length,
      created: toCreate.length,
      updated: toUpdate.length,
      skipped,
      lastSyncedAt,
    });
  } catch (err) {
    if (err.message === 'RATE_LIMITED') {
      return res.status(429).json({ error: 'Strava requests are limited, try again after 15 minutes.' });
    }
    if (err.message === 'REFRESH_FAILED' || err.message === 'STRAVA_UNAUTHORIZED') {
      return res.status(401).json({ error: 'Strava connection is expired. Please reconnect.' });
    }
    console.error('POST /strava/sync error:', err);
    res.status(500).json({ error: 'Syncing Strava failed!' });
  } finally {
    syncingUsers.delete(userId);
  }
});

export default router;
