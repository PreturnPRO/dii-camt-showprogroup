import { describe, expect, it } from 'vitest';
import { normalizeImportCourse } from './course-import';

describe('normalizeImportCourse', () => {
  it('puts the seat limits on a first section the backend understands', () => {
    const course = normalizeImportCourse({ Code: 'DII101', 'Course Name': 'Intro', capacity: '30', minstudents: '5' }, 'lec-1');
    expect(course.sections).toEqual([{ number: '01', maxStudents: 30, minStudents: 5, schedule: [] }]);
    expect(course).not.toHaveProperty('maxStudents');
    expect(course.lecturerId).toBe('lec-1');
  });
});
