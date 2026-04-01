'use client';

import { useState, useMemo } from 'react';
import { Expense } from '@/lib/db';

type SortKey = 'payer' | 'amount' | 'description' | 'coefficient' | 'final_amount';
type SortDir = 'asc' | 'desc';

interface EditForm {
  payer: 'Yao' | 'Yiqing';
  amount: string;
  description: string;
  coefficient: string;
  expense_month: string;
}

interface Props {
  expenses: Expense[];
  onDelete: (id: number) => void;
  onEdited: () => void;
  showToast: (msg: string, type: 'success' | 'error') => void;
}

const fmt = (n: number) =>
  n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ExpenseTable({ expenses, onDelete, onEdited, showToast }: Props) {
  const [sortKey, setSortKey] = useState<SortKey>('final_amount');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm | null>(null);
  const [saving, setSaving] = useState(false);

  const sorted = useMemo(() => {
    return [...expenses].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp = typeof av === 'string' ? av.localeCompare(bv as string) : (av as number) - (bv as number);
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [expenses, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span className="text-gray-300 ml-1">↕</span>;
    return <span className="text-blue-500 ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  }

  function startEdit(e: Expense) {
    setEditingId(e.id);
    setEditForm({
      payer: e.payer,
      amount: String(e.amount),
      description: e.description,
      coefficient: String(e.coefficient),
      expense_month: e.expense_month,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setEditForm(null);
  }

  async function saveEdit(id: number) {
    if (!editForm) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payer: editForm.payer,
          amount: parseFloat(editForm.amount),
          description: editForm.description,
          coefficient: parseFloat(editForm.coefficient) || 1,
          expense_month: editForm.expense_month,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      cancelEdit();
      onEdited();
      showToast('已保存', 'success');
    } catch (e) {
      showToast((e as Error).message, 'error');
    } finally {
      setSaving(false);
    }
  }

  if (expenses.length === 0) {
    return <div className="text-center py-12 text-gray-400">本月暂无账单</div>;
  }

  const thCls = 'px-4 py-3 font-semibold cursor-pointer select-none hover:text-gray-800 transition-colors';

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-500">
            <th className={`${thCls} text-left`} onClick={() => handleSort('payer')}>
              付款人<SortIcon col="payer" />
            </th>
            <th className={`${thCls} text-right`} onClick={() => handleSort('amount')}>
              付款额<SortIcon col="amount" />
            </th>
            <th className={`${thCls} text-left`} onClick={() => handleSort('description')}>
              款项<SortIcon col="description" />
            </th>
            <th className={`${thCls} text-right`} onClick={() => handleSort('coefficient')}>
              系数<SortIcon col="coefficient" />
            </th>
            <th className={`${thCls} text-right`} onClick={() => handleSort('final_amount')}>
              最终付款额<SortIcon col="final_amount" />
            </th>
            <th className="px-4 py-3 text-center w-20"></th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((e, i) => (
            editingId === e.id && editForm ? (
              <tr key={`edit-${e.id}`} className="bg-blue-50">
                <td colSpan={6} className="px-4 py-3">
                  <div className="flex flex-wrap gap-3 items-end">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">付款人</label>
                      <select
                        value={editForm.payer}
                        onChange={(ev) => setEditForm({ ...editForm, payer: ev.target.value as 'Yao' | 'Yiqing' })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="Yao">Yao</option>
                        <option value="Yiqing">Yiqing</option>
                      </select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">付款额</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={editForm.amount}
                        onChange={(ev) => setEditForm({ ...editForm, amount: ev.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-28 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
                      <label className="text-xs text-gray-500">款项</label>
                      <input
                        type="text"
                        value={editForm.description}
                        onChange={(ev) => setEditForm({ ...editForm, description: ev.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">系数</label>
                      <input
                        type="number" min="0" step="0.01"
                        value={editForm.coefficient}
                        onChange={(ev) => setEditForm({ ...editForm, coefficient: ev.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm w-20 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs text-gray-500">年月</label>
                      <input
                        type="month"
                        value={editForm.expense_month}
                        onChange={(ev) => setEditForm({ ...editForm, expense_month: ev.target.value })}
                        className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => saveEdit(e.id)}
                        disabled={saving}
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-1.5 text-sm font-medium disabled:opacity-50"
                      >
                        {saving ? '保存...' : '保存'}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="text-gray-500 hover:text-gray-700 rounded-lg px-4 py-1.5 text-sm border border-gray-300 hover:bg-gray-50"
                      >
                        取消
                      </button>
                    </div>
                  </div>
                </td>
              </tr>
            ) : (
              <tr
                key={e.id}
                className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
              >
                <td className="px-4 py-3">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.payer === 'Yao' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                  }`}>
                    {e.payer}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono">¥{fmt(e.amount)}</td>
                <td className="px-4 py-3 text-gray-700">{e.description}</td>
                <td className="px-4 py-3 text-right font-mono text-gray-500">{e.coefficient}</td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-gray-800">
                  ¥{fmt(e.final_amount)}
                </td>
                <td className="px-4 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => startEdit(e)}
                      className="text-gray-300 hover:text-blue-500 transition-colors text-sm"
                      title="编辑"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => onDelete(e.id)}
                      className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                      title="删除"
                    >
                      ×
                    </button>
                  </div>
                </td>
              </tr>
            )
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-100 font-semibold">
            <td colSpan={4} className="px-4 py-3 text-right text-gray-600">合计</td>
            <td className="px-4 py-3 text-right font-mono text-gray-800">
              ¥{fmt(expenses.reduce((s, e) => s + e.final_amount, 0))}
            </td>
            <td></td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
