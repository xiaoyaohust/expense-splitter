'use client';

import { useState, useRef } from 'react';

type ColumnRole = 'payer' | 'amount' | 'description' | 'coefficient' | 'expense_month' | '';

const ROLE_LABELS: Record<string, string> = {
  payer: '付款人',
  amount: '付款额',
  description: '款项',
  coefficient: '系数',
  expense_month: '年月',
  '': '—忽略—',
};

const ROLES: ColumnRole[] = ['', 'payer', 'amount', 'description', 'coefficient', 'expense_month'];

interface MappedRow {
  payer: string;
  amount: number;
  description: string;
  coefficient: number;
  expense_month: string;
}

interface Props {
  month: string;
  onImported: () => void;
  onClose: () => void;
}

const fmt = (n: number) =>
  n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function CsvImporter({ month, onImported, onClose }: Props) {
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([]);
  const [cellData, setCellData] = useState<string[][]>([]);
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [batchValue, setBatchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'map' | 'preview'>('upload');
  const [preview, setPreview] = useState<{ valid: MappedRow[]; invalidRows: number[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function parseCSV(text: string): string[][] {
    const lines = text.trim().split('\n');
    return lines.map((line) => {
      const result: string[] = [];
      let cur = '';
      let inQuote = false;
      for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
          inQuote = !inQuote;
        } else if (ch === ',' && !inQuote) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += ch;
        }
      }
      result.push(cur.trim());
      return result;
    });
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      if (rows.length === 0) return;
      setCellData(rows.map((r) => [...r]));
      setColumnRoles(new Array(rows[0].length).fill(''));
      setSelectedCells(new Set());
      setStep('map');
    };
    reader.readAsText(file, 'UTF-8');
  }

  function toggleCell(rowIdx: number, colIdx: number, e: React.MouseEvent) {
    const key = `${rowIdx},${colIdx}`;
    setSelectedCells((prev) => {
      const next = new Set(prev);
      if (e.shiftKey) {
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      }
      // Without shift: toggle within same column, clear other columns
      const sameCol = [...prev].filter((k) => k.split(',')[1] === String(colIdx));
      const newSet = new Set(sameCol);
      if (newSet.has(key)) newSet.delete(key);
      else newSet.add(key);
      return newSet;
    });
    setBatchValue('');
  }

  function getSelectedCol(): number | null {
    const cols = new Set([...selectedCells].map((k) => Number(k.split(',')[1])));
    if (cols.size === 1) return [...cols][0];
    return null;
  }

  function applyBatch() {
    const col = getSelectedCol();
    if (col === null || !batchValue) return;
    setCellData((prev) =>
      prev.map((row, ri) => {
        if (!selectedCells.has(`${ri},${col}`)) return row;
        const next = [...row];
        next[col] = batchValue;
        return next;
      })
    );
    setSelectedCells(new Set());
    setBatchValue('');
  }

  function updateCell(ri: number, ci: number, val: string) {
    setCellData((prev) =>
      prev.map((row, r) => {
        if (r !== ri) return row;
        const next = [...row];
        next[ci] = val;
        return next;
      })
    );
  }

  function buildMappedRows() {
    const colIndex = (role: ColumnRole) => columnRoles.indexOf(role);
    const payerCol = colIndex('payer');
    const amountCol = colIndex('amount');
    const descCol = colIndex('description');
    const coefCol = colIndex('coefficient');
    const monthCol = colIndex('expense_month');

    return cellData.map((row) => ({
      payer: row[payerCol]?.trim() || '',
      amount: parseFloat(row[amountCol]) || 0,
      description: row[descCol]?.trim() || '',
      coefficient: coefCol >= 0 ? parseFloat(row[coefCol]) || 1 : 1,
      expense_month: monthCol >= 0 ? (row[monthCol]?.trim() || month) : month,
    }));
  }

  function handlePreview() {
    setError('');
    const required: ColumnRole[] = ['payer', 'amount', 'description'];
    const missing = required.filter((r) => !columnRoles.includes(r));
    if (missing.length > 0) {
      setError(`缺少必填列映射: ${missing.map((m) => ROLE_LABELS[m]).join('、')}`);
      return;
    }

    const rows = buildMappedRows();
    const invalidRows: number[] = [];
    const valid: MappedRow[] = [];

    rows.forEach((row, i) => {
      if (!['Yao', 'Yiqing'].includes(row.payer)) {
        invalidRows.push(i);
      } else {
        valid.push(row);
      }
    });

    setPreview({ valid, invalidRows });
    setStep('preview');
  }

  async function handleSave() {
    if (!preview) return;
    setLoading(true);
    try {
      const res = await fetch('/api/expenses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: preview.valid }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onImported();
      onClose();
    } catch (e) {
      setError((e as Error).message);
      setStep('preview');
    } finally {
      setLoading(false);
    }
  }

  // Detect invalid payer cells for real-time highlighting
  function isInvalidPayerCell(ri: number, ci: number): boolean {
    if (columnRoles[ci] !== 'payer') return false;
    const val = cellData[ri]?.[ci]?.trim();
    return !!val && !['Yao', 'Yiqing'].includes(val);
  }

  const selectedCol = getSelectedCol();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-gray-800">导入 CSV</h2>
            {step !== 'upload' && (
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <span className={step === 'map' ? 'text-blue-600 font-medium' : ''}>① 映射列</span>
                <span>→</span>
                <span className={step === 'preview' ? 'text-blue-600 font-medium' : ''}>② 预览确认</span>
              </div>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* Upload step */}
        {step === 'upload' && (
          <div className="flex flex-col items-center justify-center flex-1 p-12 gap-4">
            <div
              className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 transition-colors w-full max-w-md"
              onClick={() => fileRef.current?.click()}
            >
              <div className="text-4xl mb-3">📄</div>
              <div className="text-gray-500">点击选择或拖入 CSV 文件</div>
            </div>
            <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden" onChange={handleFileChange} />
          </div>
        )}

        {/* Map step */}
        {step === 'map' && (
          <>
            {/* Batch edit bar */}
            {selectedCells.size > 0 && selectedCol !== null && (
              <div className="flex items-center gap-3 px-6 py-3 bg-blue-50 border-b border-blue-200">
                <span className="text-sm text-blue-700 font-medium">
                  已选 {selectedCells.size} 行（第 {selectedCol + 1} 列）
                </span>
                {columnRoles[selectedCol] === 'payer' ? (
                  <select
                    value={batchValue}
                    onChange={(e) => setBatchValue(e.target.value)}
                    className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                  >
                    <option value="">选择值...</option>
                    <option value="Yao">Yao</option>
                    <option value="Yiqing">Yiqing</option>
                  </select>
                ) : (
                  <input
                    type="text"
                    value={batchValue}
                    onChange={(e) => setBatchValue(e.target.value)}
                    placeholder="批量修改为..."
                    className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                  />
                )}
                <button
                  onClick={applyBatch}
                  className="bg-blue-600 text-white rounded-lg px-4 py-1.5 text-sm font-medium hover:bg-blue-700"
                >
                  应用
                </button>
                <button
                  onClick={() => { setSelectedCells(new Set()); setBatchValue(''); }}
                  className="text-blue-500 hover:text-blue-700 text-sm"
                >
                  取消选择
                </button>
              </div>
            )}

            {/* Column role selectors */}
            <div className="px-6 pt-4 pb-2">
              <p className="text-sm text-gray-500 mb-3">
                为每列指定字段，点击单元格编辑，Shift+点击 追加选择后可批量修改
              </p>
              <div className="flex gap-2 flex-wrap">
                {columnRoles.map((role, ci) => (
                  <div key={ci} className="flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-400">列 {ci + 1}</span>
                    <select
                      value={role}
                      onChange={(e) => {
                        const next = [...columnRoles];
                        next[ci] = e.target.value as ColumnRole;
                        setColumnRoles(next);
                      }}
                      className="border border-gray-300 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                    >
                      {ROLES.map((r) => (
                        <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </div>

            {/* Table */}
            <div className="flex-1 overflow-auto px-6 pb-2">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr>
                    <th className="text-left px-2 py-1 text-gray-400 font-normal text-xs w-8">#</th>
                    {columnRoles.map((role, ci) => (
                      <th key={ci} className={`px-2 py-1 text-left font-semibold text-xs ${role ? 'text-blue-600' : 'text-gray-400'}`}>
                        {role ? ROLE_LABELS[role] : `列${ci + 1}`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {cellData.map((row, ri) => (
                    <tr key={ri} className="hover:bg-gray-50">
                      <td className="px-2 py-1 text-gray-400 text-xs">{ri + 1}</td>
                      {row.map((cell, ci) => {
                        const key = `${ri},${ci}`;
                        const isSelected = selectedCells.has(key);
                        const isInvalidPayer = isInvalidPayerCell(ri, ci);
                        return (
                          <td
                            key={ci}
                            onClick={(e) => toggleCell(ri, ci, e)}
                            className={`px-1 py-0.5 cursor-pointer border transition-colors ${
                              isSelected
                                ? 'bg-blue-100 border-blue-400'
                                : isInvalidPayer
                                ? 'bg-red-50 border-red-300'
                                : 'border-transparent hover:border-gray-300'
                            }`}
                          >
                            {isSelected ? (
                              columnRoles[ci] === 'payer' ? (
                                <select
                                  value={cell}
                                  onChange={(e) => { e.stopPropagation(); updateCell(ri, ci, e.target.value); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-transparent border-none outline-none text-xs"
                                >
                                  <option value="">-</option>
                                  <option value="Yao">Yao</option>
                                  <option value="Yiqing">Yiqing</option>
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  value={cell}
                                  onChange={(e) => { e.stopPropagation(); updateCell(ri, ci, e.target.value); }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-transparent border-none outline-none text-xs"
                                  autoFocus
                                />
                              )
                            ) : (
                              <span className={`text-xs ${isInvalidPayer ? 'text-red-600 font-medium' : ''}`}>
                                {cell}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && <div className="px-6 py-2 text-red-500 text-sm">{error}</div>}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <button
                onClick={() => { setStep('upload'); setCellData([]); setError(''); }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                重新上传
              </button>
              <button
                onClick={handlePreview}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors"
              >
                下一步：预览 →
              </button>
            </div>
          </>
        )}

        {/* Preview step */}
        {step === 'preview' && preview && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-auto px-6 py-5">
              {/* Summary cards */}
              <div className="grid grid-cols-3 gap-4 mb-5">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <div className="text-sm text-green-600 font-medium mb-1">有效行</div>
                  <div className="text-2xl font-bold text-green-700">{preview.valid.length}</div>
                </div>
                <div className={`rounded-xl p-4 text-center border ${preview.invalidRows.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                  <div className={`text-sm font-medium mb-1 ${preview.invalidRows.length > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                    无效行（将跳过）
                  </div>
                  <div className={`text-2xl font-bold ${preview.invalidRows.length > 0 ? 'text-red-700' : 'text-gray-400'}`}>
                    {preview.invalidRows.length}
                  </div>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                  <div className="text-sm text-gray-500 font-medium mb-1">总金额</div>
                  <div className="text-xl font-bold text-gray-700">
                    ¥{fmt(preview.valid.reduce((s, r) => s + r.amount * r.coefficient, 0))}
                  </div>
                </div>
              </div>

              {/* Payer breakdown */}
              <div className="flex gap-4 mb-5">
                {(['Yao', 'Yiqing'] as const).map((p) => {
                  const rows = preview.valid.filter((r) => r.payer === p);
                  const total = rows.reduce((s, r) => s + r.amount * r.coefficient, 0);
                  return (
                    <div key={p} className={`flex-1 rounded-xl p-3 border text-center ${p === 'Yao' ? 'bg-blue-50 border-blue-200' : 'bg-purple-50 border-purple-200'}`}>
                      <div className={`text-xs font-medium mb-1 ${p === 'Yao' ? 'text-blue-500' : 'text-purple-500'}`}>{p}</div>
                      <div className={`font-bold ${p === 'Yao' ? 'text-blue-700' : 'text-purple-700'}`}>
                        {rows.length} 笔 &nbsp;·&nbsp; ¥{fmt(total)}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Invalid rows warning */}
              {preview.invalidRows.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
                  <div className="text-red-700 font-medium text-sm mb-1">以下行付款人无效（不是 Yao 或 Yiqing），将被跳过：</div>
                  <div className="text-red-600 text-sm">
                    行号：{preview.invalidRows.map((i) => i + 1).join('、')}
                  </div>
                  <button
                    onClick={() => setStep('map')}
                    className="mt-2 text-sm text-red-600 underline hover:text-red-800"
                  >
                    返回修改
                  </button>
                </div>
              )}

              {/* Preview table */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="px-3 py-2 text-left font-medium">付款人</th>
                      <th className="px-3 py-2 text-right font-medium">付款额</th>
                      <th className="px-3 py-2 text-left font-medium">款项</th>
                      <th className="px-3 py-2 text-right font-medium">系数</th>
                      <th className="px-3 py-2 text-right font-medium">最终</th>
                      <th className="px-3 py-2 text-right font-medium">年月</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.valid.map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-1.5">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${row.payer === 'Yao' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {row.payer}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs">¥{fmt(row.amount)}</td>
                        <td className="px-3 py-1.5 text-gray-700 text-xs">{row.description}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs text-gray-500">{row.coefficient}</td>
                        <td className="px-3 py-1.5 text-right font-mono text-xs font-semibold">¥{fmt(row.amount * row.coefficient)}</td>
                        <td className="px-3 py-1.5 text-right text-xs text-gray-500">{row.expense_month}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {error && <div className="px-6 py-2 text-red-500 text-sm">{error}</div>}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <button
                onClick={() => setStep('map')}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                ← 返回修改
              </button>
              <button
                onClick={handleSave}
                disabled={loading || preview.valid.length === 0}
                className="bg-green-600 hover:bg-green-700 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : `确认保存 ${preview.valid.length} 条`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
