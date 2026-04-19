import { db } from '../db.js';

const selectStmt = db.prepare('SELECT value, expires_at FROM cache WHERE key = ?');
const upsertStmt = db.prepare(
  'INSERT INTO cache (key, value, expires_at) VALUES (?, ?, ?) ' +
    'ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at',
);
const deleteStmt = db.prepare('DELETE FROM cache WHERE key = ?');
const purgeStmt = db.prepare('DELETE FROM cache WHERE expires_at < ?');

export function get(key) {
  const row = selectStmt.get(key);
  if (!row) return null;
  if (row.expires_at < Date.now()) {
    deleteStmt.run(key);
    return null;
  }
  return JSON.parse(row.value);
}

export function set(key, value, ttlSeconds) {
  const expiresAt = Date.now() + ttlSeconds * 1000;
  upsertStmt.run(key, JSON.stringify(value), expiresAt);
}

export function del(key) {
  deleteStmt.run(key);
}

export function purgeExpired() {
  return purgeStmt.run(Date.now()).changes;
}

export async function wrap(key, ttlSeconds, fn) {
  const hit = get(key);
  if (hit !== null) return hit;
  const fresh = await fn();
  set(key, fresh, ttlSeconds);
  return fresh;
}
