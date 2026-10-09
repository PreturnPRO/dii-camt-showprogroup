/** the same rule as the backend warning (owner decision 9/10/69, G4 รอง e) */
export const ATTENDANCE_WARNING_PERCENT = 80;
export const ATTENDANCE_WARNING_MIN_CLASSES = 3;

type Rate = { present: number; late: number; absent: number; percentage: number | null };

/** none: nothing counted · early: fewer than 3 counted classes, too soon to judge · low: < 80 % · ok */
export const attendanceTone = (rate: Rate): 'none' | 'early' | 'low' | 'ok' => {
  if (rate.percentage === null) return 'none';
  if (rate.present + rate.late + rate.absent < ATTENDANCE_WARNING_MIN_CLASSES) return 'early';
  return rate.percentage < ATTENDANCE_WARNING_PERCENT ? 'low' : 'ok';
};
