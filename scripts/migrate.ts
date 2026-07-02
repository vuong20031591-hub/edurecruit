/**
 * scripts/migrate.ts — wrapper chạy migration từ src/db/migrate.ts
 * File: scripts/migrate.ts
 */
import { runMigrations } from '../src/db/migrate';
import { closeDb } from '../src/db';

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
