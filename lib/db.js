import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

const DATA_DIR = process.env.DATA_DIR || join(process.cwd(), 'data');
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });

const db = new Database(join(DATA_DIR, 'babytracker.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
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

  CREATE TABLE IF NOT EXISTS weight_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    baby_id INTEGER NOT NULL,
    weight_grams INTEGER NOT NULL,
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
    notes TEXT,
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
  db.exec('ALTER TABLE babies ADD COLUMN photo_url TEXT');
} catch {
  // Column already exists
}

export const prepare = (sql) => db.prepare(sql);
export default db;
