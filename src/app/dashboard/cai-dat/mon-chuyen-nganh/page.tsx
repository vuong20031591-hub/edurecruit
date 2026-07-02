'use client';
import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Save, ChevronDown, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { PageHeader, Button, Spinner, Modal, toast } from '@/shared/components';
import { cn } from '@/shared/lib/cn';

interface MonChuyenNganhRow {
  id: number;
  mon: string;
  chuyen_nganh: string;
  ghi_chu: string | null;
  created_at: string;
  updated_at: string;
}

interface Grouped {
  mon: string;
  items: MonChuyenNganhRow[];
}

export default function MonChuyenNganhPage() {
  const [grouped, setGrouped] = useState<Grouped[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Modal states
  const [addMonOpen, setAddMonOpen] = useState<{ mon: string } | null>(null);
  const [editMonOpen, setEditMonOpen] = useState<{ oldMon: string; newMon: string } | null>(null);
  const [deleteMonOpen, setDeleteMonOpen] = useState<string | null>(null);

  // Form state cho thêm chuyên ngành
  const [addCnForms, setAddCnForms] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/mon-chuyen-nganh?grouped=true', { cache: 'no-store' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const data = await res.json() as Grouped[];
      setGrouped(data);
      // Auto-expand tất cả môn lần đầu
      if (expanded.size === 0) {
        setExpanded(new Set(data.map(g => g.mon)));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const totalCn = useMemo(() => grouped.reduce((s, g) => s + g.items.length, 0), [grouped]);

  function toggleExpand(mon: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(mon)) next.delete(mon);
      else next.add(mon);
      return next;
    });
  }

  // ─── CRUD handlers ─────────────────────────────────────────────

  async function handleAddMon() {
    if (!addMonOpen) return;
    const mon = addMonOpen.mon.trim();
    if (!mon) {
      toast.error('Vui lòng nhập tên môn');
      return;
    }
    setSaving(true);
    try {
      // Tạo 1 chuyên ngành giả = tên môn để khởi tạo
      const res = await fetch('/api/mon-chuyen-nganh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mon, chuyen_nganh: mon })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      toast.success(`Đã thêm môn "${mon}"`);
      setAddMonOpen(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thêm môn');
    } finally {
      setSaving(false);
    }
  }

  async function handleAddChuyenNganh(mon: string) {
    const cn = (addCnForms[mon] || '').trim();
    if (!cn) {
      toast.error('Vui lòng nhập tên chuyên ngành');
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/mon-chuyen-nganh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mon, chuyen_nganh: cn })
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      toast.success(`Đã thêm "${cn}" vào môn "${mon}"`);
      setAddCnForms(prev => ({ ...prev, [mon]: '' }));
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi thêm chuyên ngành');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteRow(id: number, mon: string, chuyenNganh: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/mon-chuyen-nganh/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      toast.success(`Đã xóa "${chuyenNganh}" khỏi môn "${mon}"`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa');
    } finally {
      setSaving(false);
    }
  }

  async function handleEditMon() {
    if (!editMonOpen) return;
    const newMon = editMonOpen.newMon.trim();
    if (!newMon) {
      toast.error('Vui lòng nhập tên môn mới');
      return;
    }
    if (newMon === editMonOpen.oldMon) {
      setEditMonOpen(null);
      return;
    }
    setSaving(true);
    try {
      // Lấy tất cả chuyên ngành của môn cũ
      const oldGroup = grouped.find(g => g.mon === editMonOpen.oldMon);
      if (!oldGroup) throw new Error('Không tìm thấy môn');
      // Update từng row (đổi tên mon)
      for (const item of oldGroup.items) {
        if (item.chuyen_nganh === newMon) {
          // Cặp (newMon, newMon) đã tồn tại do seed → skip
          continue;
        }
        const res = await fetch(`/api/mon-chuyen-nganh/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mon: newMon })
        });
        if (!res.ok && res.status !== 409) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.error || `HTTP ${res.status}`);
        }
      }
      // Nếu có cặp (oldMon, oldMon) thì xóa (vì trùng tên)
      const selfRow = oldGroup.items.find(i => i.chuyen_nganh === editMonOpen.oldMon);
      if (selfRow) {
        await fetch(`/api/mon-chuyen-nganh/${selfRow.id}`, { method: 'DELETE' });
      }
      toast.success(`Đã đổi tên môn "${editMonOpen.oldMon}" → "${newMon}"`);
      setEditMonOpen(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi đổi tên');
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteMon(mon: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/mon-chuyen-nganh?mon=${encodeURIComponent(mon)}`, { method: 'DELETE' });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `HTTP ${res.status}`);
      }
      const j = await res.json();
      toast.success(`Đã xóa môn "${mon}" và ${j.deleted} chuyên ngành liên quan`);
      setDeleteMonOpen(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi xóa môn');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Quản lý Môn – Chuyên ngành"
        description={`Whitelist dùng cho rà soát tự động (Bước 2 PRD). Nếu (môn, chuyên ngành) có trong bảng này → pass; ngược lại fallback keyword. Hiện có ${grouped.length} môn × ${totalCn} chuyên ngành.`}
      />

      <div className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setAddMonOpen({ mon: '' })}
          >
            Thêm môn
          </Button>
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} className={loading ? 'animate-spin' : ''} />}
            onClick={() => void load()}
            disabled={loading}
          >
            Làm mới
          </Button>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Không tải được dữ liệu</div>
              <div className="text-xs">{error}</div>
            </div>
          </div>
        )}

        {loading && grouped.length === 0 ? (
          <div className="flex h-32 items-center justify-center rounded-lg border border-slate-200 bg-white">
            <Spinner size={24} className="text-brand-500" />
          </div>
        ) : grouped.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có môn nào. Bấm "Thêm môn" để bắt đầu.
          </div>
        ) : (
          <div className="space-y-2">
            {grouped.map((g) => {
              const isExpanded = expanded.has(g.mon);
              return (
                <div key={g.mon} className="rounded-lg border border-slate-200 bg-white overflow-hidden">
                  {/* Header */}
                  <div className="flex items-center justify-between bg-slate-50 px-4 py-3">
                    <button
                      type="button"
                      onClick={() => toggleExpand(g.mon)}
                      className="flex flex-1 items-center gap-2 text-left"
                    >
                      {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      <span className="font-semibold text-slate-800">{g.mon}</span>
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-2xs font-medium text-slate-600">
                        {g.items.length}
                      </span>
                    </button>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditMonOpen({ oldMon: g.mon, newMon: g.mon })}
                        disabled={saving}
                      >
                        Sửa tên
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        leftIcon={<Trash2 size={13} />}
                        onClick={() => setDeleteMonOpen(g.mon)}
                        disabled={saving}
                        className="text-red-600 hover:bg-red-50"
                      >
                        Xóa môn
                      </Button>
                    </div>
                  </div>

                  {/* Body (collapsible) */}
                  {isExpanded && (
                    <div className="px-4 py-3">
                      {/* List chuyên ngành */}
                      <div className="space-y-1.5">
                        {g.items.map(item => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between rounded-md border border-slate-100 bg-slate-50/50 px-3 py-2 hover:bg-slate-100"
                          >
                            <div className="flex items-center gap-2">
                              <span className="inline-block h-1.5 w-1.5 rounded-full bg-brand-500" />
                              <span className="text-sm text-slate-700">{item.chuyen_nganh}</span>
                              {item.ghi_chu && (
                                <span className="text-2xs italic text-slate-400">({item.ghi_chu})</span>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(item.id, g.mon, item.chuyen_nganh)}
                              disabled={saving}
                              className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Xóa chuyên ngành này"
                              aria-label={`Xóa ${item.chuyen_nganh}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Form thêm chuyên ngành */}
                      <div className="mt-3 flex items-center gap-2">
                        <input
                          type="text"
                          value={addCnForms[g.mon] ?? ''}
                          onChange={e => setAddCnForms(prev => ({ ...prev, [g.mon]: e.target.value }))}
                          onKeyDown={e => { if (e.key === 'Enter') void handleAddChuyenNganh(g.mon); }}
                          placeholder="Thêm chuyên ngành (vd: Sư phạm Toán)"
                          className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
                          disabled={saving}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          leftIcon={<Plus size={13} />}
                          onClick={() => handleAddChuyenNganh(g.mon)}
                          disabled={saving || !(addCnForms[g.mon] ?? '').trim()}
                        >
                          Thêm
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className={cn(
          'rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600'
        )}>
          <b>Hướng dẫn:</b> Whitelist này dùng cho rule rà soát "Chuyên ngành-môn không khớp" (Bước 2 PRD).
          Khi thí sinh đăng ký vị trí có môn X và chuyên ngành Y, hệ thống sẽ check xem cặp (X, Y) có trong bảng này không.
          Nếu có → pass. Nếu không → fallback keyword match. Cuối cùng vẫn fail → cảnh báo nhẹ -5đ.
        </div>
      </div>

      {/* Modal thêm môn */}
      <Modal
        open={addMonOpen !== null}
        onClose={() => !saving && setAddMonOpen(null)}
        title="Thêm môn mới"
        description="Nhập tên môn (vd: Toán, Ngữ văn, Quản lý). Sẽ tự tạo 1 chuyên ngành trùng tên để khởi tạo, bạn có thể thêm các chuyên ngành khác sau."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setAddMonOpen(null)} disabled={saving}>Hủy</Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save size={13} />}
              onClick={handleAddMon}
              loading={saving}
            >
              Thêm
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tên môn</label>
          <input
            type="text"
            value={addMonOpen?.mon ?? ''}
            onChange={e => setAddMonOpen(prev => prev ? { ...prev, mon: e.target.value } : prev)}
            onKeyDown={e => { if (e.key === 'Enter') void handleAddMon(); }}
            placeholder="VD: Toán"
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
            autoFocus
            disabled={saving}
          />
        </div>
      </Modal>

      {/* Modal sửa tên môn */}
      <Modal
        open={editMonOpen !== null}
        onClose={() => !saving && setEditMonOpen(null)}
        title="Sửa tên môn"
        description="Đổi tên sẽ ảnh hưởng đến tất cả chuyên ngành của môn này. Sẽ tự xóa cặp (tên cũ, tên cũ) nếu có."
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setEditMonOpen(null)} disabled={saving}>Hủy</Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Save size={13} />}
              onClick={handleEditMon}
              loading={saving}
            >
              Lưu
            </Button>
          </>
        }
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-slate-600">Tên môn mới</label>
          <input
            type="text"
            value={editMonOpen?.newMon ?? ''}
            onChange={e => setEditMonOpen(prev => prev ? { ...prev, newMon: e.target.value } : prev)}
            onKeyDown={e => { if (e.key === 'Enter') void handleEditMon(); }}
            className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-1 focus:ring-brand-200"
            autoFocus
            disabled={saving}
          />
        </div>
      </Modal>

      {/* Modal xóa môn */}
      <Modal
        open={deleteMonOpen !== null}
        onClose={() => !saving && setDeleteMonOpen(null)}
        title="Xóa môn"
        description={`Sẽ xóa toàn bộ chuyên ngành của môn "${deleteMonOpen}". Hành động này không thể hoàn tác.`}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setDeleteMonOpen(null)} disabled={saving}>Hủy</Button>
            <Button
              variant="danger"
              size="sm"
              leftIcon={<Trash2 size={13} />}
              onClick={() => deleteMonOpen && handleDeleteMon(deleteMonOpen)}
              loading={saving}
            >
              Xóa
            </Button>
          </>
        }
      >
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <b>Cảnh báo:</b> Tất cả chuyên ngành thuộc môn này sẽ bị xóa. Nếu chỉ muốn xóa 1 chuyên ngành cụ thể, hãy mở rộng môn và xóa từng dòng.
        </div>
      </Modal>
    </div>
  );
}
