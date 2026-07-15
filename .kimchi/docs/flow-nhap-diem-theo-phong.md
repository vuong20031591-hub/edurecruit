# Flow nhập điểm theo phòng thi

## Tổng quan
- Chọn **kỳ tuyển dụng** (topbar) → **vị trí (môn + cấp)** → **phòng thi** → nhập điểm.
- Điểm ưu tiên **tự điền** từ hồ sơ đăng ký (`thisinh.doi_tuong_uu_tien`).
- Modal **Tổng hợp hoàn tất** kiểm tra toàn kỳ; nút **Xét duyệt kết quả** chỉ bật khi mọi phòng đã khóa.

## Files đã sửa / thêm

### Backend (mới)
- `src/modules/diemthi/uu-tien.ts` — Helper tính điểm ưu tiên, đọc mapping từ `system_config` (key `diemthi.uu_tien.mapping`), fallback mặc định nếu chưa cấu hình.
- `src/db/migrations/0018_diem_uu_tien_mapping.sql` — Seed mapping mặc định vào `system_config` (7.5/5/2.5/1.5, lấy cao nhất).
- `src/app/api/diemthi/uu-tien/prefill/route.ts` — `POST` body `{phongthi_id}`, tự điền `diem_uu_tien` cho thí sinh trong phòng chưa có.

### Backend (sửa)
- `src/modules/diemthi/types.ts` — Thêm `doi_tuong_uu_tien` vào `DiemThiView`; thêm `DiemThiCompletionSummary`, `PhongThiCompletion`.
- `src/modules/diemthi/repository.ts` — `list` join thêm `t.doi_tuong_uu_tien`; thêm `getCompletionSummaryByKy`, `listMissingUuTien`, `upsertKetquaUuTien`.
- `src/modules/diemthi/service.ts` — `prefillUuTienForPhong`, `getCompletionSummary`.
- `src/app/api/diemthi/route.ts` — `GET ?completion=true` trả tổng hợp.
- `src/server/audit.ts` — Thêm `PREFILL_DIEM_UU_TIEN` vào `AuditAction`.

### UI
- `src/app/dashboard/nhap-diem/page.tsx` — Rewrite:
  - Dropdown **Môn thi** (vị trí) → dropdown **Phòng thi** (lọc theo vị trí).
  - Khi chọn phòng: tự gọi prefill, refresh list/stats.
  - Input **Điểm ưu tiên** chuyển từ `defaultValue` → `value` (đồng bộ khi prefill).
  - Thêm checkbox **Bỏ thi** (song song Vắng thi).
  - Nút **Tổng hợp hoàn tất** → modal bảng theo phòng + tổng + nút **Xét duyệt kết quả** (chỉ bật khi mọi phòng `tong>0 && tong===daKhoa`).

## Quy tắc nghiệp vụ đã xác nhận
- **"Theo trường"** = nhóm theo `don_vi_du_tuyen_id` (đơn vị tuyển dụng). `xettuyenService.run` đã nhóm đúng.
- **"Theo môn"** = lọc theo `vitri_tuyendung` (môn + cấp học).
- **Điểm ưu tiên** vẫn cho admin sửa tay; mặc định lấy từ mapping keyword × `doi_tuong_uu_tien`.

## Công thức điểm tổng
- `ketqua.diem_tong` = `diem_thi_giang + diem_uu_tien + diem_dan_toc` (đã áp dụng trong cả `upsertKetquaUuTien` và PUT route khi sync `diem_dan_toc`).
- Nếu muốn bỏ `diem_dan_toc` khỏi tổng, sửa `repository.ts:upsertKetquaUuTien` và `route.ts` PUT sync block.

## Verify
- `npx tsc --noEmit` ✅
- `npm run build` ✅ (nếu gặp lỗi prerender cache cũ, xóa `.next` rồi build lại)
- `npx vitest run tests/unit/uu-tien.test.ts` ✅ (16/16 pass)
- `npx vitest run` hoặc `npm test` — chạy toàn bộ unit test
- `npx playwright test` — chạy e2e (yêu cầu dev server đang chạy)

## Test tự động đã thêm

### Unit tests
- **File**: `tests/unit/uu-tien.test.ts`
- **Đối tượng**: `computeDiemUuTien`, `getUuTienMapping`
- **Phạm vi**:
  - Không có đối tượng ưu tiên → 0
  - Không khớp keyword → 0
  - Các mức điểm: 7.5, 5, 2.5, 1.5
  - Lấy điểm cao nhất khi thuộc nhiều diện
  - Không phân biệt hoa/thường, gom khoảng trắng dư thừa
  - Đọc mapping từ `system_config`
  - Fallback về default khi JSON lỗi / rules rỗng

### E2E tests
- **File**: `tests/e2e/F_nhapdiem.spec.js` (mở rộng)
- **Test cases mới**:
  - `F13`: `POST /api/diemthi/uu-tien/prefill` tự điền điểm ưu tiên từ hồ sơ
  - `F14`: `GET /api/diemthi?completion=true` trả đúng cấu trúc
  - `F15`: UI — dropdown Môn thi enable dropdown Phòng thi

### Test config
- **File mới**: `vitest.config.ts` — alias paths cho `@/*`, `@db/*`, `@modules/*`, `@shared/*`, `@server/*` để unit tests import được như source code.

