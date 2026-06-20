TÀI LIỆU ĐẶC TẢ YÊU CẦU SẢN PHẨM (PRD) CHI TIẾT
PHẦN MỀM WEB QUẢN LÝ TUYỂN DỤNG VIÊN CHỨC NGÀNH GIÁO DỤC
I. TỔNG QUAN DỰ ÁN & KIẾN TRÚC HỆ THỐNG
Tên phần mềm: Phần mềm Web Quản lý tuyển dụng viên chức ngành Giáo dục.
Mục tiêu: Xây dựng một giải pháp phần mềm Web chạy độc lập (offline) trên hệ điều hành Windows nhằm hỗ trợ toàn diện Hội đồng tuyển dụng và các ban ngành liên quan thực hiện quy trình tuyển dụng từ khâu tiếp nhận hồ sơ ban đầu cho đến khi xuất quyết định công nhận kết quả cuối cùng.
Mô hình triển khai:
Ứng dụng Web chạy offline hoàn toàn, không yêu cầu kết nối Internet.
Cơ sở dữ liệu sử dụng hệ quản trị SQLite lưu trữ tại local nhằm tối ưu hóa tốc độ và khả năng sao lưu, phục hồi.
Đối tượng và Phân quyền sử dụng: Hệ thống chia làm 4 nhóm quyền chính truy cập các tính năng nghiệp vụ nhằm đảm bảo tính bảo mật và chống gian lận chéo:
Quản trị hệ thống (Admin): Toàn quyền cấu hình kỳ thi, quản lý người dùng, sao lưu/phục hồi hệ thống.
Tổ Nhập hồ sơ: Thực hiện nhập liệu hồ sơ, rà soát, đánh số báo danh (SBD), phân phòng. (Được phép sửa hồ sơ, KHÔNG được sửa điểm).
Tổ Nhập điểm: Thực hiện thao tác nhập điểm và import điểm thi. (Được phép nhập điểm, KHÔNG được sửa hồ sơ cá nhân của thí sinh).
Lãnh đạo phê duyệt: Quyền "Chỉ xem" (Read-only), KHÔNG có quyền sửa dữ liệu. Thực hiện duyệt khóa dữ liệu, tính điểm xét tuyển, chạy thuật toán trúng tuyển, xem và in toàn bộ hệ thống báo cáo, biểu mẫu.
II. MÔ TẢ CHI TIẾT CHỨC NĂNG NGHIỆP VỤ (9 BƯỚC)
Bước 1: Tiếp nhận hồ sơ đăng ký
Nguồn đầu vào: Thí sinh thực hiện khai báo trực tuyến qua biểu mẫu Google Form. Ban thư ký xuất dữ liệu từ Google Form thành file định dạng Excel (.xlsx) hoặc CSV để nạp vào phần mềm web.
Quy tắc tiền xử lý dữ liệu (Validation Rules): Khi tiến hành import, hệ thống tự động quét và kiểm tra tính toàn vẹn:
Kiểm tra trùng lặp Số Căn cước công dân (CCCD).
Kiểm tra trùng lặp Số điện thoại.
Kiểm tra trùng lặp định dạng Email.
Nếu phát hiện trùng lặp, hệ thống đưa ra danh sách cảnh báo chi tiết dòng bị lỗi để người dùng xử lý.
Thông tin chuyên môn: Do thí sinh là đối tượng sinh viên/tự do, hệ thống KHÔNG sử dụng trường "Đơn vị đăng ký", thay vào đó bổ sung lưu trữ các trường: Trường đào tạo, Năm tốt nghiệp, Ngành đào tạo.
Xử lý mã định danh: Hệ thống tự động sinh Mã hồ sơ (MaHoSo) theo quy tắc định sẵn (ví dụ: TDVC-2026-XXXXX) để đảm bảo tính duy nhất và bảo mật.
Trạng thái vòng đời hồ sơ: Mỗi hồ sơ khi nạp vào sẽ trải qua các trạng thái: Chờ rà soát -> Hợp lệ / Cần bổ sung / Không đủ điều kiện -> Đã chỉnh sửa.
Bước 2: Rà soát hồ sơ & Nhật ký chỉnh sửa
Giao diện làm việc: Cho phép tìm kiếm, tra cứu nhanh theo CCCD, Mã hồ sơ hoặc Họ tên. Người dùng có thẩm quyền có thể chỉnh sửa các thông tin sai sót do thí sinh khai báo nhầm.
Khóa hồ sơ (Chốt danh sách): Sau khi Hội đồng chốt danh sách đủ điều kiện dự tuyển, Lãnh đạo hoặc Admin có chức năng "Khóa hồ sơ". Khi đã khóa, toàn bộ hồ sơ thí sinh sẽ bị đóng băng, không một tài khoản nào có thể sửa đổi thông tin cá nhân nữa.
Cập nhật trạng thái: Đánh dấu hồ sơ đạt yêu cầu (Hợp lệ) hoặc không đạt (Không hợp lệ).
Cơ chế ghi vết dữ liệu (Audit Log): Bất kỳ hành động sửa đổi thông tin hồ sơ nào cũng bắt buộc phải được hệ thống tự động ghi lại vào bảng nhật ký lịch sử:
Mã/Tên người thực hiện sửa đổi.
Thời gian chính xác diễn ra hành động (Timestamp).
Giá trị chi tiết của các trường thông tin trước khi sửa.
Giá trị chi tiết của các trường thông tin sau khi sửa.
Bước 3: Quản lý vị trí tuyển dụng
Khai báo danh mục: Cho phép thiết lập bảng danh mục các vị trí cần tuyển dụng trong kỳ bao gồm: Mã vị trí (ví dụ: TH_TOAN_01), Tên vị trí (ví dụ: Giáo viên Toán THPT), Đơn vị tuyển dụng cụ thể, Môn học/chuyên ngành tương ứng, Chỉ tiêu số lượng (ví dụ: 08) và các tiêu chuẩn/Điều kiện tối thiểu đi kèm.
Bảng này đóng vai trò làm ràng buộc dữ liệu khi thí sinh chọn trường ViTriDangKy.
Bước 4: Đánh số báo danh (SBD) và phân phòng thi
Tham số thiết lập: Người dùng nhập vào tổng số phòng thi khả dụng, sức chứa tối đa của một phòng (ví dụ: 24 hoặc 30 thí sinh/phòng) và cấu hình tiền tố/quy tắc sinh SBD tự động.
Xử lý tự động:
Hệ thống tự động gom các hồ sơ có trạng thái Hợp lệ thuộc cùng vị trí/chuyên ngành, tiến hành sắp xếp theo thứ tự bảng chữ cái ABC của Tên thí sinh, sau đó tự động đánh SBD tăng dần.
Tự động rải thí sinh vào các phòng thi dựa theo sức chứa đã thiết lập.
Điều chỉnh thủ công: Cho phép người dùng chọn một hoặc nhiều thí sinh để chuyển đổi phòng thi thủ công nhằm xử lý các trường hợp đặc biệt, đồng thời tự động cập nhật lại sĩ số phòng.
Kết xuất biểu mẫu: Hỗ trợ kết xuất và in ấn trực tiếp:
Danh sách niêm yết phòng thi (dán trước cửa phòng).
Danh sách gọi tên thí sinh vào phòng thi (có ký tên nhận bài).
Danh sách thí sinh theo từng phòng tổng quát.
Danh sách tổng hợp toàn bộ kỳ tuyển dụng.
Bước 5: Nhập kết quả thi & Khóa điểm
Quản lý trạng thái thi: Bổ sung chức năng quản lý tình trạng điểm danh tại phòng thi. Hệ thống cho phép đánh dấu thí sinh ở các trạng thái: Tham gia, Vắng thi, Bỏ thi. Nếu bị đánh dấu Vắng/Bỏ thi, hệ thống sẽ tự động gán tổng điểm = 0 và loại khỏi danh sách xét tuyển.
Quản lý các đầu điểm: Hệ thống hỗ trợ lưu trữ các loại điểm thành phần, bao gồm:
Điểm thi giảng (Thang điểm: 100).
Điểm phỏng vấn (Thang điểm: 100, tùy chọn cấu hình theo vị trí).
Điểm thực hành (Thang điểm: 100, tùy chọn cấu hình theo vị trí).
Điểm ưu tiên (Nhập trực tiếp giá trị điểm cộng theo quy định hiện hành).
Phương thức nhập liệu: Hỗ trợ nhập thủ công trực tiếp trên lưới dữ liệu (Grid view) của web hoặc Import hàng loạt từ file Excel kết quả chấm thi của Ban giám khảo. Bổ sung chức năng Nhập điểm hàng loạt theo Số báo danh: Cung cấp ô tìm kiếm nhanh, cán bộ nhập liệu gõ Số báo danh, nhấn Enter để hệ thống tự động focus ngay vào dòng của thí sinh đó và nhập điểm liên tục, tiết kiệm tối đa thời gian.
Ràng buộc an toàn dữ liệu:
Chặn không cho phép nhập điểm âm hoặc vượt quá thang điểm 100.
Đưa ra cảnh báo trực quan nếu hồ sơ bị thiếu một trong các đầu điểm bắt buộc của vị trí dự tuyển.
Chức năng Khóa điểm: Sau khi rà soát chính xác, nhấn khóa điểm để đóng băng dữ liệu, ngăn chặn mọi hành vi sửa điểm trái phép sau khi đã công bố.
Bước 6: Tính điểm xét tuyển tự động
Cấu hình công thức linh hoạt: Do tính chất mỗi kỳ tuyển dụng hoặc mỗi nhóm vị trí có thể khác nhau, hệ thống cho phép chọn lựa công thức tính Tổng điểm xét tuyển:
Công thức A: Tổng điểm = Điểm thi giảng + Điểm ưu tiên.
Công thức B: Tổng điểm = Điểm vòng 2 (Thi giảng hoặc Phỏng vấn hoặc Thực hành) + Điểm ưu tiên.
Xử lý dữ liệu: Hệ thống tự động tính toán giá trị TongDiem cho toàn bộ thí sinh chỉ với một cú click và tự động sinh thứ tự xếp hạng (XepHang) nội bộ trong cùng một vị trí đăng ký dự tuyển.
Bước 7: Quy trình xét tuyển & Gắn trạng thái trúng tuyển
Tiêu chí lọc: Hệ thống dựa vào ChiTieu của từng vị trí kết hợp với cấu hình Điều kiện tối thiểu (ví dụ: điểm vòng 2 phải đạt từ 50 điểm trở lên mới được xét).
Thuật toán xét tuyển:
Sắp xếp thí sinh theo thứ tự XepHang từ cao xuống thấp của vị trí đó.
Lấy từ trên xuống dưới cho đến khi đủ chỉ tiêu và tự động gắn trạng thái: Trúng tuyển.
Các thí sinh liền kề nằm ngoài chỉ tiêu nhưng đạt điều kiện tối thiểu sẽ được gắn trạng thái: Dự phòng.
Các thí sinh còn lại hoặc không đạt điều kiện tối thiểu gắn trạng thái: Không trúng tuyển.
Tiêu chí xử lý đồng điểm: Cho phép thiết lập thứ tự ưu tiên xử lý khi có hai hoặc nhiều thí sinh bằng điểm nhau ở chỉ tiêu cuối cùng (ví dụ: ưu tiên điểm thi giảng cao hơn, hoặc ưu tiên đối tượng chính sách).
Bước 8: Hệ thống báo cáo, kết xuất biểu mẫu
Hệ thống tích hợp module xuất dữ liệu tự động ra các định dạng văn phòng tiêu chuẩn:
Xuất Excel (.xlsx): Phục vụ lưu trữ dữ liệu động bao gồm Danh sách hồ sơ thí sinh, Danh sách phân phòng thi, Danh sách điểm số, Danh sách thí sinh trúng tuyển.
Xuất Word (.docx): Phục vụ in ấn văn bản hành chính theo form chuẩn bao gồm Quyết định công nhận kết quả, Thông báo kết quả tuyển dụng gửi thí sinh, Danh sách trúng tuyển/không trúng tuyển đính kèm, Biên bản tổng hợp kết quả của hội đồng, Báo cáo thống kê số liệu.
Xuất PDF: Cho phép kết xuất toàn bộ các biểu mẫu trên sang định dạng PDF để lưu trữ cố định hoặc gửi ký số.
Bước 9: Quản trị hệ thống, Sao lưu & Nhật ký thao tác
Quản lý dữ liệu an toàn: Tích hợp tính năng đóng gói toàn bộ file CSDL SQLite thành file backup lưu trữ ở phân vùng khác hoặc thiết bị ngoại vi, hỗ trợ phục hồi nguyên trạng hệ thống khi gặp sự cố phần cứng.
Nhật ký hệ thống tổng thể (System Log): Ghi vết tự động tất cả các thao tác quan trọng trên phần mềm web để phục vụ công tác thanh tra, giám sát bao gồm: Lịch sử Đăng nhập hệ thống, Thao tác nhập/import dữ liệu, Sửa đổi hồ sơ, Sửa điểm số, và thời điểm thực hiện lệnh chạy thuật toán Xét tuyển.
III. THIẾT KẾ CHI TIẾT CƠ SỞ DỮ LIỆU (SQLITE SCHEMA)
Để đảm bảo hệ thống vận hành trơn tru với quy mô dữ liệu tối thiểu trên 10.000 hồ sơ và lưu trữ được lịch sử của hơn 50 kỳ tuyển dụng khác nhau, cấu trúc dữ liệu SQLite được chi tiết hóa các kiểu dữ liệu và ràng buộc như sau:
SQL
-- 1. Bảng lưu trữ thông tin các Kỳ tuyển dụng (Để đáp ứng yêu cầu tối thiểu 50 kỳ tuyển dụng)
CREATE TABLE KY_TUYENDUNG (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    TenKyTuyenDung TEXT NOT NULL,
    NamThucHien INTEGER NOT NULL,
    NgayBatDau TEXT,
    NgayKetThuc TEXT,
    TrangThai TEXT DEFAULT 'DangDienRa' -- 'DangDienRa', 'DaKetThuc'
);

