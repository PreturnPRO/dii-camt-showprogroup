import { describe, expect, it } from 'vitest';
import { thaiToday } from './thai-date';

describe('thaiToday', () => {
  it('uses the Thai calendar day', () => {
    expect(thaiToday(new Date('2026-10-06T23:30:00.000Z'))).toBe('2026-10-07');
    expect(thaiToday(new Date('2026-10-07T16:59:00.000Z'))).toBe('2026-10-07');
    expect(thaiToday(new Date('2026-10-07T17:00:00.000Z'))).toBe('2026-10-08');
  });
});
