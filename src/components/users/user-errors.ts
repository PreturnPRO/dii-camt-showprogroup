import { ApiError } from '@/lib/api';

const CODE_TH: Record<string, string> = {
  STUDENT_ID_TAKEN: 'รหัสนักศึกษานี้มีผู้ใช้อยู่แล้ว',
  BAD_STUDENT_ID: 'รหัสนักศึกษาต้องเป็นตัวเลข 8-9 หลัก',
  ADVISOR_NOT_FOUND: 'อีเมลอาจารย์ที่ปรึกษาไม่ตรงกับอาจารย์ในระบบ',
  DUPLICATE: 'มีอีเมลหรือรหัสนักศึกษานี้ในระบบแล้ว',
};

/** why saving a user failed (codes from the API in Thai, else the API's message, else the fallback) */
export const userSaveMessage = (error: unknown, fallback: string) => {
  if (error instanceof ApiError) {
    const code = (error.details as { details?: { code?: string } } | undefined)?.details?.code;
    if (code && CODE_TH[code]) return CODE_TH[code];
  }
  return error instanceof Error && error.message ? error.message : fallback;
};

type ImportRow = { rowNumber: number; status: string; identifier?: string; code?: string; message?: string };

/** one line per failed import row: which row, whose, and why (G6, staff M-N1) */
export const importFailureLines = (results: unknown[]) =>
  (results as ImportRow[])
    .filter((row) => row && row.status === 'failed')
    .map((row) => `แถว ${row.rowNumber}${row.identifier ? ` (${row.identifier})` : ''}: ${(row.code && CODE_TH[row.code]) || row.message || 'นำเข้าไม่สำเร็จ'}`);
