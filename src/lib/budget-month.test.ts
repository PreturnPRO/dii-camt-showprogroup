import { describe, expect, it } from 'vitest';
import { monthlyExpense } from './budget-month';

const row = (date: string, amount: number, over: Record<string, string> = {}) => ({ type: 'expense', status: 'approved', date, amount, ...over });
const now = new Date('2026-10-09T05:00:00Z');

describe('monthlyExpense', () => {
  it("is this month's expenses, not every month's", () => {
    expect(monthlyExpense([row('2026-10-02', 100), row('2026-09-15', 400), row('2025-10-01', 999)], now).thisMonth).toBe(100);
  });
  it('compares with last month from the data, not a fixed "+12.5%"', () => {
    const m = monthlyExpense([row('2026-10-02', 150), row('2026-09-15', 100)], now);
    expect(m.lastMonth).toBe(100);
    expect(m.changePercent).toBe(50);
  });
  it('has no percentage when last month had no expenses', () => {
    expect(monthlyExpense([row('2026-10-02', 150)], now).changePercent).toBeNull();
  });
  it('leaves out income and rejected requests', () => {
    expect(monthlyExpense([row('2026-10-02', 100), row('2026-10-03', 50, { status: 'rejected' }), row('2026-10-03', 70, { type: 'income' })], now).thisMonth).toBe(100);
  });
  it('January compares with December of the year before', () => {
    expect(monthlyExpense([row('2026-12-20', 80)], new Date('2027-01-05T05:00:00Z')).lastMonth).toBe(80);
  });
});
