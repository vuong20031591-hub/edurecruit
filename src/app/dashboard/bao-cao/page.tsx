'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
import { FileText, Download, Printer, RefreshCw, AlertCircle } from 'lucide-react';
import { PageHeader, Button, Spinner } from '@/shared/components';
import { useTopbar } from '@/shared/hooks/useTopbar';
import { usePageFetch } from '@/shared/hooks/usePageFetch';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PhanBoBin { label: string; count: number; color: string; }
interface TyLeData { dat: number; khongDat: number; tyLeDat: number; tyLeRat: number; tong: number; vangBo: number; }
interface KetQuaViTri { name: string; dat: number; khongDat: number; tong: number; }

interface BaoCaoData {
  tongHopLe: number;
  tongDaNhapDiem: number;
  phanBoDiem: PhanBoBin[];
  tyLe: TyLeData;
  ketQuaTheoViTri: KetQuaViTri[];
}

const EMPTY: BaoCaoData = {
  tongHopLe: 0,
  tongDaNhapDiem: 0,
  phanBoDiem: [],
  tyLe: { dat: 0, khongDat: 0, tyLeDat: 0, tyLeRat: 0, tong: 0, vangBo: 0 },
  ketQuaTheoViTri: [],
};

// ─── Export file definitions ──────────────────────────────────────────────────

const EXPORT_FILES = [
  {
    id: 'ds-du-thi',
    name: 'Danh sách thí sinh đủ điều kiện dự thi',
    type: 'Excel' as const,
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'ket-qua-diem',
    name: 'Kết quả thi chấm điểm tổng hợp',
    type: 'Excel' as const,
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    id: 'ds-dau',
    name: 'Danh sách thí sinh đỗ viên chức',
    type: 'PDF' as const,
    badgeCls: 'bg-red-50 text-red-700 border-red-200',
  },
  {
    id: 'bien-ban',
    name: 'Biên bản xét tuyển hội đồng',
    type: 'Word' as const,
    badgeCls: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    id: 'bang-diem-phong',
    name: 'Bảng điểm chi tiết theo phòng thi',
    type: 'Excel' as const,
    badgeCls: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
];

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

function CustomBarTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-medium text-slate-700">{label}</p>
      <p className="text-slate-600">{payload[0]?.value} thí sinh</p>
    </div>
  );
}

