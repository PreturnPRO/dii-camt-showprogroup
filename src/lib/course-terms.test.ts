import { describe, expect, it } from 'vitest';
import { courseTerms, defaultCourseTerm, coursesInTerm, termKey } from './course-terms';

const c = (id: string, semester: number, academicYear: string, status = 'active', code = id, name = id) => ({ id, semester, academicYear, status, code, name, nameThai: name });

describe('course terms for a picker', () => {
  const courses = [
    c('a', 1, '2569'), c('b', 2, '2569', 'pending'), c('c', 2, '2568'), c('d', 1, '2569', 'active', 'DII340', 'Full-stack'),
  ];
  it('lists each term once, newest first', () => {
    expect(courseTerms(courses).map(termKey)).toEqual(['2/2569', '1/2569', '2/2568']);
  });
  it('starts at the newest term that has an open course (a term with only waiting courses is skipped)', () => {
    expect(termKey(defaultCourseTerm(courses)!)).toBe('1/2569');
    expect(termKey(defaultCourseTerm([c('x', 2, '2570', 'pending')])!)).toBe('2/2570');
    expect(defaultCourseTerm([])).toBeNull();
  });
  it('keeps only that term, narrowed by code or name', () => {
    expect(coursesInTerm(courses, '1/2569', '').map((x) => x.id)).toEqual(['a', 'd']);
    expect(coursesInTerm(courses, '1/2569', 'dii3').map((x) => x.id)).toEqual(['d']);
    expect(coursesInTerm(courses, '1/2569', 'FULL').map((x) => x.id)).toEqual(['d']);
  });
});
