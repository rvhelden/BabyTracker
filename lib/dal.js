/**
 * Data Access Layer — all database queries.
 * Only imported from Server Components, Server Actions, or Route Handlers.
 */
import { prepare } from "./db.js";
import { nowInstant, parseInstant } from "./temporal.js";

// ── Users ──────────────────────────────────────────────────────────────────

export function getUserByEmail(email) {
  return prepare("SELECT * FROM users WHERE email = ?").get(email.toLowerCase());
}

export function getUserById(id) {
  return prepare("SELECT id, email, name, locale, created_at FROM users WHERE id = ?").get(id);
}

export function createUser(email, passwordHash, name) {
  return prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)").run(
    email.toLowerCase(),
    passwordHash,
    name,
  );
}

export function updateUserLocale(userId, locale) {
  prepare("UPDATE users SET locale = ? WHERE id = ?").run(locale || null, userId);
  return prepare("SELECT id, email, name, locale, created_at FROM users WHERE id = ?").get(userId);
}

// ── Babies ─────────────────────────────────────────────────────────────────

export function getBabiesForUser(userId) {
  return prepare(`
    SELECT b.*, ub.role,
      (SELECT COUNT(*) FROM user_babies WHERE baby_id = b.id) AS parent_count,
      (SELECT weight_grams FROM growth_entries WHERE baby_id = b.id AND weight_grams IS NOT NULL ORDER BY measured_at DESC LIMIT 1) AS latest_weight,
      (SELECT measured_at  FROM growth_entries WHERE baby_id = b.id AND weight_grams IS NOT NULL ORDER BY measured_at DESC LIMIT 1) AS latest_weight_date
    FROM babies b
    JOIN user_babies ub ON ub.baby_id = b.id
    WHERE ub.user_id = ?
    ORDER BY b.created_at DESC
  `).all(userId);
}

export function getBabyForUser(babyId, userId) {
  const access = prepare("SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  const baby = prepare("SELECT * FROM babies WHERE id = ?").get(babyId);
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
    "INSERT INTO babies (name, birth_date, gender, photo_url) VALUES (?, ?, ?, ?)",
  ).run(name, birthDate, gender || null, null);

  prepare("INSERT INTO user_babies (user_id, baby_id, role) VALUES (?, ?, ?)").run(
    ownerId,
    result.lastInsertRowid,
    "owner",
  );

  return prepare("SELECT * FROM babies WHERE id = ?").get(result.lastInsertRowid);
}

export function updateBaby(babyId, userId, { name, birth_date, gender, photo_url }) {
  const access = prepare("SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  prepare(
    "UPDATE babies SET name = COALESCE(?, name), birth_date = COALESCE(?, birth_date), gender = COALESCE(?, gender), photo_url = COALESCE(?, photo_url) WHERE id = ?",
  ).run(
    name || null,
    birth_date || null,
    gender !== undefined ? gender || null : null,
    photo_url || null,
    babyId,
  );

  return prepare("SELECT * FROM babies WHERE id = ?").get(babyId);
}

export function deleteBaby(babyId, userId) {
  const access = prepare("SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access || access.role !== "owner") {
    return { error: "Only the owner can delete a baby profile" };
  }
  prepare("DELETE FROM babies WHERE id = ?").run(babyId);
  return { success: true };
}

export function leaveBaby(babyId, userId) {
  const access = prepare("SELECT role FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return { error: "Baby not found" };
  }
  if (access.role === "owner") {
    return { error: "Owner cannot leave. Delete the baby profile instead." };
  }
  prepare("DELETE FROM user_babies WHERE user_id = ? AND baby_id = ?").run(userId, babyId);
  return { success: true };
}

// ── Growth entries ─────────────────────────────────────────────────────────

export function getGrowthEntriesForBaby(babyId, userId) {
  const access = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  return prepare(`
    SELECT ge.*, u.name AS recorded_by_name
    FROM growth_entries ge
    JOIN users u ON u.id = ge.created_by
    WHERE ge.baby_id = ?
    ORDER BY ge.measured_at ASC
  `).all(babyId);
}

