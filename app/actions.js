"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import * as dal from "../lib/dal.js";
import { getSession, getUser } from "../lib/session.js";
import {
  nowInstant,
  nowZoned,
  parsePlainDate,
  parsePlainDateTime,
  toLocalDateTimeInput,
} from "../lib/temporal.js";

const { hash, compare } = bcrypt;

function normalizeBirthDateInput(value) {
  if (!value) {
    return null;
  }

  const raw = String(value).trim();
  const dateOnly = raw.match(/^\d{4}-\d{2}-\d{2}$/)?.[0];
  if (dateOnly) {
    return parsePlainDate(dateOnly)?.toString() || null;
  }

  const isoWithTime = raw.match(/^(\d{4}-\d{2}-\d{2})[T\s].+$/)?.[1];
  if (isoWithTime) {
    return parsePlainDate(isoWithTime)?.toString() || null;
  }

  const slashIso = raw.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  if (slashIso) {
    return parsePlainDate(`${slashIso[1]}-${slashIso[2]}-${slashIso[3]}`)?.toString() || null;
  }

  return null;
}

// ── Auth ───────────────────────────────────────────────────────────────────

export async function loginAction(_prevState, formData) {
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const from = formData.get("from")?.toString() || "/";

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  const user = dal.getUserByEmail(email);
  if (!user) {
    return { error: "Invalid email or password" };
  }

  const valid = await compare(password, user.password_hash);
  if (!valid) {
    return { error: "Invalid email or password" };
  }

  const session = await getSession();
  session.user = { id: user.id, email: user.email, name: user.name };
  await session.save();

  redirect(from);
}

export async function signupAction(_prevState, formData) {
  const name = formData.get("name")?.toString().trim();
  const email = formData.get("email")?.toString().trim();
  const password = formData.get("password")?.toString();
  const confirm = formData.get("confirm")?.toString();

  if (!name || !email || !password) {
    return { error: "All fields are required" };
  }
  if (password.length < 6) {
    return { error: "Password must be at least 6 characters" };
  }
  if (password !== confirm) {
    return { error: "Passwords do not match" };
  }

  const existing = dal.getUserByEmail(email);
  if (existing) {
    return { error: "Email already registered" };
  }

  const passwordHash = await hash(password, 10);
  const result = dal.createUser(email, passwordHash, name);

  const session = await getSession();
  session.user = { id: result.lastInsertRowid, email: email.toLowerCase(), name };
  await session.save();

  redirect("/");
}

export async function logoutAction() {
  const session = await getSession();
  session.destroy();
  redirect("/login");
}

export async function updateLocaleAction(locale) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const nextLocale = locale?.toString().trim() || null;
  dal.updateUserLocale(user.id, nextLocale);
  revalidatePath("/");
  revalidatePath("/settings");
  return { success: true };
}

// ── Babies ─────────────────────────────────────────────────────────────────

export async function createBabyAction(_prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name")?.toString().trim();
  const birthDateRaw = formData.get("birth_date")?.toString();
  const birth_date = normalizeBirthDateInput(birthDateRaw);
  const gender = formData.get("gender")?.toString();

  if (!name || !birthDateRaw) {
    return { error: "Name and birth date are required" };
  }
  if (!birth_date) {
    return { error: "Birth date is invalid" };
  }

  dal.createBaby(name, birth_date, gender, user.id);
  revalidatePath("/");
  return { success: true };
}

