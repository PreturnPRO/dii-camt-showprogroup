import { describe, expect, it } from 'vitest';
import { gradeSheetPayload } from './grade-sheet';

const row = (over: Record<string, unknown> = {}) => ({
  id: 'e1', studentId: 's1', courseId: 'c1', scores: [{ criteriaId: 'k1', score: 69 }], total: 90, letterGrade: 'A', remarks: '', ...over,
});

describe('gradeSheetPayload', () => {
  it('does not send back a letter the lecturer did not touch, so the server works it out from the new scores', () => {
    expect(gradeSheetPayload([row()], new Set())[0].letterGrade).toBeUndefined();
  });
  it('sends a letter the lecturer typed', () => {
    expect(gradeSheetPayload([row({ letterGrade: 'I' })], new Set(['e1:letterGrade']))[0].letterGrade).toBe('I');
  });
  it('does not send back the stored total either, since the scores decide it', () => {
    expect(gradeSheetPayload([row()], new Set())[0].total).toBeUndefined();
  });
  it('sends a total the lecturer typed (a course without criteria)', () => {
    expect(gradeSheetPayload([row({ scores: [], total: 75 })], new Set(['e1:total']))[0].total).toBe(75);
  });
});
