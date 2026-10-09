import type { Student } from '@/types';

type Text = { th: string; en: string };

/** the academic status the faculty recorded (StudentProfile.academicStatus), never a fixed "normal" */
export const academicStanding = (status: Student['academicStatus']) => {
  switch (status) {
    case 'risk':
      return { th: 'เสี่ยง', en: 'At risk', detailTh: 'ควรปรึกษาอาจารย์ที่ปรึกษา', detailEn: 'Talk to your advisor', tone: 'bad' as const };
    case 'probation':
      return { th: 'วิทยาทัณฑ์', en: 'Probation', detailTh: 'ควรปรึกษาอาจารย์ที่ปรึกษา', detailEn: 'Talk to your advisor', tone: 'warn' as const };
    case 'dropped':
      return { th: 'พ้นสภาพ', en: 'Dismissed', detailTh: 'ติดต่องานทะเบียน', detailEn: 'Contact the registrar', tone: 'bad' as const };
    default:
      return { th: 'ปกติ', en: 'Normal', detailTh: 'ไม่มีความเสี่ยง', detailEn: 'No risk', tone: 'ok' as const };
  }
};

/** the line under GPAX; with nothing published yet a 0.00 is not a GPAX at all */
export const gpaxNote = (gpax: number, hasPublishedGrades: boolean): Text & { tone: 'none' | 'bad' | 'ok' | 'excellent' } => {
  if (!hasPublishedGrades) return { th: 'ยังไม่มีเกรดที่ประกาศแล้ว', en: 'No published grades yet', tone: 'none' };
  if (gpax < 2) return { th: 'ต่ำกว่า 2.00', en: 'Below 2.00', tone: 'bad' };
  if (gpax >= 3.5) return { th: 'ผลการเรียนดีเยี่ยม', en: 'Excellent academic record', tone: 'excellent' };
  return { th: 'อยู่ในเกณฑ์ปกติ', en: 'Within normal range', tone: 'ok' };
};

/** the footnote on a course's grade card when the lecturer left no remark */
export const gradeFootnote = (letterGrade: string | undefined): Text => {
  if (!letterGrade || letterGrade === '-') return { th: 'ยังไม่ประกาศเกรด', en: 'Not published yet' };
  if (letterGrade === 'F') return { th: 'ไม่ผ่าน', en: 'Not passed' };
  if (letterGrade === 'W') return { th: 'ถอนรายวิชา', en: 'Withdrawn' };
  if (letterGrade === 'I') return { th: 'ยังไม่สมบูรณ์ (I)', en: 'Incomplete (I)' };
  return { th: 'ผ่าน', en: 'Passed' };
};
