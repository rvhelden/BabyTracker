"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";
import { parsePlainDate } from "../lib/temporal.js";

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
  redirect("/?dashboard=1");
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
  redirect("/?dashboard=1");
}
