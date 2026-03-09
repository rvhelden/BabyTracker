"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { v4 as uuidv4 } from "uuid";
import * as dal from "../lib/dal.js";
import { getUser } from "../lib/session.js";
import { nowInstant } from "../lib/temporal.js";

function getBaseUrl() {
  const headersList = headers();
  const forwardedHost = headersList.get("x-forwarded-host");
  const forwardedProto = headersList.get("x-forwarded-proto");

  if (forwardedHost) {
    const proto = forwardedProto ? forwardedProto.split(",")[0].trim() : "https";
    return `${proto}://${forwardedHost}`;
  }

  return process.env.APP_BASE_URL || "http://localhost:3000";
}

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

  const inviteUrl = `${getBaseUrl()}/invite/${token}`;
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
