"use server";

import { revalidatePath } from "next/cache";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";

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
