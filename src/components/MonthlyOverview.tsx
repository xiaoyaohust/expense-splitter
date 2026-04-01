'use client';

import { useState, useEffect } from 'react';

interface MonthSummary {
  expense_month: string;
  yao_total: number;
  yiqing_total: number;
  count: number;
}

interface Props {
  currentMonth: string;
  onSelectMonth: (month: string) => void;
}

const fmt = (n: number) =>
  n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function MonthlyOverview({ currentMonth, onSelectMonth }: Props) {
  const [year, setYear] = useState(currentMonth.split('-')[0]);
  const [data, setData] = useState<MonthSummary[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/expenses/summary?year=${year}`)
      .then((r) => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      });
  }, [year]);

  const yearYao = data.reduce((s, r) => s + r.yao_total, 0);
  const yearYiqing = data.reduce((s, r) => s + r.yiqing_total, 0);
  const yearDiff = yearYao - yearYiqing;

  function diffLabel(diff: number) {
    if (diff > 0) return { text: `Yiqing 还 ¥${fmt(diff)}`, cls: 'text-orange-600' };
    if (diff < 0) return { text: `Yao 还 ¥${fmt(Math.abs(diff))}`, cls: 'text-green-600' };
    return { text: '持平', cls: 'text-gray-400' };
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 mt-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-800">年度概览</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setYear(String(Number(year) - 1))}
            className="text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            ←
          </button>
          <span className="font-medium text-gray-700 w-16 text-center">{year} 年</span>
          <button
            onClick={() => setYear(String(Number(year) + 1))}
            className="text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            →
          </button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-6 text-gray-400 text-sm">加载中...</div>
      ) : data.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-sm">{year} 年暂无数据</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500">
                <th className="text-left pb-2 font-medium">月份</th>
                <th className="text-right pb-2 font-medium">Yao</th>
                <th className="text-right pb-2 font-medium">Yiqing</th>
                <th className="text-right pb-2 font-medium">差值</th>
                <th className="text-right pb-2 font-medium">笔数</th>
                <th className="w-12"></th>
              </tr>
            </thead>
            <tbody>
              {data.map((row) => {
                const diff = row.yao_total - row.yiqing_total;
                const { text, cls } = diffLabel(diff);
                const isActive = row.expense_month === currentMonth;
                return (
                  <tr
                    key={row.expense_month}
                    className={`border-b border-gray-50 ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                  >
                    <td className={`py-2 font-medium ${isActive ? 'text-blue-700' : 'text-gray-700'}`}>
                      {row.expense_month}
                    </td>
                    <td className="py-2 text-right font-mono text-blue-600">¥{fmt(row.yao_total)}</td>
                    <td className="py-2 text-right font-mono text-purple-600">¥{fmt(row.yiqing_total)}</td>
                    <td className={`py-2 text-right font-mono ${cls}`}>{text}</td>
                    <td className="py-2 text-right text-gray-400">{row.count}</td>
                    <td className="py-2 text-right">
                      <button
                        onClick={() => onSelectMonth(row.expense_month)}
                        className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                      >
                        查看
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="font-semibold text-gray-700 border-t border-gray-200">
                <td className="pt-3">全年合计</td>
                <td className="pt-3 text-right font-mono text-blue-700">¥{fmt(yearYao)}</td>
                <td className="pt-3 text-right font-mono text-purple-700">¥{fmt(yearYiqing)}</td>
                <td className={`pt-3 text-right font-mono ${diffLabel(yearDiff).cls}`}>
                  {diffLabel(yearDiff).text}
                </td>
                <td className="pt-3 text-right text-gray-400">
                  {data.reduce((s, r) => s + r.count, 0)}
                </td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
