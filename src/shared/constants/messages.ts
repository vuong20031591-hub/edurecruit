/**
 * Common error messages
 * File: src/shared/constants/messages.ts
 */

export const ERROR_MESSAGES = {
  REQUIRED: 'Trường bắt buộc',
  NOT_FOUND: 'Không tìm thấy',
  FORBIDDEN: 'Bạn không có quyền thực hiện',
  UNAUTHORIZED: 'Vui lòng đăng nhập',
  SERVER_ERROR: 'Lỗi máy chủ, vui lòng thử lại',
  NETWORK: 'Lỗi mạng, kiểm tra kết nối',
  SESSION_EXPIRED: 'Phiên đăng nhập hết hạn',
  DUPLICATE_CCCD: 'CCCD đã tồn tại trong hệ thống',
  CCCD_REQUIRED_BEFORE_LOCK: 'CCCD bắt buộc trước khi khóa hồ sơ',
  PHONE_REQUIRED_BEFORE_LOCK: 'Số điện thoại bắt buộc trước khi khóa hồ sơ',
  EMAIL_REQUIRED_BEFORE_LOCK: 'Email bắt buộc trước khi khóa hồ sơ',
  DIEM_LOCKED: 'Điểm đã bị khóa, không thể sửa',
  PHONG_THI_FULL: 'Phòng thi đã đầy',
  KY_KHOA: 'Kỳ tuyển dụng đã khóa'
};

export const SUCCESS_MESSAGES = {
  CREATED: 'Tạo thành công',
  UPDATED: 'Cập nhật thành công',
  DELETED: 'Xóa thành công',
  SAVED: 'Lưu thành công',
  IMPORTED: 'Import thành công',
  EXPORTED: 'Export thành công',
  LOCKED: 'Khóa thành công',
  UNLOCKED: 'Mở khóa thành công',
  BACKUP_CREATED: 'Sao lưu thành công',
  BACKUP_RESTORED: 'Phục hồi thành công'
};
