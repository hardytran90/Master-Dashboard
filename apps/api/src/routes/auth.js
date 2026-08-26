import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../core/prisma.js'

const router = Router();

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email or Password is missing!' });
        }
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters! '});
        }

        const existing = await prisma.user.findUnique({ where: { email } });
        if (existing) {
            return res.status(409).json( { error: 'Email address is existed' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: { email, passwordHash },
            select: { id: true, email: true, createdAt: true},
        });

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.status(201).json({ token, user });
    }
    catch (err) {
    console.error('POST /auth/register error: ', err);
    res.status(500).json({ error: "Cannot create account! "});
    }
});

// POST /api/auth/login
router.post('/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email or Password is missing!' });
        }
        
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.passwordHash) {
            return res.status(401).json({ error: 'Email or Password is incorrect!'});
        }

        const token = jwt.sign(
            { userId: user.id },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: { id: user.id, email: user.email },
        });
        
    } catch (err) {
        console.error('POST /auth/login error:', err);
        res.status(500).json({ error: 'Login failed! '});
    }
});

export default router;