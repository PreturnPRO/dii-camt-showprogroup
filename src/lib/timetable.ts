import type { Course, Schedule, Section } from '@/types';
import { asRecord } from '@/lib/live-data';
import { mapCourse } from '@/lib/live-mappers';
import type { ClassMoveView } from '@/lib/api';

export const DAY_KEYS = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
export type DayKey = (typeof DAY_KEYS)[number];

export const DAY_LABELS: Record<DayKey, { th: string; en: string; short: string }> = {
  monday: { th: 'จันทร์', en: 'Monday', short: 'จ.' },
  tuesday: { th: 'อังคาร', en: 'Tuesday', short: 'อ.' },
  wednesday: { th: 'พุธ', en: 'Wednesday', short: 'พ.' },
  thursday: { th: 'พฤหัสบดี', en: 'Thursday', short: 'พฤ.' },
  friday: { th: 'ศุกร์', en: 'Friday', short: 'ศ.' },
  saturday: { th: 'เสาร์', en: 'Saturday', short: 'ส.' },
  sunday: { th: 'อาทิตย์', en: 'Sunday', short: 'อา.' },
};

export const toMinutes = (hhmm: string): number | null => {
  const match = /^(\d{2}):(\d{2})$/.exec(hhmm ?? '');
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h < 24 && m < 60 ? h * 60 + m : null;
};

export const formatMinutes = (min: number) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

export type TimetableEntry = { course: Course; section: Section | null };
export type PlacedSlot = {
  key: string; course: Course; section: Section | null; slot: Schedule;
  day: DayKey; start: number; end: number; lane: number; lanes: number;
};

export const placeSlots = (entries: TimetableEntry[]): PlacedSlot[] => {
  const raw: PlacedSlot[] = [];
  entries.forEach(({ course, section }) => {
    (section?.schedule ?? []).forEach((slot, index) => {
      const day = String(slot.day ?? '').trim().toLowerCase() as DayKey;
      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);
      if (!DAY_KEYS.includes(day) || start === null || end === null || end <= start) return;
      raw.push({ key: `${course.id}-${section?.id ?? 'none'}-${index}`, course, section, slot, day, start, end, lane: 0, lanes: 1 });
    });
  });

  return assignLanes(raw);
};

/** lanes per day: classes that overlap (directly or through a chain) share a group */
export const assignLanes = <T extends PlacedSlot>(raw: T[]): T[] => {
  for (const day of DAY_KEYS) {
    const daySlots = raw.filter((p) => p.day === day).sort((a, b) => a.start - b.start || a.end - b.end);
    let group: T[] = [];
    let groupEnd = -1;
    const close = () => {
      const lanes = Math.max(1, ...group.map((p) => p.lane + 1));
      group.forEach((p) => { p.lanes = lanes; });
      group = [];
    };
    for (const p of daySlots) {
      if (group.length && p.start >= groupEnd) close();
      const laneEnds: number[] = [];
      group.forEach((g) => { laneEnds[g.lane] = Math.max(laneEnds[g.lane] ?? -1, g.end); });
      let lane = laneEnds.findIndex((end) => end <= p.start);
      if (lane === -1) lane = laneEnds.length;
      p.lane = lane;
      group.push(p);
      groupEnd = Math.max(groupEnd, p.end);
    }
    if (group.length) close();
  }
  return raw.sort((a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day) || a.start - b.start);
};

export const visibleRange = (slots: PlacedSlot[]) => ({
  start: Math.min(8 * 60, ...slots.map((s) => Math.floor(s.start / 60) * 60)),
  end: Math.max(18 * 60, ...slots.map((s) => Math.ceil(s.end / 60) * 60)),
});

/** hours for display: one decimal at most, no trailing .0 */
export const formatHours = (minutes: number) => String(Math.round((minutes / 60) * 10) / 10);

export const weeklyMinutes = (slots: PlacedSlot[]) => slots.reduce((sum, s) => sum + (s.end - s.start), 0);
export const studyDays = (slots: PlacedSlot[]): DayKey[] => DAY_KEYS.filter((d) => slots.some((s) => s.day === d));

export type Term = { semester: number; academicYear: string };
export const termKey = (t: Term) => `${t.academicYear}/${t.semester}`;

export const termsOf = (courses: Course[]): Term[] => {
  const seen = new Map<string, Term>();
  courses.forEach((c) => {
    const t = { semester: Number(c.semester), academicYear: String(c.academicYear) };
    seen.set(termKey(t), t);
  });
  return Array.from(seen.values()).sort((a, b) => Number(b.academicYear) - Number(a.academicYear) || b.semester - a.semester);
};

export const inTerm = (course: Course, term: Term | null) =>
  !!term && Number(course.semester) === term.semester && String(course.academicYear) === term.academicYear;

export const enrolledSection = (course: Course, sectionId: string | null | undefined): Section | null => {
  if (sectionId) return course.sections.find((s) => s.id === sectionId) ?? null;
  return course.sections.length === 1 ? course.sections[0] : null;
};

