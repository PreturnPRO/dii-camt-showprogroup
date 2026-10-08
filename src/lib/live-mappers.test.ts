import { describe, expect, it } from 'vitest';
import { mapCourse } from './live-mappers';

describe('mapCourse enrolledCount', () => {
  it('uses the server count when the enrollment rows were scoped to the viewer', () => {
    const course = mapCourse({ id: 'c1', enrollmentCount: 42, enrollments: [{ studentId: 's1' }] });
    expect(course.enrolledCount).toBe(42);
    expect(course.enrolledStudents).toEqual(['s1']);
  });

  it('falls back to the number of rows for full views', () => {
    expect(mapCourse({ id: 'c1', enrollments: [{ studentId: 's1' }, { studentId: 's2' }] }).enrolledCount).toBe(2);
  });
});

describe('mapCourse section seats', () => {
  it('keeps the per-section server count', () => {
    const course = mapCourse({ id: 'c1', sections: [{ id: 's1', number: '01', maxStudents: 30, enrolledCount: 12 }], enrollments: [] });
    expect(course.sections[0].enrolledCount).toBe(12);
  });
});

describe('mapCourse section minimum', () => {
  it('keeps each section its own minimum so the edit form does not save 0 back', () => {
    const course = mapCourse({ id: 'c1', sections: [{ id: 's1', number: '01', maxStudents: 30, minStudents: 8 }], enrollments: [] });
    expect(course.sections[0].minStudents).toBe(8);
  });
});
