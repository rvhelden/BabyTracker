const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router({ mergeParams: true });
router.use(authMiddleware);

function hasAccess(userId, babyId) {
  return db.prepare('SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?').get(userId, babyId);
}

// GET /api/babies/:babyId/weights
router.get('/', (req, res) => {
  if (!hasAccess(req.user.id, req.params.babyId)) {
    return res.status(404).json({ error: 'Baby not found' });
  }
  const entries = db.prepare(`
    SELECT we.*, u.name AS recorded_by_name
    FROM weight_entries we
    JOIN users u ON u.id = we.created_by
    WHERE we.baby_id = ?
    ORDER BY we.measured_at ASC
  `).all(req.params.babyId);
  res.json(entries);
});

// POST /api/babies/:babyId/weights
router.post('/', (req, res) => {
  if (!hasAccess(req.user.id, req.params.babyId)) {
    return res.status(404).json({ error: 'Baby not found' });
  }
  const { weight_grams, measured_at, notes } = req.body;
  if (!weight_grams || !measured_at) {
    return res.status(400).json({ error: 'weight_grams and measured_at are required' });
  }
  if (weight_grams < 100 || weight_grams > 50000) {
    return res.status(400).json({ error: 'weight_grams must be between 100 and 50000' });
  }

  const result = db.prepare(
    'INSERT INTO weight_entries (baby_id, weight_grams, measured_at, notes, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(req.params.babyId, weight_grams, measured_at, notes || null, req.user.id);

  const entry = db.prepare('SELECT * FROM weight_entries WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(entry);
});

// PUT /api/babies/:babyId/weights/:id
router.put('/:id', (req, res) => {
  if (!hasAccess(req.user.id, req.params.babyId)) {
    return res.status(404).json({ error: 'Baby not found' });
  }
  const entry = db.prepare('SELECT * FROM weight_entries WHERE id = ? AND baby_id = ?').get(req.params.id, req.params.babyId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  const { weight_grams, measured_at, notes } = req.body;
  if (weight_grams && (weight_grams < 100 || weight_grams > 50000)) {
    return res.status(400).json({ error: 'weight_grams must be between 100 and 50000' });
  }

  db.prepare(
    'UPDATE weight_entries SET weight_grams = COALESCE(?, weight_grams), measured_at = COALESCE(?, measured_at), notes = COALESCE(?, notes) WHERE id = ?'
  ).run(weight_grams || null, measured_at || null, notes !== undefined ? notes : null, req.params.id);

  const updated = db.prepare('SELECT * FROM weight_entries WHERE id = ?').get(req.params.id);
  res.json(updated);
});

// DELETE /api/babies/:babyId/weights/:id
router.delete('/:id', (req, res) => {
  if (!hasAccess(req.user.id, req.params.babyId)) {
    return res.status(404).json({ error: 'Baby not found' });
  }
  const entry = db.prepare('SELECT * FROM weight_entries WHERE id = ? AND baby_id = ?').get(req.params.id, req.params.babyId);
  if (!entry) return res.status(404).json({ error: 'Entry not found' });

  db.prepare('DELETE FROM weight_entries WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
