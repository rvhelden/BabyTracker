"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";
import { nowInstant } from "../lib/temporal.js";

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
