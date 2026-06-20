import { NextRequest } from 'next/server';
import { handleApiError, requireAuth, requirePerm, json } from '@/server/api';

export async function GET(req: NextRequest) {
  try {
    await requireAuth(req); // hoặc requirePerm(req, 'quyetdinh.update')
    // TODO: implement GET
    return json({ message: 'TODO: implement GET' });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAuth(req); // hoặc requirePerm(req, 'quyetdinh.update')
    // TODO: implement PUT
    return json({ message: 'TODO: implement PUT' });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await requireAuth(req); // hoặc requirePerm(req, 'quyetdinh.update')
    // TODO: implement DELETE
    return json({ message: 'TODO: implement DELETE' });
  } catch (err) {
    return handleApiError(err);
  }
}
