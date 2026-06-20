import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req); // hoặc requirePerm(req, 'quyetdinh.view')
    // TODO: implement GET
    return json({ message: 'TODO: implement GET' });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAuth(req); // hoặc requirePerm(req, 'quyetdinh.view')
    // TODO: implement POST
    return json({ message: 'TODO: implement POST' });
  } catch (err) {
    return handleApiError(err);
  }
}
