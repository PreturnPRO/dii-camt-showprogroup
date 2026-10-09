import { describe, expect, it } from 'vitest';
import { ApiError } from './api';
import { courseSaveMessage } from './course-errors';

describe('courseSaveMessage', () => {
  it('a lecturer clash names the other course, section, day and time in Thai', () => {
    const error = new ApiError(409, 'The lecturer already teaches DII340 section 01 at that time', {
      code: 'LECTURER_CLASH', conflictingCourse: 'DII340', section: '01', day: 'monday', startTime: '09:00', endTime: '12:00',
    });
    expect(courseSaveMessage(error, true)).toBe('ผู้สอนมีคาบ DII340 ตอน 01 วันจันทร์ 09:00-12:00 อยู่แล้ว');
  });
  it('two sections of one course at the same time', () => {
    const error = new ApiError(409, 'x', { code: 'LECTURER_CLASH', day: 'wednesday', startTime: '09:00', endTime: '10:00' });
    expect(courseSaveMessage(error, true)).toBe('ผู้สอนคนเดียวกันมีสองตอนสอนพร้อมกัน วันพุธ 09:00-10:00');
  });
  it('a booked room names the course using it', () => {
    const error = new ApiError(409, 'Facility is already booked during the selected time', {
      conflictingCourse: 'DII420', section: '02', day: 'friday', startTime: '13:00', endTime: '16:00',
    });
    expect(courseSaveMessage(error, true)).toBe('ห้องนี้ถูกใช้โดย DII420 ตอน 02 วันศุกร์ 13:00-16:00 แล้ว');
  });
  it('queue and duplicate conflicts in Thai (review L5)', () => {
    const coded = (code: string) => new ApiError(409, 'english', { success: false, message: 'english', details: { code } });
    expect(courseSaveMessage(coded('USE_REVIEW'), true)).toBe('วิชาในคิวอนุมัติ ต้องใช้ปุ่มอนุมัติ / ตีกลับ หรือให้ผู้สอนส่งใหม่');
    expect(courseSaveMessage(coded('NOT_WAITING'), true)).toBe('วิชานี้ไม่ได้รออนุมัติแล้ว (อาจมีคนดำเนินการไปก่อน)');
    expect(courseSaveMessage(coded('NOT_RETURNED'), true)).toBe('ส่งใหม่ได้เฉพาะวิชาที่ถูกตีกลับหรือฉบับร่าง');
    expect(courseSaveMessage(coded('CHANGED'), true)).toBe('รายวิชาถูกแก้ไขระหว่างนี้ กรุณาโหลดใหม่แล้วลองอีกครั้ง');
    expect(courseSaveMessage(new ApiError(409, 'Course DII340 already exists for 1/2569'), true)).toBe('มีรหัสวิชา DII340 ในภาคเรียน 1/2569 แล้ว');
  });
  it('anything else keeps the old wording', () => {
    expect(courseSaveMessage(new ApiError(403, 'no'), true)).toBe('ไม่มีสิทธิ์แก้ส่วนนี้ของรายวิชา');
    expect(courseSaveMessage(new ApiError(409, 'something new'), true)).toBe('บันทึกไม่ได้: something new');
    expect(courseSaveMessage(new Error('boom'), false)).toBe('Unable to save course');
  });
});