---

## Hướng dẫn test thủ công trên giao diện

### 0. Chuẩn bị
1. `npm run dev` → mở `http://localhost:3000`, đăng nhập bằng tài khoản **ADMIN** hoặc **TO_NHAP_DIEM**.
2. Đảm bảo đang ở **đúng kỳ tuyển dụng** (chọn ở TopBar) — kỳ đã có:
   - Vị trí tuyển dụng + chỉ tiêu đơn vị.
   - Phòng thi đã được tạo (`/dashboard/phong-thi`).
   - Hồ sơ đã được xếp phòng (`Bước 4`).
3. Một số thí sinh nên có `doi_tuong_uu_tien` khác nhau trong DB để kiểm thử prefill (ví dụ: “con liệt sĩ”, “dân tộc thiểu số”, hoặc để trống).

### 1. Chọn Môn → Phòng
- Vào `/dashboard/nhap-diem`.
- **Môn thi** hiển thị danh sách vị trí (môn + cấp) của kỳ hiện tại.
- Chọn 1 vị trí → **Phòng thi** chỉ hiện các phòng thuộc vị trí đó.
- Nếu chưa chọn môn: dropdown phòng bị disable, có placeholder “Chọn môn trước”.

### 2. Prefill điểm ưu tiên
- Chọn 1 phòng → hệ thống tự gọi `POST /api/diemthi/uu-tien/prefill`.
- Toast xuất hiện nếu có thí sinh vừa được điền (`Đã tự điền điểm ưu tiên cho N thí sinh`).
- Quan sát cột **Điểm ưu tiên**: các dòng có `doi_tuong_uu_tien` khớp keyword sẽ có giá trị (7.5 / 5 / 2.5 / 1.5 / 0).
- Dòng để trống đối tượng → cột để trống, admin có thể gõ tay.

### 3. Nhập điểm
- Gõ **GK1** hoặc **GK2** (0–100, bước 0.5) → sau ~800ms hệ thống tự lưu; badge chuyển sang **Đã nhập**.
- Cột **ĐTB** tự tính `(GK1+GK2)/2` làm tròn 2 chữ số.
- Nếu `|GK1-GK2| > 15` → toast cảnh báo (chênh lệch bất thường).

### 4. Vắng / Bỏ thi
- Tick **Vắng** → dòng chuyển nền cam, badge **Vắng**. Tick **Bỏ** tương tự (nền đỏ).
- Tick 1 cái sẽ tự bỏ cái còn lại (DB CHECK constraint).
- Sau khi tick, dòng đếm vào **vắng / bỏ** trong stats phòng.

### 5. Khóa điểm phòng
- Khi **tất cả thí sinh trong phòng** đã được nhập điểm HOẶC đánh dấu vắng/bỏ (không còn `ChuaNhap`), nút **Khóa điểm** chuyển sang trạng thái enable.
- Bấm **Khóa điểm** → confirm → toast `Đã khóa X điểm`. Badge trên mỗi dòng chuyển **Đã khóa** (xám).
- Sau khi khóa: input bị disabled, không sửa được nữa.

### 6. Tổng hợp hoàn tất
- Bấm **Tổng hợp hoàn tất** (góc phải toolbar) → modal mở.
- 6 ô tổng: Tổng TS / Đã nhập / Đã khóa / Chưa nhập / **Vắng thi** / **Bỏ thi**.
- Bảng chi tiết từng phòng: tổng/đã nhập/đã khóa/chưa nhập/vắng/bỏ + cột trạng thái (`Hoàn tất` xanh / `Còn N chưa nhập` vàng).
- Thông báo dưới bảng:
  - **Xanh** “Tất cả phòng đã hoàn tất — có thể chạy xét duyệt” → nút **Xét duyệt kết quả** enable.
  - **Vàng** “Còn phòng chưa hoàn tất…” → nút disabled.

### 7. Xét duyệt
- Khi mọi phòng đã khóa → bấm **Xét duyệt kết quả** → gọi `POST /api/xettuyen`.
- Backend `preCheck` kiểm tra thêm lần nữa; nếu OK, chạy thuật toán.
- Toast `Đã xét duyệt: X trúng tuyển, Y dự phòng, Z không đạt`.
- Sau khi xét duyệt: vào `/dashboard/xet-tuyen` để xem bảng kết quả (nhóm theo vị trí + đơn vị, sắp xếp theo điểm tổng giảm dần).

### 8. Điểm cần kiểm tra kỹ
- **Phòng trống** (chưa xếp thí sinh nào): `tong = 0`. Trong modal tổng hợp, dòng đó hiện `—` và **không tính là hoàn tất** → nút xét duyệt vẫn disabled. Đây là bảo vệ tránh chạy xét tuyển khi còn phòng chưa xếp.
- **Thay đổi vị trí**: chọn lại môn khác → danh sách phòng reset, dữ liệu điểm của môn trước vẫn nằm trong DB, không bị mất.
- **Điểm ưu tiên = 0** sau prefill: có thể do `doi_tuong_uu_tien` không khớp keyword nào. Admin có thể tick tay.
- **Đổi từ Vắng ↔ Bỏ**: chỉ 1 trong 2 được tick tại 1 thời điểm (DB CHECK).
