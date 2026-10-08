import { describe, expect, it } from 'vitest';
import type { Course, Section } from '@/types';
import {
  addDays, enrolledSection, formatHours, inTerm, isDay, isMonth, monthGrid, monthOccurrences, moveSource, placeSlots, weekOf, weekOccurrences, studentEntries, studyDays, teachingEntries, termsOf, toMinutes, visibleRange, weeklyMinutes,
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

describe('weeks', () => {
  it('starts on Monday and adds days', () => {
    expect(weekOf('2030-09-18')).toBe('2030-09-16');
    expect(weekOf('2030-09-22')).toBe('2030-09-16');
    expect(addDays('2030-09-16', 7)).toBe('2030-09-23');
  });
});

describe('weekOccurrences', () => {
  const A = course('A', [section('s1', [slot('monday', '09:00', '12:00')])]);
  const entries = [{ course: A, section: A.sections[0] }];
  const mv = (over: Record<string, unknown>) => ({
    id: 'm', sectionId: 's1', sectionNumber: '01', courseId: 'A', courseCode: 'A', courseName: 'A', originalDate: '2030-09-16', originalStart: '09:00', originalEnd: '12:00',
    newDate: '2030-09-18', newStart: '13:00', newEnd: '16:00', facilityId: null, room: 'R2', status: 'approved', reason: '', requestedById: 'u', decisionNote: null, ...over,
  }) as never;

  it('dates the weekly classes', () => {
    expect(weekOccurrences(entries, '2030-09-16', []).map((o) => [o.date, o.kind])).toEqual([['2030-09-16', 'regular']]);
  });

  it('shows a moved class as out on its day and in on the new day', () => {
    const occ = weekOccurrences(entries, '2030-09-16', [mv({})]);
    expect(occ.map((o) => [o.date, o.kind, o.start])).toEqual([['2030-09-16', 'moved-out', 540], ['2030-09-18', 'moved-in', 780]]);
    expect(occ[1].slot.room).toBe('R2');
  });

  it('handles moves across weeks and ignores requests that are not approved', () => {
    // moved from the 16th into the next week: that week shows its own Monday class plus the moved-in one
    expect(weekOccurrences(entries, '2030-09-23', [mv({ newDate: '2030-09-24' })]).map((o) => [o.date, o.kind])).toEqual([['2030-09-23', 'regular'], ['2030-09-24', 'moved-in']]);
    expect(weekOccurrences(entries, '2030-09-09', [mv({ originalDate: '2030-09-16', newDate: '2030-09-10' })]).map((o) => [o.date, o.kind])).toEqual([['2030-09-09', 'regular'], ['2030-09-10', 'moved-in']]);
    expect(weekOccurrences(entries, '2030-09-16', [mv({ status: 'pending' })]).map((o) => o.kind)).toEqual(['regular']);
  });

  it('moving a class again starts from where it normally is', () => {
    const occ = weekOccurrences(entries, '2030-09-16', [mv({})]);
    expect(occ.map(moveSource)).toEqual([{ date: '2030-09-16', start: '09:00' }, { date: '2030-09-16', start: '09:00' }]);
    expect(moveSource(weekOccurrences(entries, '2030-09-16', [])[0])).toEqual({ date: '2030-09-16', start: '09:00' });
  });

  it('moved-out blocks take no lane', () => {
    const B = course('B', [section('s2', [slot('monday', '10:00', '11:00')])]);
    const occ = weekOccurrences([...entries, { course: B, section: B.sections[0] }], '2030-09-16', [mv({})]);
    expect(occ.find((o) => o.course.code === 'B')!.lanes).toBe(1);
  });
});

describe('monthOccurrences', () => {
  const A = course('A', [section('s1', [slot('monday', '09:00', '12:00')])]);
  const entries = [{ course: A, section: A.sections[0] }];
  const mv = (over: Record<string, unknown>) => ({
    id: 'm', sectionId: 's1', sectionNumber: '01', courseId: 'A', courseCode: 'A', courseName: 'A', originalDate: '2030-09-16', originalStart: '09:00', originalEnd: '12:00',
    newDate: '2030-09-18', newStart: '13:00', newEnd: '16:00', facilityId: null, room: 'R2', status: 'approved', reason: '', requestedById: 'u', decisionNote: null, ...over,
  }) as never;

  it('puts a Monday class on every Monday of the month and nowhere else', () => {
    const byDate = monthOccurrences(entries, '2030-09', []);
    // September 2030: Mondays are 2, 9, 16, 23, 30
    expect(Object.keys(byDate).sort()).toEqual(['2030-09-02', '2030-09-09', '2030-09-16', '2030-09-23', '2030-09-30']);
    expect(byDate['2030-09-02'].map((o) => o.kind)).toEqual(['regular']);
  });

  it('follows approved moves and leaves out dates outside the month', () => {
    const byDate = monthOccurrences(entries, '2030-09', [mv({}), mv({ id: 'n', originalDate: '2030-09-30', newDate: '2030-10-01' })]);
    expect(byDate['2030-09-16']).toBeUndefined();
    expect(byDate['2030-09-18'].map((o) => [o.kind, o.start])).toEqual([['moved-in', 780]]);
    expect(byDate['2030-09-30']).toBeUndefined();
    expect(Object.keys(byDate).some((d) => !d.startsWith('2030-09'))).toBe(false);
  });

  it('ignores a malformed month', () => {
    expect(monthOccurrences(entries, 'nope', [])).toEqual({});
    expect(monthOccurrences(entries, '2026-13', [])).toEqual({});
    expect(monthOccurrences(entries, '2026-00', [])).toEqual({});
  });
});

describe('isMonth / isDay', () => {
  it('rejects impossible months and days', () => {
    expect(isMonth('2026-12')).toBe(true);
    expect(isMonth('2026-13')).toBe(false);
    expect(isMonth('2026-00')).toBe(false);
    expect(isDay('2026-02-28')).toBe(true);
    expect(isDay('2026-02-31')).toBe(false);
    expect(isDay('2026-13-01')).toBe(false);
  });
});

describe('monthGrid', () => {
  it('starts on Monday and pads to whole weeks', () => {
    const cells = monthGrid('2030-09');
    // 1 Sep 2030 is a Sunday → grid starts Mon 26 Aug, ends Sun 6 Oct
    expect(cells[0]).toEqual({ date: '2030-08-26', inMonth: false });
    expect(cells[6]).toEqual({ date: '2030-09-01', inMonth: true });
    expect(cells.length % 7).toBe(0);
    expect(cells[cells.length - 1].date).toBe('2030-10-06');
  });
});
