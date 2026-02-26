const express = require('express');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

const APP_BASE_URL = process.env.APP_BASE_URL || 'http://localhost:3000';

// POST /api/babies/:babyId/invites - generate invite token + QR code
router.post('/', (req, res) => {
  const access = db.prepare('SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?').get(req.user.id, req.params.babyId);
  if (!access) return res.status(404).json({ error: 'Baby not found' });

  const token = uuidv4();
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

  db.prepare(
    'INSERT INTO invites (baby_id, token, created_by, expires_at) VALUES (?, ?, ?, ?)'
  ).run(req.params.babyId, token, req.user.id, expiresAt);

  const inviteUrl = `${APP_BASE_URL}/invite/${token}`;

  QRCode.toDataURL(inviteUrl, { width: 256, margin: 2 }, (err, qrDataUrl) => {
    if (err) return res.status(500).json({ error: 'Failed to generate QR code' });
    res.json({ token, inviteUrl, qrDataUrl, expiresAt });
  });
});

// GET /api/invites/:token - get invite info (public, no auth required for info)
const publicRouter = express.Router();
publicRouter.get('/:token', (req, res) => {
  const invite = db.prepare(`
    SELECT i.*, b.name AS baby_name, b.birth_date, u.name AS invited_by
    FROM invites i
    JOIN babies b ON b.id = i.baby_id
    JOIN users u ON u.id = i.created_by
    WHERE i.token = ?
  `).get(req.params.token);

  if (!invite) return res.status(404).json({ error: 'Invite not found or expired' });
  if (invite.used_at) return res.status(410).json({ error: 'This invite has already been used' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'This invite has expired' });

  res.json({
    babyName: invite.baby_name,
    birthDate: invite.birth_date,
    invitedBy: invite.invited_by,
    expiresAt: invite.expires_at
  });
});

// POST /api/invites/:token/accept - accept invite (requires auth)
publicRouter.post('/:token/accept', authMiddleware, (req, res) => {
  const invite = db.prepare(`
    SELECT i.*, b.name AS baby_name
    FROM invites i
    JOIN babies b ON b.id = i.baby_id
    WHERE i.token = ?
  `).get(req.params.token);

  if (!invite) return res.status(404).json({ error: 'Invite not found' });
  if (invite.used_at) return res.status(410).json({ error: 'This invite has already been used' });
  if (new Date(invite.expires_at) < new Date()) return res.status(410).json({ error: 'This invite has expired' });

  const alreadyLinked = db.prepare('SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?').get(req.user.id, invite.baby_id);
  if (alreadyLinked) {
    return res.status(409).json({ error: 'You are already associated with this baby' });
  }

  db.prepare('INSERT INTO user_babies (user_id, baby_id, role) VALUES (?, ?, ?)').run(req.user.id, invite.baby_id, 'parent');
  db.prepare('UPDATE invites SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(invite.id);

  res.json({ success: true, babyId: invite.baby_id, babyName: invite.baby_name });
});

module.exports = { babyInviteRouter: router, publicInviteRouter: publicRouter };