export function addGrowthEntry(babyId, userId, { weight_grams, length_cm, measured_at, notes }) {
  const result = prepare(
    "INSERT INTO growth_entries (baby_id, weight_grams, length_cm, measured_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(babyId, weight_grams ?? null, length_cm ?? null, measured_at, notes || null, userId);

  return prepare("SELECT * FROM growth_entries WHERE id = ?").get(result.lastInsertRowid);
}

export function updateGrowthEntry(
  babyId,
  entryId,
  { weight_grams, length_cm, measured_at, notes },
) {
  const entry = prepare("SELECT * FROM growth_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return null;
  }

  prepare(
    "UPDATE growth_entries SET weight_grams = COALESCE(?, weight_grams), length_cm = COALESCE(?, length_cm), measured_at = COALESCE(?, measured_at), notes = COALESCE(?, notes) WHERE id = ?",
  ).run(
    weight_grams ?? null,
    length_cm ?? null,
    measured_at || null,
    notes !== undefined ? notes : null,
    entryId,
  );

  return prepare("SELECT * FROM growth_entries WHERE id = ?").get(entryId);
}

export function deleteGrowthEntry(babyId, entryId) {
  const entry = prepare("SELECT * FROM growth_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return { error: "Entry not found" };
  }
  prepare("DELETE FROM growth_entries WHERE id = ?").run(entryId);
  return { success: true };
}

// ── Diaper entries ─────────────────────────────────────────────────────────

export function getDiaperEntriesForBaby(babyId, userId) {
  const access = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  return prepare(`
    SELECT de.*, u.name AS recorded_by_name
    FROM diaper_entries de
    JOIN users u ON u.id = de.created_by
    WHERE de.baby_id = ?
    ORDER BY de.changed_at ASC
  `).all(babyId);
}

export function addDiaperEntry(babyId, userId, { diaper_type, changed_at, notes }) {
  const result = prepare(
    "INSERT INTO diaper_entries (baby_id, diaper_type, changed_at, notes, created_by) VALUES (?, ?, ?, ?, ?)",
  ).run(babyId, diaper_type, changed_at, notes || null, userId);

  return prepare("SELECT * FROM diaper_entries WHERE id = ?").get(result.lastInsertRowid);
}

export function updateDiaperEntry(babyId, entryId, { diaper_type, changed_at, notes }) {
  const entry = prepare("SELECT * FROM diaper_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return null;
  }

  prepare(
    "UPDATE diaper_entries SET diaper_type = COALESCE(?, diaper_type), changed_at = COALESCE(?, changed_at), notes = COALESCE(?, notes) WHERE id = ?",
  ).run(diaper_type || null, changed_at || null, notes !== undefined ? notes : null, entryId);

  return prepare("SELECT * FROM diaper_entries WHERE id = ?").get(entryId);
}

export function deleteDiaperEntry(babyId, entryId) {
  const entry = prepare("SELECT * FROM diaper_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return { error: "Entry not found" };
  }
  prepare("DELETE FROM diaper_entries WHERE id = ?").run(entryId);
  return { success: true };
}

export function hasDiaperEntry(babyId, changed_at, diaper_type) {
  return prepare(
    "SELECT id FROM diaper_entries WHERE baby_id = ? AND changed_at = ? AND diaper_type = ?",
  ).get(babyId, changed_at, diaper_type);
}

// ── Temperature entries ────────────────────────────────────────────────────

export function getTemperatureEntriesForBaby(babyId, userId) {
  const access = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  return prepare(`
    SELECT te.*, u.name AS recorded_by_name
    FROM temperature_entries te
    JOIN users u ON u.id = te.created_by
    WHERE te.baby_id = ?
    ORDER BY te.measured_at ASC
  `).all(babyId);
}

export function addTemperatureEntry(babyId, userId, { temperature_c, measured_at, notes }) {
  const result = prepare(
    "INSERT INTO temperature_entries (baby_id, temperature_c, measured_at, notes, created_by) VALUES (?, ?, ?, ?, ?)",
  ).run(babyId, temperature_c, measured_at, notes || null, userId);

  return prepare("SELECT * FROM temperature_entries WHERE id = ?").get(result.lastInsertRowid);
}

export function updateTemperatureEntry(babyId, entryId, { temperature_c, measured_at, notes }) {
  const entry = prepare("SELECT * FROM temperature_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return null;
  }

  prepare(
    "UPDATE temperature_entries SET temperature_c = COALESCE(?, temperature_c), measured_at = COALESCE(?, measured_at), notes = COALESCE(?, notes) WHERE id = ?",
  ).run(temperature_c ?? null, measured_at || null, notes !== undefined ? notes : null, entryId);

  return prepare("SELECT * FROM temperature_entries WHERE id = ?").get(entryId);
}

export function deleteTemperatureEntry(babyId, entryId) {
  const entry = prepare("SELECT * FROM temperature_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return { error: "Entry not found" };
  }
  prepare("DELETE FROM temperature_entries WHERE id = ?").run(entryId);
  return { success: true };
}

export function hasTemperatureEntry(babyId, measured_at, temperature_c) {
  return prepare(
    "SELECT id FROM temperature_entries WHERE baby_id = ? AND measured_at = ? AND temperature_c = ?",
  ).get(babyId, measured_at, temperature_c);
}

// ── Medication entries ─────────────────────────────────────────────────────

export function getMedicationEntriesForBaby(babyId, userId) {
  const access = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  return prepare(`
    SELECT me.*, u.name AS recorded_by_name
    FROM medication_entries me
    JOIN users u ON u.id = me.created_by
    WHERE me.baby_id = ?
    ORDER BY me.given_at ASC
  `).all(babyId);
}

export function addMedicationEntry(
  babyId,
  userId,
  { medication_name, dosage, interval_minutes, given_at, notes },
) {
  const result = prepare(
    "INSERT INTO medication_entries (baby_id, medication_name, dosage, interval_minutes, given_at, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)",
  ).run(
    babyId,
    medication_name,
    dosage || null,
    interval_minutes ?? null,
    given_at,
    notes || null,
    userId,
  );

  return prepare("SELECT * FROM medication_entries WHERE id = ?").get(result.lastInsertRowid);
}

export function updateMedicationEntry(
  babyId,
  entryId,
  { medication_name, dosage, interval_minutes, given_at, notes },
) {
  const entry = prepare("SELECT * FROM medication_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return null;
  }

  prepare(
    "UPDATE medication_entries SET medication_name = COALESCE(?, medication_name), dosage = COALESCE(?, dosage), interval_minutes = ?, given_at = COALESCE(?, given_at), notes = COALESCE(?, notes) WHERE id = ?",
  ).run(
    medication_name || null,
    dosage !== undefined ? dosage : null,
    interval_minutes !== undefined ? (interval_minutes ?? null) : entry.interval_minutes,
    given_at || null,
    notes !== undefined ? notes : null,
    entryId,
  );

  return prepare("SELECT * FROM medication_entries WHERE id = ?").get(entryId);
}

export function deleteMedicationEntry(babyId, entryId) {
  const entry = prepare("SELECT * FROM medication_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return { error: "Entry not found" };
  }
  prepare("DELETE FROM medication_entries WHERE id = ?").run(entryId);
  return { success: true };
}

export function hasMedicationEntry(babyId, given_at, medication_name, dosage) {
  return prepare(
    "SELECT id FROM medication_entries WHERE baby_id = ? AND given_at = ? AND medication_name = ? AND COALESCE(dosage, '') = COALESCE(?, '')",
  ).get(babyId, given_at, medication_name, dosage || null);
}

// ── Predefined medications ─────────────────────────────────────────────────

export function getPredefinedMedicationsForBaby(babyId, userId) {
  const access = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  return prepare(
    "SELECT * FROM predefined_medications WHERE baby_id = ? ORDER BY medication_name ASC",
  ).all(babyId);
}

export function getPredefinedMedicationForBaby(babyId, medId) {
  return prepare("SELECT * FROM predefined_medications WHERE id = ? AND baby_id = ?").get(
    medId,
    babyId,
  );
}

export function addPredefinedMedication(
  babyId,
  userId,
  { medication_name, dosage, interval_minutes },
) {
  const result = prepare(
    "INSERT INTO predefined_medications (baby_id, medication_name, dosage, interval_minutes, created_by) VALUES (?, ?, ?, ?, ?)",
  ).run(babyId, medication_name, dosage || null, interval_minutes ?? null, userId);

  return prepare("SELECT * FROM predefined_medications WHERE id = ?").get(result.lastInsertRowid);
}

export function updatePredefinedMedication(
  babyId,
  medId,
  { medication_name, dosage, interval_minutes },
) {
  const entry = prepare("SELECT * FROM predefined_medications WHERE id = ? AND baby_id = ?").get(
    medId,
    babyId,
  );
  if (!entry) {
    return null;
  }

  prepare(
    "UPDATE predefined_medications SET medication_name = COALESCE(?, medication_name), dosage = ?, interval_minutes = ? WHERE id = ?",
  ).run(medication_name || null, dosage || null, interval_minutes ?? null, medId);

  return prepare("SELECT * FROM predefined_medications WHERE id = ?").get(medId);
}

export function deletePredefinedMedication(babyId, medId) {
  const entry = prepare("SELECT * FROM predefined_medications WHERE id = ? AND baby_id = ?").get(
    medId,
    babyId,
  );
  if (!entry) {
    return { error: "Entry not found" };
  }
  prepare("DELETE FROM predefined_medications WHERE id = ?").run(medId);
  return { success: true };
}

export function ensureUserBaby(userId, babyId, role = "owner") {
  const existing = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (existing) {
    return existing;
  }
  return prepare("INSERT INTO user_babies (user_id, baby_id, role) VALUES (?, ?, ?)").run(
    userId,
    babyId,
    role,
  );
}

export function hasMilkEntry(babyId, fed_at, volume_ml) {
  return prepare(
    "SELECT id FROM milk_entries WHERE baby_id = ? AND fed_at = ? AND volume_ml = ?",
  ).get(babyId, fed_at, volume_ml);
}

export function hasGrowthEntry(babyId, measured_at, weight_grams, length_cm) {
  if (weight_grams != null && length_cm != null) {
    return prepare(
      "SELECT id FROM growth_entries WHERE baby_id = ? AND measured_at = ? AND weight_grams = ? AND length_cm = ?",
    ).get(babyId, measured_at, weight_grams, length_cm);
  }

  if (weight_grams != null) {
    return prepare(
      "SELECT id FROM growth_entries WHERE baby_id = ? AND measured_at = ? AND weight_grams = ?",
    ).get(babyId, measured_at, weight_grams);
  }

  if (length_cm != null) {
    return prepare(
      "SELECT id FROM growth_entries WHERE baby_id = ? AND measured_at = ? AND length_cm = ?",
    ).get(babyId, measured_at, length_cm);
  }

  return prepare(
    "SELECT id FROM growth_entries WHERE baby_id = ? AND measured_at = ? AND weight_grams IS NULL AND length_cm IS NULL",
  ).get(babyId, measured_at);
}

export function findGrowthEntryByDate(babyId, measured_at) {
  return prepare("SELECT * FROM growth_entries WHERE baby_id = ? AND measured_at = ?").get(
    babyId,
    measured_at,
  );
}

export function mergeGrowthEntry(entryId, { weight_grams, length_cm, notes }) {
  prepare(
    "UPDATE growth_entries SET weight_grams = COALESCE(?, weight_grams), length_cm = COALESCE(?, length_cm), notes = COALESCE(?, notes) WHERE id = ?",
  ).run(weight_grams ?? null, length_cm ?? null, notes || null, entryId);

  return prepare("SELECT * FROM growth_entries WHERE id = ?").get(entryId);
}

export function getBabyByName(name) {
  return prepare("SELECT * FROM babies WHERE LOWER(name) = LOWER(?)").get(name);
}

// ── Milk entries ───────────────────────────────────────────────────────────

export function getMilkForBaby(babyId, userId) {
  const access = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    babyId,
  );
  if (!access) {
    return null;
  }

  return prepare(`
    SELECT me.*, u.name AS recorded_by_name
    FROM milk_entries me
    JOIN users u ON u.id = me.created_by
    WHERE me.baby_id = ?
    ORDER BY me.fed_at ASC
  `).all(babyId);
}

