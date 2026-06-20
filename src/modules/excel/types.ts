/**
 * excel module - types
 * File: src/modules/excel/types.ts
 */
import type { ImportBatch } from '@/db/schema';

export type ImportBatchListItem = ImportBatch;

export interface excelFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