-- 2. Bảng cấu hình Danh mục Vị trí tuyển dụng
CREATE TABLE VITRI_TUYENDUNG (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    KyTuyenDungID INTEGER NOT NULL,
    MaViTri TEXT NOT NULL,
    TenViTri TEXT NOT NULL,
    DonViTuyenDung TEXT NOT NULL,
    MonHocChuyenNganh TEXT,
    ChiTieu INTEGER NOT NULL DEFAULT 0,
    DieuKienToiThieu TEXT,
    FOREIGN KEY (KyTuyenDungID) REFERENCES KY_TUYENDUNG(ID),
    UNIQUE(KyTuyenDungID, MaViTri) -- Tránh trùng mã vị trí trong cùng 1 kỳ
);

-- 3. Bảng thông tin chi tiết Thí sinh
CREATE TABLE THISINH (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    KyTuyenDungID INTEGER NOT NULL,
    MaHoSo TEXT NOT NULL,
    HoTen TEXT NOT NULL,
    NgaySinh TEXT NOT NULL,
    GioiTinh TEXT NOT NULL,
    CCCD TEXT NOT NULL,
    DienThoai TEXT NOT NULL,
    Email TEXT NOT NULL,
    DiaChi TEXT,
    TrinhDoDaoTao TEXT,
    ChuyenNganh TEXT,
    ViTriDangKy TEXT NOT NULL, -- Link tới MaViTri
    TruongDaoTao TEXT,      -- MỚI BỔ SUNG
    NamTotNghiep INTEGER,   -- MỚI BỔ SUNG
    NganhDaoTao TEXT,       -- MỚI BỔ SUNG
    DoiTuongUuTien TEXT,
    GhiChu TEXT,
    TrangThaiHoSo TEXT NOT NULL DEFAULT 'ChoRaSoat', -- 'ChoRaSoat', 'HopLe', 'CanBoSung', 'KhongDuDieuKien', 'DaChinhSua'
    IsProfileLocked INTEGER DEFAULT 0, -- MỚI BỔ SUNG: 0: Chưa khóa, 1: Đã khóa hồ sơ
    PhongThiID INTEGER,
    SBD TEXT,
    FOREIGN KEY (KyTuyenDungID) REFERENCES KY_TUYENDUNG(ID),
    FOREIGN KEY (PhongThiID) REFERENCES PHONGTHI(ID),
    UNIQUE(KyTuyenDungID, MaHoSo),
    UNIQUE(KyTuyenDungID, CCCD) -- Tránh một thí sinh nộp 2 hồ sơ trong cùng 1 kỳ tuyển dụng
);

