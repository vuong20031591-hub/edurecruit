'use client';
import { useEffect, useState, use, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Save, Trash2, Printer, Edit, X } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import {
  Button,
  Spinner,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  Badge,
  toast
} from '@/shared/components';
import { TrangThaiHoSoLabel } from '@/shared/constants/enums';
import type { ThiSinhView } from '@/modules/hosso/types';
import type { TrangThaiHoSo, Quyen } from '@/db/schema';
import { ThongTinCaNhan } from './_components/ThongTinCaNhan';
import { ThongTinLienHe } from './_components/ThongTinLienHe';
import { ThongTinDaoTao } from './_components/ThongTinDaoTao';
import { ThongTinDangKy } from './_components/ThongTinDangKy';
import { ThongTinNguoiThan } from './_components/ThongTinNguoiThan';
import { ThongTinVanBangVaQTC } from './_components/ThongTinVanBangVaQTC';
import { TrangThaiActions } from './_components/TrangThaiActions';
import { LichSuThayDoi } from './_components/LichSuThayDoi';
import {
  EMPTY_FORM,
  formFromView,
  buildSubmitPayload,
  statusVariant,
  type FormValues,
  type NguoiThanItem,
  type VanBangItem,
  type QtcItem
} from './form-types';

const ROLE_PERMS: Record<Quyen, string[]> = {
  ADMIN: ['hosso.view','hosso.create','hosso.update','hosso.delete','hosso.rasoat','hosso.khoa'],
  TO_NHAP_HOSO: ['hosso.view','hosso.create','hosso.update','hosso.rasoat'],
  TO_NHAP_DIEM: ['hosso.view'],
  LANH_DAO: ['hosso.view']
};

