import Database from 'better-sqlite3-multiple-ciphers';
const db = new Database('data/edurecruit.db', { readonly: true });
const rows = db.prepare(
  "SELECT ten_don_vi, cap_hoc FROM don_vi_tuyen_dung WHERE ky_tuyendung_id=4 AND (ten_don_vi LIKE '%THCS%' OR ten_don_vi LIKE '%DTNT%') ORDER BY ten_don_vi"
).all();
console.log(JSON.stringify(rows, null, 2));
db.close();
