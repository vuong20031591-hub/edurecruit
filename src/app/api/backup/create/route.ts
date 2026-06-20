import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { getDb, closeDb } from '@/db';
import { audit } from '@/server/audit';
import path from 'node:path';
import fs from 'node:fs';

// POST /api/backup/create — tạo backup thủ công
export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'backup.create');
    const db = getDb();

    const backupDir = path.join(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const backupFile = path.join(backupDir, `backup_${ts}.db`);

    // SQLite backup API (better-sqlite3)
    await db.backup(backupFile);

    const stat = fs.statSync(backupFile);
    const sizeKB = Math.round(stat.size / 1024);

    audit({
      action: 'BACKUP_CREATE',
      userId: parseInt(session.sub, 10),
      username: session.username,
      payload: { file: path.basename(backupFile), size_kb: sizeKB },
      result: 'SUCCESS',
    });

    return json({
      file: path.basename(backupFile),
      path: backupFile,
      size_kb: sizeKB,
      created_at: new Date().toISOString(),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
