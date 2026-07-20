import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json, ValidationError } from '@/server/api';
import { audit } from '@/server/audit';
import { notify } from '@/server/notify';
import { xettuyenService } from '@/modules/xettuyen/service';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'xettuyen.chay');
    const body = await req.json();
    const { ky_tuyendung_id } = body;

    if (!ky_tuyendung_id || typeof ky_tuyendung_id !== 'number') {
      throw new ValidationError('Thiếu ky_tuyendung_id');
    }

    const preCheck = xettuyenService.preCheck(ky_tuyendung_id);
    if (!preCheck.ready) {
      throw new ValidationError(preCheck.message);
    }

    const userId = parseInt(session.sub, 10);
    const result = xettuyenService.run(ky_tuyendung_id, userId);

    audit({
      action: 'XETTUYEN_CHAY',
      userId,
      username: session.username,
      resourceType: 'ky_tuyendung',
      resourceId: ky_tuyendung_id,
      payload: result,
      result: 'SUCCESS',
    });

    const totalProcessed = result.trung_tuyen_count + result.du_phong_count + result.khong_dat_count;
    notify({
      userId,
      loai: 'XetTuyen',
      tieuDe: `Xét tuyển hoàn tất kỳ #${ky_tuyendung_id}`,
      noiDung: `Đã xử lý ${totalProcessed} hồ sơ (${result.trung_tuyen_count} trúng tuyển, ${result.du_phong_count} dự phòng, ${result.khong_dat_count} không đạt)`,
      lienKet: '/dashboard/xet-tuyen',
    });

    return json(result);
  } catch (err) {
    return handleApiError(err);
  }
}

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'xettuyen.xem');
    const kyId = Number(req.nextUrl.searchParams.get('ky_tuyendung_id'));

    if (!kyId) {
      throw new ValidationError('Thiếu ky_tuyendung_id');
    }

    const preCheck = xettuyenService.preCheck(kyId);
    const lastRun = xettuyenService.getLastRun(kyId);

    return json({ preCheck, lastRun });
  } catch (err) {
    return handleApiError(err);
  }
}
