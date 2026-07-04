-- Migration 0011: thêm cột số chỉ tiêu tuyển dụng cho đơn vị
ALTER TABLE don_vi_tuyen_dung ADD COLUMN so_chi_tieu INTEGER NOT NULL DEFAULT 0;
