"use server";

import { revalidatePath } from "next/cache";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";

function toCelsius(tempInput, locale) {
  if (tempInput == null || tempInput === "") {
    return null;
  }

  const raw = String(tempInput).replace(",", ".").trim();
  const value = Number.parseFloat(raw);
  if (!Number.isFinite(value)) {
    return null;
  }

  if ((locale || "").toLowerCase().startsWith("en")) {
    return (value - 32) * (5 / 9);
  }

  return value;
}

export async function addTemperatureEntryAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const measured_at = formData.get("measured_at")?.toString();
  const notes = formData.get("notes")?.toString();
  const temperature_c = toCelsius(formData.get("temperature_value")?.toString(), user.locale);

  if (!measured_at || temperature_c == null) {
    return { error: "Temperature and time are required" };
  }

  if (temperature_c < 30 || temperature_c > 45) {
    return { error: "Temperature is out of expected range" };
  }

  dal.addTemperatureEntry(babyId, user.id, { temperature_c, measured_at, notes });
  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function updateTemperatureEntryAction(babyId, entryId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const measured_at = formData.get("measured_at")?.toString();
  const notes = formData.get("notes")?.toString();
  const temperatureRaw = formData.get("temperature_value")?.toString();
  const temperature_c =
    temperatureRaw && temperatureRaw.trim() !== "" ? toCelsius(temperatureRaw, user.locale) : null;

  if (temperature_c != null && (temperature_c < 30 || temperature_c > 45)) {
    return { error: "Temperature is out of expected range" };
  }

  const updated = dal.updateTemperatureEntry(babyId, entryId, {
    temperature_c,
    measured_at,
    notes,
  });
  if (!updated) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function deleteTemperatureEntryAction(babyId, entryId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deleteTemperatureEntry(babyId, entryId);
  if (result.error) {
    return result;
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}
