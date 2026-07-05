-- @no-transaction
-- Migration 0014: bỏ CHECK constraint diem_gk1/gk2 <= 10
-- Chuyển sang thang điểm 100, validation ở app layer.

PRAGMA foreign_keys = OFF;

CREATE TABLE diemthi_new (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id          INTEGER NOT NULL UNIQUE,
  phongthi_id         INTEGER,
  diem_gk1            REAL,
  diem_gk2            REAL,
  diem_thi_giang      REAL,
  diem_dan_toc        REAL DEFAULT NULL,
  vang_thi            INTEGER NOT NULL DEFAULT 0,
  bo_thi              INTEGER NOT NULL DEFAULT 0,
  ly_do_vang          TEXT,
  trang_thai_nhap     TEXT    NOT NULL DEFAULT 'ChuaNhap'
                      CHECK (trang_thai_nhap IN ('ChuaNhap','DaNhap','DaKhoa')),
  ngay_nhap           TEXT,
  nguoi_nhap          INTEGER,
  ngay_khoa           TEXT,
  nguoi_khoa          INTEGER,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  CHECK (NOT (vang_thi = 1 AND bo_thi = 1)),
  FOREIGN KEY (thisinh_id)  REFERENCES thisinh(id)  ON DELETE CASCADE,
  FOREIGN KEY (phongthi_id) REFERENCES phongthi(id) ON DELETE SET NULL,
  FOREIGN KEY (nguoi_nhap)  REFERENCES users(id),
  FOREIGN KEY (nguoi_khoa)  REFERENCES users(id)
);

INSERT INTO diemthi_new
  (id, thisinh_id, phongthi_id, diem_gk1, diem_gk2, diem_thi_giang, diem_dan_toc,
   vang_thi, bo_thi, ly_do_vang, trang_thai_nhap,
   ngay_nhap, nguoi_nhap, ngay_khoa, nguoi_khoa, created_at, updated_at)
SELECT
  id, thisinh_id, phongthi_id, diem_gk1, diem_gk2, diem_thi_giang, diem_dan_toc,
  vang_thi, bo_thi, ly_do_vang, trang_thai_nhap,
  ngay_nhap, nguoi_nhap, ngay_khoa, nguoi_khoa, created_at, updated_at
FROM diemthi;

DROP TABLE diemthi;
ALTER TABLE diemthi_new RENAME TO diemthi;

CREATE INDEX IF NOT EXISTS idx_diemthi_phongthi   ON diemthi(phongthi_id);
CREATE INDEX IF NOT EXISTS idx_diemthi_trang_thai ON diemthi(trang_thai_nhap);

PRAGMA foreign_keys = ON;
