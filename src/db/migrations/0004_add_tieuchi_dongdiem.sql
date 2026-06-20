-- Migration 0004: Thêm cấu hình tiêu chí xử lý đồng điểm cho vị trí tuyển dụng
-- Theo PRD §Bước 7: "Cho phép thiết lập thứ tự ưu tiên xử lý khi có hai hoặc nhiều thí sinh bằng điểm"
-- Thiết kế: JSON array các tiêu chí, ví dụ:
--   ["diem_thi_giang", "doi_tuong_uu_tien", "ngay_nop_ho_so"]
-- Mặc định: NULL = dùng thứ tự mặc định (diem_thi_giang DESC, ngay_nop_ho_so ASC)

ALTER TABLE vitri_tuyendung
  ADD COLUMN thu_tu_uu_tien_dong_diem TEXT DEFAULT NULL;
  -- NULL = dùng thứ tự mặc định: diem_thi_giang DESC → doi_tuong_uu_tien → ngay_nop_ho_so ASC
  -- Khi có giá trị: JSON array các field name theo thứ tự ưu tiên

-- Cập nhật comment vào open-questions (tracked via migration)
-- Confirmed by "Anh Vũ" 18/06/2026: không fix cứng, để configurable khi thực tế phát sinh
