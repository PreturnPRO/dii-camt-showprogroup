import { describe, expect, it } from 'vitest';
import { creditProgress } from './credit-progress';

describe('creditProgress', () => {
  it('counts against the whole curriculum', () => {
    expect(creditProgress({ requiredCredits: 120, completedCredits: 6, inProgressCredits: 3 })).toEqual({ completed: 6, inProgress: 3, remaining: 111, percent: 5 });
  });
  it('has no remaining or percent without a curriculum total, and never goes below zero', () => {
    expect(creditProgress({ requiredCredits: 0, completedCredits: 6, inProgressCredits: 0 })).toEqual({ completed: 6, inProgress: 0, remaining: null, percent: null });
    expect(creditProgress({ requiredCredits: null, completedCredits: 0, inProgressCredits: 0 })).toMatchObject({ remaining: null, percent: null });
    expect(creditProgress({ requiredCredits: 10, completedCredits: 9, inProgressCredits: 3 })).toEqual({ completed: 9, inProgress: 3, remaining: 0, percent: 90 });
  });
});
