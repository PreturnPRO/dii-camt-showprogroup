import { describe, expect, it } from 'vitest';
import { sectionsFromCourse, sectionsPayload, sectionsProblem, emptySection } from './course-form';

const course = {
  sections: [
    { id: 's1', sectionNumber: '01', room: 'A', facilityId: 'f1', maxStudents: 30, minStudents: 5, enrolledStudents: [], schedule: [
      { id: 'x', day: 'monday', dayThai: '', startTime: '09:00', endTime: '12:00', type: 'lecture' },
      { id: 'y', day: 'wednesday', dayThai: '', startTime: '13:00', endTime: '15:00', type: 'lab' },
    ] },
    { id: 's2', sectionNumber: '02', maxStudents: 20, enrolledStudents: [], schedule: [] },
  ],
} as never;

describe('course form sections', () => {
  it('keeps every section, each slot with its own times, and the booked room', () => {
    const form = sectionsFromCourse(course);
    expect(form).toHaveLength(2);
    expect(form[0].slots).toEqual([
      { day: 'monday', startTime: '09:00', endTime: '12:00' },
      { day: 'wednesday', startTime: '13:00', endTime: '15:00' },
    ]);
    const payload = sectionsPayload(form);
    expect(payload[0]).toMatchObject({ number: '01', facilityId: 'f1', maxStudents: 30, minStudents: 5 });
    expect(payload[0].schedule).toHaveLength(2);
    expect(payload[1]).toMatchObject({ number: '02', maxStudents: 20 });
  });
  it("keeps a class's own room through a save", () => {
    const withRoom = { sections: [{ id: 's', sectionNumber: '01', maxStudents: 5, enrolledStudents: [], schedule: [{ id: 'a', day: 'monday', dayThai: '', startTime: '09:00', endTime: '10:00', room: 'LAB 2', type: 'lab' }] }] } as never;
    expect(sectionsPayload(sectionsFromCourse(withRoom))[0].schedule[0]).toMatchObject({ room: 'LAB 2' });
  });
  it('a section with no seats cannot be saved', () => {
    expect(sectionsProblem([{ ...emptySection([]), maxStudents: 0 }])?.th).toContain('ที่นั่ง');
  });
  it('a new course starts with one empty section 01', () => {
    expect(emptySection(['01']).number).toBe('02');
    expect(emptySection([]).number).toBe('01');
  });
  it('refuses two sections with the same number and a slot that ends before it starts', () => {
    expect(sectionsProblem([{ ...emptySection([]), number: '01' }, { ...emptySection([]), number: '01' }])?.th).toContain('ซ้ำ');
    expect(sectionsProblem([{ ...emptySection([]), slots: [{ day: 'monday', startTime: '12:00', endTime: '09:00' }] }])?.th).toContain('เวลาเลิก');
    expect(sectionsProblem([])?.th).toContain('อย่างน้อย 1 ตอน');
    expect(sectionsProblem(sectionsFromCourse(course))).toBeNull();
  });
  it('a section whose booked room was let go sends facilityId null, so the booking is cleared', () => {
    const form = sectionsFromCourse(course);
    const payload = sectionsPayload([{ ...form[0], facilityId: undefined }, form[1]]);
    expect(payload[0]).toHaveProperty('facilityId', null);
    expect(payload[1]).toHaveProperty('facilityId', null);
  });
});
