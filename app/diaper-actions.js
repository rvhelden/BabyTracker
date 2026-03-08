"use server";

import { revalidatePath } from "next/cache";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";

export async function addDiaperEntryAction(babyId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const diaper_type = formData.get("diaper_type")?.toString().trim();
  const changed_at = formData.get("changed_at")?.toString();
  const notes = formData.get("notes")?.toString();

  if (!diaper_type || !changed_at) {
    return { error: "Type and time are required" };
  }

  if (!["wet", "dirty", "both", "dry"].includes(diaper_type)) {
    return { error: "Invalid diaper type" };
  }

  dal.addDiaperEntry(babyId, user.id, { diaper_type, changed_at, notes });
  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function updateDiaperEntryAction(babyId, entryId, _prevState, formData) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const diaper_type = formData.get("diaper_type")?.toString().trim();
  const changed_at = formData.get("changed_at")?.toString();
  const notes = formData.get("notes")?.toString();

  if (diaper_type && !["wet", "dirty", "both", "dry"].includes(diaper_type)) {
    return { error: "Invalid diaper type" };
  }

  const updated = dal.updateDiaperEntry(babyId, entryId, { diaper_type, changed_at, notes });
  if (!updated) {
    return { error: "Entry not found" };
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}

export async function deleteDiaperEntryAction(babyId, entryId) {
  const user = await getUser();
  if (!user) {
    return { error: "Not authenticated" };
  }

  const result = dal.deleteDiaperEntry(babyId, entryId);
  if (result.error) {
    return result;
  }

  revalidatePath(`/baby/${babyId}`);
  return { success: true };
}
