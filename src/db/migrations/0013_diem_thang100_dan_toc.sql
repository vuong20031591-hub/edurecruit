-- Migration 0013: Thang điểm 100 + cột diem_dan_toc
-- Thêm cột diem_dan_toc vào diemthi
-- Xoá CHECK constraint cũ nếu có, không thay đổi dữ liệu đã tồn tại

ALTER TABLE diemthi ADD COLUMN diem_dan_toc REAL DEFAULT NULL;
