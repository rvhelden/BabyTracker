import { NextResponse } from "next/server";
import * as dal from "../../../lib/dal.js";
import { getUser } from "../../../lib/session.js";

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

    const localHeader = Buffer.alloc(30 + nameBuf.length);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(size, 18);
    localHeader.writeUInt32LE(size, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28);
    nameBuf.copy(localHeader, 30);

    const centralEntry = Buffer.alloc(46 + nameBuf.length);
    centralEntry.writeUInt32LE(0x02014b50, 0);
    centralEntry.writeUInt16LE(20, 4);
    centralEntry.writeUInt16LE(20, 6);
    centralEntry.writeUInt16LE(0, 8);
    centralEntry.writeUInt16LE(0, 10);
    centralEntry.writeUInt16LE(time, 12);
    centralEntry.writeUInt16LE(date, 14);
    centralEntry.writeUInt32LE(checksum, 16);
    centralEntry.writeUInt32LE(size, 20);
    centralEntry.writeUInt32LE(size, 24);
    centralEntry.writeUInt16LE(nameBuf.length, 28);
    centralEntry.writeUInt16LE(0, 30);
    centralEntry.writeUInt16LE(0, 32);
    centralEntry.writeUInt16LE(0, 34);
    centralEntry.writeUInt16LE(0, 36);
    centralEntry.writeUInt32LE(0, 38);
    centralEntry.writeUInt32LE(offset, 42);
    nameBuf.copy(centralEntry, 46);

    localParts.push(localHeader, dataBuf);
    offset += localHeader.length + dataBuf.length;
    centralEntries.push(centralEntry);
  }

  const centralDir = Buffer.concat(centralEntries);
  const centralDirSize = centralDir.length;
  const centralDirOffset = offset;

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(centralDirSize, 12);
  eocd.writeUInt32LE(centralDirOffset, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

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

function toExportDateTime(isoDate, isoTime = "00:00") {
  if (!isoDate) {
    return "";
  }
  const [year, month, day] = isoDate.split("-");
  const [hour, minute] = isoTime.split(":");
  return `${month}/${day}/${year} ${(hour || "00").padStart(2, "0")}:${(minute || "00").padStart(2, "0")}`;
}

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
      "",
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

export async function GET() {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const babies = dal.getBabiesForUser(user.id) ?? [];
  if (babies.length === 0) {
    return NextResponse.json({ error: "No babies to export" }, { status: 404 });
  }

  const files = [];
  for (const baby of babies) {
    const growthEntries = dal.getGrowthEntriesForBaby(baby.id, user.id) ?? [];
    const milkEntries = dal.getMilkForBaby(baby.id, user.id) ?? [];
    const safeName = String(baby.name || `baby_${baby.id}`).replace(/[^a-z0-9_-]/gi, "_");

    files.push({
      name: `${safeName}_growth.csv`,
      content: buildGrowthCsv(baby.name, growthEntries),
    });
    files.push({
      name: `${safeName}_formula.csv`,
      content: buildFormulaCsv(baby.name, milkEntries),
    });
  }

  const zip = createZip(files);

  return new NextResponse(zip, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": 'attachment; filename="babytracker_full_export.zip"',
      "Content-Length": String(zip.length),
    },
  });
}
