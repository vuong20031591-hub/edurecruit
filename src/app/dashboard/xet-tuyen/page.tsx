'use client';
import { useEffect, useMemo, useState } from 'react';
import { Play, Download, AlertTriangle, Trophy, Clock, Users } from 'lucide-react';
import { PageHeader, Button, Spinner, SelectDropdown, Badge, Modal, toast } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';
import { cn } from '@/shared/lib/cn';
import type { KetQuaView, PreCheckResult, XetTuyenResult } from '@/modules/xettuyen/types';

interface ViTriOption { id: number; ma_vi_tri: string; mon: string; }

function ketQuaLabel(row: KetQuaView): { text: string; variant: 'success' | 'warning' | 'danger' | 'neutral' } {
  if (row.ket_qua === 'Dat' && row.ghi_chu === 'DuPhong') {
    return { text: 'Dự phòng', variant: 'warning' };
  }
  if (row.ket_qua === 'Dat') return { text: 'Trúng tuyển', variant: 'success' };
  if (row.ket_qua === 'Vang') return { text: 'Vắng thi', variant: 'neutral' };
  if (row.ket_qua === 'BoThi') return { text: 'Bỏ thi', variant: 'neutral' };
  return { text: 'Không trúng', variant: 'danger' };
}

export default function XetTuyenPage() {
  const { data: topbar } = useTopbar();
  const kyId = topbar.ky?.id ?? null;

  const [preCheck, setPreCheck] = useState<PreCheckResult | null>(null);
  const [lastRun, setLastRun] = useState<string | null>(null);
  const [vitriList, setVitriList] = useState<ViTriOption[]>([]);
  const [selectedVitri, setSelectedVitri] = useState<string>('');
  const [rows, setRows] = useState<KetQuaView[]>([]);
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [summary, setSummary] = useState<XetTuyenResult | null>(null);

  const statusUrl = useMemo(() => (kyId ? `/api/xettuyen?ky_tuyendung_id=${kyId}` : null), [kyId]);
  const vitriUrl = useMemo(() => (kyId ? `/api/vitri?ky_tuyendung_id=${kyId}` : null), [kyId]);
  const ketQuaUrl = useMemo(() => {
    if (!kyId) return null;
    let url = `/api/xettuyen/ket-qua?ky_tuyendung_id=${kyId}`;
    if (selectedVitri) url += `&vitri_id=${selectedVitri}`;
    return url;
  }, [kyId, selectedVitri]);

  const statusRes = usePageFetch<{ preCheck: PreCheckResult; lastRun: string | null }>(statusUrl, { fallback: { preCheck: null as unknown as PreCheckResult, lastRun: null } });
  const vitriRes = usePageFetch<unknown>(vitriUrl, { fallback: null as unknown });
  const ketQuaRes = usePageFetch<{ data: KetQuaView[] }>(ketQuaUrl, { fallback: { data: [] } });

  useEffect(() => {
    if (statusRes.data) {
      setPreCheck(statusRes.data.preCheck);
      setLastRun(statusRes.data.lastRun);
    }
  }, [statusRes.data]);

  useEffect(() => {
    if (!vitriRes.data) return;
    const list = (vitriRes.data as { data?: ViTriOption[] }).data ?? (vitriRes.data as ViTriOption[]);
    setVitriList(list);
  }, [vitriRes.data]);

  useEffect(() => { setLoading(ketQuaRes.loading); }, [ketQuaRes.loading]);
  useEffect(() => { if (ketQuaRes.data) setRows(ketQuaRes.data.data); }, [ketQuaRes.data]);
  useEffect(() => {
    if (ketQuaRes.error) toast.error('Không tải được kết quả xét tuyển');
  }, [ketQuaRes.error]);

  async function handleRunXetTuyen() {
    if (!kyId) return;
    setRunning(true);
    setConfirmOpen(false);
    try {
      const res = await fetch('/api/xettuyen', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ky_tuyendung_id: kyId }),
      });
      const data = await res.json();
      if (res.ok) {
        setSummary(data);
        setLastRun(data.ngay_chay);
        toast.success('Xét tuyển hoàn tất');
        ketQuaRes.refresh();
        statusRes.refresh();
        vitriRes.refresh();
      } else {
        toast.error(data.error ?? 'Lỗi xét tuyển');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setRunning(false);
    }
  }

  const trungTuyen = rows.filter(r => r.ket_qua === 'Dat' && r.ghi_chu !== 'DuPhong').length;
  const duPhong = rows.filter(r => r.ghi_chu === 'DuPhong').length;
  const khongDat = rows.filter(r => r.ket_qua !== 'Dat').length;

  return (
    <div className="flex flex-col gap-4 p-5">
      <PageHeader
        title="Xét tuyển"
        description="Tính điểm và xếp hạng thí sinh theo vị trí tuyển dụng"
      />

      {/* Pre-check warning */}
      {preCheck && !preCheck.ready && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertTriangle size={18} className="text-amber-600 shrink-0" />
          <span className="text-sm text-amber-800">{preCheck.message}</span>
        </div>
      )}

      {/* Toolbar */}
      <div data-guide="xet-tuyen-tinh" className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3">
        <span data-guide="xet-tuyen-chay">
          <Button
            variant="danger"
            size="sm"
            leftIcon={<Play size={14} />}
            onClick={() => setConfirmOpen(true)}
            disabled={!preCheck?.ready || running}
            loading={running}
          >
            Chạy xét tuyển
          </Button>
        </span>

        <div className="h-6 w-px bg-slate-200" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 whitespace-nowrap">Vị trí:</span>
          <SelectDropdown
            value={selectedVitri}
            onChange={setSelectedVitri}
            options={[
              { value: '', label: 'Tất cả vị trí' },
              ...vitriList.map(v => ({ value: String(v.id), label: `${v.ma_vi_tri} — ${v.mon}` })),
            ]}
            className="w-56"
          />
        </div>

        <div className="flex-1" />

        {lastRun && (
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Clock size={12} />
            <span>Lần chạy cuối: {lastRun}</span>
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          leftIcon={<Download size={14} />}
          disabled={rows.length === 0}
          onClick={() => {
            if (kyId) window.open(`/api/bao-cao/xuat?loai=ket-qua-diem&ky_tuyendung_id=${kyId}`, '_blank');
          }}
        >
          Xuất Excel
        </Button>
      </div>

      {/* Summary cards */}
      {(summary || rows.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard icon={<Trophy size={18} />} label="Trúng tuyển" value={summary?.trung_tuyen_count ?? trungTuyen} color="emerald" />
          <SummaryCard icon={<Users size={18} />} label="Dự phòng" value={summary?.du_phong_count ?? duPhong} color="amber" />
          <SummaryCard icon={<AlertTriangle size={18} />} label="Không trúng" value={summary?.khong_dat_count ?? khongDat} color="red" />
        </div>
      )}

      {/* Results table */}
      <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            {lastRun ? 'Không có kết quả cho bộ lọc hiện tại' : 'Chưa chạy xét tuyển'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Hạng</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">SBD</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Họ tên</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Vị trí</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Điểm TG</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Ưu tiên</th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">Tổng</th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">Kết quả</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => {
                  const badge = ketQuaLabel(row);
                  return (
                    <tr key={row.id} className={cn(
                      'hover:bg-slate-50 transition-colors',
                      row.ket_qua === 'Dat' && row.ghi_chu !== 'DuPhong' && 'bg-emerald-50/30',
                    )}>
                      <td className="px-4 py-2.5 text-slate-700 font-mono">
                        {row.xep_hang ?? '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="inline-flex items-center rounded px-2 py-0.5 bg-slate-800 text-slate-200 text-xs font-bold font-mono">
                          {row.sbd ?? row.thisinh_id}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-700">{row.ho_ten}</td>
                      <td className="px-4 py-2.5 text-slate-600 text-xs">{row.mon}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-700">
                        {row.diem_thi_giang != null ? row.diem_thi_giang.toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-amber-700">
                        {row.diem_uu_tien > 0 ? `+${row.diem_uu_tien}` : '0'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                        {row.diem_tong.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-center">
                        <Badge variant={badge.variant}>{badge.text}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm dialog */}
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Xác nhận chạy xét tuyển"
        description="Thao tác này sẽ xóa kết quả xét tuyển cũ và tính toán lại."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)}>Hủy</Button>
            <Button variant="danger" size="sm" onClick={handleRunXetTuyen} loading={running}>
              Xác nhận
            </Button>
          </>
        }
      >
        <div className="space-y-2 text-sm text-slate-600">
          <p>Hệ thống sẽ:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Xóa toàn bộ kết quả xét tuyển trước đó</li>
            <li>Tính điểm tổng = Điểm thi giảng + Điểm ưu tiên</li>
            <li>Xếp hạng theo từng vị trí tuyển dụng</li>
            <li>Gán kết quả: Trúng tuyển / Dự phòng / Không trúng</li>
          </ul>
          {preCheck && (
            <p className="mt-3 text-xs text-slate-500">
              Tổng: {preCheck.total_thisinh} thí sinh đã khóa điểm
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'emerald' | 'amber' | 'red';
}) {
  const colorMap = {
    emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    amber: 'border-amber-200 bg-amber-50 text-amber-700',
    red: 'border-red-200 bg-red-50 text-red-700',
  };
  return (
    <div className={cn('flex items-center gap-3 rounded-xl border px-4 py-3', colorMap[color])}>
      {icon}
      <div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs opacity-80">{label}</div>
      </div>
    </div>
  );
}
