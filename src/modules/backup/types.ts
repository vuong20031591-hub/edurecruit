/**
 * backup module - types
 * File: src/modules/backup/types.ts
 */
export interface Backup {
  id: number;
  filename: string;
  file_path: string;
  size_bytes: number;
  created_at: string;
}

export type BackupListItem = Backup;

export interface backupFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

