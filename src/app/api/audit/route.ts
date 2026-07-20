export const dynamic = 'force-dynamic';

import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { getAuditLog, countAuditLog } from '@/server/audit';

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'audit.xem');
    const sp = req.nextUrl.searchParams;
    const limit = Math.min(parseInt(sp.get('limit') ?? '20', 10), 100);
    const offset = parseInt(sp.get('offset') ?? '0', 10);
    const action = sp.get('action') ?? undefined;
    const from = sp.get('from') ?? undefined;
    const to = sp.get('to') ?? undefined;

    const data = getAuditLog({ action, from, to, limit, offset });
    const total = countAuditLog({ action, from, to });
    return json({ data, total });
  } catch (err) {
    return handleApiError(err);
  }
}
