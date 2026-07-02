-- ============================================================================
-- 0010: Bảng mon_chuyen_nganh_map — whitelist chuyên ngành cho phép theo môn
-- Dùng cho rule rà soát tự động Bước 2: nếu (mon, chuyen_nganh) có trong bảng
-- này → pass; nếu không → fallback keyword match (mềm hơn trước) → cảnh báo nhẹ.
--
-- Dữ liệu seed dựa trên Thông tư 09/2022/TT-BGDĐT (Danh mục ngành đào tạo ĐH)
-- và thực tế tuyển dụng viên chức ngành GDPT Việt Nam.
-- Admin có thể chỉnh sửa qua trang Cài đặt > Quản lý môn-chuyên ngành.
-- ============================================================================

CREATE TABLE mon_chuyen_nganh_map (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  mon          TEXT    NOT NULL,                          -- 'Quản lý', 'Toán', 'Ngữ văn',...
  chuyen_nganh  TEXT    NOT NULL,                          -- 'Giáo dục học', 'Sư phạm Toán',...
  ghi_chu      TEXT,                                       -- optional, ghi chú của admin
  created_at   TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT    NOT NULL DEFAULT (datetime('now')),

  UNIQUE (mon, chuyen_nganh)
);

CREATE INDEX idx_mcm_mon          ON mon_chuyen_nganh_map(mon);
CREATE INDEX idx_mcm_chuyen_nganh ON mon_chuyen_nganh_map(chuyen_nganh);

-- ============================================================================
-- Seed dữ liệu mẫu (12 môn phổ biến × 5-8 chuyên ngành mỗi môn)
-- Theo Thông tư 09/2022/TT-BGDĐT và thực tế tuyển dụng giáo viên
-- ============================================================================

-- Môn Quản lý (cho vị trí Quản lý giáo dục, Hiệu trưởng, Hiệu phó)
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Quản lý', 'Quản lý giáo dục'),
  ('Quản lý', 'Quản lý nhà nước'),
  ('Quản lý', 'Quản trị'),
  ('Quản lý', 'Quản trị giáo dục'),
  ('Quản lý', 'Giáo dục học'),
  ('Quản lý', 'Hành chính học'),
  ('Quản lý', 'Kinh tế'),
  ('Quản lý', 'Kinh tế chính trị'),
  ('Quản lý', 'Luật');

-- Môn Toán
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Toán', 'Toán'),
  ('Toán', 'Toán học'),
  ('Toán', 'Sư phạm Toán'),
  ('Toán', 'Toán ứng dụng'),
  ('Toán', 'Toán - Tin'),
  ('Toán', 'Toán cơ'),
  ('Toán', 'Toán cao cấp');

-- Môn Ngữ văn
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Ngữ văn', 'Ngữ văn'),
  ('Ngữ văn', 'Văn học'),
  ('Ngữ văn', 'Sư phạm Ngữ văn'),
  ('Ngữ văn', 'Văn hóa học'),
  ('Ngữ văn', 'Ngôn ngữ học');

-- Môn Tiếng Anh
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Tiếng Anh', 'Tiếng Anh'),
  ('Tiếng Anh', 'Sư phạm Tiếng Anh'),
  ('Tiếng Anh', 'Ngôn ngữ Anh'),
  ('Tiếng Anh', 'Anh văn'),
  ('Tiếng Anh', 'Ngữ văn Anh');

-- Môn Vật lý
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Vật lý', 'Vật lý'),
  ('Vật lý', 'Sư phạm Vật lý'),
  ('Vật lý', 'Vật lý học'),
  ('Vật lý', 'Vật lý ứng dụng');

-- Môn Hóa học
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Hóa học', 'Hóa học'),
  ('Hóa học', 'Sư phạm Hóa'),
  ('Hóa học', 'Hóa dược'),
  ('Hóa học', 'Hóa phân tích');

