/**
 * GET /api/health
 * File: src/app/api/health/route.ts
 */
import { dbInfo } from '@/db';
import { getSession } from '@/server/api';
import { json } from '@/server/api';

export async function GET() {
  try {
    const session = await getSession();
    return json({
      ok: true,
      time: new Date().toISOString(),
      db: dbInfo(),
      session: session ? { username: session.username, quyen: session.quyen } : null
    });
  } catch (err) {
    return json({ ok: false, error: String(err) }, { status: 500 });
  }
}
