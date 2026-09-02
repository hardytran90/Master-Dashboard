import { Router } from 'express';
import { prisma } from '../core/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = Router();

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// REDIRECT TO AUTHORIZATION PAGE OF STRAVA
router.get('/strava/connect', requireAuth, (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID,
        redirect_uri: process.env.STRAVA_REDIRECT_URI,
        response_type: 'code',
        scope: 'activity:read_all',
        state: String(req.user.id), // MOUNT userId TO STATE TO KNOW WHO IS CONNECT WITH
    });
    res.redirect(`${STRAVA_AUTH_URL}?${params.toString()}`);
});

// STRAVA REDIRECT HERE WITH ?code=...&state=userId
router.get('/strava/callback', async (req, res) => {
    try {
        const { code, state, error } = req.query;

        if (error) {
            return res.status(400).json({ error: `Strava refuses to connect: ${error}`});
        }
        const userId = Number(state);
        if (!code || !userId) {
            return res.status(400).json({ error: 'Code or State is missing from Strava' });
        }

        const tokenRes = await fetch(STRAVA_TOKEN_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: process.env.STRAVA_CLIENT_ID,
                client_secret: process.env.STRAVA_CLIENT_SECRET,
                code,
                grant_type: 'authorization_code',
            }),
        });
        const tokenData = await tokenRes.json();

        if (!tokenRes.ok) {
            console.error('Strava token exchange error: ', tokenData);
            return res.status(400).json({ error: 'Cannot exchange token from Strava' });
        }

        const { access_token, refresh_token, expires_at } = tokenData;

        // UPSERT - EACH USER ONLY HAVE 1 RECORD FOR STRAVA PROVIDER (VIA @@unique([userId, provider]))
        await prisma.oAuthConnection.upsert({
            where: { userId_provider: { userId, provider: 'strava' } },
            update: {
        accessTokenEnc: encrypt(access_token),
        refreshTokenEnc: encrypt(refresh_token),
        expiresAt: new Date(expires_at * 1000), // Strava returns timestamp (seconds)
      },
      create: {
        userId,
        provider: 'strava',
        accessTokenEnc: encrypt(access_token),
        refreshTokenEnc: encrypt(refresh_token),
        expiresAt: new Date(expires_at * 1000),
      },
    });

    // REDIRECT TO FRONTEND, SUCCESSFUL CONNECT
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/fitness?strava=connected`);
  } catch (err) {
    console.error('GET /strava/callback error:', err);
    res.status(500).json({ error: 'Error when processing callback Strava' });
  }
});

// ── HELPER: TAKE VALID ACCESS TOKEN - AUTO REFRESH IF EXPIRES
async function getValidAccessToken(userId) {
  const conn = await prisma.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: 'strava' } },
  });
  if (!conn) {
    throw new Error('NOT_CONNECTED');
  }

  const isExpired = conn.expiresAt && conn.expiresAt.getTime() < Date.now() + 60_000; // extend to 1 min
  if (!isExpired) {
    return decrypt(conn.accessTokenEnc);
  }

  // Refresh token
  const refreshRes = await fetch(STRAVA_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.STRAVA_CLIENT_ID,
      client_secret: process.env.STRAVA_CLIENT_SECRET,
      refresh_token: decrypt(conn.refreshTokenEnc),
      grant_type: 'refresh_token',
    }),
  });
  const refreshData = await refreshRes.json();
  if (!refreshRes.ok) {
    throw new Error('REFRESH_FAILED');
  }
  await prisma.oAuthConnection.update({
    where: { userId_provider: { userId, provider: 'strava' } },
    data: {
      accessTokenEnc: encrypt(refreshData.access_token),
      refreshTokenEnc: encrypt(refreshData.refresh_token),
      expiresAt: new Date(refreshData.expires_at * 1000),
    },
  });

  return refreshData.access_token;
}

// SYNC - FETCH LATEST ACTIVITIES FROM STRAVA - UPSERT TO ACTIVITIES TABLE
router.post('/strava/sync', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    let accessToken;
    try {
      accessToken = await getValidAccessToken(userId);
    } catch (e) {
      if (e.message === 'NOT_CONNECTED') {
        return res.status(400).json({ error: 'Not connect to Strava, call /strava/connect first' });
      }
      throw e;
    }

    // Take 30 latest activities (Can extend to next page)
    const activitiesRes = await fetch(
      `${STRAVA_API_BASE}/athlete/activities?per_page=30`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const stravaActivities = await activitiesRes.json();

    if (!activitiesRes.ok) {
      console.error('Strava API lỗi:', stravaActivities);
      return res.status(502).json({ error: 'Cannot fetch data from Strava' });
    }

    let created = 0;
    let skipped = 0;

    for (const a of stravaActivities) {
      const stravaId = String(a.id);
      const existing = await prisma.activity.findUnique({
        where: { stravaActivityId: stravaId },
      });
      if (existing) {
        skipped++;
        continue; // synced before, pass
      }

      await prisma.activity.create({
        data: {
          userId,
          type: a.type === 'Run' ? 'run' : a.type === 'Ride' ? 'ride' : a.type.toLowerCase(),
          distanceKm: (a.distance / 1000).toFixed(2), // Strava returns meters
          durationSec: a.moving_time,
          elevationGainM: a.total_elevation_gain ?? null,
          activityDate: new Date(a.start_date),
          source: 'strava',
          stravaActivityId: stravaId,
          summaryPolyline: a.map?.summary_polyline ?? null,
        },
      });
      created++;
      }

    res.json({ synced: created, skipped });
  } catch (err) {
    console.error('POST /strava/sync error:', err);
    res.status(500).json({ error: 'Error when syncing with Strava' });
  }
});

export default router;