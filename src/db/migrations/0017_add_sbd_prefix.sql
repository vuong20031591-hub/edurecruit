-- Migration 0017: Thêm cột sbd_prefix vào vitri_tuyendung
-- Format SBD mới: "{sbd_prefix}.{seq:03d}"  VD: 05.001, 08.042
-- prefix là 2 chữ số, duy nhất trong 1 kỳ tuyển dụng

ALTER TABLE vitri_tuyendung ADD COLUMN sbd_prefix TEXT DEFAULT NULL;

-- Unique: 2 vị trí trong cùng kỳ không được dùng chung prefix
CREATE UNIQUE INDEX idx_vitri_sbd_prefix
  ON vitri_tuyendung(ky_tuyendung_id, sbd_prefix)
  WHERE sbd_prefix IS NOT NULL;
