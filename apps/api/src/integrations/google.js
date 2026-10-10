// "Continue with Google" via OAuth 2.0 / OpenID Connect, using fetch directly (no extra library).
import { Router } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../core/prisma.js';
import { encrypt } from '../utils/crypto.js';

const router = Router();

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// ───────────────────────── Helpers ─────────────────────────

// Signed state (10 min) → prevents forged callbacks and carries the "remember me" choice
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

// Same token format as /auth/login → requireAuth works unchanged
function signAppToken(userId, remember) {
  return jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: remember ? '30d' : '1d' });
}

function redirectToFrontend(res, path) {
  return res.redirect(`${FRONTEND_URL}${path}`);
}

async function exchangeCode(code) {
  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code',
    }),
  });
  if (!response.ok) {
    throw new Error(`Google token exchange failed: ${response.status} ${await response.text()}`);
  }
  return response.json(); // { access_token, expires_in, refresh_token?, id_token, ... }
}

async function fetchProfile(accessToken) {
  const response = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error(`Google userinfo failed: ${response.status} ${await response.text()}`);
  }
  return response.json(); // { sub, email, email_verified, name, picture }
}

// ───────────────────────── Routes ─────────────────────────

// 1. Login button → redirect to Google's account picker
//    GET /api/auth/google/login?remember=1
router.get('/auth/google/login', (req, res) => {

  const remember = req.query.remember === '1';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'openid email profile',
    state: signState({ purpose: 'google_login', remember }),
    prompt: 'select_account', // always let the user pick which Google account
  });
  res.redirect(`${GOOGLE_AUTH_URL}?${params}`);
});

// 2. Google redirects back here
router.get('/auth/google/callback', async (req, res) => {
  const { code, state, error } = req.query;
  const payload = verifyState(state);

  if (error || !code || payload?.purpose !== 'google_login') {
    return redirectToFrontend(res, '/login?error=google');
  }

  try {
    const tokenData = await exchangeCode(code);
    const profile = await fetchProfile(tokenData.access_token);

    if (!profile.email || !profile.email_verified) {
      return redirectToFrontend(res, '/login?error=google_email');
    }
    const googleId = String(profile.sub);

    // a) Google account already linked → that user
    const linked = await prisma.oAuthConnection.findUnique({
      where: { provider_providerAccountId: { provider: 'google', providerAccountId: googleId } },
    });
    let userId = linked?.userId;

    // b) Not linked yet → reuse the account with the same (verified) email, otherwise create one
    if (!userId) {
      const existing = await prisma.user.findUnique({ where: { email: profile.email } });
      userId = existing
        ? existing.id
        : (await prisma.user.create({ data: { email: profile.email } })).id; // passwordHash = null
    }

    const data = {
      providerAccountId: googleId,
      accessTokenEnc: encrypt(tokenData.access_token),
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      // Google only sends refresh_token the first time → don't overwrite an existing one with null
      ...(tokenData.refresh_token && { refreshTokenEnc: encrypt(tokenData.refresh_token) }),
    };
    await prisma.oAuthConnection.upsert({
      where: { userId_provider: { userId, provider: 'google' } },
      update: data,
      create: { userId, provider: 'google', ...data },
    });

    // Token after the # → never sent to the server or written to logs
    const token = signAppToken(userId, payload.remember);
    const remember = payload.remember ? '1' : '0';
    return redirectToFrontend(
      res,
      `/auth/google/callback#token=${encodeURIComponent(token)}&remember=${remember}`
    );
  } catch (err) {
    console.error('GET /auth/google/callback error:', err);
    return redirectToFrontend(res, '/login?error=google');
  }
});

export default router;
