-- 0015: subject_aliases — ánh xạ tên viết tắt/biến thể trong Excel sang tên chuẩn trong vitri_tuyendung.mon
-- Admin quản lý qua UI Cài đặt > Alias môn học

CREATE TABLE subject_aliases (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  alias     TEXT NOT NULL COLLATE NOCASE,  -- tên trong Excel: "Lý", "Hóa", "Văn", ...
  canonical TEXT NOT NULL,                 -- tên chuẩn trong vitri_tuyendung.mon: "Vật lý", "Hóa học", ...
  UNIQUE (alias)
);

CREATE INDEX idx_subject_aliases_alias ON subject_aliases(alias);

-- Seed: các alias phổ biến từ file Excel mẫu
INSERT INTO subject_aliases (alias, canonical) VALUES
  ('Lý',         'Vật lý'),
  ('Hóa',        'Hóa học'),
  ('Sinh',       'Sinh học'),
  ('Văn',        'Ngữ văn'),
  ('Sử',         'Lịch sử'),
  ('Địa',        'Địa lý'),
  ('Tin',        'Tin học'),
  ('TD',         'Thể dục'),
  ('MT',         'Mỹ thuật'),
  ('AN',         'Âm nhạc'),
  ('CN',         'Công nghệ'),
  ('Anh',        'Tiếng Anh'),
  ('TV',         'Tiếng Việt'),
  ('Vật Lý',     'Vật lý'),
  ('Hóa Học',    'Hóa học'),
  ('Ngữ Văn',    'Ngữ văn'),
  ('Lịch Sử',    'Lịch sử'),
  ('Địa Lý',     'Địa lý'),
  ('Tin Học',    'Tin học'),
  ('Thể Dục',    'Thể dục'),
  ('Mỹ Thuật',   'Mỹ thuật'),
  ('Âm Nhạc',    'Âm nhạc'),
  ('Công Nghệ',  'Công nghệ'),
  ('Tiếng Anh',  'Tiếng Anh'),
  ('Tiếng Việt', 'Tiếng Việt');
