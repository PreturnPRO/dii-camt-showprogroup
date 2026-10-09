import { asNumber } from './live-data';
import { readTabularFile } from './tabular-file';

export type ImportCoursePayload = {
  code: string;
  name: string;
  nameThai: string;
  credits: number;
  semester: number;
  academicYear: string;
  year: number;
  lecturerId: string;
  sections: Array<{
    number: string;
    maxStudents: number;
    minStudents: number;
    schedule: unknown[];
  }>;
  description: string;
  syllabus: string;
};

export type ImportCourseInput = Omit<ImportCoursePayload, 'sections'> & {
  maxStudents: number;
  minStudents: number;
};

export const headerAliases: Record<string, keyof ImportCourseInput> = {
  code: 'code',
  coursecode: 'code',
  name: 'name',
  englishname: 'name',
  coursename: 'name',
  namethai: 'nameThai',
  thainame: 'nameThai',
  coursenamethai: 'nameThai',
  credits: 'credits',
  credit: 'credits',
  semester: 'semester',
  academicyear: 'academicYear',
  year: 'year',
  yearlevel: 'year',
  lecturerid: 'lecturerId',
  instructorid: 'lecturerId',
  maxstudents: 'maxStudents',
  capacity: 'maxStudents',
  minstudents: 'minStudents',
  description: 'description',
  syllabus: 'syllabus',
};

export const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');

export const csvEscape = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

/** what the downloaded template puts in the instructor column; a row that still has it names no instructor */
const LECTURER_PLACEHOLDER = 'paste-lecturer-id-here';

export const normalizeImportCourse = (
  row: Record<string, unknown>,
  fallbackLecturerId: string,
): ImportCoursePayload => {
  const normalized: Partial<Record<keyof ImportCourseInput, string>> = {};
  Object.entries(row).forEach(([header, value]) => {
    const field = headerAliases[normalizeHeader(header)];
    if (field) normalized[field] = String(value ?? '').trim();
  });

  return {
    code: normalized.code || '',
    name: normalized.name || '',
    nameThai: normalized.nameThai || normalized.name || '',
    credits: asNumber(normalized.credits, 3),
    semester: asNumber(normalized.semester, 1),
    academicYear: normalized.academicYear || String(new Date().getFullYear() + 543),
    year: asNumber(normalized.year, 1),
    lecturerId: (normalized.lecturerId === LECTURER_PLACEHOLDER ? '' : normalized.lecturerId) || fallbackLecturerId,
    sections: [
      {
        number: '01',
        maxStudents: asNumber(normalized.maxStudents, 60),
        minStudents: asNumber(normalized.minStudents, 0),
        schedule: [],
      },
    ],
    description: normalized.description || '',
    syllabus: normalized.syllabus || '',
  };
};

export const parseCourseImportFile = async (file: File) => {
  return readTabularFile(file);
};

export const downloadImportTemplate = (defaultLecturerId?: string) => {
  const headers = [
    'code',
    'name',
    'nameThai',
    'credits',
    'semester',
    'academicYear',
    'year',
    'lecturerId',
    'maxStudents',
    'minStudents',
    'description',
    'syllabus',
  ];
  const sample = [
    'DII101',
    'Digital Industry Fundamentals',
    'พื้นฐานอุตสาหกรรมดิจิทัล',
    3,
    1,
    new Date().getFullYear() + 543,
    1,
    defaultLecturerId || LECTURER_PLACEHOLDER,
    60,
    1,
    'Introductory course',
    'Course outline',
  ];
  const csv = `${headers.join(',')}\n${sample.map(csvEscape).join(',')}\n`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'course-import-template.csv';
  anchor.click();
  URL.revokeObjectURL(url);
};

type Reason = { th: string; en: string };
export type ImportSkip = { row: number; code: string; reason: Reason };

/**
 * Which rows of an import file become courses. Duplicates are a code in the same term (a code opens
 * again every term); a row without an instructor is skipped unless one was chosen, never handed to
 * whoever is first in the lecturer list. `row` is the spreadsheet row (header = 1).
 */
export const planCourseImport = (
  payloads: ImportCoursePayload[],
  existing: Array<{ code: string; semester: number; academicYear: string }>,
) => {
  const key = (c: { code: string; semester: number; academicYear: string }) => `${c.code.trim().toLowerCase()}|${c.semester}|${c.academicYear}`;
  const seen = new Set(existing.map(key));
  const toCreate: ImportCoursePayload[] = [];
  const skipped: ImportSkip[] = [];
  payloads.forEach((course, index) => {
    const row = index + 2;
    const skip = (th: string, en: string) => skipped.push({ row, code: course.code, reason: { th, en } });
    if (!course.code || !course.name || !course.nameThai) return skip('ไม่มีรหัสวิชาหรือชื่อวิชา', 'missing course code or name');
    if (!course.lecturerId) return skip('ไม่ระบุผู้สอน และไม่ได้เลือกผู้สอนเริ่มต้น', 'no instructor in the row and no default chosen');
    if (seen.has(key(course))) {
      return skip(`มีรายวิชานี้ในภาคเรียน ${course.semester}/${course.academicYear} แล้ว`, `already exists in ${course.semester}/${course.academicYear}`);
    }
    seen.add(key(course));
    toCreate.push(course);
  });
  return { toCreate, skipped };
};
