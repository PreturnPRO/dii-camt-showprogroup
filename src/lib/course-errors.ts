import { ApiError } from './api';
import { DAY_LABELS } from './timetable';

type ClashDetails = { code?: string; conflictingCourse?: string; section?: string; day?: string; startTime?: string; endTime?: string };

/** the clash the API names in a 409 (the client keeps the whole body, whose `details` holds it) */
const clashOf = (error: ApiError): ClashDetails | null => {
  const body = error.details as { details?: unknown } | undefined;
  const details = (body && typeof body === 'object' && 'details' in body ? body.details : body) as ClashDetails | null | undefined;
  return details && typeof details === 'object' && details.day ? details : null;
};

const QUEUE_TH: Record<string, string> = {
  USE_REVIEW: 'วิชาในคิวอนุมัติ ต้องใช้ปุ่มอนุมัติ / ตีกลับ หรือให้ผู้สอนส่งใหม่',
  NOT_WAITING: 'วิชานี้ไม่ได้รออนุมัติแล้ว (อาจมีคนดำเนินการไปก่อน)',
  NOT_RETURNED: 'ส่งใหม่ได้เฉพาะวิชาที่ถูกตีกลับหรือฉบับร่าง',
  CHANGED: 'รายวิชาถูกแก้ไขระหว่างนี้ กรุณาโหลดใหม่แล้วลองอีกครั้ง',
};

const codeOf = (error: ApiError): string | undefined => {
  const body = error.details as { details?: { code?: string } } | undefined;
  return body?.details?.code;
};

/** why a course could not be saved, in the viewer's language (lecturer and room clashes named in Thai) */
export const courseSaveMessage = (error: unknown, th: boolean): string => {
  const status = error instanceof ApiError ? error.status : 0;
  if (status === 403) return th ? 'ไม่มีสิทธิ์แก้ส่วนนี้ของรายวิชา' : 'You may not change this part of the course';
  if (status !== 409) return th ? 'บันทึกรายวิชาไม่สำเร็จ' : 'Unable to save course';
  const message = error instanceof Error ? error.message : '';
  const clash = clashOf(error as ApiError);
  if (clash && th) {
    const when = `วัน${DAY_LABELS[clash.day as keyof typeof DAY_LABELS]?.th ?? clash.day} ${clash.startTime}-${clash.endTime}`;
    if (clash.code === 'LECTURER_CLASH') {
      return clash.conflictingCourse
        ? `ผู้สอนมีคาบ ${clash.conflictingCourse} ตอน ${clash.section} ${when} อยู่แล้ว`
        : `ผู้สอนคนเดียวกันมีสองตอนสอนพร้อมกัน ${when}`;
    }
    if (clash.conflictingCourse) return `ห้องนี้ถูกใช้โดย ${clash.conflictingCourse} ตอน ${clash.section} ${when} แล้ว`;
  }
  if (th) {
    const code = codeOf(error as ApiError);
    if (code && QUEUE_TH[code]) return QUEUE_TH[code];
    const duplicate = /^Course (\S+) already exists for (\d+\/\d+)/.exec(message);
    if (duplicate) return `มีรหัสวิชา ${duplicate[1]} ในภาคเรียน ${duplicate[2]} แล้ว`;
  }
  return th ? `บันทึกไม่ได้: ${message || 'ข้อมูลซ้ำ'}` : `Not saved: ${message || 'duplicate'}`;
};
