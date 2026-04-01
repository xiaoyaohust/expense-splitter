import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const result = db.prepare('DELETE FROM expenses WHERE id = ?').run(Number(id));
  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { payer, amount, description, coefficient, expense_month } = body;

  if (!payer || !amount || !description || !expense_month) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  if (!['Yao', 'Yiqing'].includes(payer)) {
    return NextResponse.json({ error: 'Invalid payer' }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    'UPDATE expenses SET payer=?, amount=?, description=?, coefficient=?, expense_month=? WHERE id=?'
  ).run(payer, Number(amount), description, Number(coefficient ?? 1), expense_month, Number(id));

  if (result.changes === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const updated = db.prepare(
    'SELECT *, amount * coefficient AS final_amount FROM expenses WHERE id = ?'
  ).get(Number(id));

  return NextResponse.json(updated);
}
