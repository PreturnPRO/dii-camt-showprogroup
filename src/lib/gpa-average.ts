/** average GPAX of students who have one; 0 means "no grade yet", not a real 0.00 (audit M1) */
export const gpaAverage = (students: Array<{ gpax: number }>) => {
  const graded = students.filter((s) => Number.isFinite(s.gpax) && s.gpax > 0);
  return {
    average: graded.length ? Number((graded.reduce((sum, s) => sum + s.gpax, 0) / graded.length).toFixed(2)) : null,
    count: graded.length,
  };
};
