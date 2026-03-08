import { NextResponse } from "next/server";
import * as dal from "../../../../lib/dal.js";
import { getUser } from "../../../../lib/session.js";

// ── Minimal ZIP creator (STORED, no compression) ──────────────────────────

function buildCrc32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  return table;
}

const CRC32_TABLE = buildCrc32Table();

function crc32(buf) {
  let crc = 0xffffffff;
  for (const byte of buf) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime() {
  const now = new Date();
  const time =
    ((now.getHours() & 0x1f) << 11) |
    ((now.getMinutes() & 0x3f) << 5) |
    ((now.getSeconds() >> 1) & 0x1f);
  const date =
    (((now.getFullYear() - 1980) & 0x7f) << 9) |
    (((now.getMonth() + 1) & 0x0f) << 5) |
    (now.getDate() & 0x1f);
  return { time, date };
}

/**
 * Creates a ZIP buffer from an array of { name: string, content: Buffer|string } objects.
 * Uses STORE method (no compression) for maximum compatibility.
 */
function createZip(files) {
  const { time, date } = dosDateTime();
  const localParts = [];
  const centralEntries = [];
  let offset = 0;

  for (const { name, content } of files) {
    const nameBuf = Buffer.from(name, "utf8");
    const dataBuf = Buffer.isBuffer(content) ? content : Buffer.from(content, "utf8");
    const checksum = crc32(dataBuf);
    const size = dataBuf.length;

    // Local file header (30 bytes + file name)
    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0); // PK\x03\x04
    localHeader.writeUInt16LE(20, 4); // version needed (2.0)
    localHeader.writeUInt16LE(0, 6); // general purpose flags
    localHeader.writeUInt16LE(0, 8); // compression: STORED
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(size, 18); // compressed size
    localHeader.writeUInt32LE(size, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // extra field length
    nameBuf.copy(localHeader, 30);

    // Central directory entry (46 bytes + file name)
    const centralEntry = Buffer.alloc(46 + nameBuf.length);
    centralEntry.writeUInt32LE(0x02014b50, 0); // PK\x01\x02
    centralEntry.writeUInt16LE(20, 4); // version made by
    centralEntry.writeUInt16LE(20, 6); // version needed
    centralEntry.writeUInt16LE(0, 8); // flags
    centralEntry.writeUInt16LE(0, 10); // compression: STORED
    centralEntry.writeUInt16LE(time, 12);
    centralEntry.writeUInt16LE(date, 14);
    centralEntry.writeUInt32LE(checksum, 16);
    centralEntry.writeUInt32LE(size, 20); // compressed size
    centralEntry.writeUInt32LE(size, 24); // uncompressed size
    centralEntry.writeUInt16LE(nameBuf.length, 28);
    centralEntry.writeUInt16LE(0, 30); // extra field length
    centralEntry.writeUInt16LE(0, 32); // comment length
    centralEntry.writeUInt16LE(0, 34); // disk number start
    centralEntry.writeUInt16LE(0, 36); // internal attributes
    centralEntry.writeUInt32LE(0, 38); // external attributes
    centralEntry.writeUInt32LE(offset, 42); // local header offset
    nameBuf.copy(centralEntry, 46);

    localParts.push(localHeader, dataBuf);
    offset += localHeader.length + dataBuf.length;
    centralEntries.push(centralEntry);
  }

  const centralDir = Buffer.concat(centralEntries);
  const centralDirSize = centralDir.length;
  const centralDirOffset = offset;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // PK\x05\x06
  eocd.writeUInt16LE(0, 4); // disk number
  eocd.writeUInt16LE(0, 6); // disk with central dir
  eocd.writeUInt16LE(files.length, 8); // entries on this disk
  eocd.writeUInt16LE(files.length, 10); // total entries
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20); // comment length

  return Buffer.concat([...localParts, centralDir, eocd]);
}

// ── CSV helpers ────────────────────────────────────────────────────────────

