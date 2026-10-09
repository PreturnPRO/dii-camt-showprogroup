import { describe, expect, it } from 'vitest';
import { internshipWeeks } from './internship-weeks';

describe('internshipWeeks', () => {
  it('counts weeks that have a diary entry, not entries', () => {
    // Mon 5 Oct + Fri 9 Oct are one week; Mon 12 Oct is the next
    expect(internshipWeeks(['2026-10-05', '2026-10-09', '2026-10-12'], 8).logged).toBe(2);
  });
  it('a Sunday belongs to the week that started on the Monday before', () => {
    expect(internshipWeeks(['2026-10-05', '2026-10-11'], 8).logged).toBe(1);
  });
  it('without a planned duration there is no total and no percentage (not "1/1 (100%)")', () => {
    expect(internshipWeeks(['2026-10-05'], 0)).toEqual({ logged: 1, total: null, progress: null });
  });
  it('progress is logged weeks over the planned weeks, at most 100', () => {
    expect(internshipWeeks(['2026-10-05', '2026-10-12'], 8).progress).toBe(25);
    expect(internshipWeeks(['2026-10-05', '2026-10-12'], 1).progress).toBe(100);
  });
});
