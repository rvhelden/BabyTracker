/**
 * Data Access Layer — all database queries.
 * Only imported from Server Components, Server Actions, or Route Handlers.
 */
import { prepare } from './db.js';

// ── Users ──────────────────────────────────────────────────────────────────

export function getUserByEmail(email) {
  return prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
}

export function getUserById(id) {
  return prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(id);
}

export function createUser(email, passwordHash, name) {
  return prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email.toLowerCase(), passwordHash, name);
}

// ── Babies ─────────────────────────────────────────────────────────────────

export function getBabiesForUser(userId) {
  return prepare(`
    SELECT b.*, ub.role,
      (SELECT COUNT(*) FROM user_babies WHERE baby_id = b.id) AS parent_count,
      (SELECT weight_grams FROM weight_entries WHERE baby_id = b.id ORDER BY measured_at DESC LIMIT 1) AS latest_weight,
      (SELECT measured_at  FROM weight_entries WHERE baby_id = b.id ORDER BY measured_at DESC LIMIT 1) AS latest_weight_date
    FROM babies b
    JOIN user_babies ub ON ub.baby_id = b.id
    WHERE ub.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);
}

export function getBabyForUser(babyId, userId) {
  const access = prepare(
    'SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?'
  ).get(userId, babyId);
  if (!access) return null;

  const baby = prepare('SELECT * FROM babies WHERE id = ?').get(babyId);
  const parents = prepare(`
    SELECT u.id, u.name, u.email, ub.role, ub.created_at AS joined_at
    FROM users u
    JOIN user_babies ub ON ub.user_id = u.id
    WHERE ub.baby_id = ?
  `).all(babyId);

  return { ...baby, role: access.role, parents };
}

export function createBaby(name, birthDate, gender, ownerId) {
  const result = prepare(
    'INSERT INTO babies (name, birth_date, gender, photo_url) VALUES (?, ?, ?, ?)'
  ).run(name, birthDate, gender || null, null);

  prepare(
    'INSERT INTO user_babies (user_id, baby_id, role) VALUES (?, ?, ?)'
  ).run(ownerId, result.lastInsertRowid, 'owner');

  return prepare('SELECT * FROM babies WHERE id = ?').get(result.lastInsertRowid);
}

export function updateBaby(babyId, userId, { name, birth_date, gender, photo_url }) {
  const access = prepare(
    'SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?'
  ).get(userId, babyId);
  if (!access) return null;

  prepare(
    'UPDATE babies SET name = COALESCE(?, name), birth_date = COALESCE(?, birth_date), gender = COALESCE(?, gender), photo_url = COALESCE(?, photo_url) WHERE id = ?'
  ).run(name || null, birth_date || null, gender !== undefined ? gender || null : null, photo_url || null, babyId);

  return prepare('SELECT * FROM babies WHERE id = ?').get(babyId);
}

export function deleteBaby(babyId, userId) {
  const access = prepare(
    'SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?'
  ).get(userId, babyId);
  if (!access || access.role !== 'owner') return { error: 'Only the owner can delete a baby profile' };
  prepare('DELETE FROM babies WHERE id = ?').run(babyId);
  return { success: true };
}

export function leaveBaby(babyId, userId) {
  const access = prepare(
    'SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?'
  ).get(userId, babyId);
  if (!access) return { error: 'Baby not found' };
  if (access.role === 'owner') return { error: 'Owner cannot leave. Delete the baby profile instead.' };
  prepare('DELETE FROM user_babies WHERE user_id = ? AND baby_id = ?').run(userId, babyId);
  return { success: true };
}

// ── Weight entries ─────────────────────────────────────────────────────────

export function getWeightsForBaby(babyId, userId) {
  const access = prepare(
    'SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?'
  ).get(userId, babyId);
  if (!access) return null;

  return prepare(`
    SELECT we.*, u.name AS recorded_by_name
    FROM weight_entries we
    JOIN users u ON u.id = we.created_by
    WHERE we.baby_id = ?
    ORDER BY we.measured_at ASC
  `).all(babyId);
}

export function addWeight(babyId, userId, { weight_grams, measured_at, notes }) {
  const result = prepare(
    'INSERT INTO weight_entries (baby_id, weight_grams, measured_at, notes, created_by) VALUES (?, ?, ?, ?, ?)'
  ).run(babyId, weight_grams, measured_at, notes || null, userId);

  return prepare('SELECT * FROM weight_entries WHERE id = ?').get(result.lastInsertRowid);
}

export function updateWeight(babyId, entryId, { weight_grams, measured_at, notes }) {
  const entry = prepare(
    'SELECT * FROM weight_entries WHERE id = ? AND baby_id = ?'
  ).get(entryId, babyId);
  if (!entry) return null;

  prepare(
    'UPDATE weight_entries SET weight_grams = COALESCE(?, weight_grams), measured_at = COALESCE(?, measured_at), notes = COALESCE(?, notes) WHERE id = ?'
  ).run(weight_grams || null, measured_at || null, notes !== undefined ? notes : null, entryId);

  return prepare('SELECT * FROM weight_entries WHERE id = ?').get(entryId);
}

export function deleteWeight(babyId, entryId) {
  const entry = prepare(
    'SELECT * FROM weight_entries WHERE id = ? AND baby_id = ?'
  ).get(entryId, babyId);
  if (!entry) return { error: 'Entry not found' };
  prepare('DELETE FROM weight_entries WHERE id = ?').run(entryId);
  return { success: true };
}

// ── Milk entries ───────────────────────────────────────────────────────────

export function getMilkForBaby(babyId, userId) {
  const access = prepare(
    'SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?'
  ).get(userId, babyId);
  if (!access) return null;

  return prepare(`
    SELECT me.*, u.name AS recorded_by_name
    FROM milk_entries me
    JOIN users u ON u.id = me.created_by
    WHERE me.baby_id = ?
    ORDER BY me.fed_at ASC
  `).all(babyId);
}

export function addMilk(babyId, userId, { volume_ml, fed_at, notes, started_at, ended_at, duration_minutes }) {
  const result = prepare(
    'INSERT INTO milk_entries (baby_id, volume_ml, fed_at, started_at, ended_at, duration_minutes, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(babyId, volume_ml, fed_at, started_at || null, ended_at || null, duration_minutes || null, notes || null, userId);

  return prepare('SELECT * FROM milk_entries WHERE id = ?').get(result.lastInsertRowid);
}

export function updateMilk(babyId, entryId, { volume_ml, fed_at, notes, started_at, ended_at, duration_minutes }) {
  const entry = prepare(
    'SELECT * FROM milk_entries WHERE id = ? AND baby_id = ?'
  ).get(entryId, babyId);
  if (!entry) return null;

  prepare(
    'UPDATE milk_entries SET volume_ml = COALESCE(?, volume_ml), fed_at = COALESCE(?, fed_at), started_at = COALESCE(?, started_at), ended_at = COALESCE(?, ended_at), duration_minutes = COALESCE(?, duration_minutes), notes = COALESCE(?, notes) WHERE id = ?'
  ).run(
    volume_ml || null,
    fed_at || null,
    started_at || null,
    ended_at || null,
    duration_minutes || null,
    notes !== undefined ? notes : null,
    entryId
  );

  return prepare('SELECT * FROM milk_entries WHERE id = ?').get(entryId);
}

export function deleteMilk(babyId, entryId) {
  const entry = prepare(
    'SELECT * FROM milk_entries WHERE id = ? AND baby_id = ?'
  ).get(entryId, babyId);
  if (!entry) return { error: 'Entry not found' };
  prepare('DELETE FROM milk_entries WHERE id = ?').run(entryId);
  return { success: true };
}

// ── Invites ────────────────────────────────────────────────────────────────

export function createInvite(babyId, createdBy, token, expiresAt) {
  prepare(
    'INSERT INTO invites (baby_id, token, created_by, expires_at) VALUES (?, ?, ?, ?)'
  ).run(babyId, token, createdBy, expiresAt);
}

export function getInviteByToken(token) {
  return prepare(`
    SELECT i.*, b.name AS baby_name, b.birth_date, u.name AS invited_by
    FROM invites i
    JOIN babies b ON b.id = i.baby_id
    JOIN users u ON u.id = i.created_by
    WHERE i.token = ?
  `).get(token);
}

export function acceptInvite(token, userId) {
  const invite = prepare(`
    SELECT i.*, b.name AS baby_name
    FROM invites i
    JOIN babies b ON b.id = i.baby_id
    WHERE i.token = ?
  `).get(token);

  if (!invite) return { error: 'Invite not found' };
  if (invite.used_at) return { error: 'This invite has already been used' };
  if (new Date(invite.expires_at) < new Date()) return { error: 'This invite has expired' };

  const alreadyLinked = prepare(
    'SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?'
  ).get(userId, invite.baby_id);
  if (alreadyLinked) return { error: 'You are already associated with this baby' };

  prepare(
    'INSERT INTO user_babies (user_id, baby_id, role) VALUES (?, ?, ?)'
  ).run(userId, invite.baby_id, 'parent');
  prepare('UPDATE invites SET used_at = CURRENT_TIMESTAMP WHERE id = ?').run(invite.id);

  return { success: true, babyId: invite.baby_id, babyName: invite.baby_name };
}
