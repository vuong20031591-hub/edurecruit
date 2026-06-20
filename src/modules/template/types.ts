/**
 * template module - types
 * File: src/modules/template/types.ts
 */
import type { WordTemplate } from '@/db/schema';

export type WordTemplateListItem = WordTemplate;

export interface templateFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