-- 4. Bảng cấu hình danh sách Phòng thi
CREATE TABLE PHONGTHI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    KyTuyenDungID INTEGER NOT NULL,
    TenPhong TEXT NOT NULL,
    SoLuong INTEGER NOT NULL DEFAULT 0, -- Sức chứa tối đa của phòng thi
    FOREIGN KEY (KyTuyenDungID) REFERENCES KY_TUYENDUNG(ID)
);

-- 5. Bảng quản lý Điểm thi của thí sinh
CREATE TABLE DIEMTHI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ThiSinhID INTEGER NOT NULL UNIQUE,
    TrangThaiThi TEXT DEFAULT 'ThamGia', -- MỚI BỔ SUNG: 'ThamGia', 'VangThi', 'BoThi'
    DiemThiGiang REAL DEFAULT 0.0,
    DiemPhongVan REAL DEFAULT 0.0,
    DiemThucHanh REAL DEFAULT 0.0,
    DiemUuTien REAL DEFAULT 0.0,
    TongDiem REAL DEFAULT 0.0,
    IsLocked INTEGER DEFAULT 0, -- 0: Chưa khóa, 1: Đã khóa điểm
    FOREIGN KEY (ThiSinhID) REFERENCES THISINH(ID)
);

-- 6. Bảng lưu trữ Kết quả xếp hạng và Xét tuyển cuối cùng
CREATE TABLE KETQUA (
    ThiSinhID INTEGER PRIMARY KEY,
    XepHang INTEGER,
    TrangThaiTrungTuyen TEXT NOT NULL, -- 'TrungTuyen', 'KhongTrungTuyen', 'DuPhong'
    GhiChuXetTuyen TEXT,
    FOREIGN KEY (ThiSinhID) REFERENCES THISINH(ID)
);

