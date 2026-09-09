// apps/api/src/routes/activities.js
import { Router } from 'express';
import { prisma } from '../core/prisma.js';
import { requireAuth } from '../core/middleware/requireAuth.js';
import { parseGpx } from '../utils/gpx.js';
import multer from 'multer';

const router = Router();

router.get('/activities', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id; // mounted by requireAuth (keep old middleware)
    const { type, from, to, page = 1, limit = 20 } = req.query;

    const take = Math.min(Number(limit) || 20, 100); // Prevent large limit
    const skip = (Math.max(Number(page) || 1, 1) - 1) * take;

    const where = {
      userId,
      ...(type && { type }),
      ...((from || to) && {
        activityDate: {
          ...(from && { gte: new Date(from) }),
          ...(to && { lte: new Date(to) }),
        },
      }),
    };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { activityDate: 'desc' },
        skip,
        take,
      }),
      prisma.activity.count({ where }),
    ]);

    res.json({
      data: activities,
      pagination: {
        page: Number(page) || 1,
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    });
  } catch (err) {
    console.error('GET /activities error:', err);
    res.status(500).json({ error: 'Cannot load activities' });
  }
});

router.post('/activities', requireAuth, async (req, res) => {
    try {
        const userId = req.user.id;
        const {
            type,
            activityDate,
            distanceKm,
            durationSec,
            elevationGainM,
            source = 'manual',
        } = req.body;

        // Minimum validate - 3 required categories for each activity
        if (!type || !activityDate || distanceKm == null || durationSec == null) {
            return res.status(400).json({
                error: 'Required categories is missing: type, activityDate, distanceKm, durationSec',
            });
        }

        const activity = await prisma.activity.create({
            data: {
                userId,
                type,
                activityDate: new Date(activityDate),
                distanceKm: distanceKm,
                durationSec: Number(durationSec),
                elevationGainM: elevationGainM != null ? Number(elevationGainM) : null,
                source, // 'manual' default - distinguish with Strava
            },
        });

        res.status(201).json({ data: activity });
    } catch (err) {
    console.error('POST /activities error: ', err);
    res.status(500).json({ error: 'Cannot create activity!' });
    }
});

// AFTER DESIGNING GPX FILE UPLOAD FUNCTION

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 }}); // 10MB limit

router.post('/activities/import-gpx', requireAuth, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'File GPX is missing!' });
    }

    const xmlString = req.file.buffer.toString('utf-8');
    const parsed = parseGpx(xmlString);

    if (parsed.durationSec == null) {
      return res.status(400).json({
        error: 'File GPX has no time data, cannot calculate duration data!',
      });
    }

    const activity = await prisma.activity.create({
      data: {
        userId: req.user.id,
        type: req.body.type || 'run', // Frontend can send type via another form field, default 'run'
        activityDate: parsed.activityDate,
        distanceKm: parsed.distanceKm,
        durationSec: parsed.durationSec,
        elevationGainM: parsed.elevationGainM,
        source: 'gpx',
      },
    });

    res.status(201).json({ json: activity });
  } catch (err) {
    console.error('POST /activities/import-gpx error:', err);
    res.status(400).json({ error: err.message || 'Cannot process GPX file!'});
  }
});

export default router;