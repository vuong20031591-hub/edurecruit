/**
 * Common types dùng trong UI
 * File: src/shared/types/index.ts
 */

export interface PageProps {
  params: Promise<{ [key: string]: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export interface ApiSuccess<T> { data: T; }
export interface ApiError { error: string; status: number; }
export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TableState {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  search?: string;
  filters?: Record<string, string | number | boolean | null>;
}

export interface MenuItem {
  label: string;
  href: string;
  icon?: string;
  children?: MenuItem[];
  permission?: string;
}