-- 7. Bảng Nhật ký chỉnh sửa hồ sơ thí sinh (Audit Log phục vụ Bước 2)
CREATE TABLE HIST_CHINH_SUA (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ThiSinhID INTEGER NOT NULL,
    NguoiSua TEXT NOT NULL,
    ThoiGianSua TEXT NOT NULL, -- ISO8601 String
    NoiDungTruocSua TEXT, -- Dạng JSON lưu trạng thái cũ
    NoiDungSauSua TEXT,   -- Dạng JSON lưu trạng thái mới
    FOREIGN KEY (ThiSinhID) REFERENCES THISINH(ID)
);

-- 8. Bảng Nhật ký hệ thống (System Log phục vụ Bước 9)
CREATE TABLE LOG_HE_THONG (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    TaiKhoan TEXT NOT NULL,
    ThaoTac TEXT NOT NULL, -- 'DangNhap', 'NhapDuLieu', 'SuaHoSo', 'SuaDiem', 'XetTuyen'
    ChiTiet TEXT,
    ThoiGian TEXT NOT NULL
);


V. PHỤ LỤC: GHI CHÚ BỔ SUNG YÊU CẦU NGHIỆP VỤ & CÔNG NGHỆ ÁP DỤNG
(Các ghi chú dưới đây là ràng buộc kỹ thuật bắt buộc nhằm đáp ứng đúng nghiệp vụ thực tế của Hội đồng thi tuyển và đảm bảo tính linh hoạt, bền vững của hệ thống)
1. Ràng buộc về cơ chế nhập Điểm thi giảng (Cơ chế chấm độc lập)
Mô tả nghiệp vụ thực tiễn: Nhằm đảm bảo tính khách quan và tránh sai sót khi tính toán thủ công ngoài phòng thi, quá trình chấm thi giảng sẽ do tối thiểu 02 Giám khảo thực hiện độc lập. Điểm chính thức của vòng thi này là trung bình cộng của 02 điểm số.
Giải pháp trên phần mềm (Giao diện & Logic):
Trong module "Nhập điểm", phần Điểm thi giảng phải được phân tách thành 02 cột nhập liệu độc lập: [Điểm Giám khảo 1] và [Điểm Giám khảo 2].
Hệ thống không cho phép Thư ký tự gõ thủ công Điểm thi giảng tổng.
Thư ký chỉ thực hiện nhập điểm thô từ phiếu chấm. Hệ thống tự động thiết lập công thức: Điểm thi giảng chính thức = ([Điểm GK 1] + [Điểm GK 2]) / 2 và hiển thị kết quả cuối cùng ngay trên lưới.
Cập nhật CSDL (SQLite): Bảng DIEMTHI bổ sung 02 trường DiemThiGiang_GK1 và DiemThiGiang_GK2 để lưu vết chi tiết phục vụ công tác thanh tra/phúc khảo.
2. Đồng bộ quy trình "Làm phách / Chấm thi mù" với Hệ thống
Bản chất nghiệp vụ: Tại phòng thi, thí sinh không sử dụng Số báo danh (SBD) để làm bài mà bốc thăm một "Mã số bất kỳ" (Phách) để Giám khảo chấm điểm (không biết danh tính thí sinh). Sau đó, Giám thị vòng ngoài sẽ thực hiện ráp phách (đối chiếu "Mã số" với "SBD") và đọc kết quả để Thư ký nhập điểm vào phần mềm.
Quy trình ứng dụng trên hệ thống:
Luồng logic cốt lõi của phần mềm KHÔNG thay đổi, hệ thống vẫn lưu trữ, liên kết dữ liệu và xếp hạng dựa trên khóa định danh gốc là Số báo danh (SBD).
Tối ưu trải nghiệm (UX): Để hỗ trợ Thư ký (người cầm bảng quy chiếu Phách - SBD) tác nghiệp với tốc độ cao, module Nhập điểm được trang bị cơ chế "Fast Focus": Cung cấp ô tìm kiếm nhanh, Thư ký gõ SBD -> Nhấn Enter. Hệ thống tự động bôi sáng dòng tương ứng của thí sinh đó trên lưới để nhập ngay điểm GK1, GK2 mà không cần dùng chuột click tìm kiếm, tránh nguy cơ nhập nhầm dòng.
3. Cơ chế cấu hình Biểu mẫu Động (Dynamic Template Engine)
Vấn đề thực tiễn: Các biểu mẫu hành chính (Quyết định trúng tuyển, Thông báo, Biên bản...) thường xuyên thay đổi thể thức, font chữ, quốc hiệu tùy theo các Thông tư/Nghị định mới của Nhà nước. Nếu đóng cứng (hard-code) biểu mẫu vào mã nguồn, Hội đồng thi sẽ bị phụ thuộc vào đơn vị phát triển phần mềm mỗi khi cần cập nhật.
Giải pháp công nghệ áp dụng:
Đội ngũ phát triển TUYỆT ĐỐI KHÔNG lập trình cứng (hard-code) cấu trúc biểu mẫu báo cáo vào phần mềm.
Hệ thống phải tích hợp cơ chế Biểu mẫu động (Word Templating). Cụ thể:
Phần mềm đi kèm một thư mục gốc (Local Directory) chứa các file tài liệu định dạng chuẩn (.docx).
Trong các file .docx mẫu này, lập trình viên cài đặt sẵn các biến dữ liệu (Placeholder) được quy ước, ví dụ: {{Ho_Ten}}, {{So_Bao_Danh}}, {{Diem_Thi}}.
Khi người dùng bấm lệnh "Xuất báo cáo", hệ thống sẽ tự động quét file Word mẫu, tìm và thay thế (Find & Replace) các biến {{...}} bằng dữ liệu thực tế lấy từ CSDL để xuất ra file hoàn chỉnh.
Quyền tự chủ của người dùng: Bất cứ khi nào có thay đổi về quy định văn bản, Lãnh đạo hoặc Quản trị viên có quyền tự mở các file .docx mẫu này lên bằng MS Word để chỉnh sửa tự do (căn lề, đổi font, thay câu chữ, chèn logo). Miễn là giữ nguyên các thẻ {{...}}, phần mềm sẽ tự động nội suy và xuất file báo cáo theo đúng định dạng mới nhất mà không cần can thiệp sửa đổi mã nguồn.
Ghi chú triển khai: Đội ngũ lập trình sẽ xây dựng bộ khung thuật toán dữ liệu trước. Các file biểu mẫu Word chuẩn sẽ được tích hợp vào hệ thống ở Giai đoạn 2 sau khi Hội đồng cung cấp biểu mẫu chính thức theo Thông tư hiện hành.
Ghi chú dành cho đội Lập trình (Cập nhật lại Bảng số 5 trong Mục III - Thiết kế CSDL):
SQL
-- 5. Bảng quản lý Điểm thi của thí sinh (Bản cập nhật)
CREATE TABLE DIEMTHI (
    ID INTEGER PRIMARY KEY AUTOINCREMENT,
    ThiSinhID INTEGER NOT NULL UNIQUE,
    TrangThaiThi TEXT DEFAULT 'ThamGia', -- 'ThamGia', 'VangThi', 'BoThi'
    DiemThiGiang_GK1 REAL DEFAULT 0.0,    -- MỚI BỔ SUNG: Điểm Giám khảo 1
    DiemThiGiang_GK2 REAL DEFAULT 0.0,    -- MỚI BỔ SUNG: Điểm Giám khảo 2
    DiemThiGiang REAL DEFAULT 0.0,        -- HỆ THỐNG TỰ TÍNH: (GK1 + GK2) / 2
    DiemPhongVan REAL DEFAULT 0.0,
    DiemThucHanh REAL DEFAULT 0.0,
    DiemUuTien REAL DEFAULT 0.0,
    TongDiem REAL DEFAULT 0.0,
    IsLocked INTEGER DEFAULT 0,           -- 0: Chưa khóa, 1: Đã khóa điểm
    FOREIGN KEY (ThiSinhID) REFERENCES THISINH(ID)
);

