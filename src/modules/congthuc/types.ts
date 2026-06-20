/**
 * congthuc module - types
 * File: src/modules/congthuc/types.ts
 */
import type { CongThucXetTuyen } from '@/db/schema';

export type CongThucXetTuyenListItem = CongThucXetTuyen;

export interface congthucFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

