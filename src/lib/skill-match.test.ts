import { describe, expect, it } from 'vitest';
import { summarizeMatches } from './skill-match';

const t = (matched: number, missing: number) => ({
  matchedSkills: Array.from({ length: matched }, (_, i) => `m${i}`),
  missingSkills: Array.from({ length: missing }, (_, i) => `x${i}`),
});

describe('summarizeMatches', () => {
  it('averages the share of required skills among students who match at least one', () => {
    expect(summarizeMatches([t(2, 2), t(4, 0), t(0, 4)], 4)).toEqual({ matchedStudents: 2, avgMatch: 75 });
  });
  it('is 0 when nobody matches', () => {
    expect(summarizeMatches([t(0, 3)], 3)).toEqual({ matchedStudents: 0, avgMatch: 0 });
  });
  it('is 0 when the requirement lists no skills', () => {
    expect(summarizeMatches([t(0, 0)], 0)).toEqual({ matchedStudents: 0, avgMatch: 0 });
  });
});
