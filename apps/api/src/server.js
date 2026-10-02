import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import authRouter from './routes/auth.js';
import activitiesRouter from './routes/activities.js';
import stravaRouter from './integrations/strava.js';


const app = express();
app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.use('/api', authRouter);       // → POST /api/auth/register, POST /api/auth/login
app.use('/api', activitiesRouter); // → GET /api/activities
app.use('/api', stravaRouter);     // → /api/auth/strava/login, /api/strava/callback, /api/strava/sync, ...

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`API running on port ${PORT}`));