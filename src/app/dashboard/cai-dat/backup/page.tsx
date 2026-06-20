'use client';

import { useEffect, useState } from 'react';
import {
  PageHeader,
  Button,
  Spinner,
  EmptyState,
  Table, THead, TBody, TR, TH, TD,
  Modal,
  toast,
} from '@/shared/components';
import { DatabaseBackup, RotateCcw } from 'lucide-react';
import { usePageFetch } from '@/shared/hooks/usePageFetch';

interface BackupFile {
  file: string;
  size_kb: number;
  created_at: string;
}

interface BackupListResponse {
  backups: BackupFile[];
}

export default function BackupPage() {
  const [creating, setCreating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [confirmFile, setConfirmFile] = useState<string | null>(null);

  const { data, loading, error, refresh } = usePageFetch<BackupListResponse>('/api/backup/list', {
    fallback: { backups: [] }
  });
  const backups = data.backups;

  useEffect(() => {
    if (error) toast.error('Lỗi khi tải danh sách sao lưu');
  }, [error]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backup/create', { method: 'POST' });
      if (!res.ok) throw new Error('Tạo backup thất bại');
      const data = await res.json();
      toast.success(`Đã tạo bản sao lưu: ${data.file}`);
      refresh();
    } catch {
      toast.error('Lỗi khi tạo bản sao lưu');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async () => {
    if (!confirmFile) return;
    setRestoring(true);
    try {
      const res = await fetch('/api/backup/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: confirmFile }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error ?? 'Phục hồi thất bại');
      }
      toast.success(`Đã phục hồi thành công từ ${confirmFile}. Trang sẽ tải lại...`);
      setConfirmFile(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi khi phục hồi');
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  return (
    <div>
      <PageHeader
        title="Sao lưu & Phục hồi"
        description="Quản lý bản sao lưu cơ sở dữ liệu"
        actions={
          <Button
            onClick={handleCreate}
            loading={creating}
            leftIcon={<DatabaseBackup size={16} />}
          >
            Sao lưu ngay
          </Button>
        }
      />

      <div className="p-5 space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          ⚠️ Lưu ý: Sau khi phục hồi, trang sẽ tự tải lại. Mọi thay đổi chưa lưu sẽ bị mất.
        </div>

        <div className="rounded-xl border border-slate-200 bg-white">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Spinner />
            </div>
          ) : backups.length === 0 ? (
            <EmptyState
              icon={<DatabaseBackup size={40} />}
              title="Chưa có bản sao lưu nào"
              description="Nhấn nút &quot;Sao lưu ngay&quot; để tạo bản sao lưu đầu tiên"
            />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>STT</TH>
                  <TH>Tên file</TH>
                  <TH>Kích thước</TH>
                  <TH>Ngày tạo</TH>
                  <TH>Thao tác</TH>
                </TR>
              </THead>
              <TBody>
                {backups.map((b, i) => (
                  <TR key={b.file}>
                    <TD>{i + 1}</TD>
                    <TD className="font-mono text-xs">{b.file}</TD>
                    <TD>{b.size_kb >= 1024 ? `${(b.size_kb / 1024).toFixed(1)} MB` : `${b.size_kb} KB`}</TD>
                    <TD>{formatDate(b.created_at)}</TD>
                    <TD>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => setConfirmFile(b.file)}
                        leftIcon={<RotateCcw size={14} />}
                      >
                        Phục hồi
                      </Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </div>
      </div>

      <Modal
        open={!!confirmFile}
        onClose={() => setConfirmFile(null)}
        title="Xác nhận phục hồi"
        size="sm"
        footer={
          <>
            <Button variant="outline" onClick={() => setConfirmFile(null)}>
              Hủy
            </Button>
            <Button variant="danger" loading={restoring} onClick={handleRestore}>
              Phục hồi
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-700">
          ⚠️ Toàn bộ dữ liệu hiện tại sẽ bị ghi đè bởi bản sao lưu{' '}
          <strong className="font-mono">{confirmFile}</strong>.
          Thao tác này không thể hoàn tác. Bạn có chắc chắn muốn tiếp tục?
        </p>
      </Modal>
    </div>
  );
}
