/**
 * Permission helpers - check quyền theo role
 * File: src/server/permissions.ts
 */
import type { Quyen } from '@/db/schema';

export type Permission =
  | 'hosso.view' | 'hosso.create' | 'hosso.update' | 'hosso.delete' | 'hosso.rasoat' | 'hosso.khoa'
  | 'vitri.view' | 'vitri.create' | 'vitri.update' | 'vitri.delete'
  | 'donvi.view' | 'donvi.create' | 'donvi.update' | 'donvi.delete'
  | 'phongthi.view' | 'phongthi.create' | 'phongthi.update' | 'phongthi.xepphong' | 'phongthi.khoa'
  | 'diemthi.view' | 'diemthi.nhap' | 'diemthi.khoa'
  | 'xettuyen.chay' | 'xettuyen.xem'
  | 'baocao.xem' | 'baocao.xuat'
  | 'audit.xem'
  | 'users.view' | 'users.create' | 'users.update' | 'users.delete'
  | 'backup.create' | 'backup.restore'
  | 'config.view' | 'config.update'
  | 'quyetdinh.view' | 'quyetdinh.create' | 'quyetdinh.update' | 'quyetdinh.delete';

const ROLE_PERMISSIONS: Record<Quyen, Permission[]> = {
  ADMIN: [
    'hosso.view','hosso.create','hosso.update','hosso.delete','hosso.rasoat','hosso.khoa',
    'vitri.view','vitri.create','vitri.update','vitri.delete',
    'donvi.view','donvi.create','donvi.update','donvi.delete',
    'phongthi.view','phongthi.create','phongthi.update','phongthi.xepphong','phongthi.khoa',
    'diemthi.view','diemthi.nhap','diemthi.khoa',
    'xettuyen.chay','xettuyen.xem',
    'baocao.xem','baocao.xuat',
    'audit.xem',
    'users.view','users.create','users.update','users.delete',
    'backup.create','backup.restore',
    'config.view','config.update',
    'quyetdinh.view','quyetdinh.create','quyetdinh.update','quyetdinh.delete'
  ],
  TO_NHAP_HOSO: [
    'hosso.view','hosso.create','hosso.update','hosso.rasoat',
    'vitri.view','donvi.view',
    'phongthi.view','phongthi.create','phongthi.update','phongthi.xepphong',
    'baocao.xem',
    'quyetdinh.view'
  ],
  TO_NHAP_DIEM: [
    'hosso.view',
    'vitri.view','donvi.view',
    'phongthi.view',
    'diemthi.view','diemthi.nhap',
    // diemthi.khoa: PRD §Architecture spec §2.3 — chỉ Lãnh đạo/Admin khóa điểm
    'xettuyen.xem',
    'baocao.xem',
    'quyetdinh.view'
  ],
  LANH_DAO: [
    'hosso.view', 'hosso.khoa',
    'vitri.view','donvi.view',
    'phongthi.view',
    'diemthi.view', 'diemthi.khoa',
    'xettuyen.xem','xettuyen.chay',
    'baocao.xem','baocao.xuat',
    'audit.xem',
    'quyetdinh.view','quyetdinh.create','quyetdinh.update'
  ]
};

export function hasPermission(quyen: Quyen, perm: Permission): boolean {
  return ROLE_PERMISSIONS[quyen]?.includes(perm) ?? false;
}

export function getPermissions(quyen: Quyen): Permission[] {
  return ROLE_PERMISSIONS[quyen] ?? [];
}

export function requirePermission(quyen: Quyen, perm: Permission): void {
  if (!hasPermission(quyen, perm)) {
    throw new ForbiddenError(`Permission denied: ${perm}`);
  }
}

export class ForbiddenError extends Error {
  status = 403;
  constructor(message = 'Forbidden') {
    super(message);
    this.name = 'ForbiddenError';
  }
}
