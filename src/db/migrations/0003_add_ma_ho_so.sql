-- Migration 0003: Thêm cột ma_ho_so vào bảng thisinh
-- Format: TDVC-YYYY-NNNNN (YYYY = năm kỳ, NNNNN = số thứ tự trong kỳ)

-- Thêm cột ma_ho_so (nullable ban đầu để backfill dữ liệu cũ)
ALTER TABLE thisinh ADD COLUMN ma_ho_so TEXT;

-- Tạo index unique (cho phép NULL để tránh conflict khi backfill)
CREATE UNIQUE INDEX idx_thisinh_ma_ho_so
  ON thisinh(ma_ho_so)
  WHERE ma_ho_so IS NOT NULL;

-- Trigger tự sinh ma_ho_so khi INSERT (nếu chưa cung cấp)
-- Format: TDVC-{nam_ky}-{id padded 5 chữ số}
CREATE TRIGGER trg_thisinh_gen_ma_ho_so
AFTER INSERT ON thisinh
WHEN NEW.ma_ho_so IS NULL
BEGIN
  UPDATE thisinh
  SET ma_ho_so = (
    SELECT 'TDVC-' || CAST(k.nam AS TEXT) || '-' ||
           printf('%05d', NEW.id)
    FROM ky_tuyendung k
    WHERE k.id = NEW.ky_tuyendung_id
  )
  WHERE id = NEW.id;
END;
