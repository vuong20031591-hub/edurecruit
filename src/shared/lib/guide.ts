/**
 * Định nghĩa các bước hướng dẫn sử dụng theo PRD (9 bước nghiệp vụ)
 * + mini-tour cho từng trang chức năng chính.
 *
 * Mỗi step:
 *  - id: định danh duy nhất trong tour
 *  - route: pathname đích (nếu khác trang hiện tại → sẽ tự navigate)
 *  - target: CSS selector HOẶC [data-guide="<id>"]
 *  - title: tiêu đề tooltip
 *  - content: mô tả ngắn
 *  - placement: vị trí tooltip so với target
 */
export type GuidePlacement = 'top' | 'bottom' | 'left' | 'right' | 'center';

export interface GuideStep {
  /** Optional — nếu không có thì dùng index trong tour. */
  id?: string;
  /** Nếu khác trang hiện tại → tự điều hướng trước khi highlight. */
  route?: string;
  /** CSS selector hoặc [data-guide="..."] */
  target?: string;
  title: string;
  content: string;
  placement?: GuidePlacement;
  /** Nếu true, tooltip hiển thị ở giữa màn hình (cho step giới thiệu tổng quan). */
  center?: boolean;
}

export interface GuideTour {
  id: string;
  title: string;
  description: string;
  steps: GuideStep[];
}

/**
 * 9 bước nghiệp vụ theo PRD — phù hợp onboarding cho mọi role.
 * Thứ tự tương ứng 9 menu trong sidebar.
 */
