import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";
import * as dal from "../../../../../lib/dal.js";
import { getUser } from "../../../../../lib/session.js";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const IMAGE_UPLOAD_DIR =
  process.env.IMAGE_UPLOAD_DIR || join(process.cwd(), "public", "uploads", "babies");

export async function POST(request, { params }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const baby = dal.getBabyForUser(id, user.id);
  if (!baby) {
    return NextResponse.json({ error: "Baby not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("photo");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "Photo is required" }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: "Invalid file type" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
  }

  await mkdir(IMAGE_UPLOAD_DIR, { recursive: true });
  const ext = extname(file.name) || ".jpg";
  const fileName = `${randomUUID()}${ext}`;
  const filePath = join(IMAGE_UPLOAD_DIR, fileName);
  await writeFile(filePath, Buffer.from(arrayBuffer));

  const photoUrl = `/uploads/babies/${fileName}`;
  dal.updateBaby(id, user.id, { photo_url: photoUrl });

  return NextResponse.json({ success: true, photo_url: photoUrl });
}
