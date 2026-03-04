import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { basename, dirname, join, normalize } from "node:path";
import { NextResponse } from "next/server";
import unzipper from "unzipper";
import * as dal from "../../../lib/dal.js";
import { getUser } from "../../../lib/session.js";
import { nowZoned, parsePlainDateTime, toLocalDateTimeInput } from "../../../lib/temporal.js";

const importTypes = [
  {
    key: "formula",
    label: "Formula",
    matcher: (name) => name.toLowerCase().endsWith("_formula.csv"),
    parseRow: (row) => {
      const [babyNameRaw, timeRaw, amountRaw, noteRaw] = row;
      const babyName = normalizeBabyName(babyNameRaw);
      if (!babyName) {
        return null;
      }
      const fed_at = parseDateTime(timeRaw);
      const volume_ml = parseInt(amountRaw || "0", 10) || 0;
      const notes = normalizeNote(noteRaw);
      if (!fed_at || !volume_ml) {
        return null;
      }
      return {
        babyName,
        payload: {
          volume_ml,
          fed_at,
          started_at: null,
          ended_at: null,
          duration_minutes: null,
          notes,
        },
      };
    },
    isDuplicate: (babyId, payload) => dal.hasMilkEntry(babyId, payload.fed_at, payload.volume_ml),
    insert: (babyId, userId, payload) => dal.addMilk(babyId, userId, payload),
  },
  {
    key: "growth",
    label: "Growth",
    matcher: (name) => name.toLowerCase().endsWith("_growth.csv"),
    parseRow: (row) => {
      const [babyNameRaw, timeRaw, _lengthRaw, weightRaw, _headRaw, noteRaw] = row;
      const babyName = normalizeBabyName(babyNameRaw);
      if (!babyName) {
        return null;
      }
      const measured_at = parseDateTime(timeRaw)?.split("T")[0];
      const weightKg = parseFloat(weightRaw || "0");
      if (!measured_at || !weightKg) {
        return null;
      }
      const weight_grams = Math.round(weightKg * 1000);
      const notes = normalizeNote(noteRaw);
      return {
        babyName,
        payload: {
          weight_grams,
          measured_at,
          notes,
        },
      };
    },
    isDuplicate: (babyId, payload) =>
      dal.hasWeightEntry(babyId, payload.measured_at, payload.weight_grams),
    insert: (babyId, userId, payload) => dal.addWeight(babyId, userId, payload),
  },
];

function parseCsvLine(line) {
  const result = [];
  let current = "";
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
    if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  result.push(current);
  return result.map((v) => v.trim());
}

function normalizeBabyName(value) {
  if (!value) {
    return "";
  }
  return String(value).replace(/^"|"$/g, "").trim();
}

function normalizeNote(value) {
  if (!value) {
    return null;
  }
  const cleaned = String(value).replace(/^"|"$/g, "").trim();
  return cleaned || null;
}

function babyKey(name) {
  return normalizeBabyName(name).toLowerCase();
}

