-- ============================================================================
-- Migration 0001: Initial schema for EduRecruit
-- Sở GDĐT Lạng Sơn - Hệ thống quản lý tuyển dụng viên chức
-- 16 bảng + 4 triggers + indexes
-- ============================================================================

PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;

-- ============================================================================
-- 1. ky_tuyendung — Kỳ tuyển dụng
-- ============================================================================
CREATE TABLE ky_tuyendung (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ten_ky          TEXT    NOT NULL UNIQUE,
  nam             INTEGER NOT NULL,
  ngay_bat_dau    TEXT    NOT NULL,                          -- ISO 8601
  ngay_ket_thuc   TEXT    NOT NULL,
  trang_thai      TEXT    NOT NULL DEFAULT 'Mo'
                  CHECK (trang_thai IN ('Mo','DangTuyen','DaKhoa','Huy')),
  mo_ta           TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_ky_tuyendung_trang_thai ON ky_tuyendung(trang_thai);
CREATE INDEX idx_ky_tuyendung_nam        ON ky_tuyendung(nam DESC);

-- ============================================================================
-- 2. vitri_tuyendung — Vị trí (môn + cấp học)
-- ============================================================================
CREATE TABLE vitri_tuyendung (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id INTEGER NOT NULL,
  ma_vi_tri       TEXT    NOT NULL,                          -- VD: GV_TOAN_THPT
  mon             TEXT    NOT NULL,                          -- Toán, Ngữ văn, ...
  cap_hoc         TEXT    NOT NULL
                  CHECK (cap_hoc IN ('MN','TH','THCS','THPT','GDTX','DNTTHPT')),
  loai_vi_tri     TEXT    NOT NULL DEFAULT 'GiaoVien',
  so_luong        INTEGER NOT NULL DEFAULT 0,
  hinh_thuc_thi   TEXT    NOT NULL DEFAULT 'Viet'
                  CHECK (hinh_thuc_thi IN ('Viet','TracNghiem','ThucHanh')),
  diem_chuan      REAL,
  ghi_chu         TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ky_tuyendung_id, ma_vi_tri),
  FOREIGN KEY (ky_tuyendung_id) REFERENCES ky_tuyendung(id) ON DELETE CASCADE
);

CREATE INDEX idx_vitri_ky          ON vitri_tuyendung(ky_tuyendung_id);
CREATE INDEX idx_vitri_mon         ON vitri_tuyendung(mon);
CREATE INDEX idx_vitri_cap_hoc     ON vitri_tuyendung(cap_hoc);

-- ============================================================================
-- 3. don_vi_tuyen_dung — Trường/đơn vị cụ thể (BỔ SUNG từ Excel thực tế)
-- ============================================================================
CREATE TABLE don_vi_tuyen_dung (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id INTEGER NOT NULL,
  ma_don_vi       TEXT    NOT NULL,
  ten_don_vi      TEXT    NOT NULL,
  cap_hoc         TEXT    NOT NULL,
  dia_chi         TEXT,
  so_dien_thoai   TEXT,
  nguoi_lien_he   TEXT,
  ghi_chu         TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ky_tuyendung_id, ma_don_vi),
  FOREIGN KEY (ky_tuyendung_id) REFERENCES ky_tuyendung(id) ON DELETE CASCADE
);

CREATE INDEX idx_donvi_ky ON don_vi_tuyen_dung(ky_tuyendung_id);

-- ============================================================================
-- 4. vitri_donvi — Mapping N-N vị trí ↔ đơn vị (BỔ SUNG)
-- ============================================================================
CREATE TABLE vitri_donvi (
  id                    INTEGER PRIMARY KEY AUTOINCREMENT,
  vitri_tuyendung_id    INTEGER NOT NULL,
  don_vi_tuyen_dung_id  INTEGER NOT NULL,
  so_luong_phan_bo      INTEGER NOT NULL DEFAULT 0,
  created_at            TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (vitri_tuyendung_id, don_vi_tuyen_dung_id),
  FOREIGN KEY (vitri_tuyendung_id)   REFERENCES vitri_tuyendung(id)   ON DELETE CASCADE,
  FOREIGN KEY (don_vi_tuyen_dung_id) REFERENCES don_vi_tuyen_dung(id) ON DELETE CASCADE
);

CREATE INDEX idx_vitri_donvi_vitri ON vitri_donvi(vitri_tuyendung_id);
CREATE INDEX idx_vitri_donvi_donvi ON vitri_donvi(don_vi_tuyen_dung_id);

