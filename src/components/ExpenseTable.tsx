'use client';

import { Expense } from '@/lib/db';

interface Props {
  expenses: Expense[];
  onDelete: (id: number) => void;
}

const fmt = (n: number) =>
  n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ExpenseTable({ expenses, onDelete }: Props) {
  if (expenses.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">本月暂无账单</div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-50 text-gray-600">
            <th className="px-4 py-3 text-left font-semibold">付款人</th>
            <th className="px-4 py-3 text-right font-semibold">付款额</th>
            <th className="px-4 py-3 text-left font-semibold">款项</th>
            <th className="px-4 py-3 text-right font-semibold">系数</th>
            <th className="px-4 py-3 text-right font-semibold">最终付款额</th>
            <th className="px-4 py-3 text-center font-semibold w-16"></th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((e, i) => (
            <tr
              key={e.id}
              className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}
            >
              <td className="px-4 py-3">
                <span
                  className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                    e.payer === 'Yao'
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-purple-100 text-purple-700'
                  }`}
                >
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
                <button
                  onClick={() => onDelete(e.id)}
                  className="text-gray-300 hover:text-red-500 transition-colors text-lg leading-none"
                  title="删除"
                >
                  ×
                </button>
              </td>
            </tr>
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
