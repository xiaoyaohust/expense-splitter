'use client';

import { useState, useEffect, useCallback } from 'react';
import MonthlySummary from '@/components/MonthlySummary';
import ExpenseTable from '@/components/ExpenseTable';
import AddExpenseForm from '@/components/AddExpenseForm';
import CsvImporter from '@/components/CsvImporter';
import MonthlyOverview from '@/components/MonthlyOverview';
import Toast from '@/components/Toast';
import { Expense } from '@/lib/db';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function escapeCSV(val: string | number): string {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function Home() {
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  function showToast(message: string, type: 'success' | 'error') {
    setToast({ message, type });
  }

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?month=${month}`);
      const data = await res.json();
      setExpenses(data);
    } finally {
      setLoading(false);
    }
  }, [month]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  async function handleDelete(id: number) {
    if (!confirm('确认删除这条记录？')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    fetchExpenses();
    showToast('已删除', 'success');
  }

  function handleMonthInput(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.value) setMonth(e.target.value);
  }

  function prevMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m - 2);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function nextMonth() {
    const [y, m] = month.split('-').map(Number);
    const d = new Date(y, m);
    setMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  }

  function exportCsv() {
    if (expenses.length === 0) return;
    const headers = ['付款人', '付款额', '款项', '系数', '最终付款额', '年月'];
    const rows = expenses.map((e) => [
      escapeCSV(e.payer),
      escapeCSV(e.amount),
      escapeCSV(e.description),
      escapeCSV(e.coefficient),
      escapeCSV(e.final_amount),
      escapeCSV(e.expense_month),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`已导出 ${expenses.length} 条记录`, 'success');
  }

  const isCurrentMonth = month === currentMonth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Expense Splitter</h1>
          <p className="text-gray-500 text-sm mt-1">Yao & Yiqing</p>
        </div>

        {/* Month controls */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={prevMonth}
            className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← 上月
          </button>
          <input
            type="month"
            value={month}
            onChange={handleMonthInput}
            max={currentMonth()}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30"
          >
            下月 →
          </button>
          <div className="flex-1" />
          <button
            onClick={exportCsv}
            disabled={expenses.length === 0}
            className="text-gray-500 hover:text-gray-700 border border-gray-300 hover:border-gray-400 rounded-lg px-4 py-1.5 text-sm transition-colors disabled:opacity-30"
          >
            ↓ 导出 CSV
          </button>
        </div>

        {/* Summary */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : (
          <>
            <MonthlySummary expenses={expenses} />
            <div className="mb-6">
              <ExpenseTable
                expenses={expenses}
                onDelete={handleDelete}
                onEdited={() => { fetchExpenses(); }}
                showToast={showToast}
              />
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={() => setShowAddForm((v) => !v)}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            + 手动添加
          </button>
          <button
            onClick={() => setShowCsvImporter(true)}
            className="bg-white border border-gray-300 hover:border-blue-400 hover:text-blue-600 text-gray-600 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors"
          >
            导入 CSV
          </button>
          <button
            onClick={() => setShowOverview((v) => !v)}
            className={`border rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
              showOverview
                ? 'bg-gray-700 text-white border-gray-700'
                : 'bg-white border-gray-300 hover:border-gray-400 text-gray-600'
            }`}
          >
            {showOverview ? '收起' : '年度概览'}
          </button>
        </div>

        {/* Inline add form */}
        {showAddForm && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">添加账单</h3>
              <button onClick={() => setShowAddForm(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
            </div>
            <AddExpenseForm
              month={month}
              onAdded={() => {
                fetchExpenses();
                setShowAddForm(false);
                showToast('已添加', 'success');
              }}
            />
          </div>
        )}

        {/* Yearly overview */}
        {showOverview && (
          <MonthlyOverview
            currentMonth={month}
            onSelectMonth={(m) => { setMonth(m); setShowOverview(false); }}
          />
        )}
      </div>

      {showCsvImporter && (
        <CsvImporter
          month={month}
          onImported={() => { fetchExpenses(); showToast('CSV 导入成功', 'success'); }}
          onClose={() => setShowCsvImporter(false)}
        />
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onDismiss={() => setToast(null)}
        />
      )}
    </div>
  );
}
