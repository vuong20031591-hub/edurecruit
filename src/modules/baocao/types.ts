/**
 * baocao module - types
 * File: src/modules/baocao/types.ts
 */
export interface BaoCao {
  id: number;
  filename: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
}

export type BaoCaoListItem = BaoCao;

export interface baocaoFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

