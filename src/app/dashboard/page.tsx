'use client';
import { useState } from 'react';
import { Users, CheckCircle2, Building2, Activity, AlertCircle } from 'lucide-react';
import { PageHeader } from '@/shared/components';
import { StatCard } from './_components/StatCard';
import { ProgressChart } from './_components/ProgressChart';
import { PositionBarChart } from './_components/PositionBarChart';
import { ActivityCard } from './_components/ActivityCard';
import { KySelector } from './_components/KySelector';
import { Spinner } from '@/shared/components';
import { useDashboardStats } from '@/shared/hooks/useDashboardStats';

export default function DashboardOverviewPage() {
  const [selectedKyId, setSelectedKyId] = useState<number | undefined>(undefined);
  // defaultKyId: kỳ active (load lần đầu không có param), dùng để phát hiện "xem lại kỳ cũ"
  const [defaultKyId, setDefaultKyId] = useState<number | null>(null);
  const { data, loading, error } = useDashboardStats(selectedKyId);

  const { ky, stats, progressChart, positionBar } = data;
  const tyLeHopLe = stats.tongSoHoSo > 0 ? Math.round(stats.hopLe / stats.tongSoHoSo * 100) : 0;
  const phongDu = stats.tongChoNgoi >= stats.tongSoHoSo;

  // Ghi nhận kỳ active lần đầu data load xong
  const currentKyId = defaultKyId ?? ky?.id ?? null;
  if (!loading && ky && defaultKyId === null) setDefaultKyId(ky.id);
  const isViewingOld = selectedKyId != null && currentKyId != null && selectedKyId !== currentKyId;

  return (
    <div>
      <PageHeader
        title="Tổng quan"
        description={ky ? `Kỳ tuyển dụng viên chức ${ky.nam - 1}–${ky.nam}` : 'Thống kê và hoạt động gần đây'}
        actions={
          <KySelector
            currentKyId={currentKyId}
            selectedKyId={selectedKyId ?? null}
            onChange={setSelectedKyId}
          />
        }
      />

      <div className="p-5">
        {isViewingOld && ky && (
          <div className="mb-4 flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700">
            <AlertCircle size={14} className="shrink-0" />
            Đang xem lại dữ liệu — {ky.ten_ky}. Chỉ đọc, không thể thao tác nhập mới.
          </div>
        )}
        {error && (
          <div className="mb-4 flex items-start gap-2 rounded-md border border-status-danger/30 bg-red-50 px-3 py-2 text-sm text-status-danger">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Không tải được dữ liệu</div>
              <div className="text-xs">{error.message}</div>
            </div>
          </div>
        )}

        {/* 4 stat cards */}
        {loading && stats.tongSoHoSo === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <Spinner size={24} className="text-brand-500" />
          </div>
        ) : (
          <div data-guide="tongquan-kpi" className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              label="Tổng số hồ sơ"
              value={stats.tongSoHoSo.toLocaleString('vi-VN')}
              sub={`Tính đến ${new Date().toLocaleDateString('vi-VN')}`}
              trend={{ value: stats.tongSoHoSo > 0 ? `+${stats.canBoSung + stats.khongDuDieuKien} chờ xử lý` : 'Chưa có dữ liệu' }}
              icon={Users}
              tone="blue"
            />
            <StatCard
              label="Đã duyệt hợp lệ"
              value={stats.hopLe.toLocaleString('vi-VN')}
              sub={`Tỷ lệ: ${tyLeHopLe}%`}
              trend={stats.canBoSung > 0
                ? { value: `${stats.canBoSung} cần bổ sung`, up: false }
                : { value: 'Đã duyệt xong' }}
              icon={CheckCircle2}
              tone="green"
            />
            <StatCard
              label="Số phòng thi"
              value={stats.soPhong}
              sub={`Tổng: ${stats.tongChoNgoi.toLocaleString('vi-VN')} chỗ ngồi`}
              trend={phongDu
                ? { value: 'Đủ chỗ' }
                : { value: `Thiếu ${stats.tongSoHoSo - stats.tongChoNgoi} chỗ`, up: false }}
              icon={Building2}
              tone="purple"
            />
            <StatCard
              label="Trạng thái hệ thống"
              value="Hoạt động"
              sub={ky ? `Kỳ thi: ${new Date(ky.ngay_bat_dau).toLocaleDateString('vi-VN')} – ${new Date(ky.ngay_ket_thuc).toLocaleDateString('vi-VN')}` : 'Chưa có kỳ'}
              trend={{ value: 'Bình thường' }}
              icon={Activity}
              tone="teal"
            />
          </div>
        )}

        {/* Charts */}
        <div data-guide="tongquan-charts" className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {progressChart.length > 0
              ? <ProgressChart data={progressChart} year={ky ? `${ky.nam - 1}-${ky.nam}` : '2025-2026'} />
              : <EmptyChart title="Tiến độ tiếp nhận hồ sơ" description="Chưa có dữ liệu" />
            }
          </div>
          {positionBar.length > 0
            ? <PositionBarChart data={positionBar} />
            : <EmptyChart title="Hồ sơ theo vị trí" description="Chưa có dữ liệu" />
          }
        </div>

        {/* Activity log */}
        <div data-guide="tongquan-activity" className="mt-5">
          <ActivityCard />
        </div>
      </div>
    </div>
  );
}

function EmptyChart({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex h-80 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-slate-400">
      <div className="text-base font-medium text-slate-600">{title}</div>
      <div className="mt-1 text-sm">{description}</div>
    </div>
  );
}