export const ONBOARDING_TOUR: GuideTour = {
  id: 'onboarding-9-buoc',
  title: 'Hướng dẫn sử dụng 9 bước',
  description: 'Đi qua toàn bộ quy trình tuyển dụng viên chức theo PRD',
  steps: [
    {
      id: 'welcome',
      title: 'Chào mừng bạn đến với EduRecruit',
      content:
        'Hệ thống quản lý tuyển dụng viên chức ngành Giáo dục. ' +
        'Tour này sẽ đi qua 9 bước nghiệp vụ chính. Bạn có thể bấm "Bỏ qua" để thoát bất cứ lúc nào.',
      placement: 'center',
      center: true,
    },
    {
      id: 'sidebar-overview',
      route: '/dashboard',
      target: '[data-guide="sidebar"]',
      title: 'Bước 0 — Thanh điều hướng',
      content:
        'Đây là menu chính. Mỗi mục tương ứng một bước nghiệp vụ. ' +
        'Quyền truy cập từng mục phụ thuộc vào vai trò của bạn (Admin, Tổ Nhập hồ sơ, Tổ Nhập điểm, Lãnh đạo).',
      placement: 'right',
    },
    {
      id: 'step-1-tiep-nhan',
      route: '/dashboard/ho-so',
      target: '[data-guide="ho-so-import"]',
      title: 'Bước 1 — Tiếp nhận hồ sơ',
      content:
        'Import hồ sơ từ file Excel xuất từ Google Form. Hệ thống tự động phát hiện trùng lặp CCCD/SĐT/Email ' +
        'và sinh Mã hồ sơ (TDVC-2026-XXXXX) đảm bảo duy nhất.',
      placement: 'bottom',
    },
    {
      id: 'step-2-ra-soat',
      route: '/dashboard/ho-so',
      target: '[data-guide="ho-so-list"]',
      title: 'Bước 2 — Rà soát hồ sơ & Nhật ký chỉnh sửa',
      content:
        'Tìm kiếm nhanh theo CCCD/Mã hồ sơ/Họ tên. Mọi thao tác chỉnh sửa đều được ghi audit log (ai sửa, lúc nào, giá trị cũ → mới). ' +
        'Sau khi chốt danh sách, bấm "Khóa hồ sơ" để đóng băng, không ai sửa được nữa.',
      placement: 'top',
    },
    {
      id: 'step-3-vi-tri',
      route: '/dashboard/vi-tri',
      target: '[data-guide="vi-tri-list"]',
      title: 'Bước 3 — Quản lý vị trí tuyển dụng',
      content:
        'Khai báo danh mục vị trí: Mã vị trí, Tên vị trí, Đơn vị, Môn chuyên ngành, Chỉ tiêu, Điều kiện tối thiểu. ' +
        'Bảng này là ràng buộc dữ liệu khi thí sinh chọn vị trí đăng ký.',
      placement: 'top',
    },
    {
      id: 'step-4-sbd-phong',
      route: '/dashboard/phong-thi',
      target: '[data-guide="phong-thi-sap-xep"]',
      title: 'Bước 4 — Đánh SBD & Phân phòng thi',
      content:
        'Thiết lập sức chứa phòng (24-30 thí sinh) và quy tắc sinh SBD. Hệ thống tự động sắp xếp theo ABC tên thí sinh, ' +
        'gom theo vị trí, rải vào phòng. Có thể chỉnh tay từng thí sinh nếu đặc biệt.',
      placement: 'bottom',
    },
    {
      id: 'step-5-nhap-diem',
      route: '/dashboard/nhap-diem',
      target: '[data-guide="nhap-diem-grid"]',
      title: 'Bước 5 — Nhập điểm & Khóa điểm',
      content:
        'Nhập điểm theo cơ chế "chấm độc lập 2 giám khảo": hệ thống tự tính trung bình (GK1+GK2)/2. ' +
        'Dùng ô tìm nhanh SBD + Enter để focus dòng (Fast Focus). Hỗ trợ import hàng loạt từ Excel. ' +
        'Bấm "Khóa điểm" khi đã rà soát xong để chốt dữ liệu.',
      placement: 'top',
    },
    {
      id: 'step-6-tinh-diem',
      route: '/dashboard/xet-tuyen',
      target: '[data-guide="xet-tuyen-tinh"]',
      title: 'Bước 6 — Tính điểm xét tuyển tự động',
      content:
        'Chọn công thức tính (A: Giảng+Ưu tiên | B: Vòng 2+Ưu tiên) và bấm "Tính điểm". ' +
        'Hệ thống tự tính TongDiem và xếp hạng nội bộ trong từng vị trí.',
      placement: 'bottom',
    },
    {
      id: 'step-7-xet-tuyen',
      route: '/dashboard/xet-tuyen',
      target: '[data-guide="xet-tuyen-chay"]',
      title: 'Bước 7 — Chạy thuật toán xét tuyển',
      content:
        'Hệ thống so sánh với Chỉ tiêu từng vị trí và Điều kiện tối thiểu, tự gắn trạng thái Trúng tuyển / Dự phòng / Không trúng tuyển. ' +
        'Hỗ trợ cấu hình thứ tự ưu tiên khi đồng điểm ở chỉ tiêu cuối.',
      placement: 'top',
    },
    {
      id: 'step-8-bao-cao',
      route: '/dashboard/bao-cao',
      target: '[data-guide="bao-cao-xuat"]',
      title: 'Bước 8 — Báo cáo & Biểu mẫu',
      content:
        'Xuất Excel (.xlsx) cho dữ liệu động, Word (.docx) cho văn bản hành chính, PDF để lưu trữ. ' +
        'Biểu mẫu Word dùng cơ chế Template Engine — Lãnh đạo tự sửa .docx mẫu, hệ thống tự nội suy {{Bien}}.',
      placement: 'top',
    },
    {
      id: 'step-9-sao-luu',
      route: '/dashboard/cai-dat/backup',
      target: '[data-guide="backup-create"]',
      title: 'Bước 9 — Sao lưu & Nhật ký thao tác',
      content:
        'Sao lưu toàn bộ CSDL SQLite ra file backup (lưu phân vùng khác/USB). ' +
        'Mọi thao tác quan trọng (đăng nhập, sửa hồ sơ, sửa điểm, chạy xét tuyển) đều được ghi log để phục vụ thanh tra.',
      placement: 'top',
    },
    {
      id: 'finish',
      title: 'Hoàn tất hướng dẫn',
      content:
        'Bạn đã đi qua 9 bước nghiệp vụ. Bấm nút "Hướng dẫn" trên thanh trên cùng bất cứ lúc nào để mở lại. ' +
        'Trên mỗi trang chức năng còn có tour ngắn riêng để hướng dẫn chi tiết các nút bấm.',
      placement: 'center',
      center: true,
    },
  ],
};

