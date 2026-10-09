import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

type ScheduleSlot = {
  day: string;
  startTime: string;
  endTime: string;
  room?: string;
};

type SectionInput = {
  id?: string;
  number: string;
  room?: string | null;
  facilityId?: string | null;
  maxStudents: number;
  schedule: unknown;
};

export const normalizeSchedule = (schedule: unknown): ScheduleSlot[] => {
  if (!Array.isArray(schedule)) {
    return [];
  }

  const normalized: ScheduleSlot[] = [];

  for (const item of schedule) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const slot = item as Record<string, unknown>;
    if (
      typeof slot.day !== "string" ||
      typeof slot.startTime !== "string" ||
      typeof slot.endTime !== "string"
    ) {
      continue;
    }

    normalized.push({
      day: slot.day.toLowerCase(),
      startTime: slot.startTime,
      endTime: slot.endTime,
      room: typeof slot.room === "string" ? slot.room : undefined,
    });
  }

  return normalized;
};

const toMinutes = (value: string) => {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
};

export const hasOverlap = (a: ScheduleSlot, b: ScheduleSlot) =>
  a.day === b.day && toMinutes(a.startTime) < toMinutes(b.endTime) && toMinutes(b.startTime) < toMinutes(a.endTime);

const resolveRoomLabel = (facility?: { name: string; room: string | null; building: string }) => {
  if (!facility) {
    return null;
  }

  const roomName = facility.room ?? facility.name;
  return `${facility.building} ${roomName}`.trim();
};

/** `term` limits the room check to that term's courses: a room used last term is free this term */
export const prepareCourseSections = async (
  sections: SectionInput[],
  excludeCourseId?: string,
  term?: { semester: number; academicYear: string },
) => {
  const facilityIds = Array.from(
    new Set(
      sections
        .map((section) => section.facilityId)
        .filter((facilityId): facilityId is string => Boolean(facilityId)),
    ),
  );

  const facilities = facilityIds.length
    ? await prisma.facility.findMany({
        where: {
          id: { in: facilityIds },
          isActive: true,
        },
      })
    : [];

  const facilityMap = new Map(facilities.map((facility) => [facility.id, facility]));

  if (facilityIds.length !== facilities.length) {
    throw new AppError(404, "One or more selected facilities do not exist or are inactive");
  }

  const prepared = sections.map((section) => {
    const facility =
      section.facilityId && facilityMap.has(section.facilityId)
        ? facilityMap.get(section.facilityId)
        : undefined;

    return {
      ...section,
      room: section.room ?? resolveRoomLabel(facility) ?? undefined,
      schedule: normalizeSchedule(section.schedule),
    };
  });

  for (let index = 0; index < prepared.length; index += 1) {
    const current = prepared[index];

    if (current.schedule.length === 0) {
      continue;
    }

    for (let compareIndex = index + 1; compareIndex < prepared.length; compareIndex += 1) {
      const compare = prepared[compareIndex];
      const sameFacility =
        Boolean(current.facilityId) &&
        Boolean(compare.facilityId) &&
        current.facilityId === compare.facilityId;
      const sameRoom =
        !sameFacility &&
        Boolean(current.room) &&
        Boolean(compare.room) &&
        current.room === compare.room;

      if (!sameFacility && !sameRoom) {
        continue;
      }

      const conflict = current.schedule.find((slot) =>
        compare.schedule.some((compareSlot) => hasOverlap(slot, compareSlot)),
      );

      if (conflict) {
        throw new AppError(
          409,
          `Schedule conflict detected between sections ${current.number} and ${compare.number}`,
          {
            day: conflict.day,
            startTime: conflict.startTime,
            endTime: conflict.endTime,
          },
        );
      }
    }

    if (!current.facilityId && !current.room) {
      continue;
    }

    const existingSections = await prisma.section.findMany({
      where: {
        ...(current.facilityId
          ? { facilityId: current.facilityId }
          : current.room
            ? { room: current.room }
            : {}),
        ...(excludeCourseId ? { courseId: { not: excludeCourseId } } : {}),
        // only courses that hold the room in the same term (an archived or returned course frees it)
        ...(term
          ? { course: { semester: Number(term.semester), academicYear: String(term.academicYear), status: { in: ["active", "pending"] } } }
          : {}),
      },
      include: {
        course: true,
        facility: true,
      },
    });

    for (const existing of existingSections) {
      const existingSchedule = normalizeSchedule(existing.schedule);
      const conflict = current.schedule.find((slot) =>
        existingSchedule.some((compareSlot) => hasOverlap(slot, compareSlot)),
      );

      if (!conflict) {
        continue;
      }

      throw new AppError(409, "Facility is already booked during the selected time", {
        facilityId: existing.facilityId,
        room: existing.room,
        conflictingCourse: existing.course.code,
        section: existing.number,
        day: conflict.day,
        startTime: conflict.startTime,
        endTime: conflict.endTime,
      });
    }
  }

  return prepared.map((section) => ({
    ...section,
    schedule: section.schedule,
  }));
};
