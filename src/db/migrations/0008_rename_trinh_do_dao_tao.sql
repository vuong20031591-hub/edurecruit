-- ============================================================================
-- 0008: Rename column trinh_do_dao_tao → trinh_do_chuyen_mon
-- Lý do: file mẫu Google Form chỉ có "Trình độ văn hóa" + "Trình độ chuyên môn",
-- không có "Trình độ đào tạo". Field này lưu text "Kỹ sư phần mềm" / "Cử nhân"...
-- nên tên `trinh_do_chuyen_mon` phản ánh đúng ngữ nghĩa.
-- ============================================================================

ALTER TABLE thisinh RENAME COLUMN trinh_do_dao_tao TO trinh_do_chuyen_mon;
