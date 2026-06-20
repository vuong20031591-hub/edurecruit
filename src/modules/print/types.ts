/**
 * print module - types
 * File: src/modules/print/types.ts
 */
export interface Print {
  id: number;
  filename: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
}

export type PrintListItem = Print;

export interface printFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

