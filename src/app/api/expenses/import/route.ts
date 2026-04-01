import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { rows } = body as {
    rows: Array<{
      payer: string;
      amount: string | number;
      description: string;
      coefficient: string | number;
      expense_month: string;
    }>;
  };

  if (!Array.isArray(rows) || rows.length === 0) {
    return NextResponse.json({ error: 'No rows provided' }, { status: 400 });
  }

  const db = getDb();
  const insert = db.prepare(
    'INSERT INTO expenses (payer, amount, description, coefficient, expense_month) VALUES (?, ?, ?, ?, ?)'
  );

  const insertMany = db.transaction((items: typeof rows) => {
    for (const row of items) {
      if (!['Yao', 'Yiqing'].includes(row.payer)) {
        throw new Error(`Invalid payer: ${row.payer}`);
      }
      insert.run(
        row.payer,
        Number(row.amount),
        row.description,
        Number(row.coefficient ?? 1),
        row.expense_month
      );
    }
  });

  try {
    insertMany(rows);
    return NextResponse.json({ success: true, count: rows.length }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
