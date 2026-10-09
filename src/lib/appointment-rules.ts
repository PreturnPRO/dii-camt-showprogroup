import { ApiError } from './api';
import { thaiToday } from './thai-date';

/** owner decision 9/10/69 (G6): a booking at most this many days ahead */
export const BOOKING_DAYS_AHEAD = 30;

type Timed = { date: Date | string; startTime: string; endTime: string };

/** the Thai wall-clock moment of a Thai day (stored as UTC midnight) and an "HH:MM" */
const at = (date: Date | string, hhmm: string) => {
  const day = (typeof date === 'string' ? date : date.toISOString()).slice(0, 10);
  return new Date(`${day}T${hhmm}:00+07:00`);
};

export const hasStarted = (apt: Timed, now = new Date()) => at(apt.date, apt.startTime) <= now;
export const hasEnded = (apt: Timed, now = new Date()) => at(apt.date, apt.endTime) <= now;

/** "YYYY-MM-DD" of the last day a student may book */
export const lastBookableDay = (now = new Date()) => {
  const today = new Date(`${thaiToday(now)}T00:00:00Z`);
  return new Date(today.getTime() + BOOKING_DAYS_AHEAD * 86400000).toISOString().slice(0, 10);
};

const CODE_TH: Record<string, string> = {
  ONE_PER_LECTURER: 'คุณมีนัดกับอาจารย์ท่านนี้ที่ยังไม่ถึงอยู่แล้ว ยกเลิกนัดเดิมหรือรอให้ผ่านไปก่อน',
  TOO_FAR: `จองล่วงหน้าได้ไม่เกิน ${BOOKING_DAYS_AHEAD} วัน`,
  STARTED: 'นัดเริ่มแล้ว ยกเลิกเองไม่ได้ กรุณาติดต่ออาจารย์',
  NOT_STARTED: 'ยังไม่ถึงเวลานัด บันทึกว่าพบแล้วไม่ได้',
  CHANGED: 'นัดนี้ถูกเปลี่ยนสถานะไปแล้ว กรุณาโหลดหน้าใหม่',
  CLOSED: 'นัดนี้ปิดไปแล้ว',
};

/** the server's refusals, said in Thai */
export const appointmentErrorText = (error: unknown) => {
  if (error instanceof ApiError) {
    const code = (error.details as { details?: { code?: string } } | undefined)?.details?.code;
    if (code && CODE_TH[code]) return CODE_TH[code];
    if (error.status === 409) return 'มีคนจองช่วงเวลานี้ไปแล้ว กรุณาเลือกเวลาอื่น';
    if (error.status === 404) return 'ไม่พบอาจารย์ท่านนี้ในระบบแล้ว';
    if (error.status === 403) return 'คุณทำรายการนี้กับนัดนี้ไม่ได้';
    if (error.status === 400) return 'ช่วงเวลานี้จองไม่ได้ (ผ่านไปแล้ว หรือไม่ใช่ office hours ของอาจารย์) กรุณาเลือกใหม่';
  }
  return 'ทำรายการไม่สำเร็จ กรุณาลองใหม่';
};
