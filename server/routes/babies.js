const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();
router.use(authMiddleware);

// GET /api/babies - list babies for current user
router.get('/', (req, res) => {
  const babies = db.prepare(`
    SELECT b.*, ub.role,
      (SELECT COUNT(*) FROM user_babies WHERE baby_id = b.id) AS parent_count,
      (SELECT weight_grams FROM weight_entries WHERE baby_id = b.id ORDER BY measured_at DESC LIMIT 1) AS latest_weight,
      (SELECT measured_at FROM weight_entries WHERE baby_id = b.id ORDER BY measured_at DESC LIMIT 1) AS latest_weight_date
    FROM babies b
    JOIN user_babies ub ON ub.baby_id = b.id
    WHERE ub.user_id = ?
    ORDER BY b.created_at DESC
  `).all(req.user.id);
  res.json(babies);
});

// POST /api/babies - create a new baby
router.post('/', (req, res) => {
  const { name, birth_date, gender } = req.body;
  if (!name || !birth_date) {
    return res.status(400).json({ error: 'name and birth_date are required' });
  }

  const result = db.prepare(
    'INSERT INTO babies (name, birth_date, gender) VALUES (?, ?, ?)'
  ).run(name, birth_date, gender || null);

  db.prepare(
    'INSERT INTO user_babies (user_id, baby_id, role) VALUES (?, ?, ?)'
  ).run(req.user.id, result.lastInsertRowid, 'owner');

  const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(baby);
});

// GET /api/babies/:id
router.get('/:id', (req, res) => {
  const access = db.prepare('SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?').get(req.user.id, req.params.id);
  if (!access) return res.status(404).json({ error: 'Baby not found' });

  const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
  const parents = db.prepare(`
    SELECT u.id, u.name, u.email, ub.role, ub.created_at AS joined_at
    FROM users u
    JOIN user_babies ub ON ub.user_id = u.id
    WHERE ub.baby_id = ?
  `).all(req.params.id);

  res.json({ ...baby, role: access.role, parents });
});

// PUT /api/babies/:id
router.put('/:id', (req, res) => {
  const access = db.prepare('SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?').get(req.user.id, req.params.id);
  if (!access) return res.status(404).json({ error: 'Baby not found' });

  const { name, birth_date, gender } = req.body;
  db.prepare(
    'UPDATE babies SET name = COALESCE(?, name), birth_date = COALESCE(?, birth_date), gender = COALESCE(?, gender) WHERE id = ?'
  ).run(name || null, birth_date || null, gender || null, req.params.id);

  const baby = db.prepare('SELECT * FROM babies WHERE id = ?').get(req.params.id);
  res.json(baby);
});

// DELETE /api/babies/:id - only owner can delete
router.delete('/:id', (req, res) => {
  const access = db.prepare('SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?').get(req.user.id, req.params.id);
  if (!access || access.role !== 'owner') {
    return res.status(403).json({ error: 'Only the owner can delete a baby profile' });
  }
  db.prepare('DELETE FROM babies WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

// DELETE /api/babies/:id/leave - remove self from baby (non-owners)
router.delete('/:id/leave', (req, res) => {
  const access = db.prepare('SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?').get(req.user.id, req.params.id);
  if (!access) return res.status(404).json({ error: 'Baby not found' });
  if (access.role === 'owner') {
    return res.status(400).json({ error: 'Owner cannot leave. Delete the baby profile instead.' });
  }
  db.prepare('DELETE FROM user_babies WHERE user_id = ? AND baby_id = ?').run(req.user.id, req.params.id);
  res.json({ success: true });
});

module.exports = router;
