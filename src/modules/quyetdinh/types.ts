/**
 * quyetdinh module - types
 * File: src/modules/quyetdinh/types.ts
 */
import type { QuyetDinh } from '@/db/schema';

export type QuyetDinhListItem = QuyetDinh;

export interface quyetdinhFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

