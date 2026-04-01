'use client';

import { useState, useEffect, useCallback } from 'react';
import MonthlySummary from '@/components/MonthlySummary';
import ExpenseTable from '@/components/ExpenseTable';
import AddExpenseForm from '@/components/AddExpenseForm';
import CsvImporter from '@/components/CsvImporter';
import { Expense } from '@/lib/db';

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export default function Home() {
  const [month, setMonth] = useState(currentMonth);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCsvImporter, setShowCsvImporter] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

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

  const isCurrentMonth = month === currentMonth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Title */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Expense Splitter</h1>
          <p className="text-gray-500 text-sm mt-1">Yao & Yiqing</p>
        </div>

        {/* Month selector */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={prevMonth}
            className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors"
          >
            ← 上月
          </button>
          <div className="text-xl font-semibold text-gray-800 min-w-[120px] text-center">
            {month}
          </div>
          <button
            onClick={nextMonth}
            disabled={isCurrentMonth}
            className="text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-30"
          >
            下月 →
          </button>
        </div>

        {/* Summary */}
        {loading ? (
          <div className="text-center py-8 text-gray-400">加载中...</div>
        ) : (
          <>
            <MonthlySummary expenses={expenses} />

            {/* Table */}
            <div className="mb-6">
              <ExpenseTable expenses={expenses} onDelete={handleDelete} />
            </div>
          </>
        )}

        {/* Action buttons */}
        <div className="flex gap-3">
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
        </div>

        {/* Inline add form */}
        {showAddForm && (
          <div className="mt-4 bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-700">添加账单</h3>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-gray-400 hover:text-gray-600 text-lg leading-none"
              >×</button>
            </div>
            <AddExpenseForm
              month={month}
              onAdded={() => {
                fetchExpenses();
                setShowAddForm(false);
              }}
            />
          </div>
        )}
      </div>

      {/* CSV Importer modal */}
      {showCsvImporter && (
        <CsvImporter
          month={month}
          onImported={fetchExpenses}
          onClose={() => setShowCsvImporter(false)}
        />
      )}
    </div>
  );
}