export async function updateBabyAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const name = formData.get("name")?.toString().trim();
  const birthDateRaw = formData.get("birth_date")?.toString();
  const birth_date = normalizeBirthDateInput(birthDateRaw);
  const gender = formData.get("gender")?.toString();
  const photo_url = formData.get("photo_url")?.toString();

  if (birthDateRaw && !birth_date) {
    return { error: "Birth date is invalid" };
  }

  const updated = dal.updateBaby(babyId, user.id, { name, birth_date, gender, photo_url });
  if (!updated) {
    return { error: "Baby not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true, baby: updated };
}

export async function deleteBabyAction(babyId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deleteBaby(babyId, user.id);
  if (result.error) {
    return result;
  }

  revalidatePath("/");
  redirect("/");
}

export async function leaveBabyAction(babyId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.leaveBaby(babyId, user.id);
  if (result.error) {
    return result;
  }

  revalidatePath("/");
  redirect("/");
}

// ── Growth entries ─────────────────────────────────────────────────────────

function toLengthCm(lengthInput, locale) {
  if (lengthInput == null || lengthInput === "") {
    return null;
  }

  const raw = String(lengthInput).replace(",", ".").trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  if ((locale || "").toLowerCase().startsWith("en")) {
    return value * 2.54;
  }

  return value;
}

function normalizeGrowthPayload(formData, locale) {
  const weightRaw = formData.get("weight_grams")?.toString().trim() || "";
  const lengthRaw = formData.get("length_value")?.toString().trim() || "";
  const measured_at = formData.get("measured_at")?.toString();
  const notes = formData.get("notes")?.toString();

  const weight_grams = weightRaw ? Number.parseInt(weightRaw, 10) : null;
  const length_cm = toLengthCm(lengthRaw, locale);

  return {
    weight_grams: Number.isFinite(weight_grams) ? weight_grams : null,
    length_cm,
    measured_at,
    notes,
  };
}

export async function addGrowthEntryAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { weight_grams, length_cm, measured_at, notes } = normalizeGrowthPayload(
    formData,
    user.locale,
  );

  if ((!weight_grams && !length_cm) || !measured_at) {
    return { error: "Date and at least one growth value are required" };
  }

  if (weight_grams != null && (weight_grams < 100 || weight_grams > 50000)) {
    return { error: "Weight must be between 100 and 50000 grams" };
  }

  if (length_cm != null && (length_cm < 20 || length_cm > 130)) {
    return { error: "Length must be between 20 and 130 cm" };
  }

  dal.addGrowthEntry(babyId, user.id, { weight_grams, length_cm, measured_at, notes });
  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function updateGrowthEntryAction(babyId, entryId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const { weight_grams, length_cm, measured_at, notes } = normalizeGrowthPayload(
    formData,
    user.locale,
  );

  if (weight_grams != null && (weight_grams < 100 || weight_grams > 50000)) {
    return { error: "Weight must be between 100 and 50000 grams" };
  }

  if (length_cm != null && (length_cm < 20 || length_cm > 130)) {
    return { error: "Length must be between 20 and 130 cm" };
  }

  const updated = dal.updateGrowthEntry(babyId, entryId, {
    weight_grams,
    length_cm,
    measured_at,
    notes,
  });
  if (!updated) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function deleteGrowthEntryAction(babyId, entryId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deleteGrowthEntry(babyId, entryId);
  if (result.error) {
    return result;
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

// ── Milk entries ───────────────────────────────────────────────────────────

export async function addMilkAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const volume_ml = parseInt(formData.get("volume_ml")?.toString() || "0", 10);
  const fed_at = formData.get("fed_at")?.toString();
  const started_at = formData.get("started_at")?.toString();
  const ended_at = formData.get("ended_at")?.toString();
  const duration_minutes =
    parseInt(formData.get("duration_minutes")?.toString() || "0", 10) || null;
  const notes = formData.get("notes")?.toString();

  if (!volume_ml || !fed_at) {
    return { error: "Volume and time are required" };
  }
  if (volume_ml < 5 || volume_ml > 2000) {
    return { error: "Volume must be between 5 and 2000 ml" };
  }

  dal.addMilk(babyId, user.id, {
    volume_ml,
    fed_at,
    notes,
    started_at,
    ended_at,
    duration_minutes,
  });
  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function startMilkAction(babyId, volume_ml, started_at) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const localNow = toLocalDateTimeInput(nowZoned().toPlainDateTime());
  const start = started_at || localNow;
  const volume = Number.isFinite(volume_ml) ? Math.max(0, Math.min(volume_ml, 2000)) : 0;

  const entry = dal.addMilk(babyId, user.id, {
    volume_ml: volume,
    fed_at: start,
    started_at: start,
    ended_at: null,
    duration_minutes: null,
    notes: null,
  });

  revalidatePath(`/baby/${babyId}`);
  return { success: true, entryId: entry.id, started_at: start };
}

export async function updateMilkAction(babyId, entryId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const volume_ml = parseInt(formData.get("volume_ml")?.toString() || "0", 10);
  const fed_at = formData.get("fed_at")?.toString();
  const started_at = formData.get("started_at")?.toString() || null;
  const ended_at = formData.get("ended_at")?.toString() || null;
  let duration_minutes = parseInt(formData.get("duration_minutes")?.toString() || "0", 10) || null;
  const notes = formData.get("notes")?.toString();

  // Auto-calculate duration from start/end times if both provided
  if (started_at && ended_at && !duration_minutes) {
    const start = parsePlainDateTime(started_at);
    const end = parsePlainDateTime(ended_at);
    if (start && end) {
      const diff = end.since(start, { largestUnit: "minutes" });
      const totalMinutes = Math.round(diff.total({ unit: "minutes" }));
      if (totalMinutes > 0) {
        duration_minutes = Math.max(1, totalMinutes);
      }
    }
  }

  if (volume_ml && (volume_ml < 5 || volume_ml > 2000)) {
    return { error: "Volume must be between 5 and 2000 ml" };
  }

  const updated = dal.updateMilk(babyId, entryId, {
    volume_ml,
    fed_at,
    notes,
    started_at,
    ended_at,
    duration_minutes,
  });
  if (!updated) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function deleteMilkAction(babyId, entryId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deleteMilk(babyId, entryId);
  if (result.error) {
    return result;
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

// ── Invites ────────────────────────────────────────────────────────────────

export async function createInviteAction(babyId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const token = uuidv4();
  const expiresAt = nowInstant()
    .add({ hours: 24 * 7 })
    .toString();

  dal.createInvite(babyId, user.id, token, expiresAt);

  const APP_BASE_URL = process.env.APP_BASE_URL || "http://localhost:3000";
  const inviteUrl = `${APP_BASE_URL}/invite/${token}`;
  const qrDataUrl = await QRCode.toDataURL(inviteUrl, { width: 256, margin: 2 });

  return { success: true, token, inviteUrl, qrDataUrl, expiresAt };
}

export async function acceptInviteAction(token) {
  const user = await getUser();
  if (!user) {
    redirect(`/login?from=/invite/${token}`);
  }

  const result = dal.acceptInvite(token, user.id);
  if (result.error) {
    return result;
  }

  revalidatePath("/");
  redirect(`/baby/${result.babyId}`);
}
