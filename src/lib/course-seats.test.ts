import { describe, expect, it } from 'vitest';
import { isCourseFull, openSections, seatsLeft } from './course-seats';
import type { Course, Section } from '@/types';

const section = (id: string, maxStudents: number, enrolledCount?: number, enrolledStudents: string[] = []): Section =>
  ({ id, sectionNumber: id, maxStudents, enrolledCount, enrolledStudents, schedule: [] });
const course = (sections: Section[]) => ({ id: 'c', sections } as unknown as Course);

describe('course seats', () => {
  it('uses the server count and falls back to visible rows', () => {
    expect(seatsLeft(section('01', 30, 29))).toBe(1);
    expect(seatsLeft(section('01', 2, undefined, ['a']))).toBe(1);
    expect(seatsLeft(section('01', 2, 5))).toBe(0);
  });
  it('lists only sections with seats; full only when every section is full', () => {
    const c = course([section('01', 1, 1), section('02', 1, 0)]);
    expect(openSections(c).map((s) => s.id)).toEqual(['02']);
    expect(isCourseFull(c)).toBe(false);
    expect(isCourseFull(course([section('01', 1, 1)]))).toBe(true);
    expect(isCourseFull(course([]))).toBe(false);
  });
});
