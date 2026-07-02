-- ============================================================================
-- 0009: Bảng ra_soat_ket_qua — lưu kết quả rà soát tự động Bước 2
-- Mục đích: khi user bấm "Rà soát tự động", hệ thống check rules + lưu kết quả
-- (trạng thái: Dat/CanhBao/KhongDat, điểm 0-100, lý do JSON) cho từng thí sinh.
-- User vẫn duyệt cuối cùng (chuyển trạng thái ChoRaSoat → HopLe/KhongDuDieuKien)
-- theo nghiệp vụ Hội đồng thi (mức Bán tự động).
-- ============================================================================

CREATE TABLE ra_soat_ket_qua (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id      INTEGER NOT NULL,
  ky_tuyendung_id INTEGER NOT NULL,                  -- denormalize để query nhanh
  trang_thai      TEXT    NOT NULL
                  CHECK (trang_thai IN ('Dat','CanhBao','KhongDat')),
  diem_uu_tien    INTEGER NOT NULL DEFAULT 0,         -- 0-100
  ly_do           TEXT    NOT NULL,                   -- JSON array các vấn đề: [{code, message, severity}]
  ngay_ra_soat    TEXT    NOT NULL DEFAULT (datetime('now')),
  nguoi_ra_soat   INTEGER,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (thisinh_id)      REFERENCES thisinh(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_ra_soat)   REFERENCES users(id)
);

-- Index cho query: lấy kết quả mới nhất của 1 thí sinh trong kỳ
CREATE INDEX idx_ra_soat_ts_ngay
  ON ra_soat_ket_qua(thisinh_id, ngay_ra_soat DESC);

-- Index cho query: lọc theo trạng thái trong 1 kỳ (vd "tất cả hồ sơ CanhBao trong kỳ 2026")
CREATE INDEX idx_ra_soat_ky_status
  ON ra_soat_ket_qua(ky_tuyendung_id, trang_thai, diem_uu_tien);
