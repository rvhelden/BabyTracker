"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import * as dal from "../lib/dal.js";
import { getSession, getUser } from "../lib/session.js";

const { hash, compare } = bcrypt;

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
