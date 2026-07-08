'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileSpreadsheet, CheckCircle, AlertCircle, X, Loader2, Upload, Eye } from 'lucide-react';
import { PageHeader, Button, toast } from '@/shared/components';

interface KyOption { id: number; ten_ky: string; nam: number; }

interface ImportResult {
  imported: number;
  skipped: string[];
  matchedSubjects: string[];
  unmatchedSubjects: string[];
}

interface SubjectMeta { mon: string; loaiViTri: 'GiaoVien' | 'NhanVien'; }

interface PreviewRow {
  tenDonVi: string;
  capHoc: string;
  total: number;
  subjects: Array<{ mon: string; loaiViTri: string; soLuong: number }>;
}

interface PreviewData {
  subjectMeta: SubjectMeta[];
  matchedSubjects: string[];
  unmatchedSubjects: string[];
  skipped: string[];
  preview: PreviewRow[];
}

export default function ImportChiTieuPage() {
  const router = useRouter();

  const [kyList, setKyList] = useState<KyOption[]>([]);
  const [kyId, setKyId] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/ky-tuyendung')
      .then(r => r.json())
      .then(j => {
        const list: KyOption[] = Array.isArray(j.data) ? j.data : [];
        setKyList(list);
        if (list.length > 0) setKyId(list[0].id);
      })
      .catch(() => toast.error('Không tải được danh sách kỳ tuyển dụng'));
  }, []);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function handleFileSelect(f: File) {
    if (!f.name.endsWith('.xlsx') && !f.name.endsWith('.xls')) {
      toast.error('Chỉ hỗ trợ file Excel (.xlsx, .xls)');
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      toast.error('File quá lớn (tối đa 10MB)');
      return;
    }
    setFile(f);
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function handleDragOver(e: React.DragEvent) { e.preventDefault(); setDragging(true); }
  function handleDragLeave() { setDragging(false); }
  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }
  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) handleFileSelect(f);
  }

  function reset() {
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePreview() {
    if (!file || !kyId) return;
    setPreviewing(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ky_tuyendung_id', String(kyId));
      fd.append('dry_run', 'true');
      const res = await fetch('/api/donvi/import-chitieu', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setPreview(data as PreviewData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi xem trước');
      toast.error(err instanceof Error ? err.message : 'Lỗi xem trước');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleImport() {
    if (!file || !kyId) return;
    setLoading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('ky_tuyendung_id', String(kyId));
      const res = await fetch('/api/donvi/import-chitieu', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
      setResult(data as ImportResult);
      setPreview(null);
      toast.success(`Import thành công ${(data as ImportResult).imported} đơn vị`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi import');
      toast.error(err instanceof Error ? err.message : 'Lỗi import');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Import chỉ tiêu tuyển dụng"
        description="Nạp dữ liệu chỉ tiêu theo đơn vị và môn học từ file Excel"
      />

      <div className="mx-auto max-w-5xl space-y-5 p-5">
        {/* Kỳ tuyển dụng */}
        <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-3 text-sm">
            <span className="font-medium text-slate-700 shrink-0">Kỳ tuyển dụng:</span>
            {kyList.length === 0 ? (
              <span className="text-slate-400">Đang tải...</span>
            ) : (
              <select
                value={kyId ?? ''}
                onChange={e => { setKyId(Number(e.target.value)); setPreview(null); }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm text-slate-800 focus:border-brand-400 focus:outline-none focus:ring-1 focus:ring-brand-100"
              >
                {kyList.map(k => (
                  <option key={k.id} value={k.id}>{k.ten_ky} ({k.nam})</option>
                ))}
              </select>
            )}
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Import sẽ <strong>ghi đè toàn bộ</strong> chỉ tiêu hiện có của kỳ này.
          </p>
        </div>

        {/* Drop zone — ẩn khi đã có preview hoặc result */}
        {!result && !preview && (
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={[
              'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors',
              dragging ? 'border-brand-400 bg-brand-50' : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50',
            ].join(' ')}
          >
            <FileSpreadsheet size={40} className={dragging ? 'text-brand-500' : 'text-slate-400'} />
            <div className="text-center">
              <p className="text-sm font-medium text-slate-700">
                Kéo thả file vào đây hoặc <span className="text-brand-600">click để chọn</span>
              </p>
              <p className="mt-1 text-xs text-slate-400">Hỗ trợ .xlsx · Tối đa 10MB</p>
            </div>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleInputChange} />
          </div>
        )}

        {/* File đã chọn (khi chưa preview) */}
        {file && !preview && !result && (
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <FileSpreadsheet size={18} className="shrink-0 text-emerald-600" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-800">{file.name}</p>
                <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button type="button" onClick={(e) => { e.stopPropagation(); reset(); }} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                <X size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-red-500" />
            <div className="flex-1 text-sm text-red-800">
              <p className="font-medium">Lỗi</p>
              <p className="mt-0.5 text-xs text-red-700">{error}</p>
            </div>
            <button type="button" onClick={() => setError(null)} className="rounded p-1 text-red-400 hover:bg-red-100">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Preview table */}
        {preview && !result && (
          <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-brand-500" />
                <h3 className="text-sm font-semibold text-slate-800">
                  Xem trước — {preview.preview.length} đơn vị sẽ được import
                </h3>
              </div>
              <div className="flex items-center gap-2">
                {file && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <FileSpreadsheet size={13} className="text-emerald-600" />
                    {file.name}
                  </span>
                )}
                <button type="button" onClick={reset} className="rounded p-1 text-slate-400 hover:bg-slate-100">
                  <X size={14} />
                </button>
              </div>
            </div>

            {/* Warnings */}
            {(preview.unmatchedSubjects.length > 0 || preview.skipped.length > 0) && (
              <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 flex flex-wrap gap-3 text-xs text-amber-700">
                {preview.unmatchedSubjects.length > 0 && (
                  <span>
                    <strong>{preview.unmatchedSubjects.length} môn không khớp</strong> (bỏ qua):&nbsp;
                    {preview.unmatchedSubjects.join(', ')}
                  </span>
                )}
                {preview.skipped.length > 0 && (
                  <span>
                    <strong>{preview.skipped.length} đơn vị không tìm thấy</strong>:&nbsp;
                    {preview.skipped.join(', ')}
                  </span>
                )}
              </div>
            )}

            {/* Table */}
            {(() => {
              const meta = preview.subjectMeta ?? preview.matchedSubjects.map(m => ({ mon: m, loaiViTri: 'GiaoVien' as const }));
              const gvMeta = meta.filter(m => m.loaiViTri === 'GiaoVien');
              const nvMeta = meta.filter(m => m.loaiViTri === 'NhanVien');
              const getVal = (row: PreviewRow, mon: string) => row.subjects.find(s => s.mon === mon)?.soLuong ?? 0;
              const getGvTotal = (row: PreviewRow) => gvMeta.reduce((s, m) => s + getVal(row, m.mon), 0);
              const getNvTotal = (row: PreviewRow) => nvMeta.reduce((s, m) => s + getVal(row, m.mon), 0);
              return (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200">
                        <th className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-left font-semibold text-slate-600 border-r border-slate-200 min-w-[180px]" rowSpan={2}>Đơn vị</th>
                        <th className="px-3 py-2 text-center font-semibold text-slate-600 border-r border-slate-200 whitespace-nowrap" rowSpan={2}>Tổng</th>
                        {gvMeta.length > 0 && (
                          <th colSpan={gvMeta.length + 1} className="px-3 py-2 text-center font-semibold text-blue-700 bg-blue-50 border-r border-slate-200">
                            Giáo viên
                          </th>
                        )}
                        {nvMeta.length > 0 && (
                          <th colSpan={nvMeta.length + 1} className="px-3 py-2 text-center font-semibold text-purple-700 bg-purple-50">
                            Nhân viên
                          </th>
                        )}
                      </tr>
                      <tr className="bg-slate-50 border-b border-slate-200">
                        {gvMeta.length > 0 && (
                          <th className="px-2 py-2 text-center font-semibold text-blue-800 bg-blue-100 border-r border-slate-200 whitespace-nowrap">Tổng GV</th>
                        )}
                        {gvMeta.map((m, i) => (
                          <th key={m.mon} className={['px-2 py-2 text-center font-medium whitespace-nowrap text-blue-700 bg-blue-50', i < gvMeta.length - 1 ? 'border-r border-slate-200' : 'border-r border-slate-200'].join(' ')}>
                            {m.mon}
                          </th>
                        ))}
                        {nvMeta.length > 0 && (
                          <th className="px-2 py-2 text-center font-semibold text-purple-800 bg-purple-100 border-r border-slate-200 whitespace-nowrap">Tổng NV</th>
                        )}
                        {nvMeta.map((m, i) => (
                          <th key={m.mon} className={['px-2 py-2 text-center font-medium whitespace-nowrap text-purple-700 bg-purple-50', i < nvMeta.length - 1 ? 'border-r border-slate-200' : ''].join(' ')}>
                            {m.mon}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.preview.map((row, ri) => {
                        const gvTotal = getGvTotal(row);
                        const nvTotal = getNvTotal(row);
                        return (
                          <tr key={ri} className="border-b border-slate-100 hover:bg-slate-50">
                            <td className="sticky left-0 z-10 bg-white px-3 py-2 font-medium text-slate-800 border-r border-slate-200 hover:bg-slate-50">{row.tenDonVi}</td>
                            <td className="px-3 py-2 text-center font-semibold text-slate-700 border-r border-slate-200">{row.total}</td>
                            {gvMeta.length > 0 && (
                              <td className="px-2 py-2 text-center font-semibold text-blue-800 bg-blue-50/50 border-r border-slate-200">
                                {gvTotal > 0 ? gvTotal : '—'}
                              </td>
                            )}
                            {gvMeta.map((m, ci) => {
                              const val = getVal(row, m.mon);
                              return (
                                <td key={m.mon} className={['px-2 py-2 text-center', 'border-r border-slate-100', val > 0 ? 'font-medium text-slate-800' : 'text-slate-300'].join(' ')}>
                                  {val > 0 ? val : '—'}
                                </td>
                              );
                            })}
                            {nvMeta.length > 0 && (
                              <td className="px-2 py-2 text-center font-semibold text-purple-800 bg-purple-50/50 border-r border-slate-200">
                                {nvTotal > 0 ? nvTotal : '—'}
                              </td>
                            )}
                            {nvMeta.map((m, ci) => {
                              const val = getVal(row, m.mon);
                              return (
                                <td key={m.mon} className={['px-2 py-2 text-center', ci < nvMeta.length - 1 ? 'border-r border-slate-100' : '', val > 0 ? 'font-medium text-slate-800' : 'text-slate-300'].join(' ')}>
                                  {val > 0 ? val : '—'}
                                </td>
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-200 bg-slate-100 font-semibold">
                        <td className="sticky left-0 z-10 bg-slate-100 px-3 py-2 text-slate-700 border-r border-slate-200">Tổng cộng</td>
                        <td className="px-3 py-2 text-center text-slate-800 border-r border-slate-200">{preview.preview.reduce((s, r) => s + r.total, 0)}</td>
                        {gvMeta.length > 0 && (
                          <td className="px-2 py-2 text-center text-blue-800 bg-blue-50/50 border-r border-slate-200">
                            {preview.preview.reduce((s, r) => s + getGvTotal(r), 0) || '—'}
                          </td>
                        )}
                        {gvMeta.map((m, ci) => {
                          const sum = preview.preview.reduce((s, r) => s + getVal(r, m.mon), 0);
                          return (
                            <td key={m.mon} className="px-2 py-2 text-center text-slate-700 border-r border-slate-100">
                              {sum > 0 ? sum : '—'}
                            </td>
                          );
                        })}
                        {nvMeta.length > 0 && (
                          <td className="px-2 py-2 text-center text-purple-800 bg-purple-50/50 border-r border-slate-200">
                            {preview.preview.reduce((s, r) => s + getNvTotal(r), 0) || '—'}
                          </td>
                        )}
                        {nvMeta.map((m, ci) => {
                          const sum = preview.preview.reduce((s, r) => s + getVal(r, m.mon), 0);
                          return (
                            <td key={m.mon} className={['px-2 py-2 text-center text-slate-700', ci < nvMeta.length - 1 ? 'border-r border-slate-100' : ''].join(' ')}>
                              {sum > 0 ? sum : '—'}
                            </td>
                          );
                        })}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              );
            })()}
          </div>
        )}

        {/* Kết quả sau import */}
        {result && (
          <div className="space-y-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-500" />
              <h3 className="text-sm font-semibold text-slate-800">Import hoàn tất</h3>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Đơn vị đã import" value={result.imported} color="emerald" />
              <Stat label="Đơn vị bỏ qua" value={result.skipped.length} color={result.skipped.length > 0 ? 'amber' : 'slate'} />
              <Stat label="Môn khớp" value={result.matchedSubjects.length} color="emerald" />
              <Stat label="Môn không khớp" value={result.unmatchedSubjects.length} color={result.unmatchedSubjects.length > 0 ? 'amber' : 'slate'} />
            </div>

            {result.matchedSubjects.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-slate-600">Môn học đã nhập chỉ tiêu:</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.matchedSubjects.map((m) => (
                    <span key={m} className="rounded-md bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {result.unmatchedSubjects.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-amber-700">Môn trong file không có vị trí tuyển dụng tương ứng (bỏ qua):</p>
                <div className="flex flex-wrap gap-1.5">
                  {result.unmatchedSubjects.map((m) => (
                    <span key={m} className="rounded-md bg-amber-50 px-2 py-0.5 text-xs text-amber-700">{m}</span>
                  ))}
                </div>
              </div>
            )}

            {result.skipped.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-amber-700">Đơn vị không tìm thấy trong hệ thống (bỏ qua):</p>
                <div className="max-h-40 overflow-y-auto rounded-md border border-amber-200 bg-amber-50">
                  {result.skipped.map((name, i) => (
                    <div key={i} className="border-b border-amber-100 px-3 py-1.5 text-xs text-amber-800 last:border-b-0">{name}</div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" size="sm" onClick={reset}>Import file khác</Button>
          </div>
        )}

        {/* Hướng dẫn */}
        {!file && !result && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="mb-2 font-medium text-amber-800">Yêu cầu trước khi import:</p>
            <ol className="list-inside list-decimal space-y-1 text-amber-700 text-xs">
              <li>Đã tạo đầy đủ <strong>Đơn vị tuyển dụng</strong> trong kỳ này (tên phải khớp chính xác).</li>
              <li>Đã tạo đầy đủ <strong>Vị trí tuyển dụng</strong> với tên môn khớp với cột trong file Excel.</li>
              <li>File Excel có cấu trúc: hàng 6 chứa tên môn, từ hàng 7 là dữ liệu đơn vị.</li>
            </ol>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between">
          <Button variant="outline" size="sm" leftIcon={<ArrowLeft size={14} />} onClick={() => router.push('/dashboard/don-vi')}>
            Quay lại
          </Button>
          <div className="flex items-center gap-2">
            {file && !preview && !result && (
              <Button
                variant="outline"
                size="sm"
                leftIcon={previewing ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
                onClick={handlePreview}
                disabled={previewing || !kyId}
              >
                {previewing ? 'Đang tải...' : 'Xem trước'}
              </Button>
            )}
            {preview && !result && (
              <>
                <Button variant="outline" size="sm" onClick={reset}>
                  Chọn file khác
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leftIcon={loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  onClick={handleImport}
                  disabled={loading}
                >
                  {loading ? 'Đang import...' : 'Xác nhận import'}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color: 'emerald' | 'amber' | 'slate' }) {
  const colors = {
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
    slate: 'bg-slate-100 text-slate-600',
  };
  return (
    <div className={`rounded-md p-3 text-center ${colors[color]}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs">{label}</div>
    </div>
  );
}