/** rows from GET /enrollments (dropped already excluded by the API) */
export const studentEntries = (enrollments: unknown[], term: Term | null): TimetableEntry[] =>
  enrollments
    .map((item, index) => {
      const enrollment = asRecord(item);
      const course = mapCourse(enrollment.course, index);
      const sectionId = typeof enrollment.sectionId === 'string' ? enrollment.sectionId : null;
      return { course, section: enrolledSection(course, sectionId) };
    })
    .filter((e) => inTerm(e.course, term));

export const teachingEntries = (courses: Course[], term: Term | null): TimetableEntry[] =>
  courses.filter((c) => inTerm(c, term)).flatMap((course) => course.sections.map((section) => ({ course, section })));

const MS_DAY = 24 * 60 * 60 * 1000;
const dayToDate = (day: string) => new Date(`${day}T00:00:00.000Z`);
export const addDays = (day: string, n: number) => new Date(dayToDate(day).getTime() + n * MS_DAY).toISOString().slice(0, 10);
export const weekOf = (day: string) => addDays(day, -((dayToDate(day).getUTCDay() + 6) % 7));

export type Occurrence = PlacedSlot & { date: string; kind: 'regular' | 'moved-out' | 'moved-in'; move?: ClassMoveView };

/** the class a move starts from: a moved-in block is moved again from its usual day and time */
export const moveSource = (o: Occurrence) =>
  o.kind === 'moved-in' && o.move ? { date: o.move.originalDate, start: o.move.originalStart } : { date: o.date, start: formatMinutes(o.start) };

export const weekOccurrences = (entries: TimetableEntry[], weekStart: string, moves: ClassMoveView[]): Occurrence[] => {
  const approved = moves.filter((m) => m.status === 'approved');
  const days = DAY_KEYS.map((day, i) => ({ day, date: addDays(weekStart, i) }));
  const out: Occurrence[] = [];
  for (const p of placeSlots(entries)) {
    const date = days.find((d) => d.day === p.day)!.date;
    const move = approved.find((m) => m.sectionId === p.section?.id && m.originalDate === date && m.originalStart === formatMinutes(p.start));
    out.push({ ...p, key: `${p.key}-${date}`, date, kind: move ? 'moved-out' : 'regular', move, lane: 0, lanes: 1 });
  }
  for (const m of approved) {
    const target = days.find((d) => d.date === m.newDate);
    const entry = entries.find((e) => e.section?.id === m.sectionId);
    const start = toMinutes(m.newStart);
    const end = toMinutes(m.newEnd);
    if (!target || !entry || start === null || end === null) continue;
    out.push({
      key: `move-${m.id}`, course: entry.course, section: entry.section,
      slot: { id: `move-${m.id}`, day: target.day, dayThai: '', startTime: m.newStart, endTime: m.newEnd, room: m.room ?? '', type: 'lecture' } as Schedule,
      day: target.day, start, end, lane: 0, lanes: 1, date: m.newDate, kind: 'moved-in', move: m,
    });
  }
  const laned = assignLanes(out.filter((o) => o.kind !== 'moved-out')) as Occurrence[];
  return [...out.filter((o) => o.kind === 'moved-out'), ...laned]
    .sort((a, b) => a.date.localeCompare(b.date) || a.start - b.start);
};

// real calendar dates only: '2026-13' or '2026-02-31' from a hand-edited URL must not reach Date math
export const isDay = (v: string | null | undefined): v is string =>
  !!v && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().slice(0, 10) === v;
export const isMonth = (v: string | null | undefined): v is string => !!v && /^\d{4}-\d{2}$/.test(v) && isDay(`${v}-01`);

export const shiftMonth = (month: string, n: number) => {
  const [y, m] = month.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 7);
};

// month view: whole Monday-first weeks covering `month` (YYYY-MM)
export const monthGrid = (month: string): { date: string; inMonth: boolean }[] => {
  if (!isMonth(month)) return [];
  const first = `${month}-01`;
  const cells: { date: string; inMonth: boolean }[] = [];
  for (let d = weekOf(first); d.startsWith(month) || d < first || cells.length % 7 !== 0; d = addDays(d, 1)) {
    cells.push({ date: d, inMonth: d.startsWith(month) });
  }
  return cells;
};

// the month's dated classes, with approved moves applied; moved-out classes are left out
export const monthOccurrences = (entries: TimetableEntry[], month: string, moves: ClassMoveView[]): Record<string, Occurrence[]> => {
  const out: Record<string, Occurrence[]> = {};
  const cells = monthGrid(month);
  for (let i = 0; i < cells.length; i += 7) {
    for (const o of weekOccurrences(entries, cells[i].date, moves)) {
      if (o.kind === 'moved-out' || !o.date.startsWith(month)) continue;
      (out[o.date] ??= []).push(o);
    }
  }
  return out;
};
