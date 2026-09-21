// src/db/database.js — abertura do SQLite (better-sqlite3) com PRAGMAs de performance.
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA_PATH = path.join(__dirname, 'schema.sql');

/**
 * Abre (ou cria) o banco no caminho dado, aplica PRAGMAs e o schema.
 * @param {string} dbPath
 * @param {{readonly?: boolean}} [opts]
 */
export function openDb(dbPath, opts = {}) {
  const readonly = !!opts.readonly;
  if (!readonly) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
  const db = new Database(dbPath, { readonly, fileMustExist: readonly });
  db.pragma('journal_mode = WAL');
  db.pragma('synchronous = NORMAL');
  db.pragma('mmap_size = 268435456'); // 256 MB
  db.pragma('cache_size = -65536');   // 64 MB
  db.pragma('foreign_keys = ON');
  if (!readonly) {
    const schema = fs.readFileSync(SCHEMA_PATH, 'utf8');
    db.exec(schema);
  }
  return db;
}

export function getMeta(db, key, fallback = null) {
  try {
    const row = db.prepare('SELECT value FROM meta WHERE key = ?').get(key);
    return row ? row.value : fallback;
  } catch { return fallback; }
}

export function setMeta(db, key, value) {
  db.prepare('INSERT INTO meta(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value')
    .run(key, String(value));
}
