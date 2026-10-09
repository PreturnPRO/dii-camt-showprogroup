import { thaiToday } from '@/lib/thai-date';

type Row = { type: string; status: string; date: string; amount: number };

/** expenses of the current Thai month and the one before (rejected requests and income left out) */
export const monthlyExpense = (rows: Row[], now: Date = new Date()) => {
  const [year, month] = thaiToday(now).split('-').map(Number);
  const key = (y: number, m: number) => `${y}-${String(m).padStart(2, '0')}`;
  const thisKey = key(year, month);
  const lastKey = month === 1 ? key(year - 1, 12) : key(year, month - 1);
  const sumFor = (k: string) =>
    rows.filter((r) => r.type === 'expense' && r.status !== 'rejected' && r.date.slice(0, 7) === k).reduce((sum, r) => sum + r.amount, 0);
  const thisMonth = sumFor(thisKey);
  const lastMonth = sumFor(lastKey);
  return { thisMonth, lastMonth, changePercent: lastMonth > 0 ? Math.round(((thisMonth - lastMonth) / lastMonth) * 100) : null };
};
