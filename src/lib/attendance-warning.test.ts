import { describe, expect, it } from 'vitest';
import { attendanceTone } from './attendance-warning';

describe('attendanceTone', () => {
  it('low only below 80 % once 3 classes are counted (owner decision 9/10/69)', () => {
    expect(attendanceTone({ present: 0, late: 0, absent: 1, percentage: 0 })).toBe('early');
    expect(attendanceTone({ present: 1, late: 0, absent: 2, percentage: 33.3 })).toBe('low');
    expect(attendanceTone({ present: 4, late: 0, absent: 1, percentage: 80 })).toBe('ok');
    expect(attendanceTone({ present: 0, late: 0, absent: 0, percentage: null })).toBe('none');
  });
});