function CustomGroupedTooltip({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; fill: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.fill }}>{p.name}: {p.value}</p>
      ))}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function BaoCaoPage() {
  const { data: topbar } = useTopbar();
  const kyId = topbar.ky?.id ?? null;

  const [mounted, setMounted] = useState(false);
  const [quyen, setQuyen] = useState<string>('');
  useEffect(() => {
    setMounted(true);
    fetch('/api/auth/me', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(me => { if (me?.quyen) setQuyen(me.quyen); })
      .catch(() => {});
  }, []);
  const canXuat = quyen === 'ADMIN' || quyen === 'LANH_DAO';

  const url = kyId ? `/api/bao-cao?ky_tuyendung_id=${kyId}` : null;
  const { data, loading, error, refresh } = usePageFetch<BaoCaoData>(url, { fallback: EMPTY });

  // Pie chart data
  const pieData = data.tyLe.tong > 0 ? [
    { name: `Đỗ (≥5.0)`, value: data.tyLe.dat, fill: '#10b981' },
    { name: `Trượt (<5.0)`, value: data.tyLe.khongDat, fill: '#ef4444' },
    ...(data.tyLe.vangBo > 0 ? [{ name: 'Vắng/Bỏ', value: data.tyLe.vangBo, fill: '#94a3b8' }] : []),
  ] : [];

  // Export handlers — gọi API /api/bao-cao/xuat
  async function handleExport(fileId: string) {
    if (!kyId) return;
    // Chỉ 3 loại Excel có API, 2 loại còn lại (PDF/Word) để sau
    const excelMap: Record<string, string> = {
      'ds-du-thi': 'ds-du-thi',
      'ket-qua-diem': 'ket-qua-diem',
      'bang-diem-phong': 'bang-diem-phong',
    };
    const loai = excelMap[fileId];
    if (!loai) {
      // PDF/Word — chưa implement, thông báo
      alert('Xuất PDF/Word sẽ khả dụng khi có template Word chuẩn từ Hội đồng.');
      return;
    }
    try {
      const res = await fetch(`/api/bao-cao/xuat?ky_tuyendung_id=${kyId}&loai=${loai}`);
      if (!res.ok) { alert('Lỗi xuất file'); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bao-cao-${loai}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Lỗi kết nối');
    }
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <div className="flex items-center justify-between">
        <PageHeader
          title="Báo cáo"
          description="Thống kê kết quả và xuất tài liệu"
        />
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<RefreshCw size={14} />}
          onClick={() => refresh()}
          disabled={loading}
        >
          Làm mới
        </Button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="shrink-0" />
          {error.message}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-20">
          <Spinner />
        </div>
      )}

      {!loading && (
        <>
          {/* Stat summary */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              <div className="text-2xl font-bold text-brand-600">{data.tongHopLe.toLocaleString('vi-VN')}</div>
              <div className="text-xs text-slate-500 mt-0.5">Thí sinh hợp lệ</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              <div className="text-2xl font-bold text-slate-700">{data.tongDaNhapDiem.toLocaleString('vi-VN')}</div>
              <div className="text-xs text-slate-500 mt-0.5">Đã nhập điểm</div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
              <div className="text-2xl font-bold text-emerald-600">{data.tyLe.tyLeDat}%</div>
              <div className="text-xs text-slate-500 mt-0.5">Tỷ lệ đỗ</div>
            </div>
            {data.tyLe.dat > 0 && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center">
                <div className="text-2xl font-bold text-red-500">{data.tyLe.tyLeRat}%</div>
                <div className="text-xs text-slate-500 mt-0.5">Tỷ lệ trượt</div>
              </div>
            )}
          </div>

          {/* Row 1: Bar chart + Pie chart */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">

            {/* Phân bổ điểm thi */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Phân bổ điểm thi</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {data.tyLe.tong > 0 ? `${data.tyLe.tong.toLocaleString('vi-VN')} thí sinh đã chấm điểm` : 'Chưa có dữ liệu'}
                </p>
              </div>
              {data.phanBoDiem.length > 0 ? (
                mounted ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={data.phanBoDiem} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                      <Tooltip content={<CustomBarTooltip />} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={52}>
                        {data.phanBoDiem.map((entry, idx) => (
                          <Cell key={idx} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] animate-pulse bg-slate-50 rounded-lg" />
                )
              ) : (
                <EmptyChart description="Chưa có điểm thi nào được nhập" />
              )}
            </div>

            {/* Tỷ lệ đỗ / trượt */}
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-slate-800">Tỷ lệ đỗ / trượt</h3>
                <p className="text-xs text-slate-500 mt-0.5">Toàn kỳ tuyển dụng {topbar.ky?.nam ?? ''}</p>
              </div>
              {pieData.length > 0 ? (
                <div className="flex items-center gap-4">
                  {mounted ? (
                    <ResponsiveContainer width={200} height={200}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={90}
                          strokeWidth={2}
                          stroke="#ffffff"
                          dataKey="value"
                        >
                          {pieData.map((entry, i) => (
                            <Cell key={i} fill={entry.fill} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => [`${v} TS`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] w-[200px] shrink-0 animate-pulse bg-slate-50 rounded-full" />
                  )}
                  <div className="flex flex-col gap-3">
                    {pieData.map(item => (
                      <div key={item.name} className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }} />
                          <span className="text-sm text-slate-600">{item.name}</span>
                        </div>
                        <span className="ml-5 text-base font-bold text-slate-800">
                          {item.value.toLocaleString('vi-VN')} TS
                        </span>
                      </div>
                    ))}
                    <div className="mt-2 border-t border-slate-100 pt-2">
                      <p className="text-xs text-slate-500">Tỷ lệ đỗ:</p>
                      <p className="text-xl font-bold text-emerald-600">{data.tyLe.tyLeDat}%</p>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyChart description="Chưa có điểm thi nào được nhập" />
              )}
            </div>
          </div>

          {/* Row 2: Kết quả theo vị trí */}
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Kết quả theo vị trí tuyển dụng</h3>
                <p className="text-xs text-slate-500 mt-0.5">So sánh đỗ / trượt theo từng vị trí</p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-emerald-500" />Đỗ</span>
                <span className="flex items-center gap-1.5"><span className="inline-block h-3 w-3 rounded-sm bg-red-400" />Trượt</span>
              </div>
            </div>
            {data.ketQuaTheoViTri.length > 0 ? (
              mounted ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={data.ketQuaTheoViTri} margin={{ top: 4, right: 8, bottom: 0, left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomGroupedTooltip />} />
                    <Bar dataKey="dat" name="Đỗ" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    <Bar dataKey="khongDat" name="Trượt" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] animate-pulse bg-slate-50 rounded-lg" />
              )
            ) : (
              <EmptyChart description="Chưa có dữ liệu vị trí" />
            )}
          </div>

          {/* Row 3: Tài liệu xuất */}
          {canXuat && (
          <div data-guide="bao-cao-xuat" className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100">
                  <FileText size={16} className="text-slate-600" />
                </div>
                <h3 className="text-lg font-semibold text-slate-800">Tài liệu và báo cáo xuất</h3>
              </div>
              <Button variant="outline" size="sm" leftIcon={<Printer size={14} />}>
                In tất cả
              </Button>
            </div>

            <div className="divide-y divide-slate-50">
              {EXPORT_FILES.map(file => (
                <div key={file.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                  {/* File icon */}
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                    <FileText size={15} className="text-slate-500" />
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{file.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {new Date().toLocaleDateString('vi-VN')}
                    </p>
                  </div>

                  {/* Type badge */}
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${file.badgeCls}`}>
                    {file.type}
                  </span>

                  {/* Download button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<Download size={13} />}
                    onClick={() => handleExport(file.id)}
                    className="shrink-0"
                  >
                    Tải xuống
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
        </>
      )}
    </div>
  );
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function EmptyChart({ description }: { description: string }) {
  return (
    <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-400">
      {description}
    </div>
  );
}
