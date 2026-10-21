import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import activitiesRouter from './routes/activities.js';
import stravaRouter from './integrations/strava.js';
import googleRouter from './integrations/google.js';
import codingRouter from './modules/coding/routes.js';
import codingAnalyticsRouter from './modules/coding/analytics.js';
import hubRouter from './modules/hub/routes.js';


const app = express();
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', authRouter);       // → POST /api/auth/register, POST /api/auth/login
app.use('/api', activitiesRouter); // → GET /api/activities
app.use('/api', stravaRouter);     // → /api/auth/strava/login, /api/strava/callback, /api/strava/sync, ...
app.use('/api', googleRouter);     // → /api/auth/google/login, /api/google/callback, /api/google/sync, ...
app.use('/api', codingRouter);     // → /api/coding/logs, /api/coding/wakatime/*
app.use('/api', codingAnalyticsRouter); // → /api/coding/overview, /api/coding/breakdown, /api/coding/goal
app.use('/api', hubRouter);        // → GET /api/hub/summary

if (!process.env.VERCEL) {
    const PORT = process.env.PORT || 4000;
    // Express 5 passes listen errors (e.g. port already in use) to this callback
    app.listen(PORT, (err) => {
        if (err) {
            console.error(err.code === 'EADDRINUSE'
                ? `Port ${PORT} is already in use — an old API is probably still running. Stop it (macOS: lsof -ti :${PORT} | xargs kill) and restart.`
                : err);
            process.exit(1);
        }
        console.log(`API running on port ${PORT}`);
    });
}

export default app;