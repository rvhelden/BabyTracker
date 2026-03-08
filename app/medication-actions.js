"use server";

import { revalidatePath } from "next/cache";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";

function toIntervalMinutes(intervalHoursInput) {
  if (intervalHoursInput == null || intervalHoursInput === "") {
    return null;
  }

  const raw = String(intervalHoursInput).replace(",", ".").trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  return Math.round(value * 60);
}

export async function addMedicationEntryAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const medication_name = formData.get("medication_name")?.toString().trim();
  const dosage = formData.get("dosage")?.toString().trim();
  const given_at = formData.get("given_at")?.toString();
  const notes = formData.get("notes")?.toString();
  const intervalRaw =
    formData.get("interval_hours")?.toString().trim() ||
    formData.get("interval_minutes")?.toString().trim();
  const interval_minutes = toIntervalMinutes(intervalRaw);
  const maxIntervalRaw =
    formData.get("max_interval_hours")?.toString().trim() ||
    formData.get("max_interval_minutes")?.toString().trim();
  const max_interval_minutes = toIntervalMinutes(maxIntervalRaw);
  const predefinedRaw = formData.get("predefined_medication_id")?.toString().trim();
  const predefined_medication_id = predefinedRaw ? parseInt(predefinedRaw, 10) || null : null;

  let resolvedName = medication_name;
  let resolvedDosage = dosage;
  let resolvedInterval = interval_minutes;
  let resolvedMaxInterval = max_interval_minutes;

  if (predefined_medication_id) {
    const predefined = dal.getPredefinedMedicationForBaby(babyId, predefined_medication_id);
    if (!predefined) {
      return { error: "Predefined medication not found" };
    }

    resolvedName = predefined.medication_name;
    resolvedDosage = predefined.dosage || dosage;
    resolvedInterval = predefined.interval_minutes ?? interval_minutes;
    resolvedMaxInterval = predefined.max_interval_minutes ?? max_interval_minutes;
  }

  if (!resolvedName || !given_at) {
    return { error: "Medication name and time are required" };
  }

  dal.addMedicationEntry(babyId, user.id, {
    medication_name: resolvedName,
    dosage: resolvedDosage,
    interval_minutes: resolvedInterval,
    max_interval_minutes: resolvedMaxInterval,
    given_at,
    notes,
  });
  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function updateMedicationEntryAction(babyId, entryId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const medication_name = formData.get("medication_name")?.toString().trim();
  const dosage = formData.get("dosage")?.toString().trim();
  const given_at = formData.get("given_at")?.toString();
  const notes = formData.get("notes")?.toString();
  const intervalRaw =
    formData.get("interval_hours")?.toString().trim() ||
    formData.get("interval_minutes")?.toString().trim();
  const interval_minutes = toIntervalMinutes(intervalRaw);
  const maxIntervalRaw =
    formData.get("max_interval_hours")?.toString().trim() ||
    formData.get("max_interval_minutes")?.toString().trim();
  const max_interval_minutes = toIntervalMinutes(maxIntervalRaw);
  const predefinedRaw = formData.get("predefined_medication_id")?.toString().trim();
  const predefined_medication_id = predefinedRaw ? parseInt(predefinedRaw, 10) || null : null;

  let resolvedName = medication_name;
  let resolvedDosage = dosage;
  let resolvedInterval = interval_minutes;
  let resolvedMaxInterval = max_interval_minutes;

  if (predefined_medication_id) {
    const predefined = dal.getPredefinedMedicationForBaby(babyId, predefined_medication_id);
    if (!predefined) {
      return { error: "Predefined medication not found" };
    }

    resolvedName = predefined.medication_name;
    resolvedDosage = predefined.dosage || dosage;
    resolvedInterval = predefined.interval_minutes ?? interval_minutes;
    resolvedMaxInterval = predefined.max_interval_minutes ?? max_interval_minutes;
  }

  const updated = dal.updateMedicationEntry(babyId, entryId, {
    medication_name: resolvedName,
    dosage: resolvedDosage,
    interval_minutes: resolvedInterval,
    max_interval_minutes: resolvedMaxInterval,
    given_at,
    notes,
  });
  if (!updated) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function deleteMedicationEntryAction(babyId, entryId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deleteMedicationEntry(babyId, entryId);
  if (result.error) {
    return result;
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

// ── Predefined medications ─────────────────────────────────────────────────

export async function addPredefinedMedicationAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const medication_name = formData.get("medication_name")?.toString().trim();
  const dosage = formData.get("dosage")?.toString().trim();
  const intervalRaw =
    formData.get("interval_hours")?.toString().trim() ||
    formData.get("interval_minutes")?.toString().trim();
  const interval_minutes = toIntervalMinutes(intervalRaw);
  const maxIntervalRaw =
    formData.get("max_interval_hours")?.toString().trim() ||
    formData.get("max_interval_minutes")?.toString().trim();
  const max_interval_minutes = toIntervalMinutes(maxIntervalRaw);

  if (!medication_name) {
    return { error: "Medication name is required" };
  }

  dal.addPredefinedMedication(babyId, user.id, {
    medication_name,
    dosage,
    interval_minutes,
    max_interval_minutes,
  });
  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function updatePredefinedMedicationAction(babyId, medId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const medication_name = formData.get("medication_name")?.toString().trim();
  const dosage = formData.get("dosage")?.toString().trim();
  const intervalRaw =
    formData.get("interval_hours")?.toString().trim() ||
    formData.get("interval_minutes")?.toString().trim();
  const interval_minutes = toIntervalMinutes(intervalRaw);
  const maxIntervalRaw =
    formData.get("max_interval_hours")?.toString().trim() ||
    formData.get("max_interval_minutes")?.toString().trim();
  const max_interval_minutes = toIntervalMinutes(maxIntervalRaw);

  const updated = dal.updatePredefinedMedication(babyId, medId, {
    medication_name,
    dosage,
    interval_minutes,
    max_interval_minutes,
  });
  if (!updated) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function deletePredefinedMedicationAction(babyId, medId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deletePredefinedMedication(babyId, medId);
  if (result.error) {
    return result;
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}
