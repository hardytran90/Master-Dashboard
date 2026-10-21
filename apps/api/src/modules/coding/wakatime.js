// WakaTime API client (OAuth 2.0 + REST v1), plain fetch — same style as integrations/strava.js.
// Docs: https://wakatime.com/developers
import { prisma } from '../../core/prisma.js';
import { encrypt, decrypt } from '../../utils/crypto.js';

const WAKA_BASE = 'https://wakatime.com';
const API_BASE = `${WAKA_BASE}/api/v1`;

// read_summaries  → daily summaries (/users/current/summaries)
// read_heartbeats → data dumps (/users/current/data_dumps) = full history export
export const WAKATIME_SCOPES = 'read_summaries,read_heartbeats';

export function buildAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: process.env.WAKATIME_CLIENT_ID,
    redirect_uri: process.env.WAKATIME_REDIRECT_URI,
    response_type: 'code',
    scope: WAKATIME_SCOPES,
    state,
  });
  return `${WAKA_BASE}/oauth/authorize?${params.toString()}`;
}

async function tokenRequest(body) {
  const r = await fetch(`${WAKA_BASE}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      client_id: process.env.WAKATIME_CLIENT_ID,
      client_secret: process.env.WAKATIME_CLIENT_SECRET,
      redirect_uri: process.env.WAKATIME_REDIRECT_URI,
      ...body,
    }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok || !data?.access_token) {
    console.error('WakaTime token request failed:', r.status, data);
    throw new Error('TOKEN_EXCHANGE_FAILED');
  }
  return data; // { access_token, refresh_token, expires_at (ISO), uid, scope, ... }
}

export const exchangeCode = (code) => tokenRequest({ grant_type: 'authorization_code', code });

export async function revokeToken(token) {
  await fetch(`${WAKA_BASE}/oauth/revoke`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: process.env.WAKATIME_CLIENT_ID,
      client_secret: process.env.WAKATIME_CLIENT_SECRET,
      token,
    }),
  }).catch((e) => console.warn('WakaTime revoke failed:', e.message));
}

export async function saveTokens(userId, tokenData, accountId) {
  const expires = tokenData.expires_at ? new Date(tokenData.expires_at) : null;
  const data = {
    accessTokenEnc: encrypt(tokenData.access_token),
    refreshTokenEnc: tokenData.refresh_token ? encrypt(tokenData.refresh_token) : null,
    expiresAt: expires && !Number.isNaN(expires.getTime()) ? expires : null,
    ...(accountId && { providerAccountId: String(accountId) }),
  };
  return prisma.oAuthConnection.upsert({
    where: { userId_provider: { userId, provider: 'wakatime' } },
    create: { userId, provider: 'wakatime', ...data },
    update: data,
  });
}

export function getConnection(userId) {
  return prisma.oAuthConnection.findUnique({
    where: { userId_provider: { userId, provider: 'wakatime' } },
  });
}

// Tokens from the code flow last ~100 years, but refresh anyway if one is about to expire.
export async function getValidAccessToken(userId) {
  const conn = await getConnection(userId);
  if (!conn) throw new Error('NOT_CONNECTED');

  const expiringSoon = conn.expiresAt && conn.expiresAt.getTime() - Date.now() < 60 * 1000;
  if (!expiringSoon || !conn.refreshTokenEnc) {
    return { accessToken: decrypt(conn.accessTokenEnc), conn };
  }
  const data = await tokenRequest({ grant_type: 'refresh_token', refresh_token: decrypt(conn.refreshTokenEnc) });
  const updated = await saveTokens(userId, data);
  return { accessToken: data.access_token, conn: updated };
}

export async function wakaFetch(path, accessToken, options = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json', ...options.headers },
  });
  if (r.status === 429) throw new Error('RATE_LIMITED');
  if (r.status === 401 || r.status === 403) throw new Error('WAKATIME_UNAUTHORIZED');
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    console.error(`WakaTime ${options.method || 'GET'} ${path} failed:`, r.status, data);
    const err = new Error('WAKATIME_ERROR');
    err.status = r.status;
    throw err;
  }
  return data;
}