-- ============================================================================
-- 5. thisinh — Thí sinh (bổ sung 8 field từ Excel thực tế + nam_tot_nghiep)
-- ============================================================================
CREATE TABLE thisinh (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id     INTEGER NOT NULL,
  vi_tri_dang_ky_id   INTEGER NOT NULL,
  don_vi_du_tuyen_id  INTEGER NOT NULL,

  -- Thông tin cá nhân
  ho                  TEXT    NOT NULL,
  ten                 TEXT    NOT NULL,
  ho_ten              TEXT    NOT NULL,                       -- generated từ ho + ' ' + ten (hoặc tự nhập)
  ngay_sinh           TEXT    NOT NULL,                       -- ISO 8601 (yyyy-MM-dd)
  gioi_tinh           TEXT    NOT NULL CHECK (gioi_tinh IN ('Nam','Nu','Khac')),

  -- Thông tin bổ sung từ Excel thực tế
  dan_toc             TEXT,
  ho_khau_thuong_tru  TEXT,
  cccd                TEXT,                                   -- nullable (Excel thực tế thiếu) - BẮT BUỘC trước khi khóa hồ sơ
  ngay_cap_cccd       TEXT,
  noi_cap_cccd        TEXT,
  dien_thoai          TEXT,                                   -- nullable (Excel thực tế thiếu) - BẮT BUỘC trước khi khóa hồ sơ
  email               TEXT,                                   -- nullable (Excel thực tế thiếu) - BẮT BUỘC trước khi khóa hồ sơ

  -- Thông tin đào tạo
  ten_truong_dao_tao  TEXT,
  trinh_do_dao_tao    TEXT,                                   -- Cử nhân, Kỹ sư, Thạc sĩ, ...
  chuyen_nganh        TEXT,
  nam_tot_nghiep      INTEGER,                                -- BỔ SUNG theo PRD §I.5
  co_chung_chi_nvsp   INTEGER NOT NULL DEFAULT 0,             -- 0/1
  xep_loai_bang       TEXT,                                   -- Xuất sắc/Giỏi/Khá/TB
  doi_tuong_uu_tien   TEXT,                                   -- text, comma-separated: "con_thuong_binh,con_liet_si"

  -- Trạng thái
  trang_thai_ho_so    TEXT    NOT NULL DEFAULT 'ChoRaSoat'
                      CHECK (trang_thai_ho_so IN ('ChoRaSoat','HopLe','CanBoSung','KhongDuDieuKien','DaChinhSua')),
  ly_do_tu_choi       TEXT,
  ngay_nop_ho_so      TEXT    NOT NULL DEFAULT (datetime('now')),

  -- Metadata
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  created_by          INTEGER,
  updated_by          INTEGER,

  FOREIGN KEY (ky_tuyendung_id)     REFERENCES ky_tuyendung(id),
  FOREIGN KEY (vi_tri_dang_ky_id)   REFERENCES vitri_tuyendung(id),
  FOREIGN KEY (don_vi_du_tuyen_id)  REFERENCES don_vi_tuyen_dung(id),
  FOREIGN KEY (created_by)          REFERENCES users(id),
  FOREIGN KEY (updated_by)          REFERENCES users(id)
);

CREATE INDEX idx_thisinh_ky             ON thisinh(ky_tuyendung_id);
CREATE INDEX idx_thisinh_vi_tri         ON thisinh(vi_tri_dang_ky_id);
CREATE INDEX idx_thisinh_don_vi         ON thisinh(don_vi_du_tuyen_id);
CREATE INDEX idx_thisinh_trang_thai     ON thisinh(trang_thai_ho_so);
CREATE INDEX idx_thisinh_ho_ten         ON thisinh(ho_ten);
CREATE INDEX idx_thisinh_ten            ON thisinh(ten);  -- cho sắp xếp Bước 4
CREATE INDEX idx_thisinh_cccd           ON thisinh(cccd);

-- Partial unique index: CCCD chỉ unique khi NOT NULL (vì Excel thực tế thiếu CCCD)
CREATE UNIQUE INDEX idx_thisinh_cccd_unique
  ON thisinh(cccd)
  WHERE cccd IS NOT NULL;

