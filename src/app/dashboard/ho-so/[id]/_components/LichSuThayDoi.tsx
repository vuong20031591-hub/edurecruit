'use client';
import { useEffect, useState } from 'react';
import { Badge, Spinner, Table, THead, TBody, TR, TH, TD, EmptyState } from '@/shared/components';
import { formatDateTime } from '@/shared/lib/format';
import { History } from 'lucide-react';

interface HistoryRow {
  id: number;
  truong: string;
  gia_tri_cu: string | null;
  gia_tri_moi: string | null;
  ly_do: string | null;
  nguoi_sua: number | null;
  nguoi_sua_ten?: string | null;
  ngay_sua: string;
}

interface Props {
  thisinhId: number;
}

export function LichSuThayDoi({ thisinhId }: Props) {
  const [data, setData] = useState<HistoryRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/hosso/${thisinhId}/lich-su`, { cache: 'no-store' });
        if (res.status === 404) {
          if (alive) {
            setData(null);
            setError('Chưa có API lịch sử thay đổi. Sẽ được bổ sung ở sprint sau.');
          }
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        if (!alive) return;
        setData(Array.isArray(json) ? json : (json.data ?? []));
      } catch (err) {
        if (!alive) return;
        setError(err instanceof Error ? err.message : 'Lỗi tải lịch sử');
        setData([]);
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => { alive = false; };
  }, [thisinhId]);

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-6 text-sm text-slate-500">
        <Spinner size={14} />
        Đang tải lịch sử thay đổi...
      </div>
    );
  }

  if (error || !data) {
    return (
      <EmptyState
        icon={<History size={32} />}
        title="Chưa có dữ liệu lịch sử"
        description={error ?? 'API /api/hosso/[id]/lich-su chưa được triển khai. TODO: implement endpoint này.'}
      />
    );
  }

  if (data.length === 0) {
    return (
      <EmptyState
        icon={<History size={32} />}
        title="Chưa có thay đổi nào"
        description="Hồ sơ này chưa được chỉnh sửa kể từ khi tạo."
      />
    );
  }

  return (
    <Table>
      <THead>
        <TR>
          <TH>Thời gian</TH>
          <TH>Trường thay đổi</TH>
          <TH>Giá trị cũ</TH>
          <TH>Giá trị mới</TH>
          <TH>Người sửa</TH>
          <TH>Lý do</TH>
        </TR>
      </THead>
      <TBody>
        {data.map(row => (
          <TR key={row.id}>
            <TD className="whitespace-nowrap text-xs text-slate-600">{formatDateTime(row.ngay_sua)}</TD>
            <TD><Badge variant="neutral">{row.truong}</Badge></TD>
            <TD className="max-w-[160px] truncate text-xs text-slate-600" title={row.gia_tri_cu ?? ''}>
              {row.gia_tri_cu ?? '—'}
            </TD>
            <TD className="max-w-[160px] truncate text-xs font-medium text-slate-900" title={row.gia_tri_moi ?? ''}>
              {row.gia_tri_moi ?? '—'}
            </TD>
            <TD className="text-xs text-slate-600">{row.nguoi_sua_ten ?? `#${row.nguoi_sua ?? '—'}`}</TD>
            <TD className="max-w-[200px] truncate text-xs italic text-slate-500" title={row.ly_do ?? ''}>
              {row.ly_do ?? '—'}
            </TD>
          </TR>
        ))}
      </TBody>
    </Table>
  );
}
