import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { normalizeSchedule } from "./facility.service";
import { formatDay, weekdayOf } from "./class-move-rules";

/**
 * Does the class meet on this Thai day? (owner decision 9/10/69, G4 รอง d)
 * - the section's weekly classes on that weekday, minus the ones an approved move took away that day
 * - plus any approved move into that day
 * A student without a section counts every section of the course. A course with no weekly class and no
 * move at all has no timetable yet, so its days are unknown and nothing is blocked (null).
 */
export const meetsOn = async (courseId: string, sectionId: string | null, day: Date): Promise<boolean | null> => {
  const sections = await prisma.section.findMany({
    where: sectionId ? { id: sectionId } : { courseId },
    select: {
      id: true,
      schedule: true,
      classMoves: { where: { status: "approved", OR: [{ originalDate: day }, { newDate: day }] }, select: { originalDate: true, originalStart: true, newDate: true } },
    },
  });
  const weekday = weekdayOf(day);
  const key = formatDay(day);
  let anyTimetable = false;
  for (const section of sections) {
    const slots = normalizeSchedule(section.schedule);
    if (slots.length > 0) anyTimetable = true;
    const movedAway = new Set(section.classMoves.filter((m) => formatDay(m.originalDate) === key).map((m) => m.originalStart));
    if (slots.some((slot) => slot.day === weekday && !movedAway.has(slot.startTime))) return true;
    if (section.classMoves.some((m) => formatDay(m.newDate) === key)) return true;
  }
  if (!anyTimetable) {
    const moves = await prisma.classMove.count({ where: { status: "approved", section: sectionId ? { id: sectionId } : { courseId } } });
    if (moves === 0) return null;
  }
  return false;
};

const DAY_TH: Record<string, string> = {
  sunday: "อาทิตย์", monday: "จันทร์", tuesday: "อังคาร", wednesday: "พุธ", thursday: "พฤหัสบดี", friday: "ศุกร์", saturday: "เสาร์",
};

/** 409 when the class does not meet that day */
export const assertMeetsOn = async (courseId: string, sectionId: string | null, day: Date) => {
  if ((await meetsOn(courseId, sectionId, day)) === false) {
    throw new AppError(409, `There is no class on ${formatDay(day)} (${weekdayOf(day)})`, {
      code: "NO_CLASS_THAT_DAY", date: formatDay(day), day: weekdayOf(day), dayThai: DAY_TH[weekdayOf(day)],
    });
  }
};
