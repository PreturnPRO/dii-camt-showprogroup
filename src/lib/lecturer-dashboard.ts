import { asArray, asRecord, asString } from './live-data';

/** Students still in the course, and how many of them have no letter grade yet (M12). */
export const gradeProgress = (rawCourse: unknown) => {
  const active = asArray(asRecord(rawCourse).enrollments)
    .map(asRecord)
    .filter((enrollment) => asString(enrollment.status, 'enrolled') !== 'dropped');
  return {
    enrolled: active.length,
    awaitingGrade: active.filter((enrollment) => !asString(enrollment.letterGrade)).length,
  };
};

const dayOf = (date: Date | string) => (date instanceof Date ? date.toISOString() : date).slice(0, 10);

const ACTIVE_APPOINTMENT = new Set(['pending', 'confirmed']);

/**
 * Appointments from `today` (a Bangkok YYYY-MM-DD) on that are still going ahead, soonest first.
 * Appointment dates are stored as UTC midnight of the Thai day, so the ISO date is the Thai date.
 */
export const upcomingAppointments = <A extends { date: Date | string; status: string; startTime: string }>(
  appointments: A[],
  today: string,
  limit = 4,
) =>
  appointments
    .filter((appointment) => ACTIVE_APPOINTMENT.has(appointment.status) && dayOf(appointment.date) >= today)
    .sort((a, b) => dayOf(a.date).localeCompare(dayOf(b.date)) || a.startTime.localeCompare(b.startTime))
    .slice(0, limit);

/**
 * The term the lecturer is teaching now: the newest one with a non-pending course that still has
 * a student. A course created ahead for next term (pending, nobody enrolled) does not count.
 * With nobody enrolled anywhere yet, the newest term.
 */
export const teachingTerm = (rawCourses: unknown[]): { academicYear: string; semester: number } | null => {
  const terms = rawCourses.map(asRecord).map((course) => ({
    academicYear: asString(course.academicYear),
    semester: Number(course.semester) || 0,
    teaching: asString(course.status) !== 'pending' && gradeProgress(course).enrolled > 0,
  }));
  if (terms.length === 0) return null;
  const newestFirst = [...terms].sort((a, b) => Number(b.academicYear) - Number(a.academicYear) || b.semester - a.semester);
  const chosen = newestFirst.find((term) => term.teaching) ?? newestFirst[0];
  return { academicYear: chosen.academicYear, semester: chosen.semester };
};
