import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get('month');

  const db = getDb();

  let rows;
  if (month) {
    rows = db.prepare(
      'SELECT *, amount * coefficient AS final_amount FROM expenses WHERE expense_month = ? ORDER BY created_at DESC'
    ).all(month);
  } else {
    rows = db.prepare(
      'SELECT *, amount * coefficient AS final_amount FROM expenses ORDER BY expense_month DESC, created_at DESC'
    ).all();
  }

  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { payer, amount, description, coefficient, expense_month } = body;

  if (!payer || !amount || !description || !expense_month) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['Yao', 'Yiqing'].includes(payer)) {
    return NextResponse.json({ error: 'Payer must be Yao or Yiqing' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    'INSERT INTO expenses (payer, amount, description, coefficient, expense_month) VALUES (?, ?, ?, ?, ?)'
  ).run(payer, Number(amount), description, Number(coefficient ?? 1), expense_month);

  const inserted = db.prepare(
    'SELECT *, amount * coefficient AS final_amount FROM expenses WHERE id = ?'
  ).get(result.lastInsertRowid);

  return NextResponse.json(inserted, { status: 201 });
}
