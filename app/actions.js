"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import * as dal from "../lib/dal.js";
import { getSession, getUser } from "../lib/session.js";
import { nowInstant, nowZoned, parsePlainDateTime, toLocalDateTimeInput } from "../lib/temporal.js";

const { hash, compare } = bcrypt;

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
  const birth_date = formData.get("birth_date")?.toString();
  const gender = formData.get("gender")?.toString();

  if (!name || !birth_date) {
    return { error: "Name and birth date are required" };
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
  const birth_date = formData.get("birth_date")?.toString();
  const gender = formData.get("gender")?.toString();
  const photo_url = formData.get("photo_url")?.toString();

  const updated = dal.updateBaby(babyId, user.id, { name, birth_date, gender, photo_url });
  if (!updated) {
    return { error: "Baby not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
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

// ── Weights ────────────────────────────────────────────────────────────────

export async function addWeightAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const weight_grams = parseInt(formData.get("weight_grams")?.toString() || "0", 10);
  const measured_at = formData.get("measured_at")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!weight_grams || !measured_at) {
    return { error: "Weight and date are required" };
  }
  if (weight_grams < 100 || weight_grams > 50000) {
    return { error: "Weight must be between 100 and 50000 grams" };
  }

  dal.addWeight(babyId, user.id, { weight_grams, measured_at, notes });
  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function updateWeightAction(babyId, entryId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const weight_grams = parseInt(formData.get("weight_grams")?.toString() || "0", 10);
  const measured_at = formData.get("measured_at")?.toString();
  const notes = formData.get("notes")?.toString();

  if (weight_grams && (weight_grams < 100 || weight_grams > 50000)) {
    return { error: "Weight must be between 100 and 50000 grams" };
  }

  const updated = dal.updateWeight(babyId, entryId, { weight_grams, measured_at, notes });
  if (!updated) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function deleteWeightAction(babyId, entryId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deleteWeight(babyId, entryId);
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
  const expiresAt = nowInstant().add({ days: 7 }).toString();

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
