import { describe, expect, it } from 'vitest';
import { gradeProgress, teachingTerm, upcomingAppointments } from './lecturer-dashboard';

describe('gradeProgress', () => {
  it('counts students still enrolled and those still waiting for a grade', () => {
    expect(gradeProgress({ enrollments: [
      { status: 'enrolled', letterGrade: 'A' },
      { status: 'enrolled', letterGrade: null },
      { status: 'enrolled' },
      { status: 'dropped', letterGrade: null },
    ] })).toEqual({ enrolled: 3, awaitingGrade: 2 });
  });

  it('is zero for a course with no enrollment list', () => {
    expect(gradeProgress({})).toEqual({ enrolled: 0, awaitingGrade: 0 });
  });
});

describe('upcomingAppointments', () => {
  const at = (id: string, date: string, status = 'confirmed', startTime = '10:00') => ({ id, date, status, startTime });

  it('keeps today and later (Bangkok calendar), drops past and cancelled ones, soonest first', () => {
    const list = [
      at('past', '2026-05-06T00:00:00.000Z'),
      at('yesterday', '2026-10-07T00:00:00.000Z'),
      at('later', '2026-10-20T00:00:00.000Z'),
      at('today-late', '2026-10-08T00:00:00.000Z', 'confirmed', '15:00'),
      at('today-early', '2026-10-08T00:00:00.000Z', 'pending', '09:00'),
      at('cancelled', '2026-10-09T00:00:00.000Z', 'cancelled'),
      at('rejected', '2026-10-09T00:00:00.000Z', 'rejected'),
    ];
    expect(upcomingAppointments(list, '2026-10-08').map((a) => a.id)).toEqual(['today-early', 'today-late', 'later']);
  });

  it('shows at most four', () => {
    const many = Array.from({ length: 6 }, (_, i) => at(`a${i}`, `2026-10-1${i}T00:00:00.000Z`));
    expect(upcomingAppointments(many, '2026-10-08')).toHaveLength(4);
  });
});

describe('teachingTerm', () => {
  const course = (academicYear: string, semester: number, enrollments: Array<{ status: string }>, status = 'active') => ({ academicYear, semester, status, enrollments });

  it('is the newest term the lecturer actually teaches, not a future term prepared in advance', () => {
    const term = teachingTerm([
      course('2569', 1, [{ status: 'enrolled' }]),
      course('2570', 1, [], 'pending'),
      course('2568', 2, [{ status: 'enrolled' }]),
    ]);
    expect(term).toEqual({ academicYear: '2569', semester: 1 });
  });

  it('ignores a term whose only students dropped', () => {
    expect(teachingTerm([course('2569', 2, [{ status: 'dropped' }]), course('2569', 1, [{ status: 'enrolled' }])])).toEqual({ academicYear: '2569', semester: 1 });
  });

  it('falls back to the newest term when nobody is enrolled anywhere yet, and to null with no courses', () => {
    expect(teachingTerm([course('2569', 1, []), course('2569', 2, [])])).toEqual({ academicYear: '2569', semester: 2 });
    expect(teachingTerm([])).toBeNull();
  });
});
