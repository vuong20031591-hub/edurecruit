-- 0016: thong_bao — hệ thống thông báo nội bộ
CREATE TABLE thong_bao (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER,               -- NULL = broadcast (chưa dùng)
  loai       TEXT NOT NULL CHECK (loai IN ('HoSo','XetTuyen','ChiTieu','HeThong')),
  tieu_de    TEXT NOT NULL,
  noi_dung   TEXT,
  lien_ket   TEXT,
  da_doc     INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_thong_bao_user ON thong_bao(user_id, da_doc, created_at);
