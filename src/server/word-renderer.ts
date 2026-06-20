/**
 * Word template renderer - wrapper quanh docx-templates
 * File: src/server/word-renderer.ts
 *
 * Sử dụng:
 *   const buf = await renderTemplate('MAU_01_PHIEU_DANG_KY_DU_TUYEN', {
 *     ho_ten: 'Nguyễn Văn A',
 *     ngay_sinh: '01/01/1990',
 *     ...
 *   });
 */
import fs from 'node:fs';
import path from 'node:path';
import { getDb } from '@/db';
import type { WordTemplate } from '@/db/schema';

interface RenderOptions {
  /** Command XML injection: các lệnh FOR/IF/QUERY/EXEC trong template */
  commands?: Record<string, unknown>;
  /** Dữ liệu truyền vào template */
  data: Record<string, unknown>;
  /** Tên file output (không có extension) */
  outputName: string;
}

export async function renderTemplate(
  maTemplate: string,
  data: Record<string, unknown>
): Promise<{ buffer: Buffer; fileName: string }> {
  const db = getDb();
  const tmpl = db.prepare('SELECT * FROM word_templates WHERE ma_template = ? AND trang_thai = ?')
    .get(maTemplate, 'HoatDong') as WordTemplate | undefined;
  if (!tmpl) {
    throw new Error(`Template not found or inactive: ${maTemplate}`);
  }

  const filePath = path.isAbsolute(tmpl.file_path)
    ? tmpl.file_path
    : path.resolve(process.cwd(), tmpl.file_path);

  if (!fs.existsSync(filePath)) {
    throw new Error(`Template file missing: ${filePath}`);
  }

  // Dynamic import vì docx-templates là ESM-only
  const docxTemplates = await import('docx-templates');
  const report = await docxTemplates.createReport({
    template: fs.readFileSync(filePath),
    data: { ...data, CMD_DATA: data },
    additionalJsContext: {
      /**
       * Hàm tiện ích dùng trong template Word:
       *   {formatDate: formatDate}
       *   {vietnameseMoney: vietnameseMoney}
       */
      formatDate(value: unknown, format = 'dd/MM/yyyy'): string {
        if (!value) return '';
        const d = new Date(String(value));
        if (isNaN(d.getTime())) return String(value);
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        if (format === 'dd/MM/yyyy') return `${dd}/${mm}/${yyyy}`;
        if (format === 'yyyy-MM-dd') return `${yyyy}-${mm}-${dd}`;
        return d.toISOString();
      },
      vietnameseMoney(value: unknown): string {
        const n = Number(value ?? 0);
        if (isNaN(n)) return '0';
        return n.toLocaleString('vi-VN');
      }
    },
    failFast: false
  });

  return {
    buffer: Buffer.from(report),
    fileName: `${tmpl.ma_template}_${Date.now()}.docx`
  };
}

/** Lấy template theo mã (cho UI) */
export function listTemplates(loai?: string): WordTemplate[] {
  const db = getDb();
  if (loai) {
    return db.prepare('SELECT * FROM word_templates WHERE loai = ? ORDER BY ten_template')
      .all(loai) as WordTemplate[];
  }
  return db.prepare('SELECT * FROM word_templates ORDER BY loai, ten_template')
    .all() as WordTemplate[];
}
