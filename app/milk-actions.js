"use server";

import { revalidatePath } from "next/cache";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";
import { nowZoned, parsePlainDateTime, toLocalDateTimeInput } from "../lib/temporal.js";

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
