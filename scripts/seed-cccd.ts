/**
 * scripts/seed-cccd.ts — Sinh CCCD ngẫu nhiên cho hồ sơ thiếu
 * File: scripts/seed-cccd.ts
 *
 * Cập nhật cột `thisinh.cccd` cho các hồ sơ có cccd IS NULL hoặc cccd = ''.
 * Sinh số CCCD 12 chữ số ngẫu nhiên (format CCCD Việt Nam mới).
 * Đảm bảo unique bằng cách check trùng với CCCD đã có trong DB.
 *
 * Chạy: npm run db:seed-cccd (hoặc: npx tsx scripts/seed-cccd.ts)
 */
import { getDb, closeDb } from '../src/db';

function generateCCCD(): string {
  // 12 số, bắt đầu bằng 0 (format CCCD Việt Nam)
  let s = '0';
  for (let i = 0; i < 11; i++) {
    s += Math.floor(Math.random() * 10).toString();
  }
  return s;
}

function seedCCCD(): void {
  const db = getDb();

  // Lấy tất cả hồ sơ thiếu CCCD
  const missing = db.prepare(`
    SELECT id, ho_ten, cccd
    FROM thisinh
    WHERE cccd IS NULL OR cccd = ''
    ORDER BY id ASC
  `).all() as Array<{ id: number; ho_ten: string; cccd: string | null }>;

  if (missing.length === 0) {
    console.log('Không có hồ sơ nào thiếu CCCD. Bỏ qua.');
    return;
  }

  console.log(`Tìm thấy ${missing.length} hồ sơ thiếu CCCD`);

  // Lấy tất cả CCCD đã tồn tại (trong cùng DB, không phân biệt kỳ) để check trùng
  const existing = new Set(
    (db.prepare(`
      SELECT cccd FROM thisinh
      WHERE cccd IS NOT NULL AND cccd != ''
    `).all() as Array<{ cccd: string }>).map(r => r.cccd)
  );
  console.log(`Đã có ${existing.size} CCCD trong DB`);

  const updateStmt = db.prepare(`
    UPDATE thisinh SET cccd = ? WHERE id = ?
  `);

  const result = db.transaction(() => {
    let updated = 0;
    let failed = 0;
    for (const ts of missing) {
      let cccd: string | null = null;
      // Retry tối đa 100 lần để tránh collision
      for (let attempts = 0; attempts < 100; attempts++) {
        const candidate = generateCCCD();
        if (!existing.has(candidate)) {
          cccd = candidate;
          break;
        }
      }
      if (!cccd) {
        console.warn(`  ! Không thể sinh CCCD unique cho #${ts.id} (${ts.ho_ten})`);
        failed++;
        continue;
      }
      existing.add(cccd);
      updateStmt.run(cccd, ts.id);
      updated++;
    }
    return { updated, failed };
  })();

  console.log(`\n✓ Hoàn tất: ${result.updated} hồ sơ được seed CCCD, ${result.failed} thất bại.`);
  if (result.updated > 0) {
    console.log('  Có thể chạy lại "Rà soát tự động" trên trang Hồ sơ để kiểm tra các rule mới.');
  }
}

try {
  seedCCCD();
  closeDb();
  process.exit(0);
} catch (err) {
  console.error('Seed CCCD thất bại:', err);
  closeDb();
  process.exit(1);
}
