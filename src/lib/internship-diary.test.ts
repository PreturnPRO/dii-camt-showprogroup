import { describe, expect, it } from 'vitest';
import { approvedHours, diaryEntryProblem } from './internship-diary';

const entries = [
  { id: 'a', date: '2026-10-01', hours: 5, reviewStatus: 'approved' },
  { id: 'b', date: '2026-10-02', hours: 7, reviewStatus: 'pending' },
];
const today = '2026-10-09';

describe('diaryEntryProblem', () => {
  it('accepts a normal day', () => {
    expect(diaryEntryProblem({ date: '2026-10-03', hours: 8 }, entries, { today })).toBeNull();
  });
  it('refuses a future day', () => {
    expect(diaryEntryProblem({ date: '2026-10-10', hours: 4 }, entries, { today })?.th).toBe('ลงบันทึกล่วงหน้าไม่ได้');
  });
  it('refuses more than 8 hours in one entry', () => {
    expect(diaryEntryProblem({ date: '2026-10-03', hours: 9 }, entries, { today })?.th).toContain('8 ชั่วโมง');
  });
  it('refuses a day whose entries would pass 8 hours, but not the entry being edited itself', () => {
    expect(diaryEntryProblem({ date: '2026-10-01', hours: 4 }, entries, { today })?.th).toContain('เหลือได้อีก 3 ชั่วโมง');
    expect(diaryEntryProblem({ date: '2026-10-01', hours: 8 }, entries, { today, exceptId: 'a' })).toBeNull();
  });
});

describe('diaryEntryProblem and the start month', () => {
  it('refuses a day before the start month, also in the Buddhist era', () => {
    expect(diaryEntryProblem({ date: '2026-08-31', hours: 4 }, [], { today, startMonth: '2569-09' })?.th).toBe('ลงบันทึกก่อนเดือนที่เริ่มฝึกงานไม่ได้');
    expect(diaryEntryProblem({ date: '2026-09-01', hours: 4 }, [], { today, startMonth: '2026-09' })).toBeNull();
  });
});

describe('approvedHours', () => {
  it('leaves out days outside the internship, as the certificate does', () => {
    expect(approvedHours([
      { id: 'x', date: '2026-08-31', hours: 8, reviewStatus: 'approved' },
      { id: 'y', date: '2026-10-20', hours: 8, reviewStatus: 'approved' },
      { id: 'z', date: '2026-09-02', hours: 3, reviewStatus: 'approved' },
    ], { startMonth: '2569-09', today })).toBe(3);
  });
  it('counts what the certificate will: approved only, at most 8 a day', () => {
    expect(approvedHours([...entries, { id: 'c', date: '2026-10-01', hours: 5, reviewStatus: 'approved' }])).toBe(8);
  });
});
