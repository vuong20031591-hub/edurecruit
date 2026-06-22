'use client';

import { useEffect, useState, useCallback } from 'react';
import { Plus, Pencil, KeyRound, Trash2 } from 'lucide-react';
import {
  PageHeader, Button, Input, Select,
  Table, THead, TBody, TR, TH, TD,
  Spinner, EmptyState, Modal, toast,
} from '@/shared/components';
import type { Quyen, TrangThaiUser } from '@/db/schema';

interface UserRow {
  id: number;
  username: string;
  ho_ten: string;
  email: string | null;
  quyen: Quyen;
  trang_thai: TrangThaiUser;
  last_login_at: string | null;
  created_at: string;
}

type ModalMode = 'create' | 'edit' | 'reset-password' | 'delete' | null;

const QUYEN_OPTIONS: { value: Quyen; label: string }[] = [
  { value: 'ADMIN', label: 'Admin' },
  { value: 'TO_NHAP_HOSO', label: 'Tổ nhập hồ sơ' },
  { value: 'TO_NHAP_DIEM', label: 'Tổ nhập điểm' },
  { value: 'LANH_DAO', label: 'Lãnh đạo' },
];

const QUYEN_BADGE: Record<Quyen, { label: string; cls: string }> = {
  ADMIN: { label: 'Admin', cls: 'bg-purple-100 text-purple-800' },
  TO_NHAP_HOSO: { label: 'Tổ nhập HS', cls: 'bg-blue-100 text-blue-800' },
  TO_NHAP_DIEM: { label: 'Tổ nhập điểm', cls: 'bg-emerald-100 text-emerald-800' },
  LANH_DAO: { label: 'Lãnh đạo', cls: 'bg-amber-100 text-amber-800' },
};

