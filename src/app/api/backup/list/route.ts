import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import path from 'node:path';
import fs from 'node:fs';

// GET /api/backup/list — liệt kê các file backup
export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'backup.create');

    const backupDir = path.join(process.cwd(), 'data', 'backups');
    if (!fs.existsSync(backupDir)) {
      return json({ backups: [] });
    }

    const files = fs.readdirSync(backupDir)
      .filter(f => f.endsWith('.db'))
      .map(f => {
        const fullPath = path.join(backupDir, f);
        const stat = fs.statSync(fullPath);
        return {
          file: f,
          size_kb: Math.round(stat.size / 1024),
          created_at: stat.mtime.toISOString(),
        };
      })
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return json({ backups: files });
  } catch (err) {
    return handleApiError(err);
  }
}
