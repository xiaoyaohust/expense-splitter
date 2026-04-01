'use client';

import { useState } from 'react';

interface Props {
  month: string;
  onAdded: () => void;
}

export default function AddExpenseForm({ month, onAdded }: Props) {
  const [payer, setPayer] = useState<'Yao' | 'Yiqing'>('Yao');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [coefficient, setCoefficient] = useState('1');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!amount || !description) {
      setError('请填写付款额和款项');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          payer,
          amount: parseFloat(amount),
          description,
          coefficient: parseFloat(coefficient) || 1,
          expense_month: month,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setAmount('');
      setDescription('');
      setCoefficient('1');
      onAdded();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-3 items-end">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">付款人</label>
        <select
          value={payer}
          onChange={(e) => setPayer(e.target.value as 'Yao' | 'Yiqing')}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
        >
          <option value="Yao">Yao</option>
          <option value="Yiqing">Yiqing</option>
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">付款额</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="0.00"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex flex-col gap-1 flex-1 min-w-[160px]">
        <label className="text-xs text-gray-500 font-medium">款项</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="描述..."
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium">系数</label>
        <input
          type="number"
          min="0"
          step="0.01"
          value={coefficient}
          onChange={(e) => setCoefficient(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-xs text-gray-500 font-medium opacity-0">提交</label>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-5 py-2 text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? '添加中...' : '+ 添加'}
        </button>
      </div>

      {error && (
        <div className="w-full text-red-500 text-sm">{error}</div>
      )}
    </form>
  );
}
