import { Router } from 'express';
import { prisma } from '../core/prisma.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { encrypt, decrypt } from '../utils/crypto.js';

const router = Router();

const STRAVA_AUTH_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_API_BASE = 'https://www.strava.com/api/v3';

// Redirect to authorize page of Strava

router.get('/strava/connect', requireAuth, (req, res) => {
    const params = new URLSearchParams({
        client_id: process.env.STRAVA_CLIENT_ID,
        redirect_uri: process.env.STRAVA_REDIRECT_URI,
        response_type: 'code',
        scope: 'activity:read_all',
        state: String(req.user.id),
    });
    res.redirect(`${STRAVA_AUTH_URL}?${params.toString()}`);
});