import { describe, expect, it } from 'vitest';
import { lecturerDirectory } from './lecturer-directory';

const lecturers = [
  { id: 'l1', name: 'Mali Ux', nameThai: 'มะลิ ยูเอ็กซ์', department: 'Design' },
  { id: 'l2', name: 'Narin Techakul', nameThai: 'นรินทร์ เทคากุล', department: 'Software' },
  { id: 'l3', name: 'Somchai Data', nameThai: 'สมชาย ดาต้า', department: 'Data' },
];

describe('lecturerDirectory', () => {
  it("puts the student's advisor first and keeps the rest in order", () => {
    expect(lecturerDirectory(lecturers, '', 'l2').map((l) => l.id)).toEqual(['l2', 'l1', 'l3']);
  });
  it('finds a lecturer by Thai or English name or department, ignoring case', () => {
    expect(lecturerDirectory(lecturers, 'นรินทร์', null).map((l) => l.id)).toEqual(['l2']);
    expect(lecturerDirectory(lecturers, 'somchai', null).map((l) => l.id)).toEqual(['l3']);
    expect(lecturerDirectory(lecturers, 'DESIGN', null).map((l) => l.id)).toEqual(['l1']);
  });
  it('a search that matches nobody is empty, and no advisor means the list as given', () => {
    expect(lecturerDirectory(lecturers, 'zzz', 'l2')).toEqual([]);
    expect(lecturerDirectory(lecturers, '  ', null).map((l) => l.id)).toEqual(['l1', 'l2', 'l3']);
  });
});
