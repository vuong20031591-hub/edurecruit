import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { getDb } from '@/db';
import { audit } from '@/server/audit';
import type { SystemConfig } from '@/db/schema';

// GET /api/config — lấy toàn bộ hoặc theo key
// GET /api/config?keys=a,b,c — lấy các key cụ thể
export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'config.view');
    const db = getDb();
    const keys = req.nextUrl.searchParams.get('keys');

    if (keys) {
      const keyList = keys.split(',').map(k => k.trim()).filter(Boolean);
      const result: Record<string, string | null> = {};
      for (const key of keyList) {
        const row = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
        result[key] = row?.value ?? null;
      }
      return json(result);
    }

    const rows = db.prepare('SELECT * FROM system_config ORDER BY key ASC').all() as SystemConfig[];
    return json(rows);
  } catch (err) {
    return handleApiError(err);
  }
}

// PUT /api/config — update nhiều keys cùng lúc
// Body: { key: value, ... }
export async function PUT(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'config.update');
    const body = await req.json() as Record<string, string>;
    const db = getDb();
    const userId = parseInt(session.sub, 10);

    const tx = db.transaction(() => {
      for (const [key, value] of Object.entries(body)) {
        const existing = db.prepare('SELECT value FROM system_config WHERE key = ?').get(key) as { value: string } | undefined;
        const oldValue = existing?.value ?? null;

        db.prepare(`
          INSERT INTO system_config (key, value, updated_at, updated_by)
          VALUES (?, ?, datetime('now'), ?)
          ON CONFLICT(key) DO UPDATE SET
            value = excluded.value,
            updated_at = excluded.updated_at,
            updated_by = excluded.updated_by
        `).run(key, String(value), userId);

        // Audit từng key thay đổi
        if (oldValue !== String(value)) {
          audit({
            action: 'CONFIG_UPDATE',
            userId,
            username: session.username,
            resourceType: 'system_config',
            payload: { key, old_value: oldValue, new_value: String(value) },
            result: 'SUCCESS',
          });
        }
      }
    });
    tx();

    return json({ success: true, updated: Object.keys(body).length });
  } catch (err) {
    return handleApiError(err);
  }
}
