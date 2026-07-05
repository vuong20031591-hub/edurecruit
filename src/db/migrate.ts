/**
 * Migrations runner - chạy tất cả file .sql trong src/db/migrations/
 * theo thứ tự tên file
 * File: src/db/migrate.ts
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDb, closeDb } from './index';

const MIGRATIONS_DIR = path.join(process.cwd(), 'src', 'db', 'migrations');

interface AppliedMigration {
  id: number;
  name: string;
  applied_at: string;
}

function ensureMigrationsTable(): void {
  const db = getDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL UNIQUE,
      applied_at  TEXT    NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function getApplied(): AppliedMigration[] {
  const db = getDb();
  return db.prepare('SELECT * FROM _migrations ORDER BY id').all() as AppliedMigration[];
}

function applyMigration(name: string, sql: string): void {
  const db = getDb();
  // Migration đánh dấu "-- @no-transaction" ở dòng đầu → chạy ngoài transaction.
  // Cần thiết cho recreate-table (PRAGMA foreign_keys không có tác dụng trong transaction).
  const noTx = sql.trimStart().startsWith('-- @no-transaction');
  if (noTx) {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
    return;
  }
  const tx = db.transaction(() => {
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(name);
  });
  tx();
}

export function runMigrations(): { applied: string[]; skipped: string[] } {
  ensureMigrationsTable();

  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const applied = getApplied();
  const appliedNames = new Set(applied.map(m => m.name));
  const justApplied: string[] = [];
  const skipped: string[] = [];

  for (const file of files) {
    if (appliedNames.has(file)) {
      skipped.push(file);
      continue;
    }
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    applyMigration(file, sql);
    justApplied.push(file);
    console.log(`  ✓ Applied: ${file}`);
  }

  return { applied: justApplied, skipped };
}

// CLI: npx tsx src/db/migrate.ts
if (require.main === module) {
  try {
    const result = runMigrations();
    console.log(`\nDone. Applied: ${result.applied.length}, Skipped: ${result.skipped.length}`);
    closeDb();
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    closeDb();
    process.exit(1);
  }
}
