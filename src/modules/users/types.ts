/**
 * users module - types
 * File: src/modules/users/types.ts
 */
import type { User } from '@/db/schema';

export type UserListItem = User;

export interface usersFilter {
  page?: number;
  pageSize?: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
}

