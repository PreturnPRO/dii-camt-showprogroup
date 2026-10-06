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
