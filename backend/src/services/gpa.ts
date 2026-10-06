export const COUNTED_GRADES = ["A", "B+", "B", "C+", "C", "D+", "D", "F"] as const;
export const ALL_GRADES = [...COUNTED_GRADES, "W", "I"] as const;
export type CountedGrade = (typeof COUNTED_GRADES)[number];
export type LetterGrade = (typeof ALL_GRADES)[number];

export const GRADE_POINTS: Record<CountedGrade, number> = { A: 4, "B+": 3.5, B: 3, "C+": 2.5, C: 2, "D+": 1.5, D: 1, F: 0 };

const isCounted = (grade: string | null): grade is CountedGrade =>
  grade !== null && (COUNTED_GRADES as readonly string[]).includes(grade);
export const isPassing = (grade: string | null) => isCounted(grade) && grade !== "F";

export type GradedRow = { letterGrade: string | null; credits: number; status: string; semester: number; academicYear: string };

/** W, I, ungraded and dropped enrollments are shown on transcripts but never counted. */
export const computeGpa = (rows: GradedRow[]) => {
  const counted = rows.filter((r) => r.status !== "dropped" && isCounted(r.letterGrade));
  const credits = counted.reduce((sum, r) => sum + r.credits, 0);
  const points = counted.reduce((sum, r) => sum + GRADE_POINTS[r.letterGrade as CountedGrade] * r.credits, 0);
  const earnedCredits = counted.filter((r) => isPassing(r.letterGrade)).reduce((sum, r) => sum + r.credits, 0);
  return { gpa: credits > 0 ? Number((points / credits).toFixed(2)) : null, credits, earnedCredits };
};

export const termGpas = (rows: GradedRow[]) => {
  const terms = new Map<string, GradedRow[]>();
  for (const r of rows) {
    const key = `${r.academicYear}|${r.semester}`;
    terms.set(key, [...(terms.get(key) ?? []), r]);
  }
  return Array.from(terms.values())
    .map((termRows) => ({ semester: termRows[0].semester, academicYear: termRows[0].academicYear, ...computeGpa(termRows) }))
    .filter((t) => t.gpa !== null)
    .sort((a, b) => Number(a.academicYear) - Number(b.academicYear) || a.semester - b.semester)
    .map(({ semester, academicYear, gpa, credits }) => ({ semester, academicYear, gpa: gpa as number, credits }));
};
