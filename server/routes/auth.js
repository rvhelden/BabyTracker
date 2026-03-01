import { Router } from 'express';
import bcrypt from 'bcryptjs';
const { hash: _hash, compare } = bcrypt;
import jwt from 'jsonwebtoken';
const { sign } = jwt;
import { prepare } from '../db.js';
import { authMiddleware, JWT_SECRET } from '../middleware/auth.js';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'email, password, and name are required' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  }

  const existing = prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'Email already registered' });
  }

  const hash = await _hash(password, 10);
  const result = prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), hash, name);

  const token = sign({ id: result.lastInsertRowid, email: email.toLowerCase(), name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: result.lastInsertRowid, email: email.toLowerCase(), name } });
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }

  const user = prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await compare(password, user.password_hash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const token = sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET, { expiresIn: '30d' });
  res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  const user = prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(req.user.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

export default router;
