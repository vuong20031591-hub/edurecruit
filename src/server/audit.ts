/**
 * Audit log helper - ghi log vào bảng log_he_thong
 * File: src/server/audit.ts
 */
import { getDb } from '@/db';
import type { LogHeThong } from '@/db/schema';

export type AuditAction =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAIL'
  | 'LOGOUT'
  | 'IMPORT_EXCEL'
  | 'EXPORT_EXCEL'
  | 'EXPORT_WORD'
  | 'EXPORT_PDF'
  | 'CREATE_THISINH'
  | 'UPDATE_THISINH'
  | 'DELETE_THISINH'
  | 'DELETE_BULK_THISINH'
  | 'RA_SOAT_HOSO'
  | 'RA_SOAT_TU_DONG'
  | 'APPLY_RA_SOAT'
  | 'ROLLBACK_RA_SOAT'
  | 'CREATE_VITRI'
  | 'UPDATE_VITRI'
  | 'DELETE_VITRI'
  | 'MAP_DONVI_VITRI'
  | 'CREATE_DONVI'
  | 'UPDATE_DONVI'
  | 'DELETE_DONVI'
  | 'NHAP_DIEM'
  | 'NHAP_DIEM_UU_TIEN'
  | 'PREFILL_DIEM_UU_TIEN'
  | 'KHOA_DIEM'
  | 'XETTUYEN_TINH'
  | 'XETTUYEN_CHAY'
  | 'XEP_PHONG'
  | 'KHOA_HO_SO'
  | 'TAO_QUYETDINH'
  | 'BACKUP_CREATE'
  | 'BACKUP_RESTORE'
  | 'USER_CREATE'
  | 'USER_UPDATE'
  | 'USER_DELETE'
  | 'USER_RESET_PASSWORD'
  | 'CONFIG_UPDATE'
  | 'CONFIG_MON_CHUYEN_NGANH';

export interface AuditLogInput {
  userId?: number | null;
  username?: string | null;
  action: AuditAction;
  resourceType?: string;
  resourceId?: number;
  ipAddress?: string;
  userAgent?: string;
  payload?: unknown;
  result?: 'SUCCESS' | 'FAILURE';
  errorMessage?: string;
}

export function audit(input: AuditLogInput): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO log_he_thong (
      user_id, username, action, resource_type, resource_id,
      ip_address, user_agent, payload, result, error_message
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    input.userId ?? null,
    input.username ?? null,
    input.action,
    input.resourceType ?? null,
    input.resourceId ?? null,
    input.ipAddress ?? null,
    input.userAgent ?? null,
    input.payload ? JSON.stringify(input.payload) : null,
    input.result ?? 'SUCCESS',
    input.errorMessage ?? null
  );
}

export function getAuditLog(filter: {
  userId?: number;
  action?: string;
  resourceType?: string;
  from?: string;
  to?: string;
  limit?: number;
  offset?: number;
}): LogHeThong[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.userId) {
    conditions.push('user_id = ?');
    params.push(filter.userId);
  }
  if (filter.action) {
    conditions.push('action = ?');
    params.push(filter.action);
  }
  if (filter.resourceType) {
    conditions.push('resource_type = ?');
    params.push(filter.resourceType);
  }
  if (filter.from) {
    conditions.push('ngay_thuc_hien >= ?');
    params.push(filter.from);
  }
  if (filter.to) {
    conditions.push('ngay_thuc_hien <= ?');
    params.push(filter.to);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const sql = `
    SELECT * FROM log_he_thong
    ${where}
    ORDER BY ngay_thuc_hien DESC
    LIMIT ? OFFSET ?
  `;
  params.push(filter.limit ?? 100, filter.offset ?? 0);
  return db.prepare(sql).all(...params) as LogHeThong[];
}

export function countAuditLog(filter: {
  userId?: number;
  action?: string;
  from?: string;
  to?: string;
}): number {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter.userId) { conditions.push('user_id = ?'); params.push(filter.userId); }
  if (filter.action) { conditions.push('action = ?'); params.push(filter.action); }
  if (filter.from)   { conditions.push('ngay_thuc_hien >= ?'); params.push(filter.from); }
  if (filter.to)     { conditions.push('ngay_thuc_hien <= ?'); params.push(filter.to); }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const row = db.prepare(`SELECT COUNT(*) AS c FROM log_he_thong ${where}`).get(...params) as { c: number };
  return row.c;
}
