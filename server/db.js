import Database from 'better-sqlite3';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, isAbsolute } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const rawPath = process.env.CACHE_DB_PATH || './cache.sqlite';
const dbPath = isAbsolute(rawPath) ? rawPath : resolve(__dirname, '..', rawPath);

export const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS cache (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS cache_expires_idx ON cache (expires_at);
`);
