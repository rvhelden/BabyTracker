import { readFile, stat } from "node:fs/promises";
import { extname, join } from "node:path";
import { NextResponse } from "next/server";

const UPLOAD_DIR =
  process.env.IMAGE_UPLOAD_DIR ||
  join(process.env.DATA_DIR || join(process.cwd(), "public"), "uploads", "babies");

const MIME_TYPES = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(_request, { params }) {
  const { filename } = await params;

  if (filename.includes("..") || filename.includes("/") || filename.includes("\\")) {
    return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
  }

  const filePath = join(UPLOAD_DIR, filename);

  try {
    await stat(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ext = extname(filename).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const data = await readFile(filePath);

  return new NextResponse(data, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
