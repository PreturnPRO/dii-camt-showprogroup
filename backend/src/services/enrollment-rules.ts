/** Registration rules a student (or a lecturer on the student's behalf) must pass. Staff/admin skip these. */
export const MAX_TERM_CREDITS = 22;

export type Slot = { day: string; startTime: string; endTime: string };

export type RuleInput = {
  student: { semester: number; academicYear: string };
  course: { code: string; credits: number; semester: number; academicYear: string; status: string; prerequisites: string[] };
  /** the chosen section, or null when the course has no sections */
  section: { maxStudents: number; slots: Slot[] } | null;
  /** non-dropped enrollments already in the chosen section */
  sectionSeatsTaken: number;
  /** prerequisite codes that exist as courses; others are skipped */
  knownCourseCodes: Set<string>;
  /** every enrollment the student has, any term */
  history: Array<{ courseCode: string; status: string; letterGrade: string | null }>;
  /** the student's other enrollments in the course's term, already without dropped and W */
  termEnrollments: Array<{ courseCode: string; credits: number; letterGrade: string | null; slots: Slot[] }>;
};

export type Violation = { status: 409; message: string };

export const parseSlots = (schedule: unknown): Slot[] =>
  (Array.isArray(schedule) ? schedule : []).flatMap((slot) => {
    if (!slot || typeof slot !== "object") return [];
    const { day, startTime, endTime } = slot as Record<string, unknown>;
    if (typeof day !== "string" || typeof startTime !== "string" || typeof endTime !== "string") return [];
    return [{ day: day.trim().toLowerCase(), startTime, endTime }];
  });

const toMinutes = (time: string) => {
  const [h, m] = time.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

const overlaps = (a: Slot, b: Slot) =>
  a.day === b.day && Math.max(toMinutes(a.startTime), toMinutes(b.startTime)) < Math.min(toMinutes(a.endTime), toMinutes(b.endTime));

const fail = (message: string): Violation => ({ status: 409, message });

export const findEnrollmentViolation = (input: RuleInput): Violation | null => {
  const { student, course, section } = input;

  if (course.semester !== student.semester || course.academicYear !== student.academicYear) {
    return fail(`${course.code} is not offered in your current term (${student.semester}/${student.academicYear})`);
  }
  if (course.status !== "active") return fail(`${course.code} is not open for registration`);
  if (section && input.sectionSeatsTaken >= section.maxStudents) return fail(`This section of ${course.code} is full`);

  const missing = course.prerequisites.filter(
    (code) =>
      input.knownCourseCodes.has(code) &&
      !input.history.some((e) => e.courseCode === code && e.status !== "dropped" && e.letterGrade !== "W"),
  );
  if (missing.length > 0) return fail(`Prerequisite not taken: ${missing.join(", ")}`);

  const termCredits = input.termEnrollments.filter((e) => e.letterGrade !== "W").reduce((sum, e) => sum + e.credits, 0);
  if (termCredits + course.credits > MAX_TERM_CREDITS) {
    return fail(`Credit limit exceeded: ${termCredits} + ${course.credits} is over ${MAX_TERM_CREDITS} credits this term`);
  }

  for (const slot of section?.slots ?? []) {
    const clash = input.termEnrollments.find((e) => e.letterGrade !== "W" && e.slots.some((s) => overlaps(slot, s)));
    if (clash) return fail(`Schedule conflicts with ${clash.courseCode}`);
  }
  return null;
};
