import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { attendanceErrorText } from './attendance-errors';

describe('attendanceErrorText', () => {
  it('a day without a class says so in Thai, with the date and day', () => {
    const error = new ApiError(409, 'There is no class on 2026-09-29 (tuesday)', {
      success: false, message: 'x', details: { code: 'NO_CLASS_THAT_DAY', date: '2026-09-29', day: 'tuesday', dayThai: 'อังคาร' },
    });
    expect(attendanceErrorText(error, true)).toBe('วันที่ 2026-09-29 (วันอังคาร) วิชานี้ไม่มีคาบเรียน จึงเช็คชื่อไม่ได้');
    expect(attendanceErrorText(error, false)).toBe('There is no class on 2026-09-29 (tuesday)');
  });
  it('a future date and other known refusals in Thai (review L5)', () => {
    const coded = (status: number, code: string) => new ApiError(status, 'english', { success: false, message: 'english', details: { code } });
    expect(attendanceErrorText(coded(400, 'FUTURE_DATE'), true)).toBe('เช็คชื่อล่วงหน้าไม่ได้ เลือกวันนี้หรือวันที่ผ่านมาแล้ว');
  });
  it('anything else keeps its message', () => {
    expect(attendanceErrorText(new ApiError(500, 'boom'), true)).toBe('boom');
    expect(attendanceErrorText('x', true)).toBeUndefined();
  });
});
