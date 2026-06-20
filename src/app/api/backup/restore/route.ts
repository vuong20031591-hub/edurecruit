import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json, ValidationError, NotFoundError } from '@/server/api';
import { closeDb } from '@/db';
import { audit } from '@/server/audit';
import path from 'node:path';
import fs from 'node:fs';

const INVALID_FILE_PATTERN = /[/\\]|\.\./;

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'backup.create');
    const body = await req.json();
    const { file } = body as { file?: string };

    if (!file || typeof file !== 'string') {
      throw new ValidationError('Thiếu tên file backup');
    }
    if (!file.endsWith('.db')) {
      throw new ValidationError('File backup phải có đuôi .db');
    }
    if (INVALID_FILE_PATTERN.test(file)) {
      throw new ValidationError('Tên file không hợp lệ');
    }

    const backupDir = path.join(process.cwd(), 'data', 'backups');
    const restoreFrom = path.join(backupDir, file);

    if (!fs.existsSync(restoreFrom)) {
      throw new NotFoundError(`File backup "${file}" không tồn tại`);
    }

    const dbPath = process.env.DB_PATH
      ? (path.isAbsolute(process.env.DB_PATH)
          ? process.env.DB_PATH
          : path.resolve(process.cwd(), process.env.DB_PATH))
      : path.join(process.cwd(), 'data', 'edurecruit.db');

    closeDb();

    const safetyName = `pre-restore_${Date.now()}.db`;
    const safetyPath = path.join(backupDir, safetyName);
    fs.copyFileSync(dbPath, safetyPath);

    fs.copyFileSync(restoreFrom, dbPath);

    const walPath = dbPath + '-wal';
    const shmPath = dbPath + '-shm';
    if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
    if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

    audit({
      action: 'BACKUP_RESTORE',
      userId: parseInt(session.sub, 10),
      username: session.username,
      payload: { restored_from: file, safety_backup: safetyName },
      result: 'SUCCESS',
    });

    return json({
      success: true,
      restored_from: file,
      safety_backup: safetyName,
    });
  } catch (err) {
    return handleApiError(err);
  }
}
