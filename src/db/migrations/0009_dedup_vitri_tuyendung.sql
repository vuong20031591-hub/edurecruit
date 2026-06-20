-- Migration 0009: De-dup vitri_tuyendung (mon+cap_hoc trong cùng kỳ) + UNIQUE constraint
-- Fix dropdown PhongThiFormModal hiển thị options trùng do DB có nhiều rows
-- cùng (ky_tuyendung_id, mon, cap_hoc, loai_vi_tri) với ma_vi_tri khác nhau.

-- Bước 1: Xóa duplicate rows. Giữ row có id nhỏ hơn (record gốc).
-- 4 cặp duplicate trong kỳ 4:
--   Hóa học-THCS:    id=23 (giữ) | id=31 (xóa, ma=GV_HOA_HOC_THCS)
--   Ngữ văn-THCS:    id=20 (giữ) | id=25 (xóa, ma=GV_NGU_VAN_THCS)
--   Tiếng Anh-THPT:  id=21 (giữ) | id=40 (xóa, ma=GV_TIENG_ANH_THPT)
--   Vật lý-THPT:     id=22 (giữ) | id=26 (xóa, ma=GV_VAT_LY_THPT)
-- Đã verify: không có thisinh/vitri_donvi/phongthi nào tham chiếu id 25, 26, 31, 40.

DELETE FROM vitri_tuyendung WHERE id IN (25, 26, 31, 40);

-- Bước 2: Thêm UNIQUE constraint để prevent duplicate trong tương lai.
-- Bao gồm loai_vi_tri vì một (mon, cap_hoc) có thể có 2 loại vị trí
-- khác nhau (GiaoVien vs QuanLy) — đó là hợp lệ.

CREATE UNIQUE INDEX uq_vitri_ky_mon_cap_loai
  ON vitri_tuyendung (ky_tuyendung_id, mon, cap_hoc, loai_vi_tri);
