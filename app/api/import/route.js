import { NextResponse } from 'next/server';
import { getUser } from '../../../lib/session.js';
import * as dal from '../../../lib/dal.js';
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
      continue;
    }
    current += char;
  }
  result.push(current);
  return result.map(v => v.trim());
}

function parseDateTime(value) {
  if (!value) return null;
  const parts = value.trim().split(' ');
  if (parts.length < 2) return null;
  const [datePart, timePart] = parts;
  const [month, day, year] = datePart.split('/').map(v => parseInt(v, 10));
  const [hour, minute] = timePart.split(':').map(v => parseInt(v, 10));
  if (!month || !day || !year || Number.isNaN(hour) || Number.isNaN(minute)) return null;
  const yyyy = year < 100 ? 2000 + year : year;
  const pad = n => String(n).padStart(2, '0');
  return `${yyyy}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`;
}

async function readCsv(path) {
  const content = await readFile(path, 'utf-8');
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    rows.push(parseCsvLine(lines[i]));
  }
  return rows;
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const body = await request.json();
    const sourcePath = body?.sourcePath;
    if (!sourcePath) return NextResponse.json({ error: 'sourcePath is required' }, { status: 400 });

    const files = await readdir(sourcePath);
    const formulaFiles = files.filter(name => name.toLowerCase().endsWith('_formula.csv')).map(name => join(sourcePath, name));
    const growthFiles = files.filter(name => name.toLowerCase().endsWith('_growth.csv')).map(name => join(sourcePath, name));

    let babiesCreated = 0;
    let milkInserted = 0;
    let weightInserted = 0;
    let skipped = 0;

    function todayLocalDate() {
      const now = new Date();
      const pad = n => String(n).padStart(2, '0');
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    }

    function ensureBaby(name) {
      let baby = dal.getBabyByName(name);
      if (!baby) {
        baby = dal.createBaby(name, todayLocalDate(), null, user.id);
        babiesCreated += 1;
      } else {
        dal.ensureUserBaby(user.id, baby.id, 'owner');
      }
      return baby;
    }

    for (const filePath of formulaFiles) {
      const rows = await readCsv(filePath);
      for (const row of rows) {
        const [babyNameRaw, timeRaw, amountRaw, noteRaw] = row;
        const babyName = (babyNameRaw || '').replace(/^"|"$/g, '');
        if (!babyName) continue;
        const baby = ensureBaby(babyName);
        const fed_at = parseDateTime(timeRaw);
        const volume_ml = parseInt(amountRaw || '0', 10) || 0;
        const notes = (noteRaw || '').replace(/^"|"$/g, '') || null;
        if (!fed_at || !volume_ml) continue;
        if (dal.hasMilkEntry(baby.id, fed_at, volume_ml)) {
          skipped += 1;
          continue;
        }
        dal.addMilk(baby.id, user.id, {
          volume_ml,
          fed_at,
          started_at: null,
          ended_at: null,
          duration_minutes: null,
          notes,
        });
        milkInserted += 1;
      }
    }

    for (const filePath of growthFiles) {
      const rows = await readCsv(filePath);
      for (const row of rows) {
        const [babyNameRaw, timeRaw, lengthRaw, weightRaw, headRaw, noteRaw] = row;
        const babyName = (babyNameRaw || '').replace(/^"|"$/g, '');
        if (!babyName) continue;
        const baby = ensureBaby(babyName);
        const measured_at = parseDateTime(timeRaw)?.split('T')[0];
        const weightKg = parseFloat(weightRaw || '0');
        if (!measured_at || !weightKg) continue;
        const weight_grams = Math.round(weightKg * 1000);
        if (dal.hasWeightEntry(baby.id, measured_at, weight_grams)) {
          skipped += 1;
          continue;
        }
        const notes = (noteRaw || '').replace(/^"|"$/g, '') || null;
        dal.addWeight(baby.id, user.id, {
          weight_grams,
          measured_at,
          notes,
        });
        weightInserted += 1;
      }
    }

    return NextResponse.json({
      success: true,
      babiesCreated,
      milkInserted,
      weightInserted,
      skipped,
    });
  } catch (err) {
    console.error('Import error:', err);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}
