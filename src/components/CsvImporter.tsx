'use client';

import { useState, useRef, useCallback } from 'react';

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

interface Props {
  month: string;
  onImported: () => void;
  onClose: () => void;
}

export default function CsvImporter({ month, onImported, onClose }: Props) {
  const [rawData, setRawData] = useState<string[][]>([]);
  const [columnRoles, setColumnRoles] = useState<ColumnRole[]>([]);
  const [cellData, setCellData] = useState<string[][]>([]);
  // selectedCells: Set of "rowIdx,colIdx"
  const [selectedCells, setSelectedCells] = useState<Set<string>>(new Set());
  const [batchValue, setBatchValue] = useState('');
  const [editingBatchCol, setEditingBatchCol] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'upload' | 'map'>('upload');
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
      setRawData(rows);
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
        // toggle on shift click
        if (next.has(key)) next.delete(key);
        else next.add(key);
      } else {
        // without shift: select only this column's rows
        // clear other columns
        const newSet = new Set<string>();
        if (!next.has(key)) newSet.add(key);
        // keep only same column if clicking different column, otherwise toggle
        const sameCol = [...prev].filter((k) => k.split(',')[1] === String(colIdx));
        if (sameCol.length > 0) {
          sameCol.forEach((k) => newSet.add(k));
          if (next.has(key)) newSet.delete(key);
          else newSet.add(key);
        }
        return newSet;
      }
      return next;
    });
    setEditingBatchCol(colIdx);
    setBatchValue('');
  }

  function getSelectedCol(): number | null {
    const cols = new Set([...selectedCells].map((k) => Number(k.split(',')[1])));
    if (cols.size === 1) return [...cols][0];
    return null;
  }

  function applyBatch() {
    const col = getSelectedCol();
    if (col === null) return;
    setCellData((prev) =>
      prev.map((row, ri) => {
        const key = `${ri},${col}`;
        if (selectedCells.has(key)) {
          const next = [...row];
          next[col] = batchValue;
          return next;
        }
        return row;
      })
    );
    setSelectedCells(new Set());
    setBatchValue('');
    setEditingBatchCol(null);
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

  async function handleSave() {
    setError('');
    const required: ColumnRole[] = ['payer', 'amount', 'description'];
    const missing = required.filter((r) => !columnRoles.includes(r));
    if (missing.length > 0) {
      setError(`缺少必填列映射: ${missing.map((m) => ROLE_LABELS[m]).join('、')}`);
      return;
    }

    const colIndex = (role: ColumnRole) => columnRoles.indexOf(role);
    const payerCol = colIndex('payer');
    const amountCol = colIndex('amount');
    const descCol = colIndex('description');
    const coefCol = colIndex('coefficient');
    const monthCol = colIndex('expense_month');

    const rows = cellData.map((row) => ({
      payer: row[payerCol]?.trim() || '',
      amount: parseFloat(row[amountCol]) || 0,
      description: row[descCol]?.trim() || '',
      coefficient: coefCol >= 0 ? parseFloat(row[coefCol]) || 1 : 1,
      expense_month: monthCol >= 0 ? row[monthCol]?.trim() : month,
    }));

    const invalidPayers = rows.filter((r) => !['Yao', 'Yiqing'].includes(r.payer));
    if (invalidPayers.length > 0) {
      setError(`付款人字段含无效值，只能是 Yao 或 Yiqing。检测到: ${[...new Set(invalidPayers.map((r) => r.payer))].join(', ')}`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/expenses/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      onImported();
      onClose();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const selectedCol = getSelectedCol();

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">导入 CSV</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

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
                为每一列指定字段含义，然后点击单元格可批量修改同列多行值（Shift+点击 追加选择）
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
                      <th
                        key={ci}
                        className={`px-2 py-1 text-left font-semibold text-xs ${
                          role ? 'text-blue-600' : 'text-gray-400'
                        }`}
                      >
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
                        return (
                          <td
                            key={ci}
                            onClick={(e) => toggleCell(ri, ci, e)}
                            className={`px-1 py-0.5 cursor-pointer border ${
                              isSelected
                                ? 'bg-blue-100 border-blue-400'
                                : 'border-transparent hover:border-gray-300'
                            }`}
                          >
                            {isSelected ? (
                              columnRoles[ci] === 'payer' ? (
                                <select
                                  value={cell}
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateCell(ri, ci, e.target.value);
                                  }}
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
                                  onChange={(e) => {
                                    e.stopPropagation();
                                    updateCell(ri, ci, e.target.value);
                                  }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="w-full bg-transparent border-none outline-none text-xs"
                                  autoFocus
                                />
                              )
                            ) : (
                              <span className="text-xs">{cell}</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer */}
            {error && (
              <div className="px-6 py-2 text-red-500 text-sm">{error}</div>
            )}
            <div className="flex items-center justify-between px-6 py-4 border-t">
              <button
                onClick={() => { setStep('upload'); setRawData([]); setCellData([]); setError(''); }}
                className="text-gray-500 hover:text-gray-700 text-sm"
              >
                重新上传
              </button>
              <button
                onClick={handleSave}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-6 py-2 text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '保存中...' : `保存 ${cellData.length} 条记录`}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
