import { describe, expect, it } from 'vitest';
import { enrolledSectionInfo } from './enrolled-section';

const enrollment = (section: unknown, sections: unknown[] = []) => ({ sectionId: 's1', section, course: { sections } });

describe('enrolledSectionInfo', () => {
  it("shows the student's own section times, in Thai", () => {
    const info = enrolledSectionInfo(enrollment({ id: 's1', number: '02', schedule: [{ day: 'tuesday', startTime: '13:00', endTime: '16:00' }, { day: 'friday', startTime: '09:00', endTime: '10:30' }] }), 'th');
    expect(info.schedule).toBe('อังคาร 13:00–16:00, ศุกร์ 09:00–10:30');
    expect(info.section).toBe('02');
  });
  it('says there is no timetable instead of inventing Monday 09:00', () => {
    expect(enrolledSectionInfo(enrollment({ id: 's1', number: '01', schedule: [] }), 'th').schedule).toBe('ยังไม่มีตารางเวลา');
  });
  it('takes the room from the facility of the section, then the room text, else says it is not set (never "ห้อง 301")', () => {
    expect(enrolledSectionInfo(enrollment({ id: 's1', schedule: [] }, [{ id: 's1', facility: { code: 'FAC-DII-401', name: 'Room 401', building: 'DII' } }]), 'th').room).toBe('Room 401 (DII)');
    expect(enrolledSectionInfo(enrollment({ id: 's1', schedule: [], room: 'CAMT 201' }), 'th').room).toBe('CAMT 201');
    expect(enrolledSectionInfo(enrollment({ id: 's1', schedule: [] }), 'th').room).toBe('ยังไม่ระบุห้อง');
  });
  it('an enrollment without a section is said so', () => {
    expect(enrolledSectionInfo({ sectionId: null, section: null, course: { sections: [] } }, 'en')).toEqual({ section: null, schedule: 'No timetable yet', room: 'Room not set' });
  });
});
