import "server-only";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS accounts (
  id            TEXT PRIMARY KEY,
  label         TEXT NOT NULL,
  email         TEXT NOT NULL,
  provider_id   TEXT NOT NULL,
  protocol      TEXT NOT NULL,
  secret        TEXT NOT NULL,          -- encrypted MailAccount JSON
  created_at    TEXT NOT NULL,
  last_scan_at  TEXT,
  last_scan_scope TEXT,
  last_scan_scanned INTEGER,
  last_error    TEXT
);

CREATE TABLE IF NOT EXISTS newsletters (
  account_id     TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  address        TEXT NOT NULL,
  name           TEXT NOT NULL,
  list_id        TEXT,
  count          INTEGER NOT NULL,
  latest_subject TEXT NOT NULL,
  latest_date    TEXT,
  unsubscribe    TEXT NOT NULL,         -- UnsubscribeMethods JSON
  folders        TEXT NOT NULL,         -- string[] JSON
  PRIMARY KEY (account_id, address)
);

CREATE TABLE IF NOT EXISTS unsubscribes (
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  address     TEXT NOT NULL,
  status      TEXT NOT NULL,            -- done | manual | failed
  method      TEXT,
  detail      TEXT,
  url         TEXT,
  updated_at  TEXT NOT NULL,
  PRIMARY KEY (account_id, address)
);
`;

const globalForDb = globalThis as unknown as { byeletterDb?: DatabaseSync };

/** One connection per process; kept on globalThis because route bundles don't share module state. */
export function db(): DatabaseSync {
  if (!globalForDb.byeletterDb) {
    // Runtime-only location; tell Turbopack not to trace it into the build output.
    const dir = path.resolve(/* turbopackIgnore: true */ process.cwd(), process.env.DATA_DIR || "data");
    mkdirSync(dir, { recursive: true });
    const conn = new DatabaseSync(path.join(dir, "byeletter.db"));
    conn.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");
    conn.exec(SCHEMA);
    globalForDb.byeletterDb = conn;
  }
  return globalForDb.byeletterDb;
}

export function transaction<T>(fn: () => T): T {
  const conn = db();
  conn.exec("BEGIN");
  try {
    const result = fn();
    conn.exec("COMMIT");
    return result;
  } catch (err) {
    conn.exec("ROLLBACK");
    throw err;
  }
}
