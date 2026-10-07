import { describe, expect, it } from 'vitest';
import { bulkMessage, splitSettled } from './bulk-result';

const ok = { status: 'fulfilled', value: undefined } as const;
const fail = { status: 'rejected', reason: new Error('x') } as const;

describe('splitSettled', () => {
  it('pairs each id with its own result, in order', () => {
    expect(splitSettled(['a', 'b', 'c'], [ok, fail, ok])).toEqual({ succeeded: ['a', 'c'], failed: ['b'] });
  });
  it('refuses mismatched lengths instead of guessing who failed', () => {
    expect(() => splitSettled(['a', 'b'], [ok])).toThrow();
  });
});

describe('bulkMessage', () => {
  it('all succeeded → success with the count', () => {
    expect(bulkMessage({ succeeded: ['a', 'b'], failed: [] }, 'th')).toEqual({ kind: 'success', text: 'ปรับสถานะแล้ว 2 รายการ' });
    expect(bulkMessage({ succeeded: ['a', 'b'], failed: [] }, 'en')).toEqual({ kind: 'success', text: 'Updated 2 applications.' });
  });
  it('some failed → warning naming succeeded out of total and the failures', () => {
    expect(bulkMessage({ succeeded: ['a'], failed: ['b'] }, 'th')).toEqual({ kind: 'warning', text: 'สำเร็จ 1 จาก 2 รายการ — ไม่สำเร็จ 1 รายการ' });
    expect(bulkMessage({ succeeded: ['a'], failed: ['b', 'c'] }, 'en')).toEqual({ kind: 'warning', text: 'Updated 1 of 3 — 2 failed.' });
  });
  it('all failed → error, never success', () => {
    expect(bulkMessage({ succeeded: [], failed: ['a'] }, 'th')).toEqual({ kind: 'error', text: 'ปรับสถานะไม่สำเร็จ' });
    expect(bulkMessage({ succeeded: [], failed: ['a'] }, 'en')).toEqual({ kind: 'error', text: 'Could not update status.' });
  });
});
