import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req); // hoặc requirePerm(req, 'baocao.xuat')
    // TODO: implement GET
    return json({ message: 'TODO: implement GET' });
  } catch (err) {
    return handleApiError(err);
  }
}