const TRANG_THAI_BADGE: Record<TrangThaiUser, { label: string; cls: string }> = {
  HoatDong: { label: 'Hoạt động', cls: 'bg-green-100 text-green-800' },
  Khoa: { label: 'Khóa', cls: 'bg-red-100 text-red-800' },
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [formHoTen, setFormHoTen] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formQuyen, setFormQuyen] = useState<Quyen>('TO_NHAP_HOSO');
  const [formTrangThai, setFormTrangThai] = useState<TrangThaiUser>('HoatDong');
  const [formPassword, setFormPassword] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users?all=true', { cache: 'no-store' });
      if (res.ok) {
        const j = await res.json();
        setUsers(j.data ?? []);
      }
    } catch {
      toast.error('Không tải được danh sách tài khoản');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function openCreate() {
    setFormHoTen('');
    setFormUsername('');
    setFormEmail('');
    setFormQuyen('TO_NHAP_HOSO');
    setFormTrangThai('HoatDong');
    setFormPassword('');
    setSelectedUser(null);
    setModalMode('create');
  }

  function openEdit(user: UserRow) {
    setFormHoTen(user.ho_ten);
    setFormUsername(user.username);
    setFormEmail(user.email ?? '');
    setFormQuyen(user.quyen);
    setFormTrangThai(user.trang_thai);
    setSelectedUser(user);
    setModalMode('edit');
  }

  function openResetPassword(user: UserRow) {
    setFormPassword('');
    setSelectedUser(user);
    setModalMode('reset-password');
  }

  function openDelete(user: UserRow) {
    setSelectedUser(user);
    setModalMode('delete');
  }

  function closeModal() {
    setModalMode(null);
    setSelectedUser(null);
  }

  async function handleCreateSubmit() {
    if (!formHoTen.trim() || !formUsername.trim() || !formPassword) {
      toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
      return;
    }
    if (formPassword.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formUsername.trim(),
          ho_ten: formHoTen.trim(),
          email: formEmail.trim() || undefined,
          quyen: formQuyen,
          trang_thai: formTrangThai,
          password: formPassword,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Tạo tài khoản thành công');
        closeModal();
        loadUsers();
      } else {
        toast.error(data.error ?? 'Lỗi tạo tài khoản');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleEditSubmit() {
    if (!selectedUser) return;
    if (!formHoTen.trim()) {
      toast.error('Họ tên không được trống');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ho_ten: formHoTen.trim(),
          email: formEmail.trim() || null,
          quyen: formQuyen,
          trang_thai: formTrangThai,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Cập nhật thành công');
        closeModal();
        loadUsers();
      } else {
        toast.error(data.error ?? 'Lỗi cập nhật');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword() {
    if (!selectedUser) return;
    if (!formPassword || formPassword.length < 6) {
      toast.error('Mật khẩu tối thiểu 6 ký tự');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: formPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success('Đặt lại mật khẩu thành công');
        closeModal();
      } else {
        toast.error(data.error ?? 'Lỗi đặt lại mật khẩu');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        toast.success('Xóa tài khoản thành công');
        closeModal();
        loadUsers();
      } else {
        toast.error(data.error ?? 'Lỗi xóa tài khoản');
      }
    } catch {
      toast.error('Lỗi kết nối');
    } finally {
      setSubmitting(false);
    }
  }

  function formatDate(d: string | null) {
    if (!d) return '—';
    return new Date(d).toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }

  return (
    <div className="flex flex-col gap-4 p-5">
      <PageHeader
        title="Quản lý tài khoản"
        description="Thêm, sửa, xóa tài khoản người dùng hệ thống"
        actions={
          <span data-guide="users-create">
            <Button size="sm" leftIcon={<Plus size={14} />} onClick={openCreate}>
              Thêm tài khoản
            </Button>
          </span>
        }
      />

      <div data-guide="users-list" className="rounded-xl border border-slate-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16"><Spinner /></div>
        ) : users.length === 0 ? (
          <EmptyState title="Chưa có tài khoản nào" description="Tạo tài khoản đầu tiên" />
        ) : (
          <Table>
            <THead>
              <TR>
                <TH className="w-12">STT</TH>
                <TH>Username</TH>
                <TH>Họ tên</TH>
                <TH>Vai trò</TH>
                <TH>Trạng thái</TH>
                <TH>Đăng nhập cuối</TH>
                <TH className="text-right">Thao tác</TH>
              </TR>
            </THead>
            <TBody>
              {users.map((u, idx) => (
                <TR key={u.id}>
                  <TD className="text-slate-500">{idx + 1}</TD>
                  <TD className="font-mono text-xs">{u.username}</TD>
                  <TD>{u.ho_ten}</TD>
                  <TD>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${QUYEN_BADGE[u.quyen].cls}`}>
                      {QUYEN_BADGE[u.quyen].label}
                    </span>
                  </TD>
                  <TD>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${TRANG_THAI_BADGE[u.trang_thai].cls}`}>
                      {TRANG_THAI_BADGE[u.trang_thai].label}
                    </span>
                  </TD>
                  <TD className="text-xs text-slate-500">{formatDate(u.last_login_at)}</TD>
                  <TD>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(u)}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-brand-600"
                        title="Sửa"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openResetPassword(u)}
                        className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-amber-600"
                        title="Đặt lại mật khẩu"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openDelete(u)}
                        className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-600"
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
        )}
      </div>

      {/* Modal tạo/sửa */}
      <Modal
        open={modalMode === 'create' || modalMode === 'edit'}
        onClose={closeModal}
        title={modalMode === 'create' ? 'Thêm tài khoản' : 'Chỉnh sửa tài khoản'}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeModal}>Hủy</Button>
            <Button
              size="sm"
              loading={submitting}
              onClick={modalMode === 'create' ? handleCreateSubmit : handleEditSubmit}
            >
              {modalMode === 'create' ? 'Tạo' : 'Lưu'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Họ tên"
            required
            value={formHoTen}
            onChange={e => setFormHoTen(e.target.value)}
            placeholder="Nguyễn Văn A"
          />
          <Input
            label="Username"
            required
            value={formUsername}
            onChange={e => setFormUsername(e.target.value)}
            placeholder="nguyenvana"
            disabled={modalMode === 'edit'}
          />
          <Input
            label="Email"
            type="email"
            value={formEmail}
            onChange={e => setFormEmail(e.target.value)}
            placeholder="email@example.com"
          />
          <Select
            label="Vai trò"
            required
            value={formQuyen}
            onChange={e => setFormQuyen(e.target.value as Quyen)}
          >
            {QUYEN_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </Select>
          {modalMode === 'edit' && (
            <Select
              label="Trạng thái"
              value={formTrangThai}
              onChange={e => setFormTrangThai(e.target.value as TrangThaiUser)}
            >
              <option value="HoatDong">Hoạt động</option>
              <option value="Khoa">Khóa</option>
            </Select>
          )}
          {modalMode === 'create' && (
            <Input
              label="Mật khẩu"
              required
              type="password"
              value={formPassword}
              onChange={e => setFormPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
            />
          )}
        </div>
      </Modal>

      {/* Modal đặt lại mật khẩu */}
      <Modal
        open={modalMode === 'reset-password'}
        onClose={closeModal}
        title={`Đặt lại mật khẩu — ${selectedUser?.ho_ten ?? ''}`}
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeModal}>Hủy</Button>
            <Button size="sm" loading={submitting} onClick={handleResetPassword}>
              Xác nhận
            </Button>
          </>
        }
      >
        <Input
          label="Mật khẩu mới"
          required
          type="password"
          value={formPassword}
          onChange={e => setFormPassword(e.target.value)}
          placeholder="Tối thiểu 6 ký tự"
        />
      </Modal>

      {/* Modal xóa */}
      <Modal
        open={modalMode === 'delete'}
        onClose={closeModal}
        title="Xác nhận xóa tài khoản"
        size="sm"
        footer={
          <>
            <Button variant="outline" size="sm" onClick={closeModal}>Hủy</Button>
            <Button variant="danger" size="sm" loading={submitting} onClick={handleDelete}>
              Xóa
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Bạn có chắc muốn xóa tài khoản <strong>{selectedUser?.username}</strong> ({selectedUser?.ho_ten})?
          Hành động này không thể hoàn tác.
        </p>
      </Modal>
    </div>
  );
}
