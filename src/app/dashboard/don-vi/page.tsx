'use client';
import { useEffect, useMemo, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import {
  Plus, Search, X, RefreshCw, Pencil, Trash2, Building2,
  AlertCircle, ChevronLeft, ChevronRight, Filter as FilterIcon
} from 'lucide-react';
import {
  Button, Card, CardBody, EmptyState, PageHeader, Spinner,
  Table, TBody, TD, TH, THead, TR, toast, ToastContainer,
  Select
} from '@/shared/components';
import { CapHoc, CapHocLabel } from '@/shared/constants/enums';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import { DonViFormModal } from './_components/DonViFormModal';
import type { CapHoc as CapHocType } from '@/db/schema';
import type { DonViView, PaginatedDonVi } from '@/modules/donvi/types';

interface FilterState {
  cap_hoc: CapHocType | '';
  search: string;
  page: number;
  pageSize: number;
}

const INITIAL_FILTER: FilterState = {
  cap_hoc: '',
  search: '',
  page: 1,
  pageSize: 20
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

export default function DonViPage() {
  const { data: topbar } = useTopbar();
  const kyId = topbar.ky?.id ?? 0;

  const [filter, setFilter] = useState<FilterState>(INITIAL_FILTER);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<DonViView | null>(null);
  const [deleting, setDeleting] = useState<DonViView | null>(null);
  const [deletingBusy, setDeletingBusy] = useState(false);

  const capHocOptions = useMemo(
    () => (Object.keys(CapHoc) as CapHocType[]).map((k) => ({ value: k, label: CapHocLabel[k] ?? k })),
    []
  );

  const listUrl = useMemo(() => {
    if (!kyId) return null;
    const sp = new URLSearchParams();
    sp.set('ky_tuyendung_id', String(kyId));
    if (filter.cap_hoc) sp.set('cap_hoc', filter.cap_hoc);
    if (filter.search.trim()) sp.set('search', filter.search.trim());
    sp.set('page', String(filter.page));
    sp.set('pageSize', String(filter.pageSize));
    return `/api/donvi?${sp.toString()}`;
  }, [kyId, filter]);

  const { data, loading, error, refresh } = usePageFetch<PaginatedDonVi>(listUrl, {
    fallback: { data: [], total: 0, page: 1, pageSize: 20 }
  });

  function updateFilter(patch: Partial<FilterState>) {
    setFilter((prev) => {
      const next = { ...prev, ...patch };
      if (patch.cap_hoc !== undefined || patch.search !== undefined || patch.pageSize !== undefined) {
        next.page = 1;
      }
      return next;
    });
  }

  function resetFilter() {
    setFilter(INITIAL_FILTER);
  }

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(dv: DonViView) {
    setEditing(dv);
    setModalOpen(true);
  }

  async function confirmDelete() {
    if (!deleting) return;
    setDeletingBusy(true);
    try {
      const res = await fetch(`/api/donvi/${deleting.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      toast.success(`Đã xóa đơn vị "${deleting.ten_don_vi}"`);
      setDeleting(null);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi xóa');
    } finally {
      setDeletingBusy(false);
    }
  }

  const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const startIndex = data.total === 0 ? 0 : (data.page - 1) * data.pageSize + 1;
  const endIndex = Math.min(data.page * data.pageSize, data.total);

  return (
    <div className="p-5">
      <ToastContainer />

      <PageHeader
        title="Đơn vị tuyển dụng"
        description={topbar.ky ? `Kỳ: ${topbar.ky.ten_ky} · ${data.total} đơn vị` : 'Danh sách trường/đơn vị cần tuyển'}
      />

      {!kyId && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>Chưa có kỳ tuyển dụng nào được chọn. Vui lòng cấu hình kỳ trong Cài đặt.</div>
        </div>
      )}

      {error && (
        <div className="mb-4 flex items-start gap-2 rounded-md border border-status-danger/30 bg-red-50 px-3 py-2 text-sm text-status-danger">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Không tải được dữ liệu</div>
            <div className="text-xs">{error?.message ?? String(error)}</div>
          </div>
        </div>
      )}

      <Card>
        <CardBody className="p-0">
          {/* Filter bar + action buttons */}
          <div className="space-y-3 border-b border-slate-200 p-4">
            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={refresh}
                leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
              >
                Làm mới
              </Button>
              <Button
                onClick={openCreate}
                leftIcon={<Plus size={14} />}
                disabled={!kyId}
                title={!kyId ? 'Chưa có kỳ tuyển dụng' : undefined}
              >
                Thêm đơn vị
              </Button>
            </div>
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="text"
                value={filter.search}
                onChange={(e) => updateFilter({ search: e.target.value })}
                placeholder="Tìm theo mã hoặc tên đơn vị..."
                className="block w-full rounded-md border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
              />
              {filter.search && (
                <button
                  type="button"
                  onClick={() => updateFilter({ search: '' })}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Xóa tìm kiếm"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={filter.cap_hoc}
                onChange={(e) => updateFilter({ cap_hoc: e.target.value as CapHocType | '' })}
                className="min-w-[180px]"
                aria-label="Lọc theo cấp học"
              >
                <option value="">Tất cả cấp học</option>
                {capHocOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>

              <button
                type="button"
                onClick={resetFilter}
                className="inline-flex h-10 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 transition-colors hover:bg-slate-50"
              >
                <FilterIcon size={14} />
                Đặt lại
              </button>
            </div>
          </div>

          {/* Table */}
          {loading && data.data.length === 0 ? (
            <div className="flex h-64 items-center justify-center">
              <Spinner size={28} className="text-brand-500" />
            </div>
          ) : data.data.length === 0 ? (
            <EmptyState
              icon={<Building2 size={36} />}
              title={filter.search || filter.cap_hoc ? 'Không tìm thấy đơn vị nào' : 'Chưa có đơn vị nào'}
              description={
                filter.search || filter.cap_hoc
                  ? 'Thử bỏ bớt bộ lọc hoặc từ khóa tìm kiếm.'
                  : 'Bắt đầu bằng việc thêm đơn vị tuyển dụng đầu tiên.'
              }
              action={
                !filter.search && !filter.cap_hoc && kyId ? (
                  <Button onClick={openCreate} leftIcon={<Plus size={14} />}>
                    Thêm đơn vị
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
                {data.data.map((dv) => (
                  <div key={dv.id} className="px-4 py-3 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-slate-600">
                        {dv.ma_don_vi}
                      </span>
                      <span className="font-semibold text-sm text-slate-900">{dv.ten_don_vi}</span>
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap text-xs text-slate-500">
                      <span className="inline-flex items-center rounded bg-brand-50 px-1.5 py-0.5 text-[11px] font-medium text-brand-700">
                        {CapHocLabel[dv.cap_hoc] ?? dv.cap_hoc}
                      </span>
                      {dv.dia_chi && (
                        <>
                          <span>·</span>
                          <span>{dv.dia_chi}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span className="inline-flex items-center gap-1">
                        <Building2 size={10} />
                        {dv.soThiSinh} thí sinh
                      </span>
                      <span>·</span>
                      <span>{dv.soViTri} vị trí</span>
                      <span>·</span>
                      <span>Chỉ tiêu: {dv.so_chi_tieu}</span>
                    </div>

                    <div
                      className="flex items-center gap-0 border-t border-slate-100 pt-2 mt-2"
                      onClick={e => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => openEdit(dv)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 active:bg-slate-200"
                      >
                        <Pencil size={14} /> Sửa
                      </button>
                      <div className="h-5 w-px bg-slate-200" />
                      <button
                        type="button"
                        onClick={() => setDeleting(dv)}
                        className="flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium text-red-500 hover:bg-red-50 active:bg-red-100"
                      >
                        <Trash2 size={14} /> Xóa
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block">
              <Table>
                <THead>
                  <TR>
                    <TH className="w-14">STT</TH>
                    <TH className="w-32">Mã ĐV</TH>
                    <TH>Tên đơn vị</TH>
                    <TH className="w-40">Cấp học</TH>
                    <TH className="w-24 text-right">Chỉ tiêu</TH>
                    <TH className="w-20 text-right">Số TS</TH>
                    <TH className="w-24 text-right">Số vị trí</TH>
                    <TH className="w-24 text-right">Thao tác</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.data.map((dv, idx) => (
                    <TR key={dv.id}>
                      <TD className="text-slate-500">{(data.page - 1) * data.pageSize + idx + 1}</TD>
                      <TD className="font-mono text-xs font-semibold text-slate-700">{dv.ma_don_vi}</TD>
                      <TD>
                        <div className="font-medium text-slate-900">{dv.ten_don_vi}</div>
                        {dv.dia_chi && (
                          <div className="mt-0.5 text-xs text-slate-500">{dv.dia_chi}</div>
                        )}
                      </TD>
                      <TD className="text-slate-700">{CapHocLabel[dv.cap_hoc] ?? dv.cap_hoc}</TD>
                      <TD className="text-right font-mono text-sm">{dv.so_chi_tieu ?? 0}</TD>
                      <TD className="text-right font-mono text-sm">{dv.soThiSinh}</TD>
                      <TD className="text-right font-mono text-sm">{dv.soViTri}</TD>
                      <TD>
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => openEdit(dv)}
                            className="rounded p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-brand-600"
                            aria-label={`Sửa ${dv.ten_don_vi}`}
                            title="Sửa"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleting(dv)}
                            className="rounded p-1.5 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
                            aria-label={`Xóa ${dv.ten_don_vi}`}
                            title="Xóa"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 text-sm text-slate-600">
                <div>
                  Hiển thị <span className="font-medium text-slate-900">{startIndex}–{endIndex}</span> / {data.total} đơn vị
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => updateFilter({ page: Math.max(1, filter.page - 1) })}
                    disabled={filter.page <= 1}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="px-2 text-xs text-slate-600">
                    Trang {data.page} / {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateFilter({ page: Math.min(totalPages, filter.page + 1) })}
                    disabled={filter.page >= totalPages}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    aria-label="Trang sau"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <span className="text-slate-500">Số dòng:</span>
                  <select
                    value={filter.pageSize}
                    onChange={(e) => updateFilter({ pageSize: Number(e.target.value) })}
                    className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                    aria-label="Số dòng mỗi trang"
                  >
                    {PAGE_SIZE_OPTIONS.map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      <DonViFormModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        kyId={kyId}
        editing={editing}
        onSaved={() => refresh()}
      />

      {/* Delete confirm */}
      <Dialog.Root open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm" />
          <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-lg border border-slate-200 bg-white p-5 shadow-xl focus:outline-none">
            <Dialog.Title className="text-base font-semibold text-slate-900">Xác nhận xóa</Dialog.Title>
            <Dialog.Description className="mt-2 text-sm text-slate-600">
              Bạn có chắc chắn muốn xóa đơn vị <span className="font-semibold text-slate-900">{deleting?.ten_don_vi}</span>?
              {deleting && deleting.soThiSinh > 0 && (
                <span className="mt-2 block rounded-md bg-red-50 px-2 py-1.5 text-xs text-red-700">
                  Đơn vị đang có {deleting.soThiSinh} thí sinh — không thể xóa.
                </span>
              )}
            </Dialog.Description>
            <div className="mt-4 flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleting(null)} disabled={deletingBusy}>
                Hủy
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                loading={deletingBusy}
                disabled={!!deleting && deleting.soThiSinh > 0}
              >
                Xóa
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
