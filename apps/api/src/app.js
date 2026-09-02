import activitiesRouter from './routes/activities.js';
import stravaRouter from './integrations/strava.js';

app.use('/api', activitiesRouter); // → GET /api/activities
app.use('/api', stravaRouter);