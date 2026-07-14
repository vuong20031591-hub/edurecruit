import { getDb } from '@/db';

const db = getDb();
const cfg = db.prepare("SELECT value FROM system_config WHERE key = 'app.current_ky_id'").get() as { value: string } | undefined;
console.log('current_ky_id:', cfg?.value);
const vitri = db.prepare('SELECT ky_tuyendung_id, COUNT(*) as c FROM vitri_tuyendung GROUP BY ky_tuyendung_id').all();
console.log('vitri by ky:', vitri);
const donvi = db.prepare('SELECT ky_tuyendung_id, COUNT(*) as c FROM don_vi_tuyen_dung GROUP BY ky_tuyendung_id').all();
console.log('donvi by ky:', donvi);
const thisinh = db.prepare('SELECT ky_tuyendung_id, COUNT(*) as c FROM thisinh GROUP BY ky_tuyendung_id').all();
console.log('thisinh by ky:', thisinh);
const users = db.prepare('SELECT id, username, quyen FROM users LIMIT 5').all();
console.log('users:', users);
