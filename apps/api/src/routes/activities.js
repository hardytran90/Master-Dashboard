// apps/api/src/routes/activities.js
import { Router } from 'express';
import { prisma } from '../core/prisma.js';
import { requireAuth } from '../core/middleware/requireAuth.js';

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

export default router;