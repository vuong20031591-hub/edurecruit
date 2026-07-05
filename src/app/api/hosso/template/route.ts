/**
 * GET /api/hosso/template — Tải file Excel mẫu để nhập hồ sơ thí sinh
 */
import { NextRequest, NextResponse } from 'next/server';
import { handleApiError, requirePerm } from '@/server/api';
import ExcelJS from 'exceljs';

// Headers khớp chính xác với excel-parser.ts parseGoogleForm() get() calls
const COLUMNS = [
  { header: 'Dấu thời gian', key: 'ngay_nop_phieu', width: 22 },
  { header: 'Địa chỉ email', key: 'email', width: 28 },
  { header: 'Họ và tên:', key: 'ho_ten', width: 24 },
  { header: 'Ngày, tháng, năm sinh:', key: 'ngay_sinh', width: 20 },
  { header: 'Giới tính:', key: 'gioi_tinh', width: 12 },
  { header: 'Dân tộc:', key: 'dan_toc', width: 14 },
  { header: 'Tôn giáo:', key: 'ton_giao', width: 14 },
  { header: 'Tình trạng sức khỏe:', key: 'suc_khoe', width: 20 },
  { header: 'Chiều cao:', key: 'chieu_cao', width: 12 },
  { header: 'Cân nặng:', key: 'can_nang', width: 12 },
  { header: 'Số CMND hoặc Thẻ căn cước công dân:', key: 'cccd', width: 38 },
  { header: 'Ngày cấp:', key: 'ngay_cap_cccd', width: 16 },
  { header: 'Nơi cấp:', key: 'noi_cap_cccd', width: 20 },
  { header: 'Số điện thoại di động:', key: 'dien_thoai', width: 20 },
  { header: 'Quê quán:', key: 'ho_khau_thuong_tru', width: 30 },
  { header: 'Chỗ ở hiện nay (để báo tin):', key: 'cho_o_hien_nay', width: 32 },
  { header: 'Trình độ văn hóa:', key: 'trinh_do_van_hoa', width: 20 },
  { header: 'Trình độ chuyên môn:', key: 'trinh_do_chuyen_mon', width: 22 },
  { header: 'Tên trường/cơ sở đào tạo cấp - Mục 1', key: 'ten_truong_dao_tao', width: 36 },
  { header: 'Ngày cấp văn bằng/chứng chỉ - Mục 1', key: 'ngay_cap_van_bang', width: 28 },
  { header: 'Số hiệu văn bằng/chứng chỉ - Mục 1', key: 'so_hieu_van_bang', width: 26 },
  { header: 'Chuyên ngành đào tạo - Mục 1', key: 'chuyen_nganh', width: 28 },
  { header: 'Hình thức đào tạo - Mục 1', key: 'hinh_thuc_dao_tao', width: 22 },
  { header: 'Ngành đào tạo - Mục 1', key: 'nganh_dao_tao', width: 24 },
  { header: 'Xếp loại bằng/chứng chỉ - Mục 1', key: 'xep_loai_bang', width: 24 },
  { header: 'Tên trường/cơ sở đào tạo cấp - Mục 2', key: 'vb_2_ten_truong', width: 36 },
  { header: 'Ngày cấp văn bằng/chứng chỉ - Mục 2', key: 'vb_2_ngay_cap', width: 28 },
  { header: 'Trình độ văn bằng/chứng chỉ - Mục 2', key: 'vb_2_trinh_do', width: 28 },
  { header: 'Số hiệu văn bằng/chứng chỉ - Mục 2', key: 'vb_2_so_hieu', width: 26 },
  { header: 'Chuyên ngành đào tạo - Mục 2', key: 'vb_2_chuyen_nganh', width: 28 },
  { header: 'Hình thức đào tạo - Mục 2', key: 'vb_2_hinh_thuc', width: 22 },
  { header: 'Ngành đào tạo - Mục 2', key: 'vb_2_nganh', width: 24 },
  { header: 'Xếp loại bằng/chứng chỉ - Mục 2', key: 'vb_2_xep_loai', width: 24 },
  { header: 'Từ ngày - Quá trình công tác 1', key: 'qtc_1_tu_ngay', width: 20 },
  { header: 'Đến ngày - Quá trình công tác 1', key: 'qtc_1_den_ngay', width: 20 },
  { header: 'Cơ quan, tổ chức, đơn vị công tác - Mục 1', key: 'qtc_1_co_quan', width: 38 },
  { header: 'Từ ngày - Quá trình công tác 2', key: 'qtc_2_tu_ngay', width: 20 },
  { header: 'Đến ngày - Quá trình công tác 2', key: 'qtc_2_den_ngay', width: 20 },
  { header: 'Cơ quan, tổ chức, đơn vị công tác - Mục 2', key: 'qtc_2_co_quan', width: 38 },
  { header: 'Mối quan hệ - Người thân 1:', key: 'nt_1_moi_quan_he', width: 22 },
  { header: 'Họ và tên - Người thân 1:', key: 'nt_1_ho_ten', width: 24 },
  { header: 'Ngày, tháng, năm sinh - Người thân 1:', key: 'nt_1_ngay_sinh', width: 28 },
  { header: 'Quê quán, nghề nghiệp, chức danh, chức vụ, đơn vị công tác/học tập, nơi ở, tổ chức chính trị - xã hội - Người thân 1:', key: 'nt_1_thong_tin', width: 50 },
  { header: 'Mối quan hệ - Người thân 2:', key: 'nt_2_moi_quan_he', width: 22 },
  { header: 'Họ và tên - Người thân 2:', key: 'nt_2_ho_ten', width: 24 },
  { header: 'Ngày, tháng, năm sinh - Người thân 2:', key: 'nt_2_ngay_sinh', width: 28 },
  { header: 'Quê quán, nghề nghiệp, chức danh, chức vụ, đơn vị công tác/học tập, nơi ở, tổ chức chính trị - xã hội - Người thân 2:', key: 'nt_2_thong_tin', width: 50 },
  { header: 'Mối quan hệ - Người thân 3:', key: 'nt_3_moi_quan_he', width: 22 },
  { header: 'Họ và tên - Người thân 3:', key: 'nt_3_ho_ten', width: 24 },
  { header: 'Ngày, tháng, năm sinh - Người thân 3:', key: 'nt_3_ngay_sinh', width: 28 },
  { header: 'Quê quán, nghề nghiệp, chức danh, chức vụ, đơn vị công tác/học tập, nơi ở, tổ chức chính trị - xã hội - Người thân 3:', key: 'nt_3_thong_tin', width: 50 },
  { header: 'Vị trí việc làm dự tuyển', key: 'vi_tri_ten', width: 32 },
  { header: 'Đơn vị dự tuyển', key: 'ten_don_vi', width: 30 },
  { header: 'Có đăng ký nguyện vọng 2 không?', key: 'co_dang_ky_nv2', width: 26 },
  { header: 'Vị trí việc làm dự tuyển 2', key: 'vi_tri_ten_2', width: 32 },
  { header: 'Đơn vị dự tuyển 2', key: 'ten_don_vi_2', width: 30 },
  { header: 'Đăng ký dự thi ngoại ngữ', key: 'ngoai_ngu', width: 24 },
  { header: 'Ngoại ngữ khác theo yêu cầu vị trí việc làm', key: 'ngoai_ngu_khac', width: 36 },
  { header: 'Miễn thi ngoại ngữ do (nếu có)', key: 'mien_thi_nn', width: 28 },
  { header: 'Đối tượng ưu tiên (nếu có)', key: 'doi_tuong_uu_tien', width: 28 },
  { header: 'Tôi cam đoan thông tin cung cấp trong phiếu đăng ký dự tuyển là đúng sự thật và chịu trách nhiệm trước pháp luật', key: 'cam_doan_thong_tin', width: 50 },
];