function parseDateTime(value) {
  if (!value) {
    return null;
  }
  const parts = value.trim().split(" ");
  if (parts.length < 2) {
    return null;
  }
  const [datePart, timePart] = parts;
  const [month, day, year] = datePart.split("/").map((v) => parseInt(v, 10));
  const [hour, minute] = timePart.split(":").map((v) => parseInt(v, 10));
  if (!month || !day || !year || Number.isNaN(hour) || Number.isNaN(minute)) {
    return null;
  }
  const yyyy = year < 100 ? 2000 + year : year;
  const normalized = `${yyyy}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(
    hour,
  ).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  const parsed = parsePlainDateTime(normalized);
  return parsed ? parsed.toString({ smallestUnit: "minute" }) : null;
}

async function readCsv(path) {
  const content = await readFile(path, "utf-8");
  const lines = content.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) {
    return [];
  }
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    rows.push(parseCsvLine(lines[i]));
  }
  return rows;
}

function safeEntryPath(entryPath) {
  const normalized = normalize(entryPath.replace(/\\/g, "/"));
  if (normalized.startsWith("..") || normalized.includes("../") || normalized.includes("..\\")) {
    return null;
  }
  if (normalized.startsWith("/") || normalized.startsWith("\\")) {
    return null;
  }
  return normalized;
}

async function extractZip(buffer) {
  const tempDir = await mkdtemp(join(os.tmpdir(), "baby-import-"));
  const directory = await unzipper.Open.buffer(buffer);
  const extracted = [];

  for (const entry of directory.files) {
    if (entry.type !== "File") {
      continue;
    }
    const sanitized = safeEntryPath(entry.path);
    if (!sanitized) {
      continue;
    }
    const destPath = join(tempDir, sanitized);
    await mkdir(dirname(destPath), { recursive: true });
    const content = await entry.buffer();
    await writeFile(destPath, content);
    extracted.push(destPath);
  }

  return { tempDir, extracted };
}

function todayLocalDate() {
  return toLocalDateTimeInput(nowZoned().toPlainDateTime()).split("T")[0];
}

function buildBabyLookup(existingBabies) {
  const lookup = new Map();
  for (const baby of existingBabies) {
    const key = babyKey(baby.name);
    if (key) {
      lookup.set(key, baby);
    }
  }
  return lookup;
}

function trackBaby(state, name, status) {
  const key = babyKey(name);
  if (!key) {
    return;
  }
  if (status === "create") {
    if (!state.babiesToCreate.has(key)) {
      state.babiesToCreate.set(key, name);
    }
    return;
  }
  if (!state.babiesToReuse.has(key)) {
    state.babiesToReuse.set(key, name);
  }
}

function initImportState() {
  return {
    babiesToCreate: new Map(),
    babiesToReuse: new Map(),
    countsByType: {},
    skipped: 0,
  };
}

function finalizeImportState(state) {
  return {
    babiesToCreate: Array.from(state.babiesToCreate.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    ),
    babiesToReuse: Array.from(state.babiesToReuse.values()).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    ),
    countsByType: state.countsByType,
    skipped: state.skipped,
  };
}

function ensureCount(state, key) {
  if (!state.countsByType[key]) {
    state.countsByType[key] = 0;
  }
}

function resolveBaby({ name, user, lookup, mode, state }) {
  const key = babyKey(name);
  if (!key) {
    return null;
  }
  let baby = lookup.get(key);
  if (baby) {
    trackBaby(state, name, "reuse");
    dal.ensureUserBaby(user.id, baby.id, "owner");
    return baby;
  }
  trackBaby(state, name, "create");
  if (mode === "preview") {
    return null;
  }
  baby = dal.createBaby(name, todayLocalDate(), null, user.id);
  lookup.set(key, baby);
  return baby;
}

export async function POST(request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }
    const formData = await request.formData();
    const mode = formData.get("mode") === "preview" ? "preview" : "import";
    const file = formData.get("file");
    if (!file || typeof file.arrayBuffer !== "function") {
      return NextResponse.json({ error: "Zip file is required" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    let tempDir = null;
    try {
      const extraction = await extractZip(buffer);
      tempDir = extraction.tempDir;
      const extractedFiles = extraction.extracted;

      const filesByType = new Map();
      for (const filePath of extractedFiles) {
        const fileName = basename(filePath);
        const type = importTypes.find((item) => item.matcher(fileName));
        if (!type) {
          continue;
        }
        if (!filesByType.has(type.key)) {
          filesByType.set(type.key, []);
        }
        filesByType.get(type.key).push(filePath);
      }

      if (filesByType.size === 0) {
        return NextResponse.json(
          { error: "No formula or growth CSV files found in the zip." },
          { status: 400 },
        );
      }

      const state = initImportState();
      const existingBabies = dal.getBabiesForUser(user.id) || [];
      const lookup = buildBabyLookup(existingBabies);

      for (const type of importTypes) {
        const filePaths = filesByType.get(type.key) || [];
        if (filePaths.length === 0) {
          continue;
        }
        ensureCount(state, type.key);
        for (const filePath of filePaths) {
          const rows = await readCsv(filePath);
          for (const row of rows) {
            const parsed = type.parseRow(row);
            if (!parsed) {
              continue;
            }
            const baby = resolveBaby({
              name: parsed.babyName,
              user,
              lookup,
              mode,
              state,
            });

            if (baby && type.isDuplicate(baby.id, parsed.payload)) {
              state.skipped += 1;
              continue;
            }

            if (mode === "import" && baby) {
              type.insert(baby.id, user.id, parsed.payload);
            }

            state.countsByType[type.key] += 1;
          }
        }
      }

      const response = finalizeImportState(state);
      return NextResponse.json({
        success: true,
        mode,
        ...response,
      });
    } finally {
      if (tempDir) {
        await rm(tempDir, { recursive: true, force: true });
      }
    }
  } catch (err) {
    console.error("Import error:", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
