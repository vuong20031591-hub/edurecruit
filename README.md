# EduRecruit

> Hệ thống quản lý tuyển dụng viên chức — Sở Giáo dục và Đào tạo Lạng Sơn

Web app chạy nội bộ (offline), lưu trữ SQLite có mã hóa, dùng cho công tác quản lý hồ sơ thí sinh, xếp phòng thi, nhập điểm, chạy xét tuyển và xuất báo cáo.

## Tech stack

| Layer | Technology |
|---|---|
| Runtime | Node.js >= 22 |
| Framework | Next.js 15 (App Router) |
| UI | React 19 + TailwindCSS + Radix UI |
| Database | SQLite (SQLCipher AES-256) via `better-sqlite3-multiple-ciphers` |
| Auth | JWT (jose) + bcryptjs |
| Word | `docx-templates` 4.x (template engine do user tự sửa trong MS Word) |
| Excel | `exceljs` 4.x (import từ Google Form, export báo cáo có format) |
| PDF | Browser native `window.print()` → "Save as PDF" |
| Validation | zod |
| Charts | recharts |
| Icons | lucide-react |

## Tài liệu

Toàn bộ tài liệu đặc tả nằm trong `docs/`:

- `prd.md` — Yêu cầu sản phẩm (gốc)
- `original_description.md` — Bản mô tả ban đầu
- `link_figma.md` — Link Figma (6 mockup)
- `architecture-spec.md` — Kiến trúc chi tiết
- `database-design.md` — Schema DB (16 bảng + 4 triggers)
- `domain-model.md` — Domain model
- `workflow-spec.md` — Workflow 9 bước
- `ui-ux-spec.md` — UI/UX spec
- `sample-data-mapping.md` — Mapping file thực tế → DB
- `open-questions.md` — Câu hỏi & giả định
- `adr-001-architecture-decision.md` — ADR kiến trúc
- `adr-002-document-and-excel-engine.md` — ADR engine Word/Excel

## Cài đặt

### Yêu cầu

