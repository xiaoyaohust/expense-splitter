import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const year = searchParams.get('year') || new Date().getFullYear().toString();

  const db = getDb();
  const rows = db.prepare(`
    SELECT
      expense_month,
      SUM(CASE WHEN payer = 'Yao' THEN amount * coefficient ELSE 0 END) AS yao_total,
      SUM(CASE WHEN payer = 'Yiqing' THEN amount * coefficient ELSE 0 END) AS yiqing_total,
      COUNT(*) AS count
    FROM expenses
    WHERE expense_month LIKE ?
    GROUP BY expense_month
    ORDER BY expense_month
  `).all(`${year}-%`);

  return NextResponse.json(rows);
}