-- Môn Sinh học
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Sinh học', 'Sinh học'),
  ('Sinh học', 'Sư phạm Sinh'),
  ('Sinh học', 'Công nghệ sinh học'),
  ('Sinh học', 'Y - Sinh'),
  ('Sinh học', 'Sinh - Kỹ thuật nông nghiệp');

-- Môn Lịch sử
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Lịch sử', 'Lịch sử'),
  ('Lịch sử', 'Sư phạm Lịch sử'),
  ('Lịch sử', 'Lịch sử - Địa lý'),
  ('Lịch sử', 'Sử - Địa');

-- Môn Địa lý
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Địa lý', 'Địa lý'),
  ('Địa lý', 'Sư phạm Địa'),
  ('Địa lý', 'Địa chất'),
  ('Địa lý', 'Địa lý tự nhiên'),
  ('Địa lý', 'Lịch sử - Địa lý');

-- Môn Tin học
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Tin học', 'Tin học'),
  ('Tin học', 'Công nghệ thông tin'),
  ('Tin học', 'Khoa học máy tính'),
  ('Tin học', 'Toán - Tin'),
  ('Tin học', 'Sư phạm Tin học'),
  ('Tin học', 'Hệ thống thông tin');

-- Môn Thể dục
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Thể dục', 'Thể dục'),
  ('Thể dục', 'Thể thao'),
  ('Thể dục', 'Giáo dục thể chất'),
  ('Thể dục', 'Sư phạm Thể dục'),
  ('Thể dục', 'Huấn luyện thể thao');

-- Môn Mỹ thuật
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Mỹ thuật', 'Mỹ thuật'),
  ('Mỹ thuật', 'Nghệ thuật'),
  ('Mỹ thuật', 'Hội họa'),
  ('Mỹ thuật', 'Đồ họa'),
  ('Mỹ thuật', 'Thiết kế'),
  ('Mỹ thuật', 'Sư phạm Mỹ thuật');

-- Môn Âm nhạc
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Âm nhạc', 'Âm nhạc'),
  ('Âm nhạc', 'Sư phạm Âm nhạc'),
  ('Âm nhạc', 'Nghệ thuật biểu diễn'),
  ('Âm nhạc', 'Hòa âm');

-- Môn Công nghệ
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Công nghệ', 'Công nghệ'),
  ('Công nghệ', 'Kỹ thuật'),
  ('Công nghệ', 'Sư phạm Kỹ thuật'),
  ('Công nghệ', 'Công nghệ thông tin'),
  ('Công nghệ', 'Kỹ thuật nông nghiệp');

-- Môn Giáo dục công dân (GDCD)
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('GDCD', 'Giáo dục công dân'),
  ('GDCD', 'Chính trị'),
  ('GDCD', 'Triết học'),
  ('GDCD', 'Lịch sử'),
  ('GDCD', 'Ngữ văn'),
  ('GDCD', 'Giáo dục học'),
  ('GDCD', 'Kinh tế chính trị');

-- Môn Tiếng Việt (cho tiểu học)
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('Tiếng Việt', 'Tiếng Việt'),
  ('Tiếng Việt', 'Ngữ văn'),
  ('Tiếng Việt', 'Văn học'),
  ('Tiếng Việt', 'Sư phạm Tiếng Việt'),
  ('Tiếng Việt', 'Ngôn ngữ học');

-- Môn Tự nhiên Xã hội (tiểu học - tích hợp)
INSERT INTO mon_chuyen_nganh_map (mon, chuyen_nganh) VALUES
  ('TNXH', 'Sư phạm Khoa học Tự nhiên'),
  ('TNXH', 'Sư phạm Khoa học Xã hội'),
  ('TNXH', 'Sinh học'),
  ('TNXH', 'Lịch sử'),
  ('TNXH', 'Địa lý'),
  ('TNXH', 'Khoa học tự nhiên'),
  ('TNXH', 'Khoa học xã hội');