/**
 * Mini-tour cho từng trang — ngắn gọn, focus vào các nút/vùng thao tác.
 * key = pathname khớp (prefix). Có thể tìm mini-tour phù hợp bằng `findMiniTour(pathname)`.
 */
export const MINI_TOURS: Record<string, GuideTour> = {
  '/dashboard': {
    id: 'mini-tong-quan',
    title: 'Hướng dẫn trang Tổng quan',
    description: 'Các chỉ số và biểu đồ trên trang chính',
    steps: [
      {
        id: 'tongquan-kpi',
        target: '[data-guide="tongquan-kpi"]',
        title: '4 chỉ số chính',
        content:
          'Tổng hồ sơ, đã duyệt hợp lệ, số phòng thi và trạng thái hệ thống — cập nhật realtime theo kỳ hiện tại.',
        placement: 'bottom',
      },
      {
        id: 'tongquan-charts',
        target: '[data-guide="tongquan-charts"]',
        title: 'Biểu đồ tiến độ',
        content:
          'Biểu đồ tiến độ tiếp nhận hồ sơ và phân bổ theo vị trí — dùng để báo cáo nhanh cho Lãnh đạo.',
        placement: 'top',
      },
      {
        id: 'tongquan-activity',
        target: '[data-guide="tongquan-activity"]',
        title: 'Hoạt động gần đây',
        content: 'Nhật ký thao tác mới nhất của tất cả người dùng trong hệ thống.',
        placement: 'top',
      },
    ],
  },
  '/dashboard/ho-so': {
    id: 'mini-ho-so',
    title: 'Hướng dẫn trang Hồ sơ',
    description: 'Các thao tác chính trên danh sách hồ sơ',
    steps: [
      {
        target: '[data-guide="ho-so-import"]',
        title: 'Import hàng loạt',
        content:
          'Bấm để nạp file Excel từ Google Form. Hệ thống sẽ preview, phát hiện trùng lặp, sau đó bạn xác nhận để lưu.',
        placement: 'bottom',
      },
      {
        target: '[data-guide="ho-so-filter"]',
        title: 'Bộ lọc & tìm kiếm',
        content:
          'Lọc theo trạng thái (Chờ rà soát / Hợp lệ / Cần bổ sung / Không đủ điều kiện), tìm nhanh theo CCCD, Mã hồ sơ, Họ tên.',
        placement: 'bottom',
      },
      {
        target: '[data-guide="ho-so-list"]',
        title: 'Bảng hồ sơ',
        content:
          'Bấm vào 1 dòng để mở chi tiết, sửa thông tin, xem lịch sử chỉnh sửa hoặc đổi trạng thái hồ sơ.',
        placement: 'top',
      },
    ],
  },
  '/dashboard/vi-tri': {
    id: 'mini-vi-tri',
    title: 'Hướng dẫn trang Vị trí',
    description: 'Quản lý vị trí tuyển dụng',
    steps: [
      {
        target: '[data-guide="vi-tri-list"]',
        title: 'Danh sách vị trí',
        content:
          'Mỗi vị trí gắn liền 1 kỳ tuyển dụng. Bấm vào dòng để chỉnh Chỉ tiêu, Điều kiện tối thiểu hoặc phân bổ vào Đơn vị.',
        placement: 'top',
      },
      {
        target: '[data-guide="vi-tri-create"]',
        title: 'Tạo vị trí mới',
        content: 'Khai báo Mã vị trí, Tên, Đơn vị tuyển dụng, Môn, Chỉ tiêu và Điều kiện tối thiểu.',
        placement: 'left',
      },
    ],
  },
  '/dashboard/phong-thi': {
    id: 'mini-phong-thi',
    title: 'Hướng dẫn trang Phòng thi',
    description: 'Đánh SBD và phân phòng tự động',
    steps: [
      {
        target: '[data-guide="phong-thi-sap-xep"]',
        title: 'Chạy sắp xếp tự động',
        content:
          'Hệ thống tự gom thí sinh theo vị trí, sắp xếp ABC theo tên, sinh SBD tăng dần, rải vào phòng theo sức chứa.',
        placement: 'bottom',
      },
      {
        target: '[data-guide="phong-thi-list"]',
        title: 'Quản lý phòng thi',
        content:
          'Xem danh sách phòng, sĩ số, điều chỉnh thủ công (chuyển thí sinh giữa phòng) và in danh sách niêm yết.',
        placement: 'top',
      },
    ],
  },
  '/dashboard/nhap-diem': {
    id: 'mini-nhap-diem',
    title: 'Hướng dẫn trang Nhập điểm',
    description: 'Quy trình chấm độc lập 2 giám khảo',
    steps: [
      {
        target: '[data-guide="nhap-diem-search"]',
        title: 'Fast Focus theo SBD',
        content:
          'Gõ Số báo danh + Enter. Hệ thống tự bôi sáng dòng tương ứng để nhập điểm liên tục, tránh nhầm dòng.',
        placement: 'bottom',
      },
      {
        target: '[data-guide="nhap-diem-grid"]',
        title: 'Điểm GK1 & GK2',
        content:
          'Mỗi giám khảo nhập điểm độc lập. Cột Điểm thi giảng do hệ thống tự tính = (GK1+GK2)/2 — không nhập tay.',
        placement: 'top',
      },
      {
        target: '[data-guide="nhap-diem-khoa"]',
        title: 'Khóa điểm',
        content:
          'Sau khi rà soát chính xác, bấm "Khóa điểm" để đóng băng, ngăn sửa trái phép sau khi công bố.',
        placement: 'left',
      },
    ],
  },
  '/dashboard/xet-tuyen': {
    id: 'mini-xet-tuyen',
    title: 'Hướng dẫn trang Xét tuyển',
    description: 'Tính điểm, xếp hạng, chạy thuật toán trúng tuyển',
    steps: [
      {
        target: '[data-guide="xet-tuyen-tinh"]',
        title: 'Tính điểm xét tuyển',
        content:
          'Chọn công thức (A hoặc B) theo kỳ → bấm "Tính điểm". Hệ thống tự tính TongDiem + XepHang cho mọi thí sinh.',
        placement: 'bottom',
      },
      {
        target: '[data-guide="xet-tuyen-chay"]',
        title: 'Chạy thuật toán xét tuyển',
        content:
          'Hệ thống so với Chỉ tiêu + Điều kiện tối thiểu, tự gắn Trúng tuyển / Dự phòng / Không trúng tuyển.',
        placement: 'top',
      },
    ],
  },
  '/dashboard/bao-cao': {
    id: 'mini-bao-cao',
    title: 'Hướng dẫn trang Báo cáo',
    description: 'Xuất Excel/Word/PDF',
    steps: [
      {
        target: '[data-guide="bao-cao-xuat"]',
        title: 'Xuất báo cáo',
        content:
          'Chọn loại (Danh sách hồ sơ, Phân phòng, Điểm, Trúng tuyển...) → chọn định dạng Excel/Word/PDF → bấm Xuất.',
        placement: 'top',
      },
    ],
  },
  '/dashboard/cai-dat/system': {
    id: 'mini-cai-dat-system',
    title: 'Hướng dẫn Cài đặt hệ thống',
    description: 'Cấu hình kỳ, phân quyền, thông báo, sao lưu',
    steps: [
      {
        target: '[data-guide="cai-dat-ky"]',
        title: 'Thông tin kỳ tuyển dụng',
        content:
          'Đổi tên kỳ, ngày bắt đầu/kết thúc, sức chứa phòng mặc định, điểm đạt tối thiểu. Đây là dữ liệu nền cho toàn hệ thống.',
        placement: 'bottom',
      },
      {
        target: '[data-guide="cai-dat-users-section"]',
        title: 'Bảo mật & phân quyền',
        content:
          'Danh sách tài khoản theo role. Bấm "Quản lý tài khoản" để thêm/sửa/khóa user, đặt lại mật khẩu.',
        placement: 'top',
      },
      {
        target: '[data-guide="cai-dat-thong-bao"]',
        title: 'Thông báo & cảnh báo',
        content:
          'Bật/tắt cảnh báo chênh lệch điểm GK1-GK2, nhắc nhở hồ sơ chờ duyệt, cảnh báo trước kỳ thi.',
        placement: 'top',
      },
      {
        target: '[data-guide="cai-dat-backup-section"]',
        title: 'Dữ liệu & sao lưu',
        content:
          'Bật sao lưu tự động theo số ngày, xem bản sao lưu gần nhất, hoặc bấm "Sao lưu ngay" để tạo bản backup thủ công.',
        placement: 'top',
      },
    ],
  },
  '/dashboard/cai-dat/backup': {
    id: 'mini-cai-dat-backup',
    title: 'Hướng dẫn Sao lưu & Phục hồi',
    description: 'Quản lý bản sao lưu CSDL',
    steps: [
      {
        target: '[data-guide="backup-create"]',
        title: 'Tạo bản sao lưu',
        content:
          'Bấm "Sao lưu ngay" để đóng gói toàn bộ file SQLite thành file .db. Lưu file này ra phân vùng khác hoặc USB để đảm bảo an toàn dữ liệu.',
        placement: 'bottom',
      },
      {
        target: '[data-guide="backup-list"]',
        title: 'Danh sách bản sao lưu',
        content:
          'Mỗi dòng là 1 bản backup với: Tên file, Kích thước, Ngày tạo. Bấm "Phục hồi" để khôi phục CSDL về thời điểm đó. ' +
          'Lưu ý: trang sẽ tự tải lại sau khi phục hồi, mọi thay đổi chưa lưu sẽ mất.',
        placement: 'top',
      },
    ],
  },
  '/dashboard/cai-dat/users': {
    id: 'mini-cai-dat-users',
    title: 'Hướng dẫn Quản lý tài khoản',
    description: 'Thêm, sửa, khóa tài khoản',
    steps: [
      {
        target: '[data-guide="users-create"]',
        title: 'Thêm tài khoản mới',
        content:
          'Bấm "Thêm tài khoản" để tạo user mới. Nhập username, mật khẩu, họ tên, email và chọn quyền (Admin / Tổ Nhập hồ sơ / Tổ Nhập điểm / Lãnh đạo).',
        placement: 'bottom',
      },
      {
        target: '[data-guide="users-list"]',
        title: 'Danh sách tài khoản',
        content:
          'Mỗi dòng là 1 tài khoản. Có thể: sửa thông tin, đặt lại mật khẩu, khóa/mở khóa, hoặc xóa. Tài khoản đang đăng nhập không thể tự xóa mình.',
        placement: 'top',
      },
    ],
  },
};

/**
 * Tìm mini-tour phù hợp với pathname hiện tại.
 * 1. Exact match trước
 * 2. Prefix match (pathname bắt đầu bằng key + '/')
 * 3. Nếu không có → trả null
 */
export function findMiniTour(pathname: string): GuideTour | null {
  // 1. Exact match
  if (MINI_TOURS[pathname]) return MINI_TOURS[pathname];

  // 2. Longest prefix match (pathname bắt đầu bằng key + '/')
  const prefixMatch = Object.keys(MINI_TOURS)
    .filter((k) => pathname.startsWith(k + '/'))
    .sort((a, b) => b.length - a.length)[0];
  if (prefixMatch) return MINI_TOURS[prefixMatch];

  return null;
}
