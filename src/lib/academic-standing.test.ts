import { describe, expect, it } from 'vitest';
import { academicStanding, gpaxNote, gradeFootnote } from './academic-standing';

describe('academicStanding', () => {
  it('shows the status the faculty recorded, not a fixed "normal"', () => {
    expect(academicStanding('risk').th).toBe('เสี่ยง');
    expect(academicStanding('risk').tone).toBe('bad');
    expect(academicStanding('probation').tone).toBe('warn');
    expect(academicStanding('normal').tone).toBe('ok');
  });
  it('only claims "no risk" for a normal standing', () => {
    expect(academicStanding('normal').detailTh).toBe('ไม่มีความเสี่ยง');
    expect(academicStanding('risk').detailTh).not.toContain('ไม่มีความเสี่ยง');
    expect(academicStanding('probation').detailTh).not.toContain('ไม่มีความเสี่ยง');
  });
});

describe('gpaxNote', () => {
  it('a student with no published grade is not "within normal range"', () => {
    expect(gpaxNote(0, false).th).toBe('ยังไม่มีเกรดที่ประกาศแล้ว');
  });
  it('below 2.00 is called out', () => {
    expect(gpaxNote(1.75, true).th).toBe('ต่ำกว่า 2.00');
    expect(gpaxNote(1.75, true).tone).toBe('bad');
  });
  it('2.00 up to 3.49 is the normal range, 3.50 and up is excellent', () => {
    expect(gpaxNote(2, true).tone).toBe('ok');
    expect(gpaxNote(3.5, true).tone).toBe('excellent');
  });
});

describe('gradeFootnote', () => {
  it('an F is "not passed", never "passed the standard"', () => {
    expect(gradeFootnote('F').th).toBe('ไม่ผ่าน');
  });
  it('a missing grade is "not published yet"', () => {
    expect(gradeFootnote(undefined).th).toBe('ยังไม่ประกาศเกรด');
    expect(gradeFootnote('-').th).toBe('ยังไม่ประกาศเกรด');
  });
  it('W and I say what they are', () => {
    expect(gradeFootnote('W').th).toBe('ถอนรายวิชา');
    expect(gradeFootnote('I').th).toBe('ยังไม่สมบูรณ์ (I)');
  });
  it('a passing grade says passed', () => {
    expect(gradeFootnote('C+').th).toBe('ผ่าน');
  });
});