4. Bổ sung Biểu mẫu: Danh sách thí sinh tại Phòng chờ (Nghiệp vụ Thi giảng)
Bản chất nghiệp vụ: Đặc thù của hình thức thi giảng yêu cầu thí sinh sau khi bốc thăm nội dung sẽ có một khoảng thời gian (thường là 30 phút) ngồi tại Phòng chờ để soạn bài/chuẩn bị đề cương trước khi bước vào phòng thi chính thức gặp Giám khảo. Do đó, Hội đồng cần một biểu mẫu danh sách độc lập cho khu vực này để giám thị canh giờ và điểm danh từng người.
Giải pháp xử lý trên phần mềm:
Về mặt logic dữ liệu: Tập hợp thí sinh tại một Phòng chờ hoàn toàn đồng nhất với danh sách thí sinh của Phòng thi đó (Thí sinh thi ở Phòng 01 sẽ ngồi tại Phòng chờ 01). Do vậy, phần mềm dùng chung nguồn dữ liệu phân phòng mà không cần tạo thêm cấu trúc lưu trữ (Table) mới.
Cơ chế Template Word: Áp dụng cơ chế Biểu mẫu động (đã nêu ở Mục 3), file Word mẫu của danh sách này (Mau_DS_PhongCho.docx) sẽ tự động lấy dữ liệu cơ bản (SBD, Họ tên, Vị trí thi) từ phần mềm. Đồng thời, form mẫu này được kẻ sẵn các cột trống để Giám thị ghi chép thực tế tại hiện trường, bao gồm:
Cột: [Mã đề / Phách bốc thăm] (Để trống cho Giám thị ghi tay)
Cột: [Thời gian bắt đầu chuẩn bị bài] (Để trống)
Cột: [Thời gian kết thúc 30 phút / Gọi vào phòng thi] (Để trống)
Cột: [Chữ ký xác nhận của thí sinh] (Để trống cho thí sinh ký)
