import { describe, expect, it } from 'vitest';
import { normalizeImportCourse, planCourseImport } from './course-import';

describe('normalizeImportCourse', () => {
  it('puts the seat limits on a first section the backend understands', () => {
    const course = normalizeImportCourse({ Code: 'DII101', 'Course Name': 'Intro', capacity: '30', minstudents: '5' }, 'lec-1');
    expect(course.sections).toEqual([{ number: '01', maxStudents: 30, minStudents: 5, schedule: [] }]);
    expect(course).not.toHaveProperty('maxStudents');
    expect(course.lecturerId).toBe('lec-1');
  });
  it("the template's placeholder instructor counts as no instructor", () => {
    expect(normalizeImportCourse({ code: 'X1', lecturerId: 'paste-lecturer-id-here' }, 'lec-1').lecturerId).toBe('lec-1');
    expect(normalizeImportCourse({ code: 'X1', lecturerId: 'paste-lecturer-id-here' }, '').lecturerId).toBe('');
  });
});

describe('planCourseImport', () => {
  const row = (over: Record<string, unknown> = {}) => ({ ...normalizeImportCourse({ code: 'DII340', name: 'FS', semester: '2', academicYear: '2569' }, 'lec-1'), ...over });

  it('a code that ran in another term is imported again (unique per term, not forever)', () => {
    const plan = planCourseImport([row()], [{ code: 'DII340', semester: 1, academicYear: '2569' }]);
    expect(plan.toCreate).toHaveLength(1);
  });
  it('the same code in the same term is skipped and says why', () => {
    const plan = planCourseImport([row()], [{ code: 'dii340', semester: 2, academicYear: '2569' }]);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.skipped[0]).toMatchObject({ row: 2, code: 'DII340' });
    expect(plan.skipped[0].reason.th).toContain('2/2569');
  });
  it('a row without an instructor, when none was chosen, is skipped instead of going to the first lecturer', () => {
    const plan = planCourseImport([{ ...normalizeImportCourse({ code: 'X1', name: 'X' }, ''), semester: 1, academicYear: '2569' }], []);
    expect(plan.toCreate).toHaveLength(0);
    expect(plan.skipped[0].reason.th).toContain('ผู้สอน');
  });
  it('a row missing its code or name is skipped with the row number', () => {
    const plan = planCourseImport([row({ code: '' })], []);
    expect(plan.skipped[0]).toMatchObject({ row: 2 });
    expect(plan.skipped[0].reason.th).toContain('รหัสวิชา');
  });
  it('two rows for the same course and term in one file: the second is skipped', () => {
    expect(planCourseImport([row(), row()], []).skipped).toHaveLength(1);
  });
});
