'use client';
import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { GraduationCap, ShieldCheck } from 'lucide-react';
import { Button, Input, Card, CardBody } from '@/shared/components';

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', label: 'Quản trị hệ thống', quyen: 'ADMIN' },
  { username: 'nhaphoso', password: 'admin123', label: 'Tổ Nhập Hồ Sơ', quyen: 'TO_NHAP_HOSO' },
  { username: 'nhapdiem', password: 'admin123', label: 'Tổ Nhập Điểm', quyen: 'TO_NHAP_DIEM' },
  { username: 'lanhdao', password: 'admin123', label: 'Lãnh đạo Sở', quyen: 'LANH_DAO' }
];

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get('redirect') || '/dashboard';

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || 'Đăng nhập thất bại');
        return;
      }
      // Dùng window.location.href thay vì router.push để tránh cache điều hướng của Next.js client
      // và đảm bảo cookie được ghi nhận hoàn toàn trước khi tải trang đích.
      window.location.href = redirect;
    } catch (err) {
      setError('Lỗi kết nối, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] bg-slate-50 lg:grid-cols-12">
      <aside className="relative isolate overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand-900 px-8 py-12 sm:px-12 lg:col-span-5 lg:flex lg:flex-col lg:justify-between lg:px-16 lg:py-16">
        <div className="relative flex items-center gap-3 text-white">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/20">
            <GraduationCap className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-base font-semibold tracking-tight">EduRecruit</span>
        </div>

        <div className="relative mt-12 max-w-md lg:mt-0">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            Hệ thống quản lý tuyển dụng viên chức
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-slate-300">
            Nền tảng số hóa toàn diện cho công tác tuyển dụng, quản lý hồ sơ và xét duyệt viên chức
            ngành giáo dục.
          </p>

          <div className="mt-8 flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-4">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-300" strokeWidth={1.75} aria-hidden />
            <div className="text-sm text-slate-200">
              <p className="font-medium text-white">Bảo mật cấp ngành</p>
              <p className="mt-1 text-slate-300">Mọi phiên đăng nhập được mã hóa và ghi nhận nhật ký kiểm toán.</p>
            </div>
          </div>
        </div>

        <div className="relative mt-12 text-xs text-slate-400 lg:mt-0">
          <p className="font-medium text-slate-200">Sở Giáo dục và Đào tạo Lạng Sơn</p>
          <p className="mt-1">© 2026. Bảo lưu mọi quyền.</p>
        </div>
      </aside>

      <main className="flex items-center justify-center px-6 py-12 sm:px-10 lg:col-span-7 lg:px-16">
        <div className="w-full max-w-md">
          <div className="mb-8">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Đăng nhập</h2>
            <p className="mt-2 text-sm text-slate-600">Nhập thông tin tài khoản để tiếp tục làm việc.</p>
          </div>

          <Card className="rounded-xl border-slate-200/80 bg-white shadow-xl shadow-slate-900/5">
            <CardBody className="p-6 sm:p-8">
              <form onSubmit={handleSubmit} className="space-y-5">
                <Input
                  label="Tên đăng nhập"
                  required
                  autoComplete="username"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="admin"
                />
                <Input
                  label="Mật khẩu"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                />

                {error && (
                  <div
                    role="alert"
                    className="rounded-lg border border-status-danger/20 bg-status-danger/5 px-3 py-2.5 text-sm text-status-danger"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  loading={loading}
                  className="h-11 w-full text-sm font-medium shadow-sm shadow-brand-600/20"
                >
                  Đăng nhập
                </Button>
              </form>
            </CardBody>
          </Card>

          <div className="mt-6 rounded-lg border border-slate-200/80 bg-white p-4 text-xs text-slate-600">
            <p className="font-medium text-slate-700">Tài khoản demo (bấm để điền nhanh)</p>
            <p className="mt-1 text-slate-500">Mật khẩu chung: <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-slate-800">admin123</code></p>
            <div className="mt-2.5 grid grid-cols-2 gap-1.5">
              {DEMO_ACCOUNTS.map(acc => (
                <button
                  key={acc.username}
                  type="button"
                  onClick={() => { setUsername(acc.username); setPassword(acc.password); }}
                  className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-left text-[11px] transition hover:border-brand-300 hover:bg-brand-50"
                >
                  <div className="font-mono text-slate-800">{acc.username}</div>
                  <div className="text-slate-500">{acc.label}</div>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-slate-500">Vui lòng đổi mật khẩu ngay sau lần đăng nhập đầu tiên.</p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="flex min-h-[100dvh] items-center justify-center bg-slate-50">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
