import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req); // hoặc requirePerm(req, 'baocao.xuat')
    // TODO: implement POST
    return json({ message: 'TODO: implement POST' });
  } catch (err) {
    return handleApiError(err);
  }
}
