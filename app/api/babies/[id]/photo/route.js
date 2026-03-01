import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import { getUser } from '../../../../../lib/session.js';
import * as dal from '../../../../../lib/dal.js';

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export async function POST(request, { params }) {
  const user = await getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { id } = await params;
  const baby = dal.getBabyForUser(id, user.id);
  if (!baby) return NextResponse.json({ error: 'Baby not found' }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get('photo');
  if (!file || typeof file === 'string') {
    return NextResponse.json({ error: 'Photo is required' }, { status: 400 });
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json({ error: 'Invalid file type' }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  if (arrayBuffer.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: 'File too large (max 5MB)' }, { status: 400 });
  }

  const uploadDir = join(process.cwd(), 'public', 'uploads', 'babies');
  await mkdir(uploadDir, { recursive: true });
  const ext = extname(file.name) || '.jpg';
  const fileName = `${randomUUID()}${ext}`;
  const filePath = join(uploadDir, fileName);
  await writeFile(filePath, Buffer.from(arrayBuffer));

  const photoUrl = `/uploads/babies/${fileName}`;
  dal.updateBaby(id, user.id, { photo_url: photoUrl });

  return NextResponse.json({ success: true, photo_url: photoUrl });
}
