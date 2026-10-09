/** owner decision 9/10/69, the same rule the server enforces */
export const MAX_HOURS_PER_DAY = 8;

type Entry = { id: string; date: string; hours: number; reviewStatus?: string };

/** "2026-09" or the Buddhist-era "2569-09" → "2026-09-01", or null */
const startDay = (month?: string | null) => {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? '');
  if (!match) return null;
  const year = Number(match[1]) > 2400 ? Number(match[1]) - 543 : Number(match[1]);
  return `${year}-${match[2]}-01`;
};

/** why a diary entry would be refused (Thai/English), or null; dates are "YYYY-MM-DD" Thai days */
export const diaryEntryProblem = (
  entry: { date: string; hours: number },
  entries: Entry[],
  opts: { today: string; exceptId?: string; startMonth?: string | null },
) => {
  if (entry.date > opts.today) return { th: 'ลงบันทึกล่วงหน้าไม่ได้', en: 'You cannot log a day in the future' };
  const start = startDay(opts.startMonth);
  if (start && entry.date < start) return { th: 'ลงบันทึกก่อนเดือนที่เริ่มฝึกงานไม่ได้', en: "You cannot log a day before the internship's start month" };
  if (entry.hours > MAX_HOURS_PER_DAY) {
    return { th: `บันทึกได้ไม่เกิน ${MAX_HOURS_PER_DAY} ชั่วโมงต่อวัน`, en: `At most ${MAX_HOURS_PER_DAY} hours a day` };
  }
  const already = entries.filter((e) => e.id !== opts.exceptId && e.date === entry.date).reduce((sum, e) => sum + e.hours, 0);
  if (already + entry.hours > MAX_HOURS_PER_DAY) {
    const left = Math.max(0, MAX_HOURS_PER_DAY - already);
    return {
      th: `วันนี้บันทึกไปแล้ว ${already} ชั่วโมง เหลือได้อีก ${left} ชั่วโมง (ไม่เกิน ${MAX_HOURS_PER_DAY} ชั่วโมงต่อวัน)`,
      en: `${already} hours already logged that day; ${left} left (at most ${MAX_HOURS_PER_DAY} a day)`,
    };
  }
  return null;
};

/** the hours a certificate counts: approved entries only, from the start month to today, at most 8 a day */
export const approvedHours = (entries: Entry[], window: { startMonth?: string | null; today?: string } = {}) => {
  const start = startDay(window.startMonth);
  const perDay = new Map<string, number>();
  for (const e of entries) {
    if (e.reviewStatus !== 'approved' || (start && e.date < start) || (window.today && e.date > window.today)) continue;
    perDay.set(e.date, (perDay.get(e.date) ?? 0) + e.hours);
  }
  return [...perDay.values()].reduce((sum, h) => sum + Math.min(h, MAX_HOURS_PER_DAY), 0);
};
