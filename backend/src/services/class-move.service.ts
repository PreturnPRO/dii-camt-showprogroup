import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { thaiDay } from "./attendance";
import { parseSlots } from "./enrollment-rules";
import { busyOn, clashesWith, editable, formatDay, fromMinutes, parseDay, toMinutes, weekdayOf, type MoveLike, type RegularSlots } from "./class-move-rules";
import { createNotification, createNotificationsForRole } from "./notification.service";
import { getLecturerProfileByUserId, getStudentProfileByUserId } from "./profile.service";

type Db = Prisma.TransactionClient | typeof prisma;
export type MoveInput = { sectionId: string; originalDate: string; originalStart: string; newDate: string; newStart: string; facilityId?: string; reason?: string };

const moveInclude = {
  section: { include: { course: { include: { lecturer: { include: { user: true } } } } } },
  facility: true,
} satisfies Prisma.ClassMoveInclude;
type MoveRow = Prisma.ClassMoveGetPayload<{ include: typeof moveInclude }>;

export const serializeMove = (m: MoveRow) => ({
  id: m.id,
  sectionId: m.sectionId,
  sectionNumber: m.section.number,
  courseId: m.section.courseId,
  courseCode: m.section.course.code,
  courseName: m.section.course.nameThai || m.section.course.name,
  originalDate: formatDay(m.originalDate),
  originalStart: m.originalStart,
  originalEnd: m.originalEnd,
  newDate: formatDay(m.newDate),
  newStart: m.newStart,
  newEnd: m.newEnd,
  facilityId: m.facilityId,
  room: m.room,
  status: m.status,
  reason: m.reason,
  requestedById: m.requestedById,
  decisionNote: m.decisionNote,
});

const toMoveLike = (m: MoveRow | (Prisma.ClassMoveGetPayload<{ include: { section: { include: { course: true } } } }>)): MoveLike => ({
  id: m.id, sectionId: m.sectionId, label: m.section.course.code,
  originalDate: m.originalDate, originalStart: m.originalStart, originalEnd: m.originalEnd,
  newDate: m.newDate, newStart: m.newStart, newEnd: m.newEnd, facilityId: m.facilityId,
});

const regularOf = (sections: Array<{ id: string; schedule: unknown; course: { code: string } }>): RegularSlots[] =>
  sections.map((s) => ({ sectionId: s.id, label: s.course.code, slots: parseSlots(s.schedule) }));

/** validates the request and finds clashes; throws 400 for anything malformed */
export const checkMove = async (db: Db, input: MoveInput, ignoreMoveId?: string) => {
  const section = await db.section.findUnique({ where: { id: input.sectionId }, include: { course: true, facility: true } });
  if (!section) throw new AppError(404, "Section not found");
  const originalDate = parseDay(input.originalDate);
  const newDate = parseDay(input.newDate);
  if (!originalDate || !newDate) throw new AppError(400, "Dates must be real days (YYYY-MM-DD)");
  const today = thaiDay(new Date());
  if (!editable({ originalDate, newDate }, today)) throw new AppError(400, "Both the original and the new day must be after today");

  const slot = parseSlots(section.schedule).find((s) => s.day === weekdayOf(originalDate) && s.startTime === input.originalStart);
  if (!slot) throw new AppError(400, `${section.course.code} has no class on ${input.originalDate} at ${input.originalStart}`);
  const length = (toMinutes(slot.endTime) ?? 0) - (toMinutes(slot.startTime) ?? 0);
  const newStart = toMinutes(input.newStart);
  if (newStart === null || newStart + length > 24 * 60) throw new AppError(400, "The moved class must start and end on the same day");
  const newEnd = fromMinutes(newStart + length);

  const facilityId = input.facilityId ?? section.facilityId;
  if (!facilityId) throw new AppError(400, "Choose a room for the moved class");
  const facility = await db.facility.findFirst({ where: { id: facilityId, isActive: true } });
  if (!facility) throw new AppError(400, "That room does not exist or is closed");

  const term = { semester: section.course.semester, academicYear: section.course.academicYear };
  const approvedOn = async (where: Prisma.SectionWhereInput) =>
    (await db.classMove.findMany({
      where: { status: "approved", section: where, OR: [{ originalDate: newDate }, { newDate }] },
      include: { section: { include: { course: true } } },
    })).map(toMoveLike);

  // the class itself, when it moves within its own day, does not clash with its own usual slot
  const notItself = (b: { sectionId: string; start: number }) =>
    !(b.sectionId === section.id && formatDay(newDate) === input.originalDate && b.start === toMinutes(slot.startTime));

  // room: weekly classes in this room (same term), minus those moved away, plus classes moved into this room
  const roomSections = await db.section.findMany({ where: { facilityId, course: term }, include: { course: true } });
  const roomMoves = await db.classMove.findMany({
    where: { status: "approved", OR: [{ section: { facilityId }, originalDate: newDate }, { facilityId, newDate }] },
    include: { section: { include: { course: true } } },
  });
  const roomBusy = busyOn(newDate, regularOf(roomSections), roomMoves.map(toMoveLike), ignoreMoveId, facilityId);
  const roomClashes = clashesWith(roomBusy, newStart, newStart + length).filter(notItself);

  // lecturer: every class of the same lecturer in the same term
  const lecturerSections = await db.section.findMany({ where: { course: { ...term, lecturerId: section.course.lecturerId } }, include: { course: true } });
  const lecturerBusy = busyOn(newDate, regularOf(lecturerSections), await approvedOn({ course: { lecturerId: section.course.lecturerId } }), ignoreMoveId);
  const lecturerClashes = clashesWith(lecturerBusy, newStart, newStart + length).filter(notItself);

  // students of this section, against their other sections in the same term: warning only
  const enrolled = await db.enrollment.findMany({ where: { sectionId: section.id, status: { not: "dropped" } }, select: { studentId: true } });
  const studentIds = enrolled.map((e) => e.studentId);
  const others = studentIds.length
    ? await db.enrollment.findMany({
        where: { studentId: { in: studentIds }, status: { not: "dropped" }, sectionId: { not: null }, NOT: { sectionId: section.id }, course: term },
        include: { section: { include: { course: true } } },
      })
    : [];
  const counts = new Map<string, number>();
  for (const e of others) {
    if (!e.section) continue;
    const busy = busyOn(newDate, regularOf([e.section]), await approvedOn({ id: e.section.id }), ignoreMoveId);
    if (clashesWith(busy, newStart, newStart + length).length) counts.set(e.section.course.code, (counts.get(e.section.course.code) ?? 0) + 1);
  }
  const studentClashes = Array.from(counts, ([courseCode, count]) => ({ courseCode, count }));

  return {
    roomClashes, lecturerClashes, studentClashes,
    resolved: { section, originalDate, newDate, originalEnd: slot.endTime, newEnd, facilityId, room: facility.room ? `${facility.building}-${facility.room}` : facility.code },
  };
};

