import Database from 'better-sqlite3-multiple-ciphers';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'edurecruit.db');
const db = new Database(dbPath);

interface ViTri { id: number; ky_tuyendung_id: number; ma_vi_tri: string; mon: string; cap_hoc: string; sbd_prefix: string | null; }

const vitris = db.prepare(
  'SELECT id, ky_tuyendung_id, ma_vi_tri, mon, cap_hoc, sbd_prefix FROM vitri_tuyendung ORDER BY ky_tuyendung_id, mon, cap_hoc, id'
).all() as ViTri[];

// Group by ky, assign prefix per ky starting from 01, skip already-set
const byKy = new Map<number, ViTri[]>();
for (const v of vitris) {
  if (!byKy.has(v.ky_tuyendung_id)) byKy.set(v.ky_tuyendung_id, []);
  byKy.get(v.ky_tuyendung_id)!.push(v);
}

const update = db.prepare('UPDATE vitri_tuyendung SET sbd_prefix = ? WHERE id = ?');
const tx = db.transaction(() => {
  for (const [kyId, list] of byKy) {
    // Collect already-used prefixes in this ky
    const used = new Set(list.filter(v => v.sbd_prefix).map(v => v.sbd_prefix!));
    let seq = 1;
    for (const v of list) {
      if (v.sbd_prefix) {
        console.log(`  skip ky=${kyId} id=${v.id} ${v.ma_vi_tri} → already ${v.sbd_prefix}`);
        continue;
      }
      // find next unused seq
      while (used.has(String(seq).padStart(2, '0'))) seq++;
      const prefix = String(seq).padStart(2, '0');
      used.add(prefix);
      update.run(prefix, v.id);
      console.log(`  assign ky=${kyId} id=${v.id} ${v.ma_vi_tri} (${v.mon}/${v.cap_hoc}) → ${prefix}`);
      seq++;
    }
  }
});

tx();
db.close();
console.log('\nDone.');
