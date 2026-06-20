'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  Calendar, Shield, Bell, Database, Save, RotateCcw,
  User, ChevronRight, AlertCircle, CheckCircle2, RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { PageHeader, Button, Input, Spinner, toast } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import { cn } from '@/shared/lib/cn';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfigMap { [key: string]: string; }

interface UserRow {
  id: number;
  ho_ten: string;
  username: string;
  quyen: string;
  trang_thai: string;
}

interface BackupInfo {
  file: string;
  size_kb: number;
  created_at: string;
}

const QUYEN_LABEL: Record<string, string> = {
  ADMIN: 'ADMIN',
  TO_NHAP_HOSO: 'NHẬP HỒ SƠ',
  TO_NHAP_DIEM: 'NHẬP ĐIỂM',
  LANH_DAO: 'LÃNH ĐẠO',
};

const CONFIG_KEYS = [
  'phong_thi.suc_chua_mac_dinh',
  'xet_tuyen.diem_dat',
  'canh_bao_chenh_lech',
  'nhac_ho_so_cho_duyet',
  'canh_bao_truoc_ky_thi_ngay',
  'backup.auto_interval_days',
];

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({ icon: Icon, title, children }: { icon: React.ElementType; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
      <div className="flex items-center gap-3 border-b border-slate-100 bg-slate-50 px-5 py-3.5">
        <Icon size={16} className="text-slate-500" />
        <h3 className="text-base font-semibold text-slate-700">{title}</h3>
      </div>
      <div className="px-5 py-5">{children}</div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-semibold text-slate-600 mb-1.5">{children}</label>;
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
        checked ? 'bg-brand-600' : 'bg-slate-300',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform',
        checked ? 'translate-x-4' : 'translate-x-0.5'
      )} />
    </button>
  );
}

// ─── Checkbox item ────────────────────────────────────────────────────────────