export function addMilk(
  babyId,
  userId,
  { volume_ml, fed_at, notes, started_at, ended_at, duration_minutes },
) {
  const result = prepare(
    "INSERT INTO milk_entries (baby_id, volume_ml, fed_at, started_at, ended_at, duration_minutes, notes, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
  ).run(
    babyId,
    volume_ml,
    fed_at,
    started_at || null,
    ended_at || null,
    duration_minutes || null,
    notes || null,
    userId,
  );

  return prepare("SELECT * FROM milk_entries WHERE id = ?").get(result.lastInsertRowid);
}

export function updateMilk(
  babyId,
  entryId,
  { volume_ml, fed_at, notes, started_at, ended_at, duration_minutes },
) {
  const entry = prepare("SELECT * FROM milk_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return null;
  }

  prepare(
    "UPDATE milk_entries SET volume_ml = COALESCE(?, volume_ml), fed_at = COALESCE(?, fed_at), started_at = COALESCE(?, started_at), ended_at = COALESCE(?, ended_at), duration_minutes = COALESCE(?, duration_minutes), notes = COALESCE(?, notes) WHERE id = ?",
  ).run(
    volume_ml || null,
    fed_at || null,
    started_at || null,
    ended_at || null,
    duration_minutes || null,
    notes !== undefined ? notes : null,
    entryId,
  );

  return prepare("SELECT * FROM milk_entries WHERE id = ?").get(entryId);
}