-- ============================================================================
-- 6. phongthi — Phòng thi
-- ============================================================================
CREATE TABLE phongthi (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id     INTEGER NOT NULL,
  vi_tri_dang_ky_id   INTEGER NOT NULL,
  ma_phong            TEXT    NOT NULL,                       -- P001, P002
  ten_phong           TEXT,                                   -- Phòng họp A, ...
  dia_diem            TEXT,                                   -- Trụ sở Sở GDĐT
  suc_chua            INTEGER NOT NULL DEFAULT 30,
  ngay_thi            TEXT    NOT NULL,                       -- ISO 8601
  gio_thi             TEXT    NOT NULL,                       -- HH:mm
  so_luong_da_xep     INTEGER NOT NULL DEFAULT 0,
  trang_thai          TEXT    NOT NULL DEFAULT 'ChuaSapXep'
                      CHECK (trang_thai IN ('ChuaSapXep','DaSapXep','DaKhoa','DaThiXong')),
  ghi_chu             TEXT,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (ky_tuyendung_id, ma_phong),
  FOREIGN KEY (ky_tuyendung_id)   REFERENCES ky_tuyendung(id) ON DELETE CASCADE,
  FOREIGN KEY (vi_tri_dang_ky_id) REFERENCES vitri_tuyendung(id)
);

CREATE INDEX idx_phongthi_ky         ON phongthi(ky_tuyendung_id);
CREATE INDEX idx_phongthi_vi_tri     ON phongthi(vi_tri_dang_ky_id);
CREATE INDEX idx_phongthi_ngay_thi   ON phongthi(ngay_thi);
CREATE INDEX idx_phongthi_trang_thai ON phongthi(trang_thai);

-- ============================================================================
-- 7. diemthi — Điểm (GK1/GK2 theo PRD §V.1 + 4 triggers)
-- ============================================================================
CREATE TABLE diemthi (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id          INTEGER NOT NULL UNIQUE,
  phongthi_id         INTEGER,

  -- Điểm theo PRD §V.1: GK1 và GK2 là 2 phần thi riêng biệt
  diem_gk1            REAL,                                   -- 0..10
  diem_gk2            REAL,                                   -- 0..10
  diem_thi_giang      REAL,                                   -- computed = (GK1+GK2)/2 khi cả 2 NOT NULL

  -- Trạng thái thi
  vang_thi            INTEGER NOT NULL DEFAULT 0,             -- 0/1
  bo_thi              INTEGER NOT NULL DEFAULT 0,             -- 0/1
  ly_do_vang          TEXT,

  -- Trạng thái dữ liệu
  trang_thai_nhap     TEXT    NOT NULL DEFAULT 'ChuaNhap'
                      CHECK (trang_thai_nhap IN ('ChuaNhap','DaNhap','DaKhoa')),
  ngay_nhap           TEXT,
  nguoi_nhap          INTEGER,
  ngay_khoa           TEXT,
  nguoi_khoa          INTEGER,

  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (thisinh_id)  REFERENCES thisinh(id)  ON DELETE CASCADE,
  FOREIGN KEY (phongthi_id) REFERENCES phongthi(id) ON DELETE SET NULL,
  FOREIGN KEY (nguoi_nhap)  REFERENCES users(id),
  FOREIGN KEY (nguoi_khoa)  REFERENCES users(id),

  -- Validate điểm
  CHECK (diem_gk1 IS NULL OR (diem_gk1 >= 0 AND diem_gk1 <= 10)),
  CHECK (diem_gk2 IS NULL OR (diem_gk2 >= 0 AND diem_gk2 <= 10)),
  -- Không thể vừa vắng vừa bỏ
  CHECK (NOT (vang_thi = 1 AND bo_thi = 1))
);

CREATE INDEX idx_diemthi_phongthi ON diemthi(phongthi_id);
CREATE INDEX idx_diemthi_trang_thai ON diemthi(trang_thai_nhap);

-- ============================================================================
-- 8. ketqua — Kết quả xét tuyển (tính từ Bước 6-7)
-- ============================================================================
CREATE TABLE ketqua (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id          INTEGER NOT NULL UNIQUE,
  diem_thi_giang      REAL,                                   -- snapshot từ diemthi
  diem_uu_tien        REAL    NOT NULL DEFAULT 0,
  diem_tong           REAL    NOT NULL DEFAULT 0,             -- diem_thi_giang + diem_uu_tien
  xep_hang            INTEGER,                                -- rank trong cùng vị trí
  ket_qua             TEXT    NOT NULL DEFAULT 'ChoXuLy'
                      CHECK (ket_qua IN ('ChoXuLy','Dat','KhongDat','Vang','BoThi','KhongDuDieuKien')),
  ghi_chu             TEXT,
  ngay_chay           TEXT    NOT NULL DEFAULT (datetime('now')),
  nguoi_chay          INTEGER,
  created_at          TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at          TEXT    NOT NULL DEFAULT (datetime('now')),

  FOREIGN KEY (thisinh_id) REFERENCES thisinh(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_chay) REFERENCES users(id)
);

