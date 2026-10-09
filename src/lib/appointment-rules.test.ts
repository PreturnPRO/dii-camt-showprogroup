import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { appointmentErrorText, hasEnded, hasStarted, lastBookableDay } from './appointment-rules';

// the date is a Thai day stored as UTC midnight; times are Thai (UTC+7)
const apt = { date: new Date('2026-10-13T00:00:00.000Z'), startTime: '13:00', endTime: '13:30' };

describe('appointment rules on the page (G6)', () => {
  it('started / ended by Thai time', () => {
    expect(hasStarted(apt, new Date('2026-10-13T05:59:00Z'))).toBe(false); // 12:59 Thai
    expect(hasStarted(apt, new Date('2026-10-13T06:00:00Z'))).toBe(true);
    expect(hasEnded(apt, new Date('2026-10-13T06:29:00Z'))).toBe(false);
    expect(hasEnded(apt, new Date('2026-10-13T06:30:00Z'))).toBe(true);
  });
  it('the last day a booking may be made for: 30 days after the Thai today', () => {
    expect(lastBookableDay(new Date('2026-10-09T18:00:00Z'))).toBe('2026-11-09'); // already 10 Oct in Bangkok
  });
  it('the server refusals in Thai', () => {
    const coded = (status: number, code: string) => new ApiError(status, 'english', { success: false, message: 'english', details: { code } });
    expect(appointmentErrorText(coded(409, 'ONE_PER_LECTURER'))).toBe('คุณมีนัดกับอาจารย์ท่านนี้ที่ยังไม่ถึงอยู่แล้ว ยกเลิกนัดเดิมหรือรอให้ผ่านไปก่อน');
    expect(appointmentErrorText(coded(400, 'TOO_FAR'))).toBe('จองล่วงหน้าได้ไม่เกิน 30 วัน');
    expect(appointmentErrorText(coded(409, 'STARTED'))).toBe('นัดเริ่มแล้ว ยกเลิกเองไม่ได้ กรุณาติดต่ออาจารย์');
    expect(appointmentErrorText(coded(409, 'NOT_STARTED'))).toBe('ยังไม่ถึงเวลานัด บันทึกว่าพบแล้วไม่ได้');
    expect(appointmentErrorText(coded(409, 'CHANGED'))).toBe('นัดนี้ถูกเปลี่ยนสถานะไปแล้ว กรุณาโหลดหน้าใหม่');
    expect(appointmentErrorText(new ApiError(409, 'taken'))).toBe('มีคนจองช่วงเวลานี้ไปแล้ว กรุณาเลือกเวลาอื่น');
  });
});
