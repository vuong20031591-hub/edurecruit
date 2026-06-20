/**
 * POST /api/auth/logout
 * File: src/app/api/auth/logout/route.ts
 */
import { NextRequest } from 'next/server';
import { handleApiError, json, getSession } from '@/server/api';
import { authService } from '@/modules/auth/service';
import { SESSION_COOKIE } from '@/server/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    const ip = req.headers.get('x-forwarded-for') || undefined;
    const ua = req.headers.get('user-agent') || undefined;
    await authService.logout(session, { ip, ua });
    const res = json({ ok: true });
    res.cookies.delete(SESSION_COOKIE);
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