CREATE INDEX idx_ketqua_xep_hang ON ketqua(xep_hang);
CREATE INDEX idx_ketqua_ket_qua  ON ketqua(ket_qua);

-- ============================================================================
-- 9. hist_chinh_sua — Lịch sử sửa hồ sơ
-- ============================================================================
CREATE TABLE hist_chinh_sua (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  thisinh_id      INTEGER NOT NULL,
  truong          TEXT    NOT NULL,                           -- 'trang_thai_ho_so' / 'cccd' / ...
  gia_tri_cu      TEXT,
  gia_tri_moi     TEXT,
  ly_do           TEXT,
  nguoi_sua       INTEGER NOT NULL,
  ngay_sua        TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (thisinh_id) REFERENCES thisinh(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_sua)  REFERENCES users(id)
);

CREATE INDEX idx_hist_thisinh ON hist_chinh_sua(thisinh_id);
CREATE INDEX idx_hist_ngay    ON hist_chinh_sua(ngay_sua DESC);

-- ============================================================================
-- 10. log_he_thong — Audit log (giữ vĩnh viễn)
-- ============================================================================
CREATE TABLE log_he_thong (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER,
  username        TEXT,                                       -- snapshot (vì user có thể bị xoá)
  action          TEXT    NOT NULL,                           -- 'LOGIN','IMPORT_EXCEL','XETTUYEN_RUN',...
  resource_type   TEXT,                                       -- 'thisinh','diemthi',...
  resource_id     INTEGER,
  ip_address      TEXT,
  user_agent      TEXT,
  payload         TEXT,                                       -- JSON
  result          TEXT    NOT NULL DEFAULT 'SUCCESS'
                  CHECK (result IN ('SUCCESS','FAILURE')),
  error_message   TEXT,
  ngay_thuc_hien  TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_log_user     ON log_he_thong(user_id);
CREATE INDEX idx_log_action   ON log_he_thong(action);
CREATE INDEX idx_log_ngay     ON log_he_thong(ngay_thuc_hien DESC);
CREATE INDEX idx_log_resource ON log_he_thong(resource_type, resource_id);

-- ============================================================================
-- 11. quyetdinh — QĐ phê duyệt (BỔ SUNG, ví dụ QĐ 1985/QĐ-SGDDT)
-- ============================================================================
CREATE TABLE quyetdinh (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id     INTEGER NOT NULL,
  so_quyet_dinh       TEXT    NOT NULL,                       -- '1985/QĐ-SGDDT'
  ngay_ban_hanh       TEXT    NOT NULL,                       -- ISO 8601
  tieu_de             TEXT    NOT NULL,                       -- 'Phê duyệt DS Vòng 1'
  loai_quyet_dinh     TEXT    NOT NULL
                      CHECK (loai_quyet_dinh IN ('PheDuyetDSVong1','PheDuyetDSVong2','PheDuyetKetQuaChinhThuc','Khac')),
  noi_dung            TEXT,
  file_dinh_kem       TEXT,                                   -- đường dẫn file scan QĐ
  nguoi_ky            TEXT    NOT NULL,                       -- Họ tên giám đốc
  chuc_vu_nguoi_ky    TEXT,                                   -- 'Giám đốc Sở GDĐT'
  ngay_tao            TEXT    NOT NULL DEFAULT (datetime('now')),
  nguoi_tao           INTEGER,
  UNIQUE (ky_tuyendung_id, so_quyet_dinh),
  FOREIGN KEY (ky_tuyendung_id) REFERENCES ky_tuyendung(id) ON DELETE CASCADE,
  FOREIGN KEY (nguoi_tao)       REFERENCES users(id)
);

CREATE INDEX idx_quyetdinh_ky         ON quyetdinh(ky_tuyendung_id);
CREATE INDEX idx_quyetdinh_loai       ON quyetdinh(loai_quyet_dinh);

-- ============================================================================
-- 12. users — Tài khoản
-- ============================================================================
CREATE TABLE users (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  username        TEXT    NOT NULL UNIQUE,
  password_hash   TEXT    NOT NULL,                           -- bcrypt
  ho_ten          TEXT    NOT NULL,
  email           TEXT,
  quyen           TEXT    NOT NULL
                  CHECK (quyen IN ('ADMIN','TO_NHAP_HOSO','TO_NHAP_DIEM','LANH_DAO')),
  trang_thai      TEXT    NOT NULL DEFAULT 'HoatDong'
                  CHECK (trang_thai IN ('HoatDong','Khoa')),
  last_login_at   TEXT,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_users_quyen ON users(quyen);

-- ============================================================================
-- 13. system_config — Cấu hình key-value
-- ============================================================================
CREATE TABLE system_config (
  key             TEXT    PRIMARY KEY,
  value           TEXT    NOT NULL,
  mo_ta           TEXT,
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_by      INTEGER,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

-- ============================================================================
-- 14. word_templates — Registry template Word
-- ============================================================================
CREATE TABLE word_templates (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ma_template     TEXT    NOT NULL UNIQUE,                    -- 'PHIEU_DANG_KY_DU_TUYEN'
  ten_template    TEXT    NOT NULL,
  file_path       TEXT    NOT NULL,                           -- 'data/templates/MAU_01_...'
  mo_ta           TEXT,
  loai            TEXT    NOT NULL DEFAULT 'mau_in'
                  CHECK (loai IN ('mau_in','phieu_yeu_cau','bao_cao','quyet_dinh')),
  trang_thai      TEXT    NOT NULL DEFAULT 'HoatDong'
                  CHECK (trang_thai IN ('HoatDong','Ngung')),
  version         INTEGER NOT NULL DEFAULT 1,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at      TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================================
-- 15. congthuc_xettuyen — Công thức A/B
-- ============================================================================
CREATE TABLE congthuc_xettuyen (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id INTEGER NOT NULL,
  ten_cong_thuc   TEXT    NOT NULL,                           -- 'A', 'B', hoặc custom
  bieu_thuc       TEXT    NOT NULL,                           -- '(GK1+GK2)/2 + UT'
  mo_ta           TEXT,
  is_default      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT    NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (ky_tuyendung_id) REFERENCES ky_tuyendung(id) ON DELETE CASCADE,
  UNIQUE (ky_tuyendung_id, ten_cong_thuc)
);

-- ============================================================================
-- 16. import_batches — Track import batches
-- ============================================================================
CREATE TABLE import_batches (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  ky_tuyendung_id INTEGER NOT NULL,
  ten_file        TEXT    NOT NULL,
  kich_thuoc      INTEGER NOT NULL,
  so_dong         INTEGER NOT NULL,
  so_dong_thanh_cong    INTEGER NOT NULL DEFAULT 0,
  so_dong_loi    INTEGER NOT NULL DEFAULT 0,
  danh_sach_loi   TEXT,                                       -- JSON
  nguoi_import    INTEGER NOT NULL,
  ngay_import     TEXT    NOT NULL DEFAULT (datetime('now')),
  trang_thai      TEXT    NOT NULL DEFAULT 'HoanTat'
                  CHECK (trang_thai IN ('DangXuLy','HoanTat','Loi','Huy')),
  FOREIGN KEY (ky_tuyendung_id) REFERENCES ky_tuyendung(id),
  FOREIGN KEY (nguoi_import)    REFERENCES users(id)
);

CREATE INDEX idx_import_ky ON import_batches(ky_tuyendung_id);

-- ============================================================================
-- 4 TRIGGERS: Tính DiemThiGiang tự động
-- theo PRD §V.1 + Vắng/Bỏ thi
-- ============================================================================

-- Trigger 1: INSERT - tính diem_thi_giang khi insert
CREATE TRIGGER trg_diemthi_insert
AFTER INSERT ON diemthi
FOR EACH ROW
BEGIN
  UPDATE diemthi
  SET diem_thi_giang = CASE
    WHEN NEW.vang_thi = 1 OR NEW.bo_thi = 1 THEN 0
    WHEN NEW.diem_gk1 IS NOT NULL AND NEW.diem_gk2 IS NOT NULL THEN (NEW.diem_gk1 + NEW.diem_gk2) / 2.0
    ELSE NULL
  END
  WHERE id = NEW.id;
END;

-- Trigger 2: UPDATE - tính lại diem_thi_giang khi GK1/GK2 thay đổi
CREATE TRIGGER trg_diemthi_update_gk
AFTER UPDATE OF diem_gk1, diem_gk2 ON diemthi
FOR EACH ROW
WHEN OLD.diem_gk1 IS NOT NEW.diem_gk1
  OR OLD.diem_gk2 IS NOT NEW.diem_gk2
BEGIN
  UPDATE diemthi
  SET diem_thi_giang = CASE
    WHEN NEW.vang_thi = 1 OR NEW.bo_thi = 1 THEN 0
    WHEN NEW.diem_gk1 IS NOT NULL AND NEW.diem_gk2 IS NOT NULL THEN (NEW.diem_gk1 + NEW.diem_gk2) / 2.0
    ELSE NULL
  END
  WHERE id = NEW.id;
END;

-- Trigger 3: UPDATE - set diem_thi_giang = 0 khi Vắng/Bỏ = 1 (cascade xep_hang NULL)
CREATE TRIGGER trg_diemthi_vang_bo
AFTER UPDATE OF vang_thi, bo_thi ON diemthi
FOR EACH ROW
WHEN (NEW.vang_thi = 1 OR NEW.bo_thi = 1)
  AND (OLD.vang_thi != NEW.vang_thi OR OLD.bo_thi != NEW.bo_thi)
BEGIN
  UPDATE diemthi
  SET diem_thi_giang = 0
  WHERE id = NEW.id;

  -- Nếu đã có kết quả, cập nhật: ket_qua = Vang/BoThi, xep_hang = NULL
  UPDATE ketqua
  SET xep_hang = NULL,
      diem_thi_giang = 0,
      diem_tong = 0 + diem_uu_tien,
      ket_qua = CASE
        WHEN NEW.vang_thi = 1 THEN 'Vang'
        WHEN NEW.bo_thi = 1   THEN 'BoThi'
        ELSE ket_qua
      END,
      updated_at = datetime('now')
  WHERE thisinh_id = NEW.thisinh_id;
END;

-- Trigger 4: UPDATE - restore diem_thi_giang khi bỏ Vắng/Bỏ
CREATE TRIGGER trg_diemthi_restore
AFTER UPDATE OF vang_thi, bo_thi ON diemthi
FOR EACH ROW
WHEN NEW.vang_thi = 0 AND NEW.bo_thi = 0
  AND (OLD.vang_thi = 1 OR OLD.bo_thi = 1)
BEGIN
  UPDATE diemthi
  SET diem_thi_giang = CASE
    WHEN NEW.diem_gk1 IS NOT NULL AND NEW.diem_gk2 IS NOT NULL THEN (NEW.diem_gk1 + NEW.diem_gk2) / 2.0
    ELSE NULL
  END
  WHERE id = NEW.id;

  -- Nếu đã có kết quả, đưa về ChoXuLy để chạy lại
  UPDATE ketqua
  SET ket_qua = 'ChoXuLy',
      xep_hang = NULL,
      updated_at = datetime('now')
  WHERE thisinh_id = NEW.thisinh_id;
END;

-- ============================================================================
-- Trigger: cập nhật updated_at tự động
-- ============================================================================
CREATE TRIGGER trg_ky_tuyendung_updated
AFTER UPDATE ON ky_tuyendung
FOR EACH ROW
BEGIN
  UPDATE ky_tuyendung SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_vitri_updated
AFTER UPDATE ON vitri_tuyendung
FOR EACH ROW
BEGIN
  UPDATE vitri_tuyendung SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_donvi_updated
AFTER UPDATE ON don_vi_tuyen_dung
FOR EACH ROW
BEGIN
  UPDATE don_vi_tuyen_dung SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_thisinh_updated
AFTER UPDATE ON thisinh
FOR EACH ROW
BEGIN
  UPDATE thisinh SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_phongthi_updated
AFTER UPDATE ON phongthi
FOR EACH ROW
BEGIN
  UPDATE phongthi SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_diemthi_updated
AFTER UPDATE ON diemthi
FOR EACH ROW
BEGIN
  UPDATE diemthi SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_ketqua_updated
AFTER UPDATE ON ketqua
FOR EACH ROW
BEGIN
  UPDATE ketqua SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_users_updated
AFTER UPDATE ON users
FOR EACH ROW
BEGIN
  UPDATE users SET updated_at = datetime('now') WHERE id = OLD.id;
END;

CREATE TRIGGER trg_word_templates_updated
AFTER UPDATE ON word_templates
FOR EACH ROW
BEGIN
  UPDATE word_templates SET updated_at = datetime('now') WHERE id = OLD.id;
END;
