import { describe, expect, it } from 'vitest';
import type { Course, Section } from '@/types';
import {
  enrolledSection, formatHours, inTerm, placeSlots, studentEntries, studyDays, teachingEntries, termsOf, toMinutes, visibleRange, weeklyMinutes,
} from './timetable';

const slot = (day: string, startTime: string, endTime: string) => ({ id: `${day}${startTime}`, day, dayThai: '', startTime, endTime, type: 'lecture' }) as never;
const section = (id: string, slots: unknown[]): Section => ({ id, sectionNumber: id, maxStudents: 30, enrolledStudents: [], schedule: slots as never });
const course = (id: string, sections: Section[], semester = 1, academicYear = '2569') =>
  ({ id, code: id, name: id, nameThai: id, credits: 3, semester, academicYear, sections } as unknown as Course);

describe('toMinutes', () => {
  it('parses HH:MM and rejects junk', () => {
    expect(toMinutes('09:30')).toBe(570);
    expect(toMinutes('9:5')).toBeNull();
    expect(toMinutes('25:00')).toBeNull();
  });
});

describe('placeSlots', () => {
  it('keeps :30 starts, weekends and drops broken slots', () => {
    const placed = placeSlots([{ course: course('A', []), section: section('01', [slot('thursday', '09:30', '11:00'), slot('saturday', '08:00', '10:00'), slot('monday', '12:00', '11:00')]) }]);
    expect(placed.map((p) => [p.day, p.start, p.end])).toEqual([['thursday', 570, 660], ['saturday', 480, 600]]);
  });

  it('puts overlapping classes side by side', () => {
    const placed = placeSlots([
      { course: course('A', []), section: section('a', [slot('monday', '09:00', '12:00')]) },
      { course: course('B', []), section: section('b', [slot('monday', '10:00', '11:00')]) },
      { course: course('C', []), section: section('c', [slot('monday', '13:00', '14:00')]) },
    ]);
    const by = Object.fromEntries(placed.map((p) => [p.course.code, p]));
    expect([by.A.lane, by.B.lane]).toEqual([0, 1]);
    expect([by.A.lanes, by.B.lanes, by.C.lanes]).toEqual([2, 2, 1]);
  });
});

describe('range, hours and days', () => {
  it('covers 08:00-18:00 and stretches to whole hours around every class', () => {
    const placed = placeSlots([{ course: course('A', []), section: section('01', [slot('monday', '07:30', '09:00'), slot('friday', '18:00', '19:15')]) }]);
    expect(visibleRange(placed)).toEqual({ start: 420, end: 1200 });
    expect(visibleRange([])).toEqual({ start: 480, end: 1080 });
    expect(weeklyMinutes(placed)).toBe(90 + 75);
    expect(studyDays(placed)).toEqual(['monday', 'friday']);
  });
});

describe('terms and sections', () => {
  it('lists terms newest first and filters by term', () => {
    const courses = [course('A', [], 1, '2568'), course('B', [], 2, '2568'), course('C', [], 1, '2569'), course('D', [], 1, '2569')];
    expect(termsOf(courses)).toEqual([{ semester: 1, academicYear: '2569' }, { semester: 2, academicYear: '2568' }, { semester: 1, academicYear: '2568' }]);
    expect(inTerm(courses[0], { semester: 1, academicYear: '2569' })).toBe(false);
    expect(inTerm(courses[0], null)).toBe(false);
  });

  it('uses the section the student is in', () => {
    const c = course('A', [section('s1', []), section('s2', [])]);
    expect(enrolledSection(c, 's2')?.id).toBe('s2');
    expect(enrolledSection(c, null)).toBeNull();
    expect(enrolledSection(course('B', [section('only', [])]), null)?.id).toBe('only');
  });

  it('builds student entries from enrollments of the term only', () => {
    const enrollments = [
      { sectionId: 's2', course: { id: 'A', code: 'A', semester: 1, academicYear: '2569', sections: [{ id: 's1', number: '01', schedule: [] }, { id: 's2', number: '02', schedule: [{ day: 'tuesday', startTime: '13:00', endTime: '15:00' }] }] } },
      { sectionId: 'x', course: { id: 'OLD', code: 'OLD', semester: 2, academicYear: '2568', sections: [{ id: 'x', number: '01', schedule: [] }] } },
    ];
    const entries = studentEntries(enrollments, { semester: 1, academicYear: '2569' });
    expect(entries.map((e) => [e.course.code, e.section?.id])).toEqual([['A', 's2']]);
    expect(placeSlots(entries).map((p) => p.day)).toEqual(['tuesday']);
  });

  it('teaching entries include every section of the term', () => {
    const entries = teachingEntries([course('A', [section('s1', []), section('s2', [])]), course('OLD', [section('o', [])], 1, '2568')], { semester: 1, academicYear: '2569' });
    expect(entries.map((e) => e.section?.id)).toEqual(['s1', 's2']);
  });
});

describe('formatHours', () => {
  it('rounds to one decimal and drops a trailing .0', () => {
    expect(formatHours(50)).toBe('0.8');
    expect(formatHours(90)).toBe('1.5');
    expect(formatHours(180)).toBe('3');
  });
});
