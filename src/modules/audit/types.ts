/**
 * audit module - types
 * File: src/modules/audit/types.ts
 */
import type { LogHeThong } from '@/db/schema';

export type LogHeThongListItem = LogHeThong;

export interface auditFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

