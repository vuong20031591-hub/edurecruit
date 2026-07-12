import Database from 'better-sqlite3-multiple-ciphers';
import path from 'node:path';

const dbPath = path.resolve(process.cwd(), 'data', 'edurecruit.db');
const db = new Database(dbPath);

const rows = db.prepare(`
  SELECT id, ky_tuyendung_id, ma_vi_tri, mon, cap_hoc, sbd_prefix
  FROM vitri_tuyendung
  ORDER BY ky_tuyendung_id, mon, cap_hoc
`).all();

console.table(rows);
db.close();
