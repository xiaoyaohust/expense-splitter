'use client';

import { Expense } from '@/lib/db';

interface Props {
  expenses: Expense[];
}

export default function MonthlySummary({ expenses }: Props) {
  const yaoTotal = expenses
    .filter((e) => e.payer === 'Yao')
    .reduce((sum, e) => sum + e.final_amount, 0);

  const yiqingTotal = expenses
    .filter((e) => e.payer === 'Yiqing')
    .reduce((sum, e) => sum + e.final_amount, 0);

  const diff = yaoTotal - yiqingTotal;

  const fmt = (n: number) =>
    n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="grid grid-cols-3 gap-4 mb-6">
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
        <div className="text-sm text-blue-500 font-medium mb-1">Yao 支付</div>
        <div className="text-2xl font-bold text-blue-700">¥{fmt(yaoTotal)}</div>
      </div>
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-center">
        <div className="text-sm text-purple-500 font-medium mb-1">Yiqing 支付</div>
        <div className="text-2xl font-bold text-purple-700">¥{fmt(yiqingTotal)}</div>
      </div>
      <div
        className={`rounded-xl p-4 text-center border ${
          diff > 0
            ? 'bg-orange-50 border-orange-200'
            : diff < 0
            ? 'bg-green-50 border-green-200'
            : 'bg-gray-50 border-gray-200'
        }`}
      >
        <div
          className={`text-sm font-medium mb-1 ${
            diff > 0 ? 'text-orange-500' : diff < 0 ? 'text-green-500' : 'text-gray-500'
          }`}
        >
          {diff > 0
            ? 'Yiqing 应还 Yao'
            : diff < 0
            ? 'Yao 应还 Yiqing'
            : '两人持平'}
        </div>
        <div
          className={`text-2xl font-bold ${
            diff > 0 ? 'text-orange-700' : diff < 0 ? 'text-green-700' : 'text-gray-700'
          }`}
        >
          ¥{fmt(Math.abs(diff))}
        </div>
      </div>
    </div>
  );
}