- **Node.js 22+** ([download](https://nodejs.org))
- **Windows 10/11** (đã test trên win32)
- **Visual Studio Build Tools 2022** (cho `better-sqlite3-multiple-ciphers` build native)
  - Tải tại: https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022
  - Chọn workload "Desktop development with C++"

### Bước 1: Cài dependencies

```powershell
npm install
```

Nếu gặp lỗi build native module, chạy:

```powershell
npm install --build-from-source
```

### Bước 2: Cấu hình môi trường

```powershell
# Tạo file .env.local từ template
Copy-Item .env.local.example .env.local

# Generate JWT secret ngẫu nhiên (32 bytes hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate DB key ngẫu nhiên (32 bytes hex = 64 chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Paste 2 giá trị trên vào .env.local
notepad .env.local
```

### Bước 3: Khởi tạo database

```powershell
npm run db:migrate
```

Lệnh này sẽ:
- Tạo file `data/edurecruit.db` (đã mã hóa nếu có `DB_KEY`)
- Chạy migration `0001_initial_schema.sql` (16 bảng + 4 triggers)
- Chạy migration `0002_seed_data.sql` (4 users, 3 templates, system config)

### Bước 4: Chạy dev server

```powershell
npm run dev
```

Mở http://localhost:3000

### Tài khoản mặc định

| Username | Password | Role |
|---|---|---|
| `admin` | `admin123` | Quản trị |
| `nhaphoso` | `admin123` | Tổ Nhập Hồ Sơ |
| `nhapdiem` | `admin123` | Tổ Nhập Điểm |
| `lanhdao` | `admin123` | Lãnh đạo |

> **Quan trọng:** Đổi mật khẩu ngay sau lần đăng nhập đầu tiên.

## Scripts

```powershell
npm run dev          # Chạy dev server (port 3000)
npm run build        # Build production
npm run start        # Chạy production server
npm run lint         # ESLint
npm run typecheck    # TypeScript check
npm test             # Vitest unit tests
npm run test:e2e     # Playwright E2E
npm run db:migrate   # Chạy migrations
npm run db:seed      # Seed data
npm run db:reset     # Xóa DB và tạo lại (DEV only)
npm run db:backup    # Tạo backup .zip
```

## Cấu trúc dự án

```
edurecruit/
├── docs/                       # Tài liệu đặc tả
├── data/
│   ├── edurecruit.db          # SQLite (encrypted)
│   ├── templates/             # Word templates (user tự sửa)
│   └── backups/               # *.zip backups
├── logs/
├── public/
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/login/
│   │   ├── (dashboard)/       # Layout có sidebar
│   │   │   ├── _components/   # Sidebar, Header
│   │   │   ├── page.tsx       # Tổng quan
│   │   │   ├── ho-so/         # F1, F2
│   │   │   ├── vi-tri/        # F3
│   │   │   ├── don-vi/        # F3
│   │   │   ├── phong-thi/     # F4
│   │   │   ├── nhap-diem/     # F5
│   │   │   ├── xet-tuyen/     # F6, F7
│   │   │   ├── bao-cao/       # F8
│   │   │   ├── audit/         # A2
│   │   │   └── cai-dat/       # F9
│   │   └── api/               # 32 API routes
│   ├── modules/               # 15 business modules
│   │   ├── auth/              # types, repository, service
│   │   ├── hosso/
│   │   ├── vitri/
│   │   ├── donvi/
│   │   ├── phongthi/
│   │   ├── diemthi/
│   │   ├── xettuyen/
│   │   ├── baocao/
│   │   ├── audit/
│   │   ├── template/          # A3 - Word rendering
│   │   ├── excel/             # A4 - Excel import/export
│   │   ├── print/             # A5 - PDF print
│   │   ├── backup/            # A6 - Backup/restore
│   │   ├── quyetdinh/         # A8 - Quyết định
│   │   ├── users/             # F9 - User management
│   │   └── congthuc/          # F6 - Công thức xét tuyển
│   ├── shared/                # Shared code
│   │   ├── components/        # Button, Card, Table, ...
│   │   ├── lib/               # format, validation, cn
│   │   ├── types/
│   │   ├── constants/         # enums, messages
│   │   └── hooks/
│   ├── db/                    # Database layer
│   │   ├── index.ts           # better-sqlite3 singleton
│   │   ├── schema.ts          # TypeScript types
│   │   ├── migrate.ts         # Migrations runner
│   │   └── migrations/        # *.sql files
│   ├── server/                # Server-only helpers
│   │   ├── auth.ts            # JWT + bcrypt
│   │   ├── audit.ts           # Audit log
│   │   ├── permissions.ts     # RBAC
│   │   ├── api.ts             # API helpers
│   │   └── word-renderer.ts   # docx-templates wrapper
│   └── middleware.ts          # Auth middleware
├── tests/
│   ├── unit/                  # Vitest
│   └── e2e/                   # Playwright
└── scripts/                   # CLI tools
```

## Phân quyền (RBAC)

| Quyền | ADMIN | Tổ Nhập HS | Tổ Nhập Điểm | Lãnh đạo |
|---|:-:|:-:|:-:|:-:|
| Quản lý hồ sơ | ✓✓ | ✓ | x | xem |
| Rà soát hồ sơ | ✓✓ | ✓ | x | xem |
| Nhập điểm | ✓ | x | ✓ | xem |
| Khóa điểm | ✓ | x | ✓ | x |
| Chạy xét tuyển | ✓ | x | x | ✓ |
| Ký quyết định | ✓ | x | x | ✓ |
| Quản lý user | ✓ | x | x | x |
| Sao lưu/phục hồi | ✓ | x | x | x |
| Xem audit log | ✓ | x | x | ✓ |

## Workflow 9 bước (theo PRD)

1. **Import hồ sơ** — Tổ Nhập HS upload Excel
2. **Rà soát hồ sơ** — Tổ Nhập HS đánh dấu Hợp lệ / Cần bổ sung / Không đủ điều kiện
3. **Khai báo vị trí & đơn vị** — Admin tạo vị trí, đơn vị
4. **Xếp phòng thi** — Tự động xếp TS theo phòng, sort theo TÊN
5. **Nhập điểm** — Tổ Nhập Điểm nhập GK1, GK2, khóa điểm
6. **Tính điểm** — Trigger tự động: `diem_thi_giang = (GK1+GK2)/2`
7. **Chạy xét tuyển** — Thuật toán ưu tiên đồng điểm
8. **Ký quyết định** — Lãnh đạo tạo QĐ phê duyệt
9. **Audit & Báo cáo** — Xuất Excel, Word, PDF

## Triển khai nội bộ

Hệ thống được phân phối dưới dạng folder `.zip` cho mỗi máy Sở GDĐT, bao gồm:

- Folder `edurecruit/` chứa toàn bộ code
- File `start.bat` để chạy nhanh
- File `data/` đã có sẵn schema + seed
- File `data/templates/` chứa 8 mẫu Word

User chỉ cần:
1. Cài Node.js 22
2. Giải nén `.zip`
3. Chạy `start.bat`

## Tình trạng triển khai

| Phase | Trạng thái |
|---|---|
| Phase 1: Setup & Foundation | ✅ Hoàn thành (skeleton) |
| Phase 2: Auth & Layout | ✅ Hoàn thành (skeleton) |
| Phase 3: Core modules (F1-F5) | 🚧 Skeleton (TODO) |
| Phase 4: Reports (F6-F8) | 🚧 Skeleton (TODO) |
| Phase 5: Admin (F9, A1-A8) | 🚧 Skeleton (TODO) |
| Phase 6: Hardening & Tests | 📋 Chưa bắt đầu |

## Liên hệ

- **Project lead:** Sở GDĐT Lạng Sơn
- **Tech lead:** Development team
- **Spec docs:** `docs/` (xem trên)

---

Phiên bản: 0.1.0 · Cập nhật: 18/06/2026
#   e d u r e c r u i t  
 