import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'expenses.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('foreign_keys = ON');

  _db.exec(`
    CREATE TABLE IF NOT EXISTS expenses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payer TEXT NOT NULL CHECK(payer IN ('Yao', 'Yiqing')),
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      coefficient REAL NOT NULL DEFAULT 1.0,
      expense_month TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_expense_month ON expenses(expense_month);

    -- Auto-cleanup: keep only last 2 years on startup
    DELETE FROM expenses
    WHERE expense_month < strftime('%Y-%m', date('now', '-2 years'));
  `);

  return _db;
}

export interface Expense {
  id: number;
  payer: 'Yao' | 'Yiqing';
  amount: number;
  description: string;
  coefficient: number;
  expense_month: string;
  created_at: string;
  final_amount: number;
}
