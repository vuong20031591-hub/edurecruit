/**
 * SQLite singleton (better-sqlite3-multiple-ciphers)
 * Hỗ trợ SQLCipher AES-256 encryption
 * File: src/db/index.ts
 */
import Database from 'better-sqlite3-multiple-ciphers';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';

let _db: Database.Database | null = null;

function sha256File(filePath: string): string | null {
  try {
    const buf = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(buf).digest('hex');
  } catch {
    return null;
  }
}

function resolveDbPath(): string {
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/edurecruit.db';
    const tmpHashPath = '/tmp/.edurecruit.db.sha256';
    const bundledDbPath = path.resolve(process.cwd(), 'data', 'edurecruit.db');
    if (fs.existsSync(bundledDbPath)) {
      const bundledHash = sha256File(bundledDbPath);
      const tmpHash = fs.existsSync(tmpHashPath)
        ? fs.readFileSync(tmpHashPath, 'utf8').trim()
        : null;
      const shouldCopy = bundledHash && (bundledHash !== tmpHash || !fs.existsSync(tmpDbPath));

      if (shouldCopy) {
        try {
          if (fs.existsSync(tmpDbPath)) {
            fs.unlinkSync(tmpDbPath);
          }
          fs.copyFileSync(bundledDbPath, tmpDbPath);
          if (bundledHash) fs.writeFileSync(tmpHashPath, bundledHash);
          console.log('Updated SQLite DB in /tmp from deployment bundle');
        } catch (err) {
          console.error('Failed to copy SQLite DB to /tmp:', err);
        }
      }
    }
    return tmpDbPath;
  }

  const p = process.env.DB_PATH || './data/edurecruit.db';
  const abs = path.isAbsolute(p) ? p : path.resolve(process.cwd(), p);
  const dir = path.dirname(abs);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return abs;
}

function applyPragmas(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.pragma('synchronous = NORMAL');
  db.pragma('temp_store = MEMORY');
  db.pragma('busy_timeout = 5000');
  db.pragma('cache_size = -64000');
  db.pragma('mmap_size = 268435456');
  db.pragma('wal_autocheckpoint = 1000');
}

export function getDb(): Database.Database {
  if (_db) return _db;

  const dbPath = resolveDbPath();
  const dbKey = process.env.DB_KEY;

  _db = new Database(dbPath);

  if (dbKey) {
    _db.pragma(`cipher='sqlcipher'`);
    _db.pragma(`key="x'${dbKey}'"`);
    // Smoke test: nếu key sai sẽ throw ở lệnh SELECT đầu tiên
  }

  applyPragmas(_db);
  return _db;
}

export function closeDb(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** Health check: trả về thông tin DB cho /api/health */
export function dbInfo(): {
  path: string;
  encrypted: boolean;
  wal: boolean;
  vitri_columns: string[];
  migrations: string[];
} {
  const db = getDb();
  const wal = db.pragma('journal_mode', { simple: true });
  const cols = db.prepare("PRAGMA table_info(vitri_tuyendung)").all() as { name: string }[];
  let migrations: string[] = [];
  try {
    migrations = (db.prepare("SELECT name FROM migrations ORDER BY name").all() as { name: string }[]).map(r => r.name);
  } catch { /* migrations table may not exist */ }
  return {
    path: resolveDbPath(),
    encrypted: !!process.env.DB_KEY,
    wal: wal === 'wal',
    vitri_columns: cols.map(c => c.name),
    migrations
  };
}
