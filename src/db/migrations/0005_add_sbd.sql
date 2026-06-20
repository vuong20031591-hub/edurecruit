-- Migration 0005: Thêm cột sbd (Số báo danh) vào bảng thisinh
-- PRD Bước 4: SBD tự sinh theo thứ tự ABC tên trong cùng vị trí
-- Format: {MA_VI_TRI}-{SEQ:04d}  VD: TOAN-TH-0001, VAN-THCS-0042
-- SBD được sinh ra khi thisinh có trang_thai_ho_so = 'HopLe'

ALTER TABLE thisinh ADD COLUMN sbd TEXT DEFAULT NULL;

-- Index unique (partial, cho phép NULL khi chưa sinh)
CREATE UNIQUE INDEX idx_thisinh_sbd
  ON thisinh(sbd)
  WHERE sbd IS NOT NULL;