export async function GET(req: NextRequest) {
  try {
    await requirePerm(req, 'hosso.view');

    const wb = new ExcelJS.Workbook();
    wb.creator = 'EduRecruit';
    const ws = wb.addWorksheet('Câu trả lời biểu mẫu 1');

    ws.columns = COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));

    // Style header row
    const headerRow = ws.getRow(1);
    headerRow.height = 32;
    headerRow.eachCell((cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } };
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = {
        bottom: { style: 'thin', color: { argb: 'FF93C5FD' } },
      };
    });

    // 1 dòng mẫu để người dùng hiểu định dạng
    ws.addRow({
      ngay_nop_phieu: '2026/07/01 8:00:00',
      email: 'thisinh@gmail.com',
      ho_ten: 'Nguyễn Văn A',
      ngay_sinh: '15/03/1995',
      gioi_tinh: 'Nam',
      dan_toc: 'Kinh',
      cccd: '079095012345',
      ngay_cap_cccd: '01/01/2020',
      noi_cap_cccd: 'Cục CS QLHC về TTXH',
      dien_thoai: '0912345678',
      ho_khau_thuong_tru: 'Tỉnh Khánh Hòa',
      trinh_do_chuyen_mon: 'Cử nhân',
      ten_truong_dao_tao: 'Trường ĐH Sư phạm Hà Nội',
      ngay_cap_van_bang: '01/07/2018',
      chuyen_nganh: 'Sư phạm Toán',
      nganh_dao_tao: 'Sư phạm Toán học',
      hinh_thuc_dao_tao: 'Chính quy',
      xep_loai_bang: 'Khá',
      vi_tri_ten: 'Giáo viên Toán THPT',
      ten_don_vi: 'THPT Nguyễn Trãi',
      co_dang_ky_nv2: 'Không',
      doi_tuong_uu_tien: 'Không',
      cam_doan_thong_tin: 'Tôi xác nhận',
    });

    // Style data row
    const dataRow = ws.getRow(2);
    dataRow.eachCell({ includeEmpty: false }, (cell) => {
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF0F9FF' } };
      cell.font = { size: 10, italic: true, color: { argb: 'FF64748B' } };
      cell.alignment = { vertical: 'middle' };
    });

    ws.views = [{ state: 'frozen', ySplit: 1 }];

    const buffer = await wb.xlsx.writeBuffer();

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="mau_import_ho_so.xlsx"',
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
