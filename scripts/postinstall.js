const fs = require('fs');
const path = require('path');

console.log('Running postinstall script...');

if (process.env.VERCEL || process.env.NEXT_IS_EXPORT-BUILD) {
  console.log('Running on Vercel, skipping database migrate and seed during build.');
  process.exit(0);
}

// Fallback check: nếu có file migrate.ts ở local thì chạy
const migrateScript = path.join(__dirname, 'migrate.ts');
if (fs.existsSync(migrateScript)) {
  console.log('Local environment: Running database migrations...');
  try {
    const { execSync } = require('child_process');
    execSync('npx tsx scripts/migrate.ts', { stdio: 'inherit' });
  } catch (err) {
    console.error('Migration failed during postinstall:', err);
  }
} else {
  console.log('migrate.ts not found, skipping migrations.');
}
