import { describe, expect, it } from 'vitest';
import type { Course, Grade } from '@/types';
import { gradesForCard } from './grade-cards';

const course = { id: 'c1', code: 'DII340', name: 'Full Stack', nameThai: 'ฟูลสแตก', credits: 3, semester: 1, academicYear: '2569' } as unknown as Course;
const grade = (over: Partial<Grade>) => ({ courseId: 'c1', letterGrade: 'A', total: 88, ...over }) as unknown as Grade;

describe('gradesForCard', () => {
  it('uses the course term and Thai name', () => {
    expect(gradesForCard([grade({})], [course])[0]).toMatchObject({ courseCode: 'DII340', courseName: 'ฟูลสแตก', credits: 3, semester: '1/2569', letterGrade: 'A' });
  });
  it("an ungraded course shows '-', never 'I'", () => {
    expect(gradesForCard([grade({ letterGrade: undefined })], [course])[0].letterGrade).toBe('-');
  });
  it("an unknown course has no invented term ('-', not '1/2568')", () => {
    expect(gradesForCard([grade({ courseId: 'gone' })], [course])[0].semester).toBe('-');
  });
});