function escapeCsv(value) {
  if (value == null || value === "") {
    return "";
  }
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Converts an ISO date string (YYYY-MM-DD) to the import-compatible format: MM/DD/YYYY HH:MM
 */
function toExportDateTime(isoDate, isoTime = "00:00") {
  const [year, month, day] = isoDate.split("-");
  const [hour, minute] = isoTime.split(":");
  return `${month}/${day}/${year} ${(hour || "00").padStart(2, "0")}:${(minute || "00").padStart(2, "0")}`;
}

/**
 * Parses a stored datetime (may be "YYYY-MM-DD HH:MM:SS" or "YYYY-MM-DDTHH:MM") into date + time parts.
 */
function splitDateTime(value) {
  if (!value) {
    return { date: "", time: "00:00" };
  }
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const [datePart, timePart = "00:00"] = normalized.split("T");
  return { date: datePart, time: timePart.slice(0, 5) };
}

function buildGrowthCsv(babyName, growthEntries) {
  const header = "baby_name,timestamp,length,weight_kg,head_circumference,notes\r\n";
  const rows = growthEntries.map((w) => {
    const weightKg = Number.isFinite(w.weight_grams) ? (w.weight_grams / 1000).toFixed(3) : "";
    const lengthCm = Number.isFinite(w.length_cm) ? w.length_cm.toFixed(1) : "";
    return [
      escapeCsv(babyName),
      toExportDateTime(w.measured_at),
      lengthCm,
      weightKg,
      "", // head circumference not tracked
      escapeCsv(w.notes || ""),
    ].join(",");
  });
  return `${header + rows.join("\r\n")}\r\n`;
}

function buildFormulaCsv(babyName, milkEntries) {
  const header = "baby_name,timestamp,amount_ml,notes\r\n";
  const rows = milkEntries.map((e) => {
    const { date, time } = splitDateTime(e.fed_at);
    return [
      escapeCsv(babyName),
      toExportDateTime(date, time),
      e.volume_ml,
      escapeCsv(e.notes || ""),
    ].join(",");
  });
  return `${header + rows.join("\r\n")}\r\n`;
}

function diaperStatusForExport(type) {
  if (type === "both") {
    return "Mixed";
  }
  if (type === "dirty") {
    return "Dirty";
  }
  if (type === "dry") {
    return "Dry";
  }
  return "Wet";
}

function buildDiaperCsv(babyName, diaperEntries) {
  const header = "Baby,Time,Status,Note\r\n";
  const rows = diaperEntries.map((entry) => {
    const { date, time } = splitDateTime(entry.changed_at);
    return [
      escapeCsv(babyName),
      toExportDateTime(date, time),
      diaperStatusForExport(entry.diaper_type),
      escapeCsv(entry.notes || ""),
    ].join(",");
  });
  return `${header + rows.join("\r\n")}\r\n`;
}

function buildTemperatureCsv(babyName, temperatureEntries) {
  const header = "Baby,Time,Temperature (°C),Note\r\n";
  const rows = temperatureEntries.map((entry) => {
    const { date, time } = splitDateTime(entry.measured_at);
    return [
      escapeCsv(babyName),
      toExportDateTime(date, time),
      Number.isFinite(entry.temperature_c) ? Number(entry.temperature_c.toFixed(1)) : "",
      escapeCsv(entry.notes || ""),
    ].join(",");
  });
  return `${header + rows.join("\r\n")}\r\n`;
}

function splitMedicationDosage(dosage) {
  const raw = String(dosage || "").trim();
  if (!raw) {
    return { amount: "", unit: "" };
  }

  const match = raw.match(/^([\d.,]+)\s*(.*)$/);
  if (!match) {
    return { amount: raw, unit: "" };
  }

  return {
    amount: match[1] || "",
    unit: match[2] || "",
  };
}

function buildMedicationCsv(babyName, medicationEntries) {
  const header =
    "Baby,Time,Medication name,Amount,,Min interval (minutes),Max interval (minutes),Note\r\n";
  const rows = medicationEntries.map((entry) => {
    const { date, time } = splitDateTime(entry.given_at);
    const dosage = splitMedicationDosage(entry.dosage);
    return [
      escapeCsv(babyName),
      toExportDateTime(date, time),
      escapeCsv(entry.medication_name || ""),
      escapeCsv(dosage.amount),
      escapeCsv(dosage.unit),
      escapeCsv(entry.interval_minutes ?? ""),
      escapeCsv(entry.max_interval_minutes ?? ""),
      escapeCsv(entry.notes || ""),
    ].join(",");
  });
  return `${header + rows.join("\r\n")}\r\n`;
}

// ── Route handler ──────────────────────────────────────────────────────────

export async function GET(_request, { params }) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const baby = dal.getBabyForUser(id, user.id);
  if (!baby) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const growthEntries = dal.getGrowthEntriesForBaby(id, user.id) ?? [];
  const milkEntries = dal.getMilkForBaby(id, user.id) ?? [];
  const diaperEntries = dal.getDiaperEntriesForBaby(id, user.id) ?? [];
  const temperatureEntries = dal.getTemperatureEntriesForBaby(id, user.id) ?? [];
  const medicationEntries = dal.getMedicationEntriesForBaby(id, user.id) ?? [];

  const safeName = baby.name.replace(/[^a-z0-9_-]/gi, "_");

  const files = [
    { name: `${safeName}_growth.csv`, content: buildGrowthCsv(baby.name, growthEntries) },
    { name: `${safeName}_formula.csv`, content: buildFormulaCsv(baby.name, milkEntries) },
    { name: `${safeName}_diaper.csv`, content: buildDiaperCsv(baby.name, diaperEntries) },
    {
      name: `${safeName}_temperature.csv`,
      content: buildTemperatureCsv(baby.name, temperatureEntries),
    },
    {
      name: `${safeName}_medication.csv`,
      content: buildMedicationCsv(baby.name, medicationEntries),
    },
  ];

  const zip = createZip(files);

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeName}_export.zip"`,
      "Content-Length": String(zip.length),
    },
  });
}