export function deleteMilk(babyId, entryId) {
  const entry = prepare("SELECT * FROM milk_entries WHERE id = ? AND baby_id = ?").get(
    entryId,
    babyId,
  );
  if (!entry) {
    return { error: "Entry not found" };
  }
  prepare("DELETE FROM milk_entries WHERE id = ?").run(entryId);
  return { success: true };
}

// ── Invites ────────────────────────────────────────────────────────────────

export function createInvite(babyId, createdBy, token, expiresAt) {
  prepare("INSERT INTO invites (baby_id, token, created_by, expires_at) VALUES (?, ?, ?, ?)").run(
    babyId,
    token,
    createdBy,
    expiresAt,
  );
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

  if (!invite) {
    return { error: "Invite not found" };
  }
  if (invite.used_at) {
    return { error: "This invite has already been used" };
  }
  const expiresAt = parseInstant(invite.expires_at);
  if (expiresAt && expiresAt.epochMilliseconds < nowInstant().epochMilliseconds) {
    return { error: "This invite has expired" };
  }

  const alreadyLinked = prepare("SELECT id FROM user_babies WHERE user_id = ? AND baby_id = ?").get(
    userId,
    invite.baby_id,
  );
  if (alreadyLinked) {
    return { error: "You are already associated with this baby" };
  }

  prepare("INSERT INTO user_babies (user_id, baby_id, role) VALUES (?, ?, ?)").run(
    userId,
    invite.baby_id,
    "parent",
  );
  prepare("UPDATE invites SET used_at = CURRENT_TIMESTAMP WHERE id = ?").run(invite.id);

  return { success: true, babyId: invite.baby_id, babyName: invite.baby_name };
}
