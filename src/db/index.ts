/**
 * SQLite singleton (better-sqlite3-multiple-ciphers)
 * Hỗ trợ SQLCipher AES-256 encryption
 * File: src/db/index.ts
 */
import Database from 'better-sqlite3-multiple-ciphers';
import path from 'node:path';
import fs from 'node:fs';

let _db: Database.Database | null = null;

function resolveDbPath(): string {
  if (process.env.VERCEL) {
    const tmpDbPath = '/tmp/edurecruit.db';
    const bundledDbPath = path.resolve(process.cwd(), 'data', 'edurecruit.db');
    if (fs.existsSync(bundledDbPath)) {
      let shouldCopy = false;
      if (!fs.existsSync(tmpDbPath)) {
        shouldCopy = true;
      } else {
        try {
          const bundledStat = fs.statSync(bundledDbPath);
          const tmpStat = fs.statSync(tmpDbPath);
          // Ghi đè nếu file bundle mới có size khác hoặc thời gian sửa đổi mới hơn
          if (bundledStat.size !== tmpStat.size || bundledStat.mtimeMs > tmpStat.mtimeMs) {
            shouldCopy = true;
          }
        } catch {
          shouldCopy = true;
        }
      }

      if (shouldCopy) {
        try {
          // Xóa file cũ trước khi copy để tránh lỗi busy/lock
          if (fs.existsSync(tmpDbPath)) {
            fs.unlinkSync(tmpDbPath);
          }
          fs.copyFileSync(bundledDbPath, tmpDbPath);
          console.log('Successfully updated SQLite DB in /tmp with new deployment bundle');
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
} {
  const db = getDb();
  const wal = db.pragma('journal_mode', { simple: true });
  return {
    path: resolveDbPath(),
    encrypted: !!process.env.DB_KEY,
    wal: wal === 'wal'
  };
}
