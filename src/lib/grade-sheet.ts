type SheetRow = {
  id: string;
  studentId: string;
  courseId: string;
  scores: Array<{ criteriaId: string; score: number }>;
  total?: number;
  letterGrade?: string;
  remarks?: string;
};

/** the cell key for `edited`: `${row.id}:total` or `${row.id}:letterGrade` */
export const sheetCell = (rowId: string, field: 'total' | 'letterGrade') => `${rowId}:${field}`;

/**
 * The bulk-save body for the lecturer's grade sheet. A total or letter is sent only when the lecturer
 * typed it; otherwise the server works both out from the scores, so changing a score changes the grade.
 */
export const gradeSheetPayload = (rows: SheetRow[], edited: ReadonlySet<string>) =>
  rows.map((row) => ({
    enrollmentId: row.id,
    // the bulk schema identifies each row by student + course
    studentId: row.studentId,
    courseId: row.courseId,
    scores: row.scores,
    total: edited.has(sheetCell(row.id, 'total')) ? row.total : undefined,
    letterGrade: edited.has(sheetCell(row.id, 'letterGrade')) ? row.letterGrade || undefined : undefined,
    remarks: row.remarks || undefined,
  }));
