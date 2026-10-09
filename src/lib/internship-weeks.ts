/** the Monday (YYYY-MM-DD) of the week a "YYYY-MM-DD" day is in */
const mondayOf = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

/**
 * Weeks with at least one diary entry, against the planned duration in weeks. With no planned duration
 * there is no total and no percentage, rather than the entries themselves pretending to be the plan.
 */
export const internshipWeeks = (logDays: string[], plannedWeeks: number) => {
  const logged = new Set(logDays.filter(Boolean).map(mondayOf)).size;
  const total = plannedWeeks > 0 ? plannedWeeks : null;
  return { logged, total, progress: total ? Math.min(100, Math.round((logged / total) * 100)) : null };
};
