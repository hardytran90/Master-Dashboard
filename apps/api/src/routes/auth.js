import { Router } from 'express';
import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../core/prisma.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();

const REMEMBER_EXPIRES = '30d';  // "Remember me" ticked
const SESSION_EXPIRES = '1d';    // not ticked (token also lives only in sessionStorage)
const RESET_COOLDOWN_MS = 5 * 60 * 1000; // at most 1 forgot-password email per address every 5 minutes

const lastResetAt = new Map(); // email -> timestamp, in-memory (resets when the server restarts)

function signAppToken(userId, remember = true) {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: remember ? REMEMBER_EXPIRES : SESSION_EXPIRES }
  );
}

// 12 random characters, URL-safe (letters, digits, - and _)
function generatePassword() {
  return crypto.randomBytes(9).toString('base64url');
}

// POST /api/auth/register
router.post('/auth/register', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');

    if (!email || !password) {
      return res.status(400).json({ error: 'Email or Password is missing!' });
    }
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters!' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'This email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, passwordHash },
      select: { id: true, email: true, createdAt: true }, // never return passwordHash
    });

    res.status(201).json({ token: signAppToken(user.id, false), user });
  } catch (err) {
    console.error('POST /auth/register error:', err);
    res.status(500).json({ error: 'Cannot create account!' });
  }
});

// POST /api/auth/login   body: { email, password, remember }
router.post('/auth/login', async (req, res) => {
  try {
    const email = String(req.body.email || '').trim();
    const password = String(req.body.password || '');
    const remember = Boolean(req.body.remember);

    if (!email || !password) {
      return res.status(400).json({ error: 'Email or Password is missing!' });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    // Users created via Google/Strava have no passwordHash → same generic message
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Email or Password is incorrect!' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Email or Password is incorrect!' });
    }

    res.json({
      token: signAppToken(user.id, remember),
      user: { id: user.id, email: user.email },
    });
  } catch (err) {
    console.error('POST /auth/login error:', err);
    res.status(500).json({ error: 'Login failed!' });
  }
});

// POST /api/auth/forgot-password   body: { email }
// Generates a new password, saves it, and emails it to the user.
// Always returns the same message so nobody can probe which emails are registered.
router.post('/auth/forgot-password', async (req, res) => {
  const email = String(req.body.email || '').trim();
  if (!email) {
    return res.status(400).json({ error: 'Please enter your email.' });
  }

  const genericReply = {
    message: 'If this email is registered, a new password is on its way. Check your inbox (and spam folder).',
  };

  const key = email.toLowerCase();
  const last = lastResetAt.get(key);
  if (last && Date.now() - last < RESET_COOLDOWN_MS) {
    return res.json(genericReply);
  }
  lastResetAt.set(key, Date.now());

  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.json(genericReply);

    const newPassword = generatePassword();
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash: await bcrypt.hash(newPassword, 10) },
    });

    try {
      await sendMail({
        to: user.email,
        subject: 'Your new Master Dashboard password',
        text:
          `Hi,\n\nYour password has been reset. Your new password is:\n\n${newPassword}\n\n` +
          `Log in with it and keep it somewhere safe.\n` +
          `If you didn't request this, someone entered your email on the "Forgot password" page.`,
        html:
          `<p>Hi,</p><p>Your password has been reset. Your new password is:</p>` +
          `<p style="font-size:18px;font-family:monospace"><strong>${newPassword}</strong></p>` +
          `<p>Log in with it and keep it somewhere safe.</p>` +
          `<p style="color:#666">If you didn't request this, someone entered your email on the "Forgot password" page.</p>`,
      });
    } catch (mailErr) {
      // Email failed → restore the old password so the user isn't locked out
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash: user.passwordHash },
      });
      lastResetAt.delete(key);
      throw mailErr;
    }

    res.json(genericReply);
  } catch (err) {
    console.error('POST /auth/forgot-password error:', err.meta?.driverAdapterError?.cause ?? err);
    res.status(500).json({ error: 'Could not send the email. Please try again later.' });
  }
});

export default router;
