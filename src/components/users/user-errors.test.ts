import { describe, expect, it } from 'vitest';
import { ApiError } from '@/lib/api';
import { importFailureLines, userSaveMessage } from './user-errors';

describe('user errors in Thai (G6)', () => {
  it('a taken or malformed student ID', () => {
    const coded = (status: number, code: string) => new ApiError(status, 'english', { success: false, message: 'english', details: { code } });
    expect(userSaveMessage(coded(409, 'STUDENT_ID_TAKEN'), 'fallback')).toBe('รหัสนักศึกษานี้มีผู้ใช้อยู่แล้ว');
    expect(userSaveMessage(coded(400, 'BAD_STUDENT_ID'), 'fallback')).toBe('รหัสนักศึกษาต้องเป็นตัวเลข 8-9 หลัก');
    expect(userSaveMessage(new ApiError(500, 'boom'), 'fallback')).toBe('boom');
    expect(userSaveMessage('x', 'fallback')).toBe('fallback');
  });
  it('each failed import row with its reason (staff M-N1: the reason used to be hidden)', () => {
    expect(importFailureLines([
      { rowNumber: 2, status: 'created', identifier: '652110001' },
      { rowNumber: 3, status: 'failed', identifier: 'AGT7', code: 'BAD_STUDENT_ID', message: 'x' },
      { rowNumber: 4, status: 'failed', identifier: '652110002', code: 'ADVISOR_NOT_FOUND', message: 'Advisor a@b is not a lecturer in the system' },
      { rowNumber: 5, status: 'failed', identifier: '652110003', code: 'DUPLICATE', message: 'x' },
      { rowNumber: 6, status: 'failed', identifier: 'c1', message: 'Something else' },
    ])).toEqual([
      'แถว 3 (AGT7): รหัสนักศึกษาต้องเป็นตัวเลข 8-9 หลัก',
      'แถว 4 (652110002): อีเมลอาจารย์ที่ปรึกษาไม่ตรงกับอาจารย์ในระบบ',
      'แถว 5 (652110003): มีอีเมลหรือรหัสนักศึกษานี้ในระบบแล้ว',
      'แถว 6 (c1): Something else',
    ]);
  });
});
