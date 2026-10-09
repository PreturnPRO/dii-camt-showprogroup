import { describe, expect, it } from 'vitest';
import { mapCourse, mapStudent, mapTermGpaHistory } from './live-mappers';

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

describe('mapTermGpaHistory', () => {
  it('keeps the term number the server sends as a number ("1/2569", not "/2569")', () => {
    expect(mapTermGpaHistory({ termGpa: [{ semester: 1, academicYear: '2569', gpa: 3.5, credits: 9 }] })[0].semester).toBe('1/2569');
  });
});

describe('mapStudent advisors', () => {
  it('a student without an advisor gets no invented one (not "ผศ.ดร. นรินทร์" or "ดร. วิลเลียม สมิธ")', () => {
    const s = mapStudent({ id: 'x', studentId: '1', user: { name: 'A' } });
    expect(s.advisorName).toBe('');
    expect(s.advisorNameThai).toBe('');
    expect(s.coAdvisorName).toBe('');
    expect(s.coAdvisorNameThai).toBe('');
  });
});

describe('mapCourse sections', () => {
  it("a section with no classes has none — it does not borrow another section's times", () => {
    const course = mapCourse({ id: 'c', code: 'X', sections: [
      { id: 's1', number: '01', schedule: [{ day: 'monday', startTime: '09:00', endTime: '12:00' }] },
      { id: 's2', number: '02', schedule: [] },
    ] });
    expect(course.sections[1].schedule).toEqual([]);
    expect(course.sections[0].schedule).toHaveLength(1);
  });
});
