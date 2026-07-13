'use client';
import { useEffect, useMemo, useState, type FormEvent } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Search, Pencil, Trash2, Link2, AlertCircle, Loader2, X, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import {
  PageHeader,
  Button,
  Input,
  Select,
  EmptyState,
  Spinner,
  toast
} from '@/shared/components';
import { CapHoc, CapHocLabel, HinhThucThi, HinhThucThiLabel } from '@/shared/constants/enums';
import type { CapHoc as CapHocT, HinhThucThi as HinhThucThiT } from '@/db/schema';
import { fetchTopbarData } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import { ViTriFormModal, type ViTriView } from './_components/ViTriFormModal';

interface PaginatedViTri {
  data: ViTriView[];
  total: number;
  page: number;
  pageSize: number;
}

interface DonViRow {
  id: number;
  ma_don_vi: string;
  ten_don_vi: string;
  so_luong_phan_bo: number;
}

export default function ViTriPage() {
  const [kyId, setKyId] = useState<number | null>(null);
  const [kyName, setKyName] = useState<string>('');
  const [capHoc, setCapHoc] = useState<string>('');
  const [search, setSearch] = useState<string>('');
  const [searchInput, setSearchInput] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(50);

  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<ViTriView | null>(null);
  const [mapTarget, setMapTarget] = useState<ViTriView | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  async function loadTopbar() {
    try {
      const body = await fetchTopbarData();
      if (body.ky?.id) {
        setKyId(body.ky.id);
        setKyName(body.ky.ten_ky ?? '');
      }
    } catch {
      /* ignore */
    }
  }

  const listUrl = useMemo(() => {
    if (!kyId) return null;
    const params = new URLSearchParams();
    params.set('ky_tuyendung_id', String(kyId));
    params.set('page', String(page));
    params.set('pageSize', String(pageSize));
    if (capHoc) params.set('cap_hoc', capHoc);
    if (search) params.set('search', search);
    return `/api/vitri?${params.toString()}`;
  }, [kyId, page, pageSize, capHoc, search]);

  const { data, loading, error, refresh } = usePageFetch<PaginatedViTri>(listUrl, {
    fallback: { data: [], total: 0, page: 1, pageSize: 20 }
  });

  useEffect(() => {
    loadTopbar();
  }, []);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(item: ViTriView) {
    setEditing(item);
    setModalOpen(true);
  }

  async function handleDelete(item: ViTriView) {
    if (!confirm(`Xóa vị trí "${item.ma_vi_tri}"? Thao tác này không thể hoàn tác.`)) return;
    setDeletingId(item.id);
    try {
      const res = await fetch(`/api/vitri/${item.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success('Đã xóa vị trí');
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa vị trí');
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearch(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  function resetFilter() {
    setCapHoc('');
    setSearchInput('');
    setSearch('');
    setPage(1);
  }

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(data.total / pageSize)),
    [data.total, pageSize]
  );

  return (
    <div>
      <PageHeader
        title="Vị trí tuyển dụng"
        description={kyName ? `Kỳ: ${kyName} · Danh sách các vị trí theo môn và cấp học` : 'Danh sách các vị trí theo môn và cấp học'}
      />

      <div className="p-5">
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-status-danger/30 bg-red-50 px-3 py-2 text-sm text-status-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Không tải được dữ liệu</div>
              <div className="text-xs">{String(error)}</div>
            </div>
          </div>
        )}

        {!kyId && !loading && (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
            Chưa có kỳ tuyển dụng nào được thiết lập. Vui lòng cấu hình kỳ trước.
          </div>
        )}

        <div data-guide="vi-tri-create" className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 bg-white p-3">
          <Button onClick={openCreate} disabled={!kyId}>
            <Plus size={16} />
            Thêm vị trí
          </Button>
          <div className="h-7 w-px bg-slate-200" />
          <div className="w-48">
            <Select
              label="Cấp học"
              value={capHoc}
              onChange={(e) => {
                setCapHoc(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Tất cả</option>
              {Object.values(CapHoc).map((c) => (
                <option key={c} value={c}>
                  {CapHocLabel[c] ?? c}
                </option>
              ))}
            </Select>
          </div>
          <form onSubmit={handleSearch} className="flex-1 min-w-[220px]">
            <Input
              label="Tìm kiếm"
              placeholder="Tìm theo mã vị trí hoặc môn..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </form>
          <Button type="button" variant="outline" onClick={resetFilter}>
            Đặt lại
          </Button>
          <Button type="button" variant="ghost" onClick={refresh} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Làm mới
          </Button>
        </div>

        <div data-guide="vi-tri-list" className="rounded-lg border border-slate-200 bg-white">
          {loading && data.data.length === 0 ? (
            <div className="flex h-48 items-center justify-center">
              <Spinner size={24} className="text-brand-500" />
            </div>
          ) : data.data.length === 0 ? (
            <EmptyState
              icon={<Search size={36} className="text-slate-300" />}
              title="Chưa có vị trí nào"
              description={
                search || capHoc
                  ? 'Không tìm thấy vị trí phù hợp với điều kiện lọc'
                  : 'Bấm "Thêm vị trí" để tạo vị trí tuyển dụng đầu tiên'
              }
              action={
                !search && !capHoc ? (
                  <Button onClick={openCreate}>
                    <Plus size={16} />
                    Thêm vị trí
                  </Button>
                ) : (
                  <Button variant="outline" onClick={resetFilter}>
                    Xóa bộ lọc
                  </Button>
                )
              }
            />
          ) : (
            <>
              {/* Mobile card layout */}
              <div className="lg:hidden divide-y divide-slate-100">
                {data.data.map((item) => (
                  <div key={item.id} className="px-3 py-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                        {item.ma_vi_tri}
                      </span>
                      <span className="text-sm font-medium text-slate-900">{item.mon}</span>
                      <span className="text-xs text-slate-500">{CapHocLabel[item.cap_hoc] ?? item.cap_hoc}</span>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500">
                      <span>{HinhThucThiLabel[item.hinh_thuc_thi] ?? item.hinh_thuc_thi}</span>
                      <span>·</span>
                      <span>Tổng số chỉ tiêu: {item.so_luong}</span>
                      <span>·</span>
                      <span>TS đã ĐK: {item.soThiSinh ?? 0}</span>
                    </div>
                    <div
                      className="flex items-center gap-0 border-t border-slate-100 pt-2 mt-1"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(item)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                      >
                        <Pencil size={14} /> Sửa
                      </button>
                      <div className="h-5 w-px bg-slate-200" />
                      <button
                        type="button"
                        onClick={() => setMapTarget(item)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-brand-600 hover:bg-brand-50 active:bg-brand-100"
                      >
                        <Link2 size={14} /> Map đơn vị
                      </button>
                      <div className="h-5 w-px bg-slate-200" />
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        disabled={deletingId === item.id}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-red-500 hover:bg-red-50 active:bg-red-100 disabled:opacity-50"
                      >
                        {deletingId === item.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table layout */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600 w-12">STT</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Mã vị trí</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Môn</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Cấp học</th>
                      <th className="px-4 py-2.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Hình thức thi</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Tổng số chỉ tiêu</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Số TS đã ĐK</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600">Số đơn vị</th>
                      <th className="px-4 py-2.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 w-44">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {data.data.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="px-4 py-2.5 text-slate-500">
                          {(data.page - 1) * data.pageSize + idx + 1}
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-900">
                          {item.ma_vi_tri}
                        </td>
                        <td className="px-4 py-2.5 text-slate-900">{item.mon}</td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {CapHocLabel[item.cap_hoc] ?? item.cap_hoc}
                        </td>
                        <td className="px-4 py-2.5 text-slate-700">
                          {HinhThucThiLabel[item.hinh_thuc_thi] ?? item.hinh_thuc_thi}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-900">
                          {item.so_luong}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {item.soThiSinh ?? 0}
                        </td>
                        <td className="px-4 py-2.5 text-right text-slate-700">
                          {item.donViCount ?? 0}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => openEdit(item)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                              title="Sửa"
                              aria-label="Sửa"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setMapTarget(item)}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                              title="Map đơn vị"
                              aria-label="Map đơn vị"
                            >
                              <Link2 size={15} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(item)}
                              disabled={deletingId === item.id}
                              className="rounded-md p-1.5 text-slate-500 hover:bg-red-50 hover:text-status-danger disabled:opacity-50"
                              title="Xóa"
                              aria-label="Xóa"
                            >
                              {deletingId === item.id ? (
                                <Loader2 size={15} className="animate-spin" />
                              ) : (
                                <Trash2 size={15} />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm">
                <div className="text-slate-600">
                  Hiển thị{' '}
                  <span className="font-semibold text-slate-900">
                    {data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1}-
                    {Math.min(data.page * data.pageSize, data.total)}
                  </span>{' '}
                  / <span className="font-semibold text-slate-900">{data.total}</span> vị trí
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || loading}
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="px-2 text-sm text-slate-700">
                    Trang <span className="font-semibold">{page}</span> / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || loading}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {kyId && (
        <ViTriFormModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          editing={editing}
          kyId={kyId}
          onSaved={refresh}
        />
      )}

      {mapTarget && kyId && (
        <MapDonViModal
          target={mapTarget}
          kyId={kyId}
          onClose={() => setMapTarget(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

interface MapDonViModalProps {
  target: ViTriView;
  kyId: number;
  onClose: () => void;
  onSaved: () => void;
}

function MapDonViModal({ target, kyId, onClose, onSaved }: MapDonViModalProps) {
  const [donVis, setDonVis] = useState<DonViRow[]>([]);
  const [mappings, setMappings] = useState<Map<number, number>>(new Map());
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [dvRes, mdRes] = await Promise.all([
          fetch(`/api/donvi?ky_tuyendung_id=${kyId}&all=true`, { cache: 'no-store' }),
          fetch(`/api/vitri/${target.id}/donvi`, { cache: 'no-store' })
        ]);
        if (!dvRes.ok) {
          const body = await dvRes.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${dvRes.status}`);
        }
        const dvBody = await dvRes.json();
        const list: DonViRow[] = (dvBody.data ?? []).map((d: any) => ({
          id: d.id,
          ma_don_vi: d.ma_don_vi,
          ten_don_vi: d.ten_don_vi,
          so_luong_phan_bo: 0
        }));

        const map = new Map<number, number>();
        if (mdRes.ok) {
          const mdBody = await mdRes.json();
          const cur: { don_vi_id: number; so_luong_phan_bo: number }[] = mdBody.mappings ?? [];
          cur.forEach((c) => map.set(c.don_vi_id, c.so_luong_phan_bo));
        }
        if (!cancelled) {
          setMappings(map);
          setDonVis(list);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [kyId, target.id]);

  function setPhanBo(donViId: number, value: number) {
    setMappings((m) => {
      const next = new Map(m);
      if (value <= 0) next.delete(donViId);
      else next.set(donViId, value);
      return next;
    });
  }

  const tongPhanBo = useMemo(() => {
    let s = 0;
    mappings.forEach((v) => (s += v));
    return s;
  }, [mappings]);

  async function handleSave() {
    setSubmitting(true);
    try {
      const arr = Array.from(mappings.entries()).map(([don_vi_id, so_luong_phan_bo]) => ({
        don_vi_id,
        so_luong_phan_bo
      }));
      const res = await fetch(`/api/vitri/${target.id}/donvi`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: arr })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success('Đã lưu phân bổ đơn vị');
      onSaved();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi lưu phân bổ');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white shadow-xl focus:outline-none">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
            <div>
              <Dialog.Title className="text-base font-semibold text-slate-900">
                Phân bổ chỉ tiêu theo đơn vị
              </Dialog.Title>
              <Dialog.Description className="mt-0.5 text-xs text-slate-500">
                {target.ma_vi_tri} · {target.mon} · {CapHocLabel[target.cap_hoc] ?? target.cap_hoc} · Tổng số chỉ tiêu: {target.so_luong}
              </Dialog.Description>
            </div>
            <Dialog.Close asChild>
              <button
                type="button"
                className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </Dialog.Close>
          </div>

          <div className="px-5 py-4 max-h-[60vh] overflow-y-auto">
            {error && (
              <div className="mb-3 flex items-start gap-2 rounded-md border border-status-danger/30 bg-red-50 px-3 py-2 text-sm text-status-danger">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <div>{error}</div>
              </div>
            )}

            {loading ? (
              <div className="flex h-40 items-center justify-center">
                <Spinner size={24} className="text-brand-500" />
              </div>
            ) : donVis.length === 0 ? (
              <EmptyState
                title="Chưa có đơn vị nào"
                description="Kỳ tuyển dụng này chưa có đơn vị. Hãy tạo đơn vị trước."
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Mã ĐV</th>
                      <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">Tên đơn vị</th>
                      <th className="px-3 py-2 text-right text-xs font-semibold uppercase tracking-wider text-slate-600 w-32">Chỉ tiêu</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {donVis.map((d) => (
                      <tr key={d.id}>
                        <td className="px-3 py-1.5 font-mono text-xs text-slate-700">{d.ma_don_vi}</td>
                        <td className="px-3 py-1.5 text-slate-900">{d.ten_don_vi}</td>
                        <td className="px-3 py-1.5">
                          <input
                            type="number"
                            min={0}
                            className="block w-full rounded-md border border-slate-200 bg-white px-2 py-1 text-right text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                            value={mappings.get(d.id) ?? ''}
                            placeholder="0"
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              setPhanBo(d.id, Number.isFinite(v) ? v : 0);
                            }}
                            disabled={submitting}
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
            <div className="text-sm">
              Tổng phân bổ:{' '}
              <span
                className={
                  tongPhanBo > target.so_luong
                    ? 'font-semibold text-status-danger'
                    : 'font-semibold text-slate-900'
                }
              >
                {tongPhanBo}
              </span>{' '}
              / <span className="font-semibold text-slate-900">{target.so_luong}</span>
              {tongPhanBo > target.so_luong && (
                <span className="ml-2 text-xs text-status-danger">vượt chỉ tiêu</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={onClose} disabled={submitting}>
                Hủy
              </Button>
              <Button
                onClick={handleSave}
                loading={submitting}
                disabled={submitting || loading || donVis.length === 0 || tongPhanBo > target.so_luong}
              >
                Lưu phân bổ
              </Button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
