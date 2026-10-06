import { describe, expect, it } from 'vitest';
import { gpaBandOf, gpaBandRank } from './gpa-band';

describe('gpaBandOf', () => {
  it('uses the band the server sent (company view)', () => {
    expect(gpaBandOf({ gpaBand: '3.00-3.49' })).toBe('3.00-3.49');
  });
  it('derives the same bands from an exact GPAX (admin view) so every viewer sees one format', () => {
    expect(gpaBandOf({ gpax: 3.74 })).toBe('3.50+');
    expect(gpaBandOf({ gpax: 3.31 })).toBe('3.00-3.49');
    expect(gpaBandOf({ gpax: 2.7 })).toBe('2.50-2.99');
    expect(gpaBandOf({ gpax: 1.9 })).toBe('below 2.50');
    expect(gpaBandOf({ gpax: 0 })).toBe('not_disclosed');
    expect(gpaBandOf({})).toBe('not_disclosed');
  });
  it('ranks bands for sorting, highest first', () => {
    expect(['below 2.50', '3.50+', 'not_disclosed', '3.00-3.49'].sort((a, b) => gpaBandRank(b) - gpaBandRank(a)))
      .toEqual(['3.50+', '3.00-3.49', 'below 2.50', 'not_disclosed']);
  });
});
