-- ============================================================================
-- 18. Seed cấu hình mapping điểm ưu tiên từ đối tượng ưu tiên trong hồ sơ đăng ký
-- ============================================================================
-- Quy tắc (theo xác nhận nghiệp vụ):
--   - 7.5 điểm: Anh hùng, thương binh, người hưởng chính sách như thương binh.
--   - 5.0 điểm: Dân tộc thiểu số, sĩ quan/quân nhân xuất ngũ, con liệt sĩ/thương binh/bệnh binh,
--               chứng chỉ kỹ năng nghề bậc 4 trở lên, kinh nghiệm 36 tháng trở lên.
--   - 2.5 điểm: Hoàn thành nghĩa vụ quân sự/công an, thanh niên xung phong.
--   - 1.5 điểm: Cán bộ công đoàn.
--   - Nếu thuộc nhiều diện: lấy điểm cao nhất.
-- ============================================================================

INSERT OR IGNORE INTO system_config (key, value, mo_ta)
VALUES (
  'diemthi.uu_tien.mapping',
  json_object(
    'combine', 'max',
    'rules', json_array(
      json_object('score', 7.5, 'keywords', json_array(
        'anh hùng', 'thương binh', 'hưởng chính sách như thương binh', 'bệnh binh'
      )),
      json_object('score', 5.0, 'keywords', json_array(
        'dân tộc thiểu số', 'sĩ quan xuất ngũ', 'quân nhân xuất ngũ',
        'con liệt sĩ', 'con thương binh', 'con bệnh binh',
        'chứng chỉ kỹ năng nghề bậc 4', '36 tháng'
      )),
      json_object('score', 2.5, 'keywords', json_array(
        'hoàn thành nghĩa vụ quân sự', 'nghĩa vụ công an', 'thanh niên xung phong'
      )),
      json_object('score', 1.5, 'keywords', json_array('cán bộ công đoàn'))
    )
  ),
  'Mapping điểm ưu tiên từ đối tượng ưu tiên trong hồ sơ đăng ký (JSON)'
);
