import { ApiError } from './api';

type NoClass = { code?: string; date?: string; dayThai?: string };

/** the reason a mark or a QR session was refused, for a toast (a day without a class in Thai: G4 รอง d) */
export const attendanceErrorText = (error: unknown, th: boolean): string | undefined => {
  if (!(error instanceof Error)) return undefined;
  if (th && error instanceof ApiError) {
    const body = error.details as { details?: NoClass } | undefined;
    const details = body?.details;
    if (details?.code === 'NO_CLASS_THAT_DAY') return `วันที่ ${details.date} (วัน${details.dayThai}) วิชานี้ไม่มีคาบเรียน จึงเช็คชื่อไม่ได้`;
    if (details?.code === 'FUTURE_DATE') return 'เช็คชื่อล่วงหน้าไม่ได้ เลือกวันนี้หรือวันที่ผ่านมาแล้ว';
  }
  return error.message;
};
