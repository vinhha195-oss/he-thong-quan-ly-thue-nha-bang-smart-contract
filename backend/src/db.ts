import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";

// Dung module SQLite tich hop san cua Node.js (khong can bien dich native nhu
// better-sqlite3) - thay the cho PostgreSQL vi may khong co san Docker/PostgreSQL.
const dir = path.dirname(config.dbFile);
if (!fs.existsSync(dir)) {
  fs.mkdirSync(dir, { recursive: true });
}

export const db = new DatabaseSync(config.dbFile);
db.exec("PRAGMA journal_mode = WAL;");

db.exec(`
CREATE TABLE IF NOT EXISTS indexer_state (
  id TEXT PRIMARY KEY,
  last_processed_block INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS blockchain_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  contract_address TEXT NOT NULL,
  transaction_hash TEXT NOT NULL,
  log_index INTEGER NOT NULL,
  block_number INTEGER NOT NULL,
  block_hash TEXT NOT NULL,
  event_name TEXT NOT NULL,
  property_id INTEGER NOT NULL,
  payload TEXT NOT NULL,
  processed_at TEXT NOT NULL,
  UNIQUE (transaction_hash, log_index)
);

CREATE INDEX IF NOT EXISTS idx_events_property ON blockchain_events (property_id);

CREATE TABLE IF NOT EXISTS properties (
  id INTEGER PRIMARY KEY,
  landlord TEXT NOT NULL,
  title TEXT NOT NULL,
  location TEXT NOT NULL,
  monthly_rent TEXT NOT NULL,
  deposit TEXT NOT NULL,
  status INTEGER NOT NULL,
  tenant TEXT NOT NULL,
  deposit_held TEXT NOT NULL,
  started_at TEXT NOT NULL,
  rent_paid_count INTEGER NOT NULL,
  image_cid TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  next_due_date TEXT NOT NULL DEFAULT '0',
  proposed_deduction TEXT NOT NULL DEFAULT '0',
  settlement_proposed INTEGER NOT NULL DEFAULT 0,
  updated_block INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
`);

// Migration nhe cho database da tao truoc khi co them cot moi.
// "ADD COLUMN IF NOT EXISTS" duoc SQLite ho tro tu 3.35 (2021).
for (const stmt of [
  `ALTER TABLE properties ADD COLUMN IF NOT EXISTS image_cid TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE properties ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';`,
  `ALTER TABLE properties ADD COLUMN IF NOT EXISTS next_due_date TEXT NOT NULL DEFAULT '0';`,
  `ALTER TABLE properties ADD COLUMN IF NOT EXISTS proposed_deduction TEXT NOT NULL DEFAULT '0';`,
  `ALTER TABLE properties ADD COLUMN IF NOT EXISTS settlement_proposed INTEGER NOT NULL DEFAULT 0;`,
]) {
  try {
    db.exec(stmt);
  } catch {
    // Da co cot roi hoac ban SQLite cu hon - bo qua, CREATE TABLE o tren da bao phu
    // truong hop tao moi.
  }
}
