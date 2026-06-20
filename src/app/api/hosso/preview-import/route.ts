/**
 * API: POST /api/hosso/preview-import
 * Dry-run: parse + validate, KHÔNG insert.
 * Trả về danh sách rows với status (ok/warning/error) + summary để UI preview.
 *
 * Hỗ trợ 2 format: Google Form (sheet "Câu trả lời biểu mẫu 1") + DS DU THI.
 */
import { NextRequest } from 'next/server';
import { handleApiError, requirePerm, json } from '@/server/api';
import { hossoService } from '@/modules/hosso/service';
import { parseWorksheet } from '@/modules/hosso/excel-parser';
import ExcelJS from 'exceljs';

export async function POST(req: NextRequest) {
  try {
    const session = await requirePerm(req, 'hosso.create');
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const kyIdRaw = formData.get('ky_tuyendung_id');
    const kyId = Number(kyIdRaw);

    if (!file) return json({ error: 'Thiếu file' }, { status: 400 });
    if (!kyId || !Number.isFinite(kyId)) {
      return json({ error: 'Thiếu hoặc sai kỳ tuyển dụng' }, { status: 400 });
    }

    const ab = await file.arrayBuffer();
    const buffer = Buffer.from(new Uint8Array(ab));
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    let worksheet: ExcelJS.Worksheet | undefined = workbook.getWorksheet('DS DU THI');
    if (!worksheet || worksheet.actualRowCount === 0) {
      worksheet = workbook.getWorksheet('Câu trả lời biểu mẫu 1');
    }
    if (!worksheet || worksheet.actualRowCount === 0) {
      worksheet = workbook.worksheets.find((ws) => ws.actualRowCount > 0);
    }
    if (!worksheet) {
      return json({ error: 'File Excel rỗng hoặc không có sheet nào' }, { status: 400 });
    }

    const parsed = parseWorksheet(worksheet);
    if (parsed.format === 'unknown') {
      return json({
        error: parsed.warnings[0] ?? 'Không nhận diện được định dạng file',
        hint: 'Hỗ trợ: (1) Phiếu đăng ký từ Google Form, (2) DS DU THI.'
      }, { status: 400 });
    }
    if (parsed.rows.length === 0) {
      return json({ error: 'Không tìm thấy dữ liệu hồ sơ trong file' }, { status: 400 });
    }

    const result = await hossoService.previewFromExcel(
      parsed.rows as unknown as Array<Record<string, unknown>>,
      parsed.format,
      kyId,
      session
    );

    return json({
      ...result,
      totalSheetRows: parsed.totalSheetRows,
      skippedHeaderRows: parsed.skippedHeaderRows,
      parseWarnings: parsed.warnings
    });
  } catch (err) {
    return handleApiError(err);
  }
}
