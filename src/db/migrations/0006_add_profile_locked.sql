-- Migration 0006: Thêm cột is_profile_locked vào bảng thisinh
-- PRD Bước 2: Lãnh đạo/Admin khóa hồ sơ trước khi đánh SBD & phân phòng (Bước 4)
-- 0 = chưa khóa, 1 = đã khóa

ALTER TABLE thisinh ADD COLUMN is_profile_locked INTEGER NOT NULL DEFAULT 0;
ALTER TABLE thisinh ADD COLUMN locked_at TEXT DEFAULT NULL;
ALTER TABLE thisinh ADD COLUMN locked_by INTEGER DEFAULT NULL REFERENCES users(id);

CREATE INDEX idx_thisinh_locked ON thisinh(is_profile_locked);
