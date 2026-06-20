/**
 * POST /api/auth/login
 * File: src/app/api/auth/login/route.ts
 */
import { NextRequest } from 'next/server';
import { handleApiError, json } from '@/server/api';
import { authService } from '@/modules/auth/service';
import { SESSION_COOKIE, sessionCookieOptions } from '@/server/auth';
import { audit } from '@/server/audit';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || undefined;
    const ua = req.headers.get('user-agent') || undefined;

    const result = await authService.login(
      { username: String(body.username || ''), password: String(body.password || '') },
      { ip, ua }
    );

    const res = json({ user: result.user, expiresAt: result.expiresAt });
    res.cookies.set(SESSION_COOKIE, result.token, sessionCookieOptions());
    return res;
  } catch (err) {
    return handleApiError(err);
  }
}
