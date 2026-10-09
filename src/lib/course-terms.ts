type TermCourse = { semester: number; academicYear: string | number; status?: string; code?: string; name?: string; nameThai?: string };
export type Term = { semester: number; academicYear: string };

export const termKey = (term: Term) => `${term.semester}/${term.academicYear}`;

/** every term the courses run in, once each, newest first */
export const courseTerms = (courses: TermCourse[]): Term[] => {
  const seen = new Map<string, Term>();
  for (const course of courses) {
    const term = { semester: Number(course.semester), academicYear: String(course.academicYear) };
    seen.set(termKey(term), term);
  }
  return [...seen.values()].sort((a, b) => Number(b.academicYear) - Number(a.academicYear) || b.semester - a.semester);
};

/** the term a picker starts at: the newest with an open course, else the newest (owner decision 9/10/69, G4 รอง c) */
export const defaultCourseTerm = (courses: TermCourse[]): Term | null => {
  const open = courseTerms(courses.filter((course) => (course.status ?? 'active') === 'active'));
  return open[0] ?? courseTerms(courses)[0] ?? null;
};

/** the courses of one term, narrowed by a code or name search */
export const coursesInTerm = <T extends TermCourse>(courses: T[], key: string, query: string): T[] => {
  const q = query.trim().toLowerCase();
  return courses.filter((course) =>
    termKey({ semester: Number(course.semester), academicYear: String(course.academicYear) }) === key &&
    (!q || [course.code, course.name, course.nameThai].some((field) => (field ?? '').toLowerCase().includes(q))));
};