export default function HoSoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const isNew = id === 'new';
  const thisinhId = isNew ? null : Number(id);
  // ?edit=1 từ list page → bật edit mode ngay khi load
  const startInEditMode = isNew || searchParams.get('edit') === '1';

  const [ts, setTs] = useState<ThiSinhView | null>(null);
  const [form, setForm] = useState<FormValues>(EMPTY_FORM);
  const [nguoiThan, setNguoiThan] = useState<NguoiThanItem[]>([]);
  const [vanBang, setVanBang] = useState<VanBangItem[]>([]);
  const [qtc, setQtc] = useState<QtcItem[]>([]);
  const [loading, setLoading] = useState(!isNew);
  const [editing, setEditing] = useState(startInEditMode);
  const [saving, setSaving] = useState(false);
  const [kyId, setKyId] = useState<number | null>(null);
  // Mặc định ADMIN perms để không ẩn buttons trong khi load — server vẫn enforce
  const [perms, setPerms] = useState<string[]>(ROLE_PERMS.ADMIN);
  const [permsLoaded, setPermsLoaded] = useState(false);

  const load = useCallback(async () => {
    if (isNew || thisinhId == null) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/hosso/${thisinhId}`, { cache: 'no-store' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const json = (await res.json()) as ThiSinhView & {
        nguoiThan?: NguoiThanItem[];
        vanBang?: VanBangItem[];
        qtc?: QtcItem[];
      };
      setTs(json);
      setForm(formFromView(json as unknown as Record<string, unknown>));
      setNguoiThan(json.nguoiThan ?? []);
      setVanBang((json.vanBang ?? []).filter((v) => v.thu_tu === 2));
      setQtc(json.qtc ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi tải hồ sơ');
      router.push('/dashboard/ho-so');
    } finally {
      setLoading(false);
    }
  }, [isNew, thisinhId, router]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    async function loadContext() {
      try {
        const [meRes, statsRes] = await Promise.all([
          fetch('/api/auth/me', { cache: 'no-store' }),
          fetch('/api/dashboard/stats', { cache: 'no-store' }).catch(() => null)
        ]);
        if (meRes.ok) {
          const me = await meRes.json();
          if (!alive) return;
          const quyen = me.quyen as Quyen | undefined;
          if (quyen) setPerms(ROLE_PERMS[quyen] ?? []);
        }
        if (statsRes && statsRes.ok) {
          const stats = await statsRes.json();
          if (!alive) return;
          if (stats?.ky?.id) setKyId(Number(stats.ky.id));
        }
      } catch {
        // ignore — server still enforces perms
      } finally {
        if (alive) setPermsLoaded(true);
      }
    }
    loadContext();
    return () => { alive = false; };
  }, []);

  function patchForm(patch: Partial<FormValues>) {
    setForm(prev => ({ ...prev, ...patch }));
  }

  function handleCancel() {
    if (isNew) {
      router.push('/dashboard/ho-so');
      return;
    }
    if (ts) setForm(formFromView(ts as unknown as Record<string, unknown>));
    setEditing(false);
  }

  async function handleSave() {
    if (!form.ho.trim() || !form.ten.trim()) {
      toast.warning('Vui lòng nhập Họ và Tên');
      return;
    }
    if (!form.ngay_sinh) {
      toast.warning('Vui lòng chọn ngày sinh');
      return;
    }
    if (!form.gioi_tinh) {
      toast.warning('Vui lòng chọn giới tính');
      return;
    }
    if (!form.dien_thoai.trim()) {
      toast.warning('Vui lòng nhập số điện thoại');
      return;
    }
    if (!form.vi_tri_dang_ky_id) {
      toast.warning('Vui lòng chọn vị trí đăng ký');
      return;
    }
    if (!isNew && !kyId && !ts?.ky_tuyendung_id) {
      toast.warning('Không xác định được kỳ tuyển dụng hiện tại');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...buildSubmitPayload(form),
        ky_tuyendung_id: kyId ?? ts?.ky_tuyendung_id
      };
      const url = isNew ? '/api/hosso' : `/api/hosso/${thisinhId}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success(isNew ? 'Đã tạo hồ sơ mới' : 'Đã lưu thay đổi');
      router.push('/dashboard/ho-so');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi lưu hồ sơ');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (thisinhId == null) return;
    if (!window.confirm(`Bạn có chắc muốn xóa hồ sơ của "${ts?.ho_ten || ''}"?\nHành động này không thể hoàn tác.`)) {
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/hosso/${thisinhId}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success('Đã xóa hồ sơ');
      router.push('/dashboard/ho-so');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa hồ sơ');
    } finally {
      setSaving(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <Spinner size={28} className="text-brand-500" />
        <span className="ml-3 text-sm text-slate-600">Đang tải hồ sơ...</span>
      </div>
    );
  }

  const title = isNew
    ? 'Thêm hồ sơ mới'
    : editing
      ? 'Sửa hồ sơ'
      : `Hồ sơ: ${ts?.ho_ten || '—'}`;

  const description = isNew
    ? 'Điền đầy đủ thông tin để tạo hồ sơ thí sinh mới'
    : `Mã HS: #${ts?.id ?? thisinhId ?? '—'}  ·  Trạng thái: ${ts ? TrangThaiHoSoLabel[ts.trang_thai_ho_so as TrangThaiHoSo] : '—'}`;

  const isLocked = ts?.is_profile_locked === 1;
  const canUpdate = !isLocked && (isNew ? perms.includes('hosso.create') : perms.includes('hosso.update'));
  const canDelete = !isLocked && !isNew && perms.includes('hosso.delete');
  const canRasoat = !isLocked && perms.includes('hosso.rasoat');

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<ArrowLeft size={14} />}
              onClick={() => {
                router.push('/dashboard/ho-so');
                router.refresh();
              }}
            >
              Quay lại
            </Button>

            {editing ? (
              <>
                <Button
                  variant="outline"
                  leftIcon={<X size={14} />}
                  onClick={handleCancel}
                  disabled={saving}
                >
                  Hủy
                </Button>
                {canUpdate && (
                  <Button
                    variant="primary"
                    leftIcon={<Save size={14} />}
                    onClick={handleSave}
                    loading={saving}
                  >
                    Lưu
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  leftIcon={<Printer size={14} />}
                  onClick={handlePrint}
                >
                  In
                </Button>
                {!isNew && canDelete && (
                  <Button
                    variant="danger"
                    leftIcon={<Trash2 size={14} />}
                    onClick={handleDelete}
                    disabled={saving}
                  >
                    Xóa
                  </Button>
                )}
                {canUpdate && (
                  <Button
                    variant="primary"
                    leftIcon={<Edit size={14} />}
                    onClick={() => setEditing(true)}
                  >
                    Sửa
                  </Button>
                )}
              </>
            )}
          </>
        }
      />

      <div className="space-y-5 p-5">
        <Card>
          <CardHeader>
            <CardTitle>Thông tin cá nhân</CardTitle>
          </CardHeader>
          <CardBody>
            <ThongTinCaNhan form={form} onChange={patchForm} editing={editing} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CCCD & Liên hệ</CardTitle>
          </CardHeader>
          <CardBody>
            <ThongTinLienHe form={form} onChange={patchForm} editing={editing} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Đào tạo</CardTitle>
          </CardHeader>
          <CardBody>
            <ThongTinDaoTao form={form} onChange={patchForm} editing={editing} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vị trí đăng ký</CardTitle>
          </CardHeader>
          <CardBody>
            <ThongTinDangKy
              form={form}
              onChange={patchForm}
              editing={editing}
              trangThai={ts?.trang_thai_ho_so ?? 'ChoRaSoat'}
              ngayNopHoSo={(ts?.ngay_nop_ho_so ?? '').slice(0, 10)}
              maHoSo={''}
              kyId={ts?.ky_tuyendung_id ?? kyId}
            />
          </CardBody>
        </Card>

        {!isNew && (
          <Card>
            <CardHeader>
              <CardTitle>Người thân</CardTitle>
            </CardHeader>
            <CardBody>
              <ThongTinNguoiThan items={nguoiThan} />
            </CardBody>
          </Card>
        )}

        {!isNew && (vanBang.length > 0 || qtc.length > 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Văn bằng 2 & Quá trình công tác</CardTitle>
            </CardHeader>
            <CardBody>
              <ThongTinVanBangVaQTC vanBang={vanBang} qtc={qtc} />
            </CardBody>
          </Card>
        )}

        {!isNew && thisinhId != null && (
          <Card>
            <CardHeader>
              <CardTitle>Trạng thái & Rà soát</CardTitle>
            </CardHeader>
            <CardBody>
              <TrangThaiActions
                thisinhId={thisinhId}
                trangThaiHienTai={ts?.trang_thai_ho_so ?? 'ChoRaSoat'}
                hoTen={ts?.ho_ten ?? ''}
                canRasoat={canRasoat}
                canLock={perms.includes('hosso.khoa')}
                isLocked={isLocked}
                onUpdated={newStatus => {
                  if (ts) setTs({ ...ts, trang_thai_ho_so: newStatus });
                  router.push('/dashboard/ho-so');
                  router.refresh();
                }}
                onLocked={() => {
                  if (ts) setTs({ ...ts, is_profile_locked: 1 });
                  router.push('/dashboard/ho-so');
                  router.refresh();
                }}
              />
            </CardBody>
          </Card>
        )}

        {!isNew && thisinhId != null && (
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử thay đổi</CardTitle>
            </CardHeader>
            <CardBody>
              <LichSuThayDoi thisinhId={thisinhId} />
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
