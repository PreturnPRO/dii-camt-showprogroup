/** Attendance and appointment dates are stored as UTC midnight of the Thai (UTC+7) calendar day. */
export const ATTENDANCE_STATUSES = ["present", "late", "leave", "absent"] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];
export const ATTENDANCE_WARNING_PERCENT = 80;

const THAI_OFFSET_MS = 7 * 60 * 60 * 1000;

export const thaiDay = (at: Date): Date => {
  const shifted = new Date(at.getTime() + THAI_OFFSET_MS);
  return new Date(Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()));
};

export const thaiDateTime = (day: Date, hhmm: string): Date => {
  const [h, m] = hhmm.split(":").map(Number);
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate(), h || 0, m || 0) - THAI_OFFSET_MS);
};

/** owner decision 7/10/69: late = attended, leave is not in the denominator, unmarked days are not counted */
export const attendanceRate = (statuses: string[]) => {
  const count = (s: AttendanceStatus) => statuses.filter((x) => x === s).length;
  const present = count("present");
  const late = count("late");
  const leave = count("leave");
  const absent = count("absent");
  const counted = present + late + absent;
  return {
    present, late, leave, absent,
    percentage: counted > 0 ? Math.round(((present + late) / counted) * 1000) / 10 : null,
  };
};
