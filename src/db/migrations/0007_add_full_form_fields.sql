-- ============================================================================
-- 0007: Mở rộng thisinh + tạo bảng phụ 1-N khớp với file mẫu Google Form
-- Phiếu đăng ký dự tuyển (Câu trả lời).xlsx
-- ============================================================================

-- ============================================================================
-- 1. Thêm cột flat vào THISINH
-- ============================================================================

ALTER TABLE thisinh ADD COLUMN ngay_nop_phieu          TEXT;                  -- Dấu thời gian từ Google Form (ISO 8601)
ALTER TABLE thisinh ADD COLUMN ton_giao                TEXT;                  -- Tôn giáo
ALTER TABLE thisinh ADD COLUMN suc_khoe                TEXT;                  -- Tình trạng sức khỏe (Tốt, Trung bình, ...)
ALTER TABLE thisinh ADD COLUMN chieu_cao               TEXT;                  -- đơn vị: cm
ALTER TABLE thisinh ADD COLUMN can_nang                TEXT;                  -- đơn vị: kg
ALTER TABLE thisinh ADD COLUMN cho_o_hien_nay          TEXT;                  -- Chỗ ở hiện nay (để báo tin)
ALTER TABLE thisinh ADD COLUMN trinh_do_van_hoa        TEXT;                  -- Trình độ văn hóa (12/12, 12/11, ...)
ALTER TABLE thisinh ADD COLUMN so_hieu_van_bang        TEXT;                  -- Số hiệu văn bằng/chứng chỉ (mục 1)
ALTER TABLE thisinh ADD COLUMN hinh_thuc_dao_tao       TEXT;                  -- Hình thức đào tạo (mục 1)
ALTER TABLE thisinh ADD COLUMN nganh_dao_tao           TEXT;                  -- Ngành đào tạo (mục 1)
ALTER TABLE thisinh ADD COLUMN ngay_cap_van_bang       TEXT;                  -- Ngày cấp văn bằng (mục 1) - ISO 8601
ALTER TABLE thisinh ADD COLUMN ngoai_ngu              TEXT;                  -- Đăng ký dự thi ngoại ngữ
ALTER TABLE thisinh ADD COLUMN ngoai_ngu_khac          TEXT;                  -- Ngoại ngữ khác theo yêu cầu vị trí
ALTER TABLE thisinh ADD COLUMN mien_thi_nn             TEXT;                  -- Miễn thi ngoại ngữ do
ALTER TABLE thisinh ADD COLUMN cam_doan_thong_tin     TEXT;                  -- Xác nhận cam đoan

-- Nguyện vọng 2
ALTER TABLE thisinh ADD COLUMN co_dang_ky_nv2          INTEGER NOT NULL DEFAULT 0;  -- 0/1
ALTER TABLE thisinh ADD COLUMN vi_tri_dang_ky_id_2     INTEGER REFERENCES vitri_tuyendung(id);
ALTER TABLE thisinh ADD COLUMN don_vi_du_tuyen_id_2    INTEGER REFERENCES don_vi_tuyen_dung(id);

-- ============================================================================
-- 2. Bảng phụ 1-N: Người thân (3 người × 4 field)
-- ============================================================================
CREATE TABLE thisinh_nguoi_than (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id        INTEGER NOT NULL,
  thu_tu            INTEGER NOT NULL CHECK (thu_tu IN (1,2,3)),
  moi_quan_he       TEXT,                         -- Cha, Mẹ, Anh, Chị, ...
  ho_ten            TEXT,
  ngay_sinh         TEXT,                         -- ISO 8601
  thong_tin_khac    TEXT,                         -- Quê quán, nghề nghiệp, chức danh, ...
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(thisinh_id, thu_tu),
  FOREIGN KEY (thisinh_id) REFERENCES thisinh(id) ON DELETE CASCADE
);
CREATE INDEX idx_nguoi_than_thisinh ON thisinh_nguoi_than(thisinh_id);

-- ============================================================================
-- 3. Bảng phụ 1-N: Văn bằng (2 văn bằng × 7 field)
-- ============================================================================
CREATE TABLE thisinh_van_bang (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id        INTEGER NOT NULL,
  thu_tu            INTEGER NOT NULL CHECK (thu_tu IN (1,2)),
  ten_truong        TEXT,                         -- Tên trường/cơ sở đào tạo
  ngay_cap          TEXT,                         -- Ngày cấp - ISO 8601
  trinh_do          TEXT,                         -- Trình độ văn bằng/chứng chỉ
  so_hieu           TEXT,                         -- Số hiệu văn bằng/chứng chỉ
  chuyen_nganh      TEXT,                         -- Chuyên ngành đào tạo
  hinh_thuc         TEXT,                         -- Hình thức đào tạo (Chính quy, ...)
  nganh             TEXT,                         -- Ngành đào tạo
  xep_loai          TEXT,                         -- Xuất sắc / Giỏi / Khá / TB
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(thisinh_id, thu_tu),
  FOREIGN KEY (thisinh_id) REFERENCES thisinh(id) ON DELETE CASCADE
);
CREATE INDEX idx_van_bang_thisinh ON thisinh_van_bang(thisinh_id);

-- ============================================================================
-- 4. Bảng phụ 1-N: Quá trình công tác (2 QTC × 3 field)
-- ============================================================================
CREATE TABLE thisinh_qtc (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id        INTEGER NOT NULL,
  thu_tu            INTEGER NOT NULL CHECK (thu_tu IN (1,2)),
  tu_ngay           TEXT,                         -- Từ ngày - ISO 8601
  den_ngay          TEXT,                         -- Đến ngày - ISO 8601
  co_quan            TEXT,                         -- Cơ quan, tổ chức, đơn vị công tác
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(thisinh_id, thu_tu),
  FOREIGN KEY (thisinh_id) REFERENCES thisinh(id) ON DELETE CASCADE
);
CREATE INDEX idx_qtc_thisinh ON thisinh_qtc(thisinh_id);
