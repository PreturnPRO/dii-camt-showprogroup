import { thaiDay } from "./attendance";

/** owner decision 9/10/69: no internship day counts for more than this */
export const MAX_HOURS_PER_DAY = 8;

/** "2026-09" or the Buddhist-era "2569-09" → the first day of that month (UTC midnight), or null */
export const startOfMonth = (month: string | null | undefined): Date | null => {
  const match = /^(\d{4})-(\d{2})$/.exec(month ?? "");
  if (!match) return null;
  const year = Number(match[1]) > 2400 ? Number(match[1]) - 543 : Number(match[1]);
  return new Date(Date.UTC(year, Number(match[2]) - 1, 1));
};

const dayKey = (at: Date) => thaiDay(at).toISOString().slice(0, 10);

/** why a diary day is not allowed, or null: not after today (Thai), not before the start month */
export const diaryDayProblem = (date: Date, startMonth: string | null | undefined, now = new Date()) => {
  if (dayKey(date) > dayKey(now)) return "A diary entry cannot be for a day in the future";
  const start = startOfMonth(startMonth);
  if (start && dayKey(date) < dayKey(start)) return "A diary entry cannot be before the internship's start month";
  return null;
};

type Log = { date: Date; hours: number; reviewStatus: string };

/** the hours on a certificate: approved entries only, inside the internship's days, at most 8 a day */
export const certificateHours = (logs: Log[], opts: { startMonth: string | null | undefined; today: Date }) => {
  const perDay = new Map<string, number>();
  for (const log of logs) {
    if (log.reviewStatus !== "approved" || diaryDayProblem(log.date, opts.startMonth, opts.today)) continue;
    perDay.set(dayKey(log.date), (perDay.get(dayKey(log.date)) ?? 0) + log.hours);
  }
  return [...perDay.values()].reduce((sum, hours) => sum + Math.min(hours, MAX_HOURS_PER_DAY), 0);
};

/** total hours already logged on the same Thai day, leaving out one entry (the one being edited) */
export const hoursOnDay = (logs: Array<{ id: string; date: Date; hours: number }>, date: Date, exceptId?: string) =>
  logs.filter((l) => l.id !== exceptId && dayKey(l.date) === dayKey(date)).reduce((sum, l) => sum + l.hours, 0);
