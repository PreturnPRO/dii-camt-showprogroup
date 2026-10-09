import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { hasOverlap, normalizeSchedule } from "./facility.service";
import { createNotification, createNotificationsForRole } from "./notification.service";
import { getLecturerProfileByUserId } from "./profile.service";

/** the statuses that hold a lecturer's time: open courses and those waiting for staff */
export const HOLDS_TIME = ["active", "pending"];

type Db = Prisma.TransactionClient | typeof prisma;
type ClashInput = {
  courseId?: string;
  lecturerId: string;
  semester: number;
  academicYear: string;
  sections: Array<{ number: string; schedule: unknown }>;
};

/** one lecturer, one term at a time: concurrent saves for them wait here until the first commits */
export const lockLecturerTerm = (tx: Prisma.TransactionClient, lecturerId: string, semester: number, academicYear: string) =>
  tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`lecturer:${lecturerId}:${semester}/${academicYear}`}))) AS l`;

const DAY_TH: Record<string, string> = {
  monday: "จันทร์", tuesday: "อังคาร", wednesday: "พุธ", thursday: "พฤหัสบดี", friday: "ศุกร์", saturday: "เสาร์", sunday: "อาทิตย์",
};

/**
 * owner decision 9/10/69 (G4 รอง b): a lecturer may not teach two classes at once in one term — across
 * their active and waiting courses, and between sections of the same course. 409 names the clash.
 */
export const assertLecturerFree = async (db: Db, input: ClashInput) => {
  const own = input.sections.map((s) => ({ number: s.number, slots: normalizeSchedule(s.schedule) }));

  for (let i = 0; i < own.length; i += 1) {
    for (let j = i + 1; j < own.length; j += 1) {
      const slot = own[i].slots.find((a) => own[j].slots.some((b) => hasOverlap(a, b)));
      if (slot) {
        throw new AppError(409, `The lecturer would teach sections ${own[i].number} and ${own[j].number} at the same time (${DAY_TH[slot.day] ?? slot.day} ${slot.startTime}-${slot.endTime})`, {
          code: "LECTURER_CLASH", day: slot.day, startTime: slot.startTime, endTime: slot.endTime,
        });
      }
    }
  }

  const others = await db.section.findMany({
    where: {
      course: {
        lecturerId: input.lecturerId,
        semester: input.semester,
        academicYear: input.academicYear,
        status: { in: HOLDS_TIME },
        ...(input.courseId ? { id: { not: input.courseId } } : {}),
      },
    },
    include: { course: { select: { code: true } } },
  });

  for (const mine of own) {
    for (const other of others) {
      const otherSlots = normalizeSchedule(other.schedule);
      const slot = mine.slots.find((a) => otherSlots.some((b) => hasOverlap(a, b)));
      if (slot) {
        throw new AppError(409, `The lecturer already teaches ${other.course.code} section ${other.number} at that time (${DAY_TH[slot.day] ?? slot.day} ${slot.startTime}-${slot.endTime})`, {
          code: "LECTURER_CLASH", conflictingCourse: other.course.code, section: other.number, day: slot.day, startTime: slot.startTime, endTime: slot.endTime,
        });
      }
    }
  }
};

/** a failed notification never undoes or fails a review that already committed (review L1) */
const quietly = async (send: () => Promise<unknown>) => {
  try {
    await send();
  } catch (error) {
    console.error("course notification failed", error);
  }
};

/** staff hear about a course waiting for them (created or sent again) */
export const notifyStaffCourseWaiting = (course: { code: string; nameThai: string; name: string }, again = false) =>
  quietly(() => createNotificationsForRole(Role.STAFF, {
    title: again ? "Course sent again for approval" : "Course waiting for approval",
    titleThai: again ? "รายวิชาส่งกลับมาให้อนุมัติอีกครั้ง" : "มีรายวิชารออนุมัติ",
    message: `${course.code} ${course.name} is waiting for approval.`,
    messageThai: `${course.code} ${course.nameThai} รอการอนุมัติ`,
    type: "course",
    priority: "medium",
    actionUrl: "/courses?status=pending",
  }));

/** staff approve a waiting course or send it back with a reason (owner decision 9/10/69, G4 รอง a) */
export const reviewCourse = async (id: string, decision: "approve" | "reject", reason?: string) => {
  const note = reason?.trim();
  if (decision === "reject" && !note) throw new AppError(400, "Say why the course is sent back");

  const course = await prisma.$transaction(async (tx) => {
    const found = await tx.course.findUnique({ where: { id }, select: { lecturerId: true, semester: true, academicYear: true } });
    if (!found) throw new AppError(404, "Course not found");
    if (decision === "approve") await lockLecturerTerm(tx, found.lecturerId, found.semester, found.academicYear);
    // claim it: only a course still waiting moves, so two reviews cannot both act
    const claimed = await tx.course.updateMany({
      where: { id, status: "pending" },
      data: decision === "approve" ? { status: "active", reviewNote: null } : { status: "rejected", reviewNote: note },
    });
    if (claimed.count !== 1) throw new AppError(409, "Only a course waiting for approval can be reviewed", { code: "NOT_WAITING" });
    const updated = await tx.course.findUniqueOrThrow({ where: { id }, include: { sections: true, lecturer: { include: { user: true } } } });
    if (decision === "approve") await assertLecturerFree(tx, { ...updated, courseId: id, sections: updated.sections });
    return updated;
  });

  await quietly(() => createNotification({
    userId: course.lecturer.userId,
    title: decision === "approve" ? "Course approved" : "Course sent back",
    titleThai: decision === "approve" ? "รายวิชาได้รับอนุมัติ" : "รายวิชาถูกตีกลับให้แก้ไข",
    message: decision === "approve" ? `${course.code} ${course.name} is open.` : `${course.code} ${course.name} was sent back: ${note}`,
    messageThai: decision === "approve" ? `${course.code} ${course.nameThai} เปิดสอนแล้ว` : `${course.code} ${course.nameThai} ถูกตีกลับ: ${note}`,
    type: "course",
    priority: decision === "approve" ? "medium" : "high",
    actionUrl: "/courses",
  }));
  return course;
};

/** the lecturer sends a returned (or draft) course to staff again */
export const submitCourse = async (currentUser: { id: string; role: Role }, id: string) => {
  const course = await prisma.$transaction(async (tx) => {
    const first = await tx.course.findUnique({ where: { id }, select: { lecturerId: true, semester: true, academicYear: true } });
    if (!first) throw new AppError(404, "Course not found");
    // lock the course row, then the lecturer's term, and only then read what is checked (review M4)
    await tx.$queryRaw`SELECT 1 FROM "Course" WHERE id = ${id} FOR UPDATE`;
    await lockLecturerTerm(tx, first.lecturerId, first.semester, first.academicYear);
    const found = await tx.course.findUniqueOrThrow({ where: { id }, include: { sections: true } });
    if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      if (found.lecturerId !== lecturer.id) throw new AppError(403, "You can only send your own courses");
    }
    if (!["rejected", "draft"].includes(found.status)) throw new AppError(409, "Only a returned or draft course can be sent for approval", { code: "NOT_RETURNED" });
    if (found.lecturerId !== first.lecturerId || found.semester !== first.semester || found.academicYear !== first.academicYear) {
      throw new AppError(409, "The course changed meanwhile; reload and try again", { code: "CHANGED" });
    }
    await assertLecturerFree(tx, { ...found, courseId: id });
    const claimed = await tx.course.updateMany({ where: { id, status: found.status }, data: { status: "pending", reviewNote: null } });
    if (claimed.count !== 1) throw new AppError(409, "The course changed meanwhile; reload and try again", { code: "CHANGED" });
    return tx.course.findUniqueOrThrow({ where: { id }, include: { sections: true, lecturer: { include: { user: true } } } });
  });
  await notifyStaffCourseWaiting(course, true);
  return course;
};
