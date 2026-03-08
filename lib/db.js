import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), "data");
if (!existsSync(DATA_DIR)) {
  mkdirSync(DATA_DIR, { recursive: true });
}

const db = new Database(join(DATA_DIR, "babytracker.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    locale TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS babies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    birth_date DATE NOT NULL,
    gender TEXT,
    photo_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_babies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    baby_id INTEGER NOT NULL,
    role TEXT DEFAULT 'parent',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    UNIQUE(user_id, baby_id)
  );

  CREATE TABLE IF NOT EXISTS growth_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    weight_grams INTEGER,
    length_cm REAL,
    measured_at DATE NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS milk_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    volume_ml INTEGER NOT NULL,
    fed_at DATETIME NOT NULL,
    started_at DATETIME,
    ended_at DATETIME,
    duration_minutes INTEGER,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS diaper_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    diaper_type TEXT NOT NULL,
    changed_at DATETIME NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS temperature_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    temperature_c REAL NOT NULL,
    measured_at DATETIME NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS medication_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT,
    interval_minutes INTEGER,
    given_at DATETIME NOT NULL,
    notes TEXT,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS predefined_medications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT,
    interval_minutes INTEGER,
    created_by INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS invites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_by INTEGER NOT NULL,
    expires_at DATETIME NOT NULL,
    used_at DATETIME,
    FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );
`);

try {
  db.exec("ALTER TABLE weight_entries RENAME TO growth_entries");
} catch {
  // Table already renamed or growth_entries already exists
}
try {
  db.exec("ALTER TABLE growth_entries ADD COLUMN length_cm REAL");
} catch {
  // Column already exists
}
try {
  const hasWeightTable = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'weight_entries'")
    .get();

  if (hasWeightTable) {
    db.exec(`
      INSERT INTO growth_entries (id, baby_id, weight_grams, measured_at, notes, created_by, created_at)
      SELECT id, baby_id, weight_grams, measured_at, notes, created_by, created_at
      FROM weight_entries
      WHERE id NOT IN (SELECT id FROM growth_entries);

      DROP TABLE weight_entries;
    `);
  }
} catch {
  // Legacy table copy not needed or already handled
}
try {
  db.exec("ALTER TABLE babies ADD COLUMN photo_url TEXT");
} catch {
  // Column already exists
}
try {
  db.exec("ALTER TABLE milk_entries ADD COLUMN started_at DATETIME");
} catch {
  // Column already exists
}
try {
  db.exec("ALTER TABLE milk_entries ADD COLUMN ended_at DATETIME");
} catch {
  // Column already exists
}
try {
  db.exec("ALTER TABLE milk_entries ADD COLUMN duration_minutes INTEGER");
} catch {
  // Column already exists
}
try {
  db.exec("ALTER TABLE users ADD COLUMN locale TEXT");
} catch {
  // Column already exists
}
try {
  db.exec("ALTER TABLE diaper_entries ADD COLUMN diaper_type TEXT");
} catch {
  // Column already exists
}
try {
  db.exec("ALTER TABLE medication_entries ADD COLUMN medication_name TEXT");
} catch {
  // Column already exists
}
try {
  db.exec("ALTER TABLE medication_entries ADD COLUMN interval_minutes INTEGER");
} catch {
  // Column already exists
}

const growthColumns = db.prepare("PRAGMA table_info(growth_entries)").all();
const weightCol = growthColumns.find((column) => column.name === "weight_grams");

if (weightCol?.notnull) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS growth_entries_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      baby_id INTEGER NOT NULL,
      weight_grams INTEGER,
      length_cm REAL,
      measured_at DATE NOT NULL,
      notes TEXT,
      created_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (baby_id) REFERENCES babies(id) ON DELETE CASCADE,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );

    INSERT INTO growth_entries_new (id, baby_id, weight_grams, length_cm, measured_at, notes, created_by, created_at)
    SELECT id, baby_id, weight_grams, length_cm, measured_at, notes, created_by, created_at
    FROM growth_entries;

    DROP TABLE growth_entries;
    ALTER TABLE growth_entries_new RENAME TO growth_entries;
  `);
}

export const prepare = (sql) => db.prepare(sql);
export default db;
