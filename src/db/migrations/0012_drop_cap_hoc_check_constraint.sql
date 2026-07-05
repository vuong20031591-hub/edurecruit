-- @no-transaction
-- Migration 0012: bỏ CHECK constraint trên vitri_tuyendung.cap_hoc
-- để cho phép cấp học liên cấp mới (THCS&THPT, TH&THCS).
-- Validation được thực hiện ở app layer (src/shared/lib/validation.ts + whitelist trong services).
--
-- Lưu ý:
--   - Bảng thật tên là `vitri_tuyendung` (không có underscore giữa "vi" và "tri").
--   - `don_vi_tuyen_dung` đã không còn CHECK (migration 0011 đã recreate mất).
--   - SQL này chạy NGOÀI transaction (PRAGMA foreign_keys không có tác dụng trong transaction).

PRAGMA foreign_keys = OFF;

CREATE TABLE vitri_tuyendung_new (
  id                       INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id          INTEGER NOT NULL,
  ma_vi_tri                TEXT    NOT NULL,
  mon                      TEXT    NOT NULL,
  cap_hoc                  TEXT    NOT NULL,
  loai_vi_tri              TEXT    NOT NULL DEFAULT 'GiaoVien',
  so_luong                 INTEGER NOT NULL DEFAULT 0,
  hinh_thuc_thi            TEXT    NOT NULL DEFAULT 'Viet',
  diem_chuan               REAL,
  ghi_chu                  TEXT,
  created_at               TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at               TEXT    NOT NULL DEFAULT (datetime('now')),
  thu_tu_uu_tien_dong_diem TEXT    DEFAULT NULL,
  UNIQUE (ky_tuyendung_id, ma_vi_tri),
  FOREIGN KEY (ky_tuyendung_id) REFERENCES ky_tuyendung(id) ON DELETE CASCADE
);

INSERT INTO vitri_tuyendung_new (
  id, ky_tuyendung_id, ma_vi_tri, mon, cap_hoc,
  loai_vi_tri, so_luong, hinh_thuc_thi, diem_chuan, ghi_chu,
  created_at, updated_at, thu_tu_uu_tien_dong_diem
)
SELECT
  id, ky_tuyendung_id, ma_vi_tri, mon, cap_hoc,
  loai_vi_tri, so_luong, hinh_thuc_thi, diem_chuan, ghi_chu,
  created_at, updated_at, thu_tu_uu_tien_dong_diem
FROM vitri_tuyendung;

DROP TABLE vitri_tuyendung;
ALTER TABLE vitri_tuyendung_new RENAME TO vitri_tuyendung;

CREATE INDEX IF NOT EXISTS idx_vitri_ky ON vitri_tuyendung(ky_tuyendung_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_vitri_ky_mon_cap_loai
  ON vitri_tuyendung (ky_tuyendung_id, mon, cap_hoc, loai_vi_tri);

PRAGMA foreign_keys = ON;
