-- ============================================================================
-- Migration 0002: Seed data
-- 4 users (1 cho mỗi role), 3 templates, system config
-- Password mặc định: "admin123" (hash bcrypt 10 rounds)
-- ============================================================================

-- Users (password_hash cho "admin123" - bcrypt 10 rounds)
-- Hash được generate bằng: bcrypt.hashSync('admin123', 10)
INSERT INTO users (username, password_hash, ho_ten, email, quyen) VALUES
  ('admin',       '$2a$10$mJ6o8q9owcLQe62dyZtK5OJGHrCeN6SCm1GIy/ApnJvuL/nExwfZe', 'Quản trị hệ thống', 'admin@langson.edu.vn', 'ADMIN'),
  ('nhaphoso',    '$2a$10$mJ6o8q9owcLQe62dyZtK5OJGHrCeN6SCm1GIy/ApnJvuL/nExwfZe', 'Tổ Nhập Hồ Sơ',     'nhaphoso@langson.edu.vn', 'TO_NHAP_HOSO'),
  ('nhapdiem',    '$2a$10$mJ6o8q9owcLQe62dyZtK5OJGHrCeN6SCm1GIy/ApnJvuL/nExwfZe', 'Tổ Nhập Điểm',     'nhapdiem@langson.edu.vn', 'TO_NHAP_DIEM'),
  ('lanhdao',     '$2a$10$mJ6o8q9owcLQe62dyZtK5OJGHrCeN6SCm1GIy/ApnJvuL/nExwfZe', 'Lãnh đạo Sở',      'lanhdao@langson.edu.vn',  'LANH_DAO');

-- Word templates registry (3 mẫu chính)
-- Lưu ý: 8 mẫu đầy đủ sẽ được bổ sung sau khi có file Word từ Sở GDĐT
INSERT INTO word_templates (ma_template, ten_template, file_path, mo_ta, loai) VALUES
  ('PHIEU_DANG_KY_DU_TUYEN',  'Phiếu đăng ký dự tuyển',     'data/templates/MAU_01_PHIEU_DANG_KY_DU_TUYEN.docx', 'Mẫu phiếu ĐKDT (Bộ GDĐT)',         'mau_in'),
  ('DANH_SACH_THI_SINH',      'Danh sách thí sinh đăng ký',  'data/templates/MAU_02_DANH_SACH_THI_SINH.docx',     'DS thí sinh theo vị trí',           'bao_cao'),
  ('GIAY_CHUNG_NHAN',         'Giấy chứng nhận thí sinh',    'data/templates/MAU_03_GIAY_CHUNG_NHAN.docx',        'Xác nhận TS đủ điều kiện dự thi',   'mau_in');

-- System config
INSERT INTO system_config (key, value, mo_ta) VALUES
  ('org.name',            'Sở Giáo dục và Đào tạo Lạng Sơn',     'Tên đầy đủ đơn vị'),
  ('org.short_name',      'Sở GDĐT Lạng Sơn',                     'Tên viết tắt'),
  ('org.director',        'Nguyễn Văn A',                          'Giám đốc Sở'),
  ('org.address',         'Đường Hoàng Văn Thụ, TP. Lạng Sơn',     'Địa chỉ cơ quan'),
  ('org.phone',           '0205.xxx.xxxx',                         'Số điện thoại'),
  ('org.email',           'sgddt@langson.gov.vn',                  'Email công vụ'),
  ('app.version',         '0.1.0',                                  'Phiên bản ứng dụng'),
  ('xet_tuyen.phuong_thuc_mac_dinh', 'A',                            'Phương thức xét tuyển mặc định (A hoặc B)'),
  ('xet_tuyen.diem_dat',  '5.0',                                    'Điểm đạt tối thiểu (thang 10)'),
  ('phong_thi.suc_chua_mac_dinh', '30',                              'Sức chứa mặc định mỗi phòng thi'),
  ('phong_thi.gio_thi_mac_dinh',  '08:00',                           'Giờ thi mặc định'),
  ('import.max_rows',     '1000',                                   'Số dòng tối đa mỗi lần import Excel'),
  ('backup.auto_interval_days', '7',                                 'Tự động nhắc sao lưu mỗi N ngày');
