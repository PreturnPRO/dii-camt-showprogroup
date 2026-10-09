import type { Course } from '@/types';

/** one weekly class; `room` is a class's own room, when it differs from the section's */
export type FormSlot = { day: string; startTime: string; endTime: string; room?: string };
export type FormSection = {
  /** the section number; sections are matched by it on save, so renaming one replaces it */
  number: string;
  room: string;
  facilityId?: string;
  maxStudents: number;
  minStudents: number;
  slots: FormSlot[];
};

/** every section of a course as the editor holds it: each slot keeps its own day and times */
export const sectionsFromCourse = (course: Pick<Course, 'sections'>): FormSection[] =>
  (course.sections ?? []).map((section) => ({
    number: section.sectionNumber,
    room: section.room ?? '',
    facilityId: section.facilityId,
    maxStudents: section.maxStudents,
    minStudents: section.minStudents ?? 0,
    slots: section.schedule.map((slot) => ({ day: slot.day, startTime: slot.startTime, endTime: slot.endTime, ...(slot.room ? { room: slot.room } : {}) })),
  }));

/** the next free section number ("01", "02", …) */
export const emptySection = (taken: string[]): FormSection => {
  let n = 1;
  while (taken.includes(String(n).padStart(2, '0'))) n += 1;
  return { number: String(n).padStart(2, '0'), room: '', maxStudents: 30, minStudents: 0, slots: [] };
};

/** the sections as the course API takes them; no booked room is sent as null, so a let-go booking is cleared */
export const sectionsPayload = (sections: FormSection[]) =>
  sections.map((section) => ({
    number: section.number.trim(),
    room: section.room.trim(),
    facilityId: section.facilityId ?? null,
    maxStudents: section.maxStudents,
    minStudents: section.minStudents,
    schedule: section.slots.map((slot) => ({ ...slot, type: 'lecture' })),
  }));

/** why the sections cannot be saved (Thai/English), or null */
export const sectionsProblem = (sections: FormSection[]) => {
  if (sections.length === 0) return { th: 'ต้องมีอย่างน้อย 1 ตอน', en: 'Add at least one section' };
  const numbers = sections.map((s) => s.number.trim());
  if (numbers.some((n) => !n)) return { th: 'ทุกตอนต้องมีเลขตอน', en: 'Every section needs a number' };
  if (new Set(numbers).size !== numbers.length) return { th: 'เลขตอนซ้ำกัน', en: 'Two sections have the same number' };
  for (const section of sections) {
    if (!(section.maxStudents >= 1)) return { th: `ตอน ${section.number}: จำนวนที่นั่งต้องอย่างน้อย 1`, en: `Section ${section.number}: at least 1 seat` };
    if (section.slots.some((slot) => slot.endTime <= slot.startTime)) {
      return { th: `ตอน ${section.number}: เวลาเลิกต้องหลังเวลาเริ่ม`, en: `Section ${section.number}: a class must end after it starts` };
    }
  }
  return null;
};
