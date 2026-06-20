/**
 * backup module - repository
 * File: src/modules/backup/repository.ts
 */
// backup khÃ´ng cÃ³ báº£ng DB riÃªng - logic tá»•ng há»£p tá»« cÃ¡c báº£ng khÃ¡c
export const backupRepository: {
  listAll?: () => unknown[];
  findById?: (id: number) => unknown;
} = {};

