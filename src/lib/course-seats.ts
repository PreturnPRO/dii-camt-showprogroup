import type { Course, Section } from '@/types';

/** seats are counted by the server (dropped excluded); rows are only a fallback for old responses */
export const seatsLeft = (section: Section) =>
  Math.max(section.maxStudents - (section.enrolledCount ?? section.enrolledStudents.length), 0);

export const openSections = (course: Course) => course.sections.filter((s) => seatsLeft(s) > 0);

/** a course without sections has no seat limit */
export const isCourseFull = (course: Course) => course.sections.length > 0 && openSections(course).length === 0;
