import { asArray, asRecord, asString } from '@/lib/live-data';
import { DAY_KEYS, DAY_LABELS, type DayKey } from '@/lib/timetable';

/**
 * The section a student is enrolled in, as text for a course card: its own times and room, from the
 * enrollment row (GET /enrollments), never a fixed "Monday 09:00" or "Room 301".
 */
export const enrolledSectionInfo = (enrollmentRaw: unknown, language: 'th' | 'en') => {
  const enrollment = asRecord(enrollmentRaw);
  const section = enrollment.section ? asRecord(enrollment.section) : null;
  const th = language === 'th';
  const slots = asArray(section?.schedule).map((item) => asRecord(item));
  const schedule = slots.length
    ? slots
        .map((slot) => {
          const day = asString(slot.day) as DayKey;
          const label = DAY_KEYS.includes(day) ? DAY_LABELS[day][th ? 'th' : 'en'] : asString(slot.day, '-');
          return `${label} ${asString(slot.startTime, '?')}–${asString(slot.endTime, '?')}`;
        })
        .join(', ')
    : (th ? 'ยังไม่มีตารางเวลา' : 'No timetable yet');
  // the facility comes with the course's sections; the enrollment's own section has only its id
  const withFacility = asArray(asRecord(enrollment.course).sections).map((s) => asRecord(s)).find((s) => s.id && s.id === section?.id);
  const facility = withFacility?.facility ? asRecord(withFacility.facility) : null;
  const room = facility
    ? `${asString(facility.name, asString(facility.code))}${asString(facility.building) ? ` (${asString(facility.building)})` : ''}`
    : asString(section?.room) || (th ? 'ยังไม่ระบุห้อง' : 'Room not set');
  return { section: section ? asString(section.number) || null : null, schedule, room };
};
