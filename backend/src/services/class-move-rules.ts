import type { Slot } from "./enrollment-rules";

export const MOVE_STATUSES = ["pending", "approved", "rejected", "withdrawn", "cancelled"] as const;
export const ACTIVE_MOVE_STATUSES = ["pending", "approved"];

const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

/** "YYYY-MM-DD" (a Thai calendar day) → UTC midnight, the storage form used by attendance and moves */
export const parseDay = (value: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? "");
  if (!m) return null;
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return date.getUTCMonth() === Number(m[2]) - 1 && date.getUTCDate() === Number(m[3]) ? date : null;
};

export const formatDay = (d: Date) => d.toISOString().slice(0, 10);
export const weekdayOf = (day: Date) => WEEKDAYS[day.getUTCDay()];

export const toMinutes = (hhmm: string): number | null => {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m || Number(m[1]) > 23 || Number(m[2]) > 59) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};
export const fromMinutes = (min: number) => `${String(Math.floor(min / 60)).padStart(2, "0")}:${String(min % 60).padStart(2, "0")}`;

/** owner decision 7/10/69: a move can be changed until its original or new day arrives */
export const editable = (move: { originalDate: Date; newDate: Date }, today: Date) =>
  Math.min(move.originalDate.getTime(), move.newDate.getTime()) > today.getTime();

export type RegularSlots = { sectionId: string; label: string; slots: Slot[] };
export type MoveLike = {
  id: string; sectionId: string; label: string;
  originalDate: Date; originalStart: string; originalEnd: string;
  newDate: Date; newStart: string; newEnd: string;
  facilityId?: string | null;
};
export type Busy = { start: number; end: number; label: string; sectionId: string };

/** what is taken on one day: weekly classes, minus classes moved away from that day, plus classes moved onto it;
 *  with `room`, only classes moved into that room are added (a class moved to another room frees its usual one) */
export const busyOn = (day: Date, regular: RegularSlots[], approvedMoves: MoveLike[], ignoreMoveId?: string, room?: string): Busy[] => {
  const weekday = weekdayOf(day);
  const moves = approvedMoves.filter((m) => m.id !== ignoreMoveId);
  const sameDay = (a: Date) => a.getTime() === day.getTime();
  const busy: Busy[] = [];
  for (const r of regular) {
    for (const slot of r.slots) {
      if (slot.day !== weekday) continue;
      const movedAway = moves.some((m) => m.sectionId === r.sectionId && sameDay(m.originalDate) && m.originalStart === slot.startTime);
      const start = toMinutes(slot.startTime);
      const end = toMinutes(slot.endTime);
      if (!movedAway && start !== null && end !== null) busy.push({ start, end, label: r.label, sectionId: r.sectionId });
    }
  }
  for (const m of moves) {
    if (room !== undefined && m.facilityId !== room) continue;
    const start = toMinutes(m.newStart);
    const end = toMinutes(m.newEnd);
    if (sameDay(m.newDate) && start !== null && end !== null) busy.push({ start, end, label: m.label, sectionId: m.sectionId });
  }
  return busy;
};

export const clashesWith = (busy: Busy[], start: number, end: number) => busy.filter((b) => Math.max(b.start, start) < Math.min(b.end, end));