function CheckItem({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-brand-600"
      />
      <div>
        <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{label}</p>
        <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
      </div>
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

// ─── KyForm state ─────────────────────────────────────────────────────────────

interface KyForm {
  ten_ky: string;
  ngay_bat_dau: string;
  ngay_ket_thuc: string;
}

export default function CaiDatSystemPage() {
  const router = useRouter();
  const { data: topbar, refresh: refreshTopbar } = useTopbar();
  const ky = topbar.ky;

  // State kỳ tuyển dụng
  const [kyForm, setKyForm] = useState<KyForm>({ ten_ky: '', ngay_bat_dau: '', ngay_ket_thuc: '' });
  const [kyOriginal, setKyOriginal] = useState<KyForm>({ ten_ky: '', ngay_bat_dau: '', ngay_ket_thuc: '' });
  const [kySaving, setKySaving] = useState(false);

  // Local state — đọc từ DB, có thể thay đổi trước khi Lưu
  const [config, setConfig] = useState<ConfigMap>({});
  const [originalConfig, setOriginalConfig] = useState<ConfigMap>({});
  const [users, setUsers] = useState<UserRow[]>([]);
  const [latestBackup, setLatestBackup] = useState<BackupInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [backingUp, setBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ─── Load ────────────────────────────────────────────────────────────────

  // Sync kyForm khi topbar.ky thay đổi
  useEffect(() => {
    if (ky) {
      const form: KyForm = {
        ten_ky: ky.ten_ky ?? '',
        ngay_bat_dau: ky.ngay_bat_dau ?? '',
        ngay_ket_thuc: ky.ngay_ket_thuc ?? '',
      };
      setKyForm(form);
      setKyOriginal(form);
    }
  }, [ky]);

  const cfgRes = usePageFetch<ConfigMap>(`/api/config?keys=${CONFIG_KEYS.join(',')}`, { fallback: {} });
  const usersRes = usePageFetch<unknown>('/api/users?all=true', { fallback: null as unknown });
  const backupRes = usePageFetch<{ backups: BackupInfo[] }>('/api/backup/list', { fallback: { backups: [] } });

  useEffect(() => {
    setLoading(cfgRes.loading || usersRes.loading || backupRes.loading);
  }, [cfgRes.loading, usersRes.loading, backupRes.loading]);

  useEffect(() => {
    if (!cfgRes.data) return;
    const merged: ConfigMap = {
      'phong_thi.suc_chua_mac_dinh': '30',
      'xet_tuyen.diem_dat': '5.0',
      'canh_bao_chenh_lech': '1.5',
      'nhac_ho_so_cho_duyet': 'true',
      'canh_bao_truoc_ky_thi_ngay': 'true',
      'backup.auto_interval_days': '7',
      ...Object.fromEntries(Object.entries(cfgRes.data).filter(([, v]) => v !== null)),
    };
    setConfig(merged);
    setOriginalConfig(merged);
  }, [cfgRes.data]);

  useEffect(() => {
    if (!usersRes.data) return;
    const j = usersRes.data;
    setUsers(Array.isArray(j) ? j : (Array.isArray((j as { data?: unknown }).data) ? (j as { data: UserRow[] }).data : []));
  }, [usersRes.data]);

  useEffect(() => {
    if (backupRes.data.backups.length > 0) setLatestBackup(backupRes.data.backups[0]);
  }, [backupRes.data]);

  useEffect(() => {
    if (cfgRes.error || usersRes.error || backupRes.error) setError('Không tải được cài đặt hệ thống');
  }, [cfgRes.error, usersRes.error, backupRes.error]);

  // ─── Save kỳ tuyển dụng ─────────────────────────────────────────────────

  async function handleSaveKy() {
    if (!ky?.id) return;
    setKySaving(true);
    try {
      const res = await fetch(`/api/ky-tuyendung/${ky.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ten_ky: kyForm.ten_ky,
          ngay_bat_dau: kyForm.ngay_bat_dau,
          ngay_ket_thuc: kyForm.ngay_ket_thuc,
        }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? 'Lỗi lưu thông tin kỳ');
      setKyOriginal({ ...kyForm });
      toast.success('Đã lưu thông tin kỳ tuyển dụng');
      // Refresh topbar để ten_ky mới hiển thị ngay
      if (typeof refreshTopbar === 'function') refreshTopbar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setKySaving(false);
    }
  }

  const isKyDirty = JSON.stringify(kyForm) !== JSON.stringify(kyOriginal);

  useEffect(() => {
    cfgRes.refresh();
    usersRes.refresh();
    backupRes.refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Config helpers ──────────────────────────────────────────────────────

  function patch(key: string, value: string) {
    setConfig(prev => ({ ...prev, [key]: value }));
  }

  function getBool(key: string) { return config[key] === 'true'; }
  function setBool(key: string, v: boolean) { patch(key, v ? 'true' : 'false'); }

  const isDirty = JSON.stringify(config) !== JSON.stringify(originalConfig);

  // ─── Save ────────────────────────────────────────────────────────────────

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch('/api/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? 'Lỗi lưu cài đặt');
      }
      setOriginalConfig({ ...config });
      toast.success('Đã lưu cài đặt hệ thống');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Lỗi lưu');
    } finally {
      setSaving(false);
    }
  }

  // ─── Backup now ──────────────────────────────────────────────────────────

  async function handleBackupNow() {
    setBackingUp(true);
    try {
      const res = await fetch('/api/backup/create', { method: 'POST' });
      const j = await res.json();
      if (res.ok) {
        toast.success(`Đã sao lưu: ${j.file} (${j.size_kb} KB)`);
        setLatestBackup({ file: j.file, size_kb: j.size_kb, created_at: j.created_at });
      } else {
        toast.error(j.error ?? 'Lỗi sao lưu');
      }
    } catch {
      toast.error('Lỗi kết nối khi sao lưu');
    } finally {
      setBackingUp(false);
    }
  }

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5 max-w-3xl">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Cài đặt hệ thống"
          description="Cấu hình kỳ tuyển dụng và phân quyền"
        />
        <Button variant="ghost" size="sm" leftIcon={<RefreshCw size={14} />} onClick={() => { cfgRes.refresh(); usersRes.refresh(); backupRes.refresh(); }}>
          Làm mới
        </Button>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {/* ── Section 1: Thông tin kỳ tuyển dụng ────────────────────────── */}
      <Section icon={Calendar} title="Thông tin kỳ tuyển dụng">
        {!ky ? (
          <p className="text-sm text-slate-400">Chưa có kỳ tuyển dụng nào. Vui lòng tạo kỳ trước.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {/* Tên kỳ */}
            <div>
              <FieldLabel>Tên kỳ tuyển dụng <span className="text-red-500">*</span></FieldLabel>
              <input
                type="text"
                value={kyForm.ten_ky}
                onChange={e => setKyForm(f => ({ ...f, ten_ky: e.target.value }))}
                placeholder="VD: Kỳ tuyển dụng viên chức 2025"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
              />
            </div>

            {/* Ngày bắt đầu / kết thúc */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Ngày bắt đầu thi</FieldLabel>
                <input
                  type="date"
                  value={kyForm.ngay_bat_dau?.slice(0, 10) ?? ''}
                  onChange={e => setKyForm(f => ({ ...f, ngay_bat_dau: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                />
              </div>
              <div>
                <FieldLabel>Ngày kết thúc thi</FieldLabel>
                <input
                  type="date"
                  value={kyForm.ngay_ket_thuc?.slice(0, 10) ?? ''}
                  onChange={e => setKyForm(f => ({ ...f, ngay_ket_thuc: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Sức chứa mặc định + Điểm đạt */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel>Số thí sinh tối đa / phòng</FieldLabel>
                <input
                  type="number"
                  min={1} max={200}
                  value={config['phong_thi.suc_chua_mac_dinh'] ?? '30'}
                  onChange={e => patch('phong_thi.suc_chua_mac_dinh', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                />
              </div>
              <div>
                <FieldLabel>Điểm đạt tối thiểu (thang 10)</FieldLabel>
                <input
                  type="number"
                  min={0} max={10} step={0.5}
                  value={config['xet_tuyen.diem_dat'] ?? '5.0'}
                  onChange={e => patch('xet_tuyen.diem_dat', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-100"
                />
              </div>
            </div>

            {/* Save kỳ tuyển dụng */}
            <div className="flex items-center gap-2 pt-1 border-t border-slate-100">
              <Button
                size="sm"
                leftIcon={<Save size={13} />}
                loading={kySaving}
                disabled={!isKyDirty}
                onClick={handleSaveKy}
              >
                Lưu thông tin kỳ
              </Button>
              {isKyDirty && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setKyForm({ ...kyOriginal })}
                >
                  Hủy
                </Button>
              )}
            </div>
          </div>
        )}
      </Section>

      {/* ── Section 2: Bảo mật & phân quyền ───────────────────────────── */}
      <Section icon={Shield} title="Bảo mật & phân quyền">
        {users.length === 0 ? (
          <p className="text-sm text-slate-400">Chưa có tài khoản nào</p>
        ) : (
          <div className="flex flex-col gap-2">
            {users.map(u => (
              <div
                key={u.id}
                className="flex items-center gap-3 rounded-lg border border-slate-100 bg-slate-50 px-3 py-3 hover:bg-slate-100 transition-colors"
              >
                {/* Avatar */}
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white overflow-hidden">
                  <img
                    src={`/avatars/${u.quyen.toLowerCase()}.png`}
                    alt={u.ho_ten}
                    className="h-full w-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-700 truncate">{u.ho_ten}</p>
                  <p className="text-xs text-slate-400 truncate">{u.username}</p>
                </div>

                {/* Role badge */}
                <span className="shrink-0 rounded px-2 py-0.5 bg-slate-200 text-slate-600 text-xs font-mono font-bold">
                  {QUYEN_LABEL[u.quyen] ?? u.quyen}
                </span>

                {/* Status */}
                {u.trang_thai === 'Khoa' && (
                  <span className="shrink-0 rounded-full bg-red-50 border border-red-200 text-red-600 text-xs px-2 py-0.5">Khóa</span>
                )}

                {/* Chevron */}
                <ChevronRight size={14} className="shrink-0 text-brand-500" />
              </div>
            ))}

            <Button
              variant="outline"
              size="sm"
              className="mt-1 self-start"
              onClick={() => router.push('/dashboard/cai-dat/users')}
            >
              Quản lý tài khoản →
            </Button>
          </div>
        )}
      </Section>

      {/* ── Section 3: Thông báo & cảnh báo ────────────────────────────── */}
      <Section icon={Bell} title="Thông báo & cảnh báo">
        <div className="flex flex-col gap-4">
          <CheckItem
            label={`Cảnh báo khi chênh lệch điểm > ${config['canh_bao_chenh_lech'] ?? '1.5'}`}
            desc="Hiển thị biểu tượng cảnh báo khi hai giám khảo có điểm chênh nhau lớn"
            checked={parseFloat(config['canh_bao_chenh_lech'] ?? '1.5') > 0}
            onChange={v => patch('canh_bao_chenh_lech', v ? '1.5' : '0')}
          />
          <CheckItem
            label="Nhắc nhở khi còn hồ sơ chờ duyệt"
            desc="Thông báo trong hệ thống khi có hồ sơ ở trạng thái chờ duyệt"
            checked={getBool('nhac_ho_so_cho_duyet')}
            onChange={v => setBool('nhac_ho_so_cho_duyet', v)}
          />
          <CheckItem
            label="Cảnh báo trước kỳ thi 7 ngày"
            desc="Gửi thông báo nhắc lịch thi cho quản trị viên"
            checked={getBool('canh_bao_truoc_ky_thi_ngay')}
            onChange={v => setBool('canh_bao_truoc_ky_thi_ngay', v)}
          />
        </div>
      </Section>

      {/* ── Section 4: Dữ liệu & sao lưu ───────────────────────────────── */}
      <Section icon={Database} title="Dữ liệu & sao lưu">
        <div className="flex flex-col gap-3">
          {/* Auto backup toggle */}
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Sao lưu tự động</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Sao lưu mỗi {config['backup.auto_interval_days'] ?? '7'} ngày
              </p>
            </div>
            <Toggle
              checked={(parseInt(config['backup.auto_interval_days'] ?? '7') ?? 0) > 0}
              onChange={v => patch('backup.auto_interval_days', v ? '7' : '0')}
            />
          </div>

          {/* Latest backup info */}
          <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-3 py-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Bản sao lưu gần nhất</p>
              {latestBackup ? (
                <p className="text-xs text-slate-400 mt-0.5">
                  {new Date(latestBackup.created_at).toLocaleString('vi-VN')} · {latestBackup.size_kb} KB
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-0.5">Chưa có bản sao lưu nào</p>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-brand-600 hover:text-brand-700"
              onClick={() => router.push('/dashboard/cai-dat/backup')}
            >
              Khôi phục
            </Button>
          </div>

          {/* Manual backup button */}
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Database size={14} />}
            loading={backingUp}
            onClick={handleBackupNow}
            className="self-start"
          >
            Sao lưu ngay
          </Button>
        </div>
      </Section>

      {/* ── Footer buttons ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <Button
          variant="outline"
          leftIcon={<RotateCcw size={14} />}
          disabled={!isDirty || saving}
          onClick={() => setConfig({ ...originalConfig })}
        >
          Hủy thay đổi
        </Button>
        <Button
          leftIcon={<Save size={14} />}
          loading={saving}
          disabled={!isDirty}
          onClick={handleSave}
        >
          Lưu cài đặt
        </Button>
      </div>
    </div>
  );
}
