import { describe, expect, it } from 'vitest';
import { gpaAverage } from './gpa-average';

describe('gpaAverage', () => {
  it('leaves out students without a grade yet and says how many were counted', () => {
    expect(gpaAverage([{ gpax: 3 }, { gpax: 0 }, { gpax: 2 }])).toEqual({ average: 2.5, count: 2 });
  });
  it('has no average when nobody has a grade', () => {
    expect(gpaAverage([{ gpax: 0 }])).toEqual({ average: null, count: 0 });
    expect(gpaAverage([])).toEqual({ average: null, count: 0 });
  });
});