const lockSection = (tx: Prisma.TransactionClient, sectionId: string) =>
  tx.$queryRaw`SELECT id FROM "Section" WHERE id = ${sectionId} FOR UPDATE`;

/** moves of different sections into one room, or for one lecturer, on one day take turns, so the clash check
 *  and the write cannot interleave; taken after the section lock, room before lecturer, by every writer */
const lockDestination = async (tx: Prisma.TransactionClient, facilityId: string | null, lecturerId: string, day: string) => {
  if (facilityId) await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`room:${facilityId}:${day}`}))) AS l`;
  await tx.$queryRaw`SELECT 1 FROM (SELECT pg_advisory_xact_lock(hashtext(${`lecturer:${lecturerId}:${day}`}))) AS l`;
};

const assertOwnCourse = async (currentUser: any, lecturerId: string) => {
  if (currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN) return;
  if (currentUser.role !== Role.LECTURER) throw new AppError(403, "Only staff and the course lecturer can move classes");
  const lecturer = await getLecturerProfileByUserId(currentUser.id);
  if (lecturer.id !== lecturerId) throw new AppError(403, "Lecturers can only move their own classes");
};

const blockIfClash = (check: Awaited<ReturnType<typeof checkMove>>) => {
  if (check.roomClashes.length || check.lecturerClashes.length) {
    throw new AppError(409, "The room or the lecturer is busy at the new time", { roomClashes: check.roomClashes, lecturerClashes: check.lecturerClashes });
  }
};

const dayLabel = (d: Date) => d.toLocaleDateString("th-TH", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" });

/** tells the section's students and the lecturer; a failed notification never undoes the move */
export const notifyMoved = async (m: MoveRow, kind: "moved" | "cancelled") => {
  try {
    const students = await prisma.enrollment.findMany({ where: { sectionId: m.sectionId, status: { not: "dropped" } }, select: { student: { select: { userId: true } } } });
    const code = m.section.course.code;
    const what = kind === "moved"
      ? { message: `${code} on ${formatDay(m.originalDate)} ${m.originalStart} moves to ${formatDay(m.newDate)} ${m.newStart}-${m.newEnd} (${m.room ?? "-"})`,
          messageThai: `${code} คาบ ${dayLabel(m.originalDate)} ${m.originalStart} ย้ายไป ${dayLabel(m.newDate)} ${m.newStart}–${m.newEnd} ห้อง ${m.room ?? "-"}` }
      : { message: `The move of ${code} on ${formatDay(m.originalDate)} ${m.originalStart} was cancelled; the class is back at its usual time`,
          messageThai: `ยกเลิกการย้ายคาบ ${code} วันที่ ${dayLabel(m.originalDate)} ${m.originalStart} แล้ว กลับไปเรียนเวลาเดิม` };
    for (const userId of [...students.map((s) => s.student.userId), m.section.course.lecturer.userId]) {
      await createNotification({
        userId, type: "class_move", priority: "high",
        title: kind === "moved" ? `Class moved: ${code}` : `Class move cancelled: ${code}`,
        titleThai: kind === "moved" ? `ย้ายคาบ ${code}` : `ยกเลิกการย้ายคาบ ${code}`,
        ...what,
        actionUrl: `/schedule?week=${formatDay(m.originalDate)}`,
      });
    }
  } catch (err) {
    console.error(`class move ${m.id}: notification failed`, err);
  }
};

export const createMove = async (currentUser: any, input: MoveInput) => {
  const section = await prisma.section.findUnique({ where: { id: input.sectionId }, include: { course: true } });
  if (!section) throw new AppError(404, "Section not found");
  await assertOwnCourse(currentUser, section.course.lecturerId);
  const isStaff = currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN;

  const { created, check, replaced } = await prisma.$transaction(async (tx) => {
    await lockSection(tx, section.id);
    await lockDestination(tx, input.facilityId ?? section.facilityId, section.course.lecturerId, input.newDate);
    const check = await checkMove(tx, input);
    const active = await tx.classMove.findFirst({
      where: { sectionId: section.id, originalDate: check.resolved.originalDate, originalStart: input.originalStart, status: { in: ["pending", "approved"] } },
    });
    if (active && (active.status === "pending" || !isStaff)) {
      throw new AppError(409, active.status === "pending" ? "A request for this class is waiting for a decision" : "This class is already moved; ask staff to change it", { moveId: active.id });
    }
    const replaced = active ? await tx.classMove.update({ where: { id: active.id }, data: { status: "cancelled", decidedById: currentUser.id, decidedAt: new Date() } }) : null;
    const recheck = replaced ? await checkMove(tx, input, replaced.id) : check;
    blockIfClash(recheck);
    const created = await tx.classMove.create({
      data: {
        sectionId: section.id, originalDate: recheck.resolved.originalDate, originalStart: input.originalStart, originalEnd: recheck.resolved.originalEnd,
        newDate: recheck.resolved.newDate, newStart: input.newStart, newEnd: recheck.resolved.newEnd,
        facilityId: recheck.resolved.facilityId, room: recheck.resolved.room,
        status: isStaff ? "approved" : "pending", reason: input.reason ?? "", requestedById: currentUser.id,
        ...(isStaff ? { decidedById: currentUser.id, decidedAt: new Date() } : {}),
      },
      include: moveInclude,
    });
    return { created, check: recheck, replaced };
  });

  if (isStaff) {
    await notifyMoved(created, "moved");
  } else {
    try {
      await createNotificationsForRole(Role.STAFF, {
        type: "class_move_request", title: `Class move request: ${created.section.course.code}`, titleThai: `คำขอย้ายคาบ ${created.section.course.code}`,
        message: `${created.section.course.code} ${created.originalStart} on ${formatDay(created.originalDate)} → ${formatDay(created.newDate)} ${created.newStart}`,
        messageThai: `${created.section.course.code} คาบ ${dayLabel(created.originalDate)} ${created.originalStart} ขอย้ายไป ${dayLabel(created.newDate)} ${created.newStart}`,
        actionUrl: "/schedule-management",
      });
    } catch (err) {
      console.error(`class move ${created.id}: notification failed`, err);
    }
  }
  void replaced;
  return { move: serializeMove(created), studentClashes: check.studentClashes };
};

export const listMoves = async (currentUser: any, from: string, to: string) => {
  const start = parseDay(from);
  const end = parseDay(to);
  if (!start || !end) throw new AppError(400, "Dates must be real days (YYYY-MM-DD)");
  const inRange = { OR: [{ originalDate: { gte: start, lte: end } }, { newDate: { gte: start, lte: end } }] };
  let scope: Prisma.ClassMoveWhereInput;
  if (currentUser.role === Role.STUDENT) {
    const student = await getStudentProfileByUserId(currentUser.id);
    scope = { status: "approved", section: { enrollments: { some: { studentId: student.id, status: { not: "dropped" } } } } };
  } else if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    scope = { section: { course: { lecturerId: lecturer.id } } };
  } else if (currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN) {
    scope = {};
  } else {
    throw new AppError(403, "Class moves are not available for your account");
  }
  const rows = await prisma.classMove.findMany({ where: { AND: [inRange, scope] }, include: moveInclude, orderBy: [{ originalDate: "asc" }, { originalStart: "asc" }] });
  return rows.map(serializeMove);
};

export const checkMoveFor = async (currentUser: any, input: MoveInput) => {
  const section = await prisma.section.findUnique({ where: { id: input.sectionId }, include: { course: true } });
  if (!section) throw new AppError(404, "Section not found");
  await assertOwnCourse(currentUser, section.course.lecturerId);
  const { roomClashes, lecturerClashes, studentClashes, resolved } = await checkMove(prisma, input);
  return { roomClashes, lecturerClashes, studentClashes, newEnd: resolved.newEnd, room: resolved.room };
};

const findMove = async (db: Db, id: string) => {
  const m = await db.classMove.findUnique({ where: { id }, include: moveInclude });
  if (!m) throw new AppError(404, "Class move not found");
  return m;
};

const notifyDecision = async (m: MoveRow, approved: boolean) => {
  try {
    await createNotification({
      userId: m.requestedById, type: "class_move_decision", priority: "high",
      title: `${approved ? "Approved" : "Rejected"}: ${m.section.course.code} move`,
      titleThai: `${approved ? "อนุมัติ" : "ไม่อนุมัติ"}คำขอย้ายคาบ ${m.section.course.code}`,
      message: `${m.section.course.code} ${formatDay(m.originalDate)} ${m.originalStart} → ${formatDay(m.newDate)} ${m.newStart}${m.decisionNote ? ` · ${m.decisionNote}` : ""}`,
      messageThai: `${m.section.course.code} คาบ ${dayLabel(m.originalDate)} ${m.originalStart} → ${dayLabel(m.newDate)} ${m.newStart}${m.decisionNote ? ` · ${m.decisionNote}` : ""}`,
      actionUrl: `/schedule?week=${formatDay(m.originalDate)}`,
    });
  } catch (err) {
    console.error(`class move ${m.id}: notification failed`, err);
  }
};

export const listPending = async () =>
  (await prisma.classMove.findMany({ where: { status: "pending" }, include: moveInclude, orderBy: { createdAt: "asc" } })).map(serializeMove);

export const approveMove = async (currentUser: any, id: string) => {
  const { updated, check } = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    const fresh = await findMove(tx, id);
    if (fresh.status !== "pending") throw new AppError(409, "Only waiting requests can be approved");
    await lockDestination(tx, fresh.facilityId, fresh.section.course.lecturerId, formatDay(fresh.newDate));
    const check = await checkMove(tx, {
      sectionId: fresh.sectionId, originalDate: formatDay(fresh.originalDate), originalStart: fresh.originalStart,
      newDate: formatDay(fresh.newDate), newStart: fresh.newStart, facilityId: fresh.facilityId ?? undefined,
    }, fresh.id);
    blockIfClash(check);
    const updated = await tx.classMove.update({
      where: { id }, data: { status: "approved", decidedById: currentUser.id, decidedAt: new Date() }, include: moveInclude,
    });
    return { updated, check };
  });
  await notifyMoved(updated, "moved");
  await notifyDecision(updated, true);
  return { move: serializeMove(updated), studentClashes: check.studentClashes };
};

export const rejectMove = async (currentUser: any, id: string, note: string) => {
  const updated = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    if ((await findMove(tx, id)).status !== "pending") throw new AppError(409, "Only waiting requests can be rejected");
    return tx.classMove.update({ where: { id }, data: { status: "rejected", decidedById: currentUser.id, decidedAt: new Date(), decisionNote: note }, include: moveInclude });
  });
  await notifyDecision(updated, false);
  return { move: serializeMove(updated) };
};

export const withdrawMove = async (currentUser: any, id: string) => {
  const updated = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    const fresh = await findMove(tx, id);
    if (fresh.requestedById !== currentUser.id) throw new AppError(403, "Only the person who asked can withdraw a request");
    if (fresh.status !== "pending") throw new AppError(409, "Only waiting requests can be withdrawn");
    return tx.classMove.update({ where: { id }, data: { status: "withdrawn" }, include: moveInclude });
  });
  return { move: serializeMove(updated) };
};

export const cancelMove = async (currentUser: any, id: string) => {
  const updated = await prisma.$transaction(async (tx) => {
    const m = await findMove(tx, id);
    await lockSection(tx, m.sectionId);
    const fresh = await findMove(tx, id);
    if (fresh.status !== "approved") throw new AppError(409, "Only moves in effect can be cancelled");
    if (!editable(fresh, thaiDay(new Date()))) throw new AppError(409, "This move's day has already come");
    return tx.classMove.update({ where: { id }, data: { status: "cancelled", decidedById: currentUser.id, decidedAt: new Date() }, include: moveInclude });
  });
  await notifyMoved(updated, "cancelled");
  return { move: serializeMove(updated) };
};
