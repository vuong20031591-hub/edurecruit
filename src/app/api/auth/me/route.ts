/**
 * GET /api/auth/me
 * File: src/app/api/auth/me/route.ts
 */
import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, json } from '@/server/api';
import { authService } from '@/modules/auth/service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth(req);
    const user = authService.getMe(Number(session.sub));
    if (!user) return json({ error: 'User không tồn tại' }, { status: 404 });
    return json({ ...user, session: { exp: session.exp } });
  } catch (err) {
    return handleApiError(err);
  }
}
