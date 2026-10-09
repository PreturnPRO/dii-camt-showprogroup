import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { createNotification } from "./notification.service";
import { computeGpa, type GradedRow } from "./gpa";

type GradeInput = {
  enrollmentId?: string;
  studentId: string;
  courseId: string;

  scores?: { criteriaId: string; score: number }[];
  total?: number;
  letterGrade?: string;
  remarks?: string;
  reason?: string;
};

/** GPAX over every term, GPA over the student's current term; W/I/ungraded/dropped never count (gpa.ts). */
type Db = Prisma.TransactionClient | typeof prisma;

const recalculateAcademicStats = async (studentId: string, db: Db = prisma) => {
  const student = await db.studentProfile.findUniqueOrThrow({
    where: { id: studentId },
    select: { semester: true, academicYear: true },
  });
  const enrollments = await db.enrollment.findMany({
    where: { studentId },
    include: { course: true },
  });
  const rows: GradedRow[] = enrollments.map((item) => ({
    letterGrade: item.letterGrade,
    credits: item.course.credits,
    status: item.status,
    semester: item.course.semester,
    academicYear: item.course.academicYear,
  }));
  const all = computeGpa(rows);
  const term = computeGpa(
    rows.filter((row) => row.semester === student.semester && row.academicYear === student.academicYear),
  );

  await db.studentProfile.update({
    where: { id: studentId },
    data: {
      earnedCredits: all.earnedCredits,
      gpax: all.gpa ?? 0,
      gpa: term.gpa ?? 0,
    },
  });
};

const enrollmentInclude = { course: { include: { gradingCriteria: true, gradeCutoffs: true } } } as const;
/** the grade sheet columns, which the global omit hides from every other query */
const withSheet = { workingTotal: false, workingLetterGrade: false, workingRemarks: false } as const;
const loadEnrollment = (id: string) => prisma.enrollment.findUnique({ where: { id }, include: enrollmentInclude, omit: withSheet });

type RowError = { index: number; studentId: string; message: string };

/** SELECT … FOR UPDATE on each course (sorted, so two saves never lock in opposite order); returns gradesPublishedAt */
const lockCourses = async (tx: Prisma.TransactionClient, courseIds: string[]) => {
  const result = new Map<string, Date | null>();
  for (const id of [...new Set(courseIds)].sort()) {
    const rows = await tx.$queryRaw<Array<{ gradesPublishedAt: Date | null }>>`SELECT "gradesPublishedAt" FROM "Course" WHERE "id" = ${id} FOR UPDATE`;
    result.set(id, rows[0]?.gradesPublishedAt ?? null);
  }
  return result;
};

/** Validates every row first; writes all of them in one transaction, or none (owner decision 7/10/69). */
export const bulkUpdateGrades = async (
  actorUserId: string,
  grades: GradeInput[],
  reqIp?: string,
) => {
  if (grades.length === 0) {
    throw new AppError(400, "At least one grade item is required");
  }

  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: { lecturerProfile: true },
  });

  // 1) check every row; nothing is written yet
  const errors: RowError[] = [];
  type LoadedEnrollment = NonNullable<Awaited<ReturnType<typeof loadEnrollment>>>;
  const checked: Array<{ grade: GradeInput; enrollment: LoadedEnrollment }> = [];
  for (const [index, grade] of grades.entries()) {
    const enrollment = grade.enrollmentId
      ? await loadEnrollment(grade.enrollmentId)
      : await prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId: grade.studentId, courseId: grade.courseId } },
          include: enrollmentInclude,
          omit: withSheet,
        });

    if (!enrollment) {
      errors.push({ index, studentId: grade.studentId, message: `Enrollment not found for course ${grade.courseId}` });
      continue;
    }
    if (actor?.role === Role.LECTURER && enrollment.course.lecturerId !== actor.lecturerProfile?.id) {
      throw new AppError(403, "You can only update grades for your own courses");
    }
    if (enrollment.status === "dropped") {
      errors.push({ index, studentId: grade.studentId, message: "This enrollment was dropped" });
      continue;
    }
    for (const s of grade.scores ?? []) {
      const criterion = enrollment.course.gradingCriteria.find((c) => c.id === s.criteriaId);
      if (!criterion) {
        errors.push({ index, studentId: grade.studentId, message: `Criterion ${s.criteriaId} does not belong to this course` });
      } else if (s.score > criterion.maxScore) {
        errors.push({ index, studentId: grade.studentId, message: `Score ${s.score} is above the maximum ${criterion.maxScore} for ${criterion.name}` });
      }
    }
    checked.push({ grade, enrollment });
  }
  if (errors.length > 0) {
    throw new AppError(400, "Some grade rows are invalid; nothing was saved", { rows: errors });
  }

  // 2) write everything in one transaction
  const results = await prisma.$transaction(async (tx) => {
    // lock each course row first: a publish that runs at the same time waits for this save, or this
    // save waits for it and then sees the course as published (publishCourseGrades locks the same row)
    const publishedAt = await lockCourses(tx, checked.map((c) => c.enrollment.courseId));
    const written = [];
    for (const { grade, enrollment: checkedRow } of checked) {
      // re-read under the lock, so the comparisons below are against what is stored now
      const enrollment = { ...checkedRow, ...(await tx.enrollment.findUniqueOrThrow({ where: { id: checkedRow.id }, omit: withSheet })) };
      const previousScores = await tx.enrollmentScore.findMany({ where: { enrollmentId: enrollment.id } });
      const scoresChanged = (grade.scores ?? []).some(
        (s) => previousScores.find((p) => p.criteriaId === s.criteriaId)?.score !== s.score,
      );
      for (const s of grade.scores ?? []) {
        await tx.enrollmentScore.upsert({
          where: { enrollmentId_criteriaId: { enrollmentId: enrollment.id, criteriaId: s.criteriaId } },
          update: { score: s.score },
          create: { enrollmentId: enrollment.id, criteriaId: s.criteriaId, score: s.score },
        });
      }

      // total comes from every stored criterion score, so a partial entry never wipes the others
      let total = enrollment.workingTotal;
      if (grade.scores && grade.scores.length > 0) {
        const stored = await tx.enrollmentScore.findMany({ where: { enrollmentId: enrollment.id } });
        const sum = stored.reduce((acc, s) => {
          const c = enrollment.course.gradingCriteria.find((x) => x.id === s.criteriaId);
          return c ? acc + (s.score / c.maxScore) * c.weightPercentage : acc;
        }, 0);
        total = Math.round(sum * 100) / 100;
      } else if (grade.total !== undefined) {
        total = grade.total;
      }

      // the letter follows the total only when the total moved (or there is no letter yet),
      // so re-sending an unchanged row keeps a letter given by hand, such as I or W
      let letterGrade = grade.letterGrade ?? enrollment.workingLetterGrade;
      const totalMoved = total !== enrollment.workingTotal || enrollment.workingLetterGrade === null;
      if (!grade.letterGrade && totalMoved && total !== null && enrollment.course.gradeCutoffs.length > 0) {
        const cutoff = [...enrollment.course.gradeCutoffs]
          .sort((a, b) => b.minScore - a.minScore)
          .find((c) => total! >= c.minScore);
        letterGrade = cutoff ? cutoff.grade : "F";
      }

      // the sheet re-sends every row; a row that changes nothing writes nothing and tells no one
      const remarks = grade.remarks !== undefined ? grade.remarks : enrollment.workingRemarks;
      const remarksChanged = remarks !== enrollment.workingRemarks;
      if (!scoresChanged && !remarksChanged && total === enrollment.workingTotal && letterGrade === enrollment.workingLetterGrade) {
        continue;
      }

      // a draft stays on the sheet; once the course is published every change reaches the student at once
      const published = publishedAt.get(enrollment.courseId) !== null;
      const result = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          workingTotal: total,
          workingLetterGrade: letterGrade,
          workingRemarks: remarks,
          // remarks and "graded at" are part of what the student sees, so they wait for publishing too
          ...(published ? { total, letterGrade, remarks, gradedBy: actorUserId, gradedAt: new Date() } : {}),
        },
        include: { course: true, student: { include: { user: true } }, scores: true },
        omit: withSheet,
      });
      // remarks alone, or a draft, change nothing the student sees
      if (!published || (letterGrade === enrollment.letterGrade && total === enrollment.total)) {
        written.push({ result, previousGrade: enrollment.workingLetterGrade, letterGrade, total, reachesStudent: false });
        continue;
      }

      await tx.gradeHistory.create({
        data: {
          enrollmentId: enrollment.id,
          modifiedBy: actorUserId,
          previousGrade: enrollment.letterGrade,
          newGrade: letterGrade ?? "N/A",
          reason: grade.reason ?? "Bulk grade update",
        },
      });

      await tx.timelineEvent.create({
        data: {
          studentId: result.studentId,
          type: "grade",
          title: `Grade updated: ${result.course.code}`,
          titleThai: `อัปเดตผลการเรียน: ${result.course.code}`,
          description: `ผลการเรียนวิชา ${result.course.name} ถูกบันทึกเป็น ${letterGrade ?? "-"}`,
          semester: result.course.semester,
          academicYear: result.course.academicYear,
          relatedId: result.courseId,
          relatedType: "course",
          tags: ["grade", result.course.code],
        },
      });

      written.push({ result, previousGrade: enrollment.letterGrade, letterGrade, total, reachesStudent: true });
    }
    // GPA/GPAX are part of the same commit, so a failing side effect below cannot leave them stale
    for (const studentId of new Set(written.filter((w) => w.reachesStudent).map((w) => w.result.studentId))) {
      await recalculateAcademicStats(studentId, tx);
    }
    return written;
  }, { timeout: 30_000, maxWait: 10_000 });

  // 3) side effects only after the commit; best effort — the grades are already saved
  for (const { result, previousGrade, letterGrade, total, reachesStudent } of results) {
    await createAuditLog({
      userId: actorUserId,
      action: "GRADE_UPDATED",
      resource: "Enrollment",
      resourceId: result.id,
      req: reqIp ? ({ ip: reqIp } as never) : undefined,
      changes: { previousGrade, newGrade: letterGrade, total, published: reachesStudent },
    }).catch((error) => console.error("grade audit log failed", error));
    if (!reachesStudent) continue;
    await notifyGrade(result.student.userId, result.course.code, letterGrade);
  }

  return results.map((r) => r.result);
};

const notifyGrade = (userId: string, courseCode: string, letterGrade: string | null) =>
  createNotification({
    userId,
    title: "Grade updated",
    titleThai: "ผลการเรียนมีการอัปเดต",
    message: `Your grade for ${courseCode} has been updated to ${letterGrade ?? "-"}.`,
    messageThai: `ผลการเรียนวิชา ${courseCode} ถูกอัปเดตเป็น ${letterGrade ?? "-"}`,
    type: "grade",
    priority: "high",
    channels: ["in-app"],
    actionUrl: "/grades",
  }).catch((error) => console.error("grade notification failed", error));


type Missing = { studentId: string; studentCode: string; reason: "no grade" | "criteria missing" };

/** Shows a course's whole grade sheet to its students; only once every non-dropped student has a grade. */
export const publishCourseGrades = async (actorUserId: string, courseId: string, reqIp?: string) => {
  // everything is read under the course lock, so a grade save cannot slip in between the check and the copy
  const course = await prisma.$transaction(async (tx) => {
    const publishedAt = await lockCourses(tx, [courseId]);
    if (publishedAt.get(courseId)) throw new AppError(409, "Grades for this course are already published");
    const course = await tx.course.findUniqueOrThrow({
      where: { id: courseId },
      include: {
        gradingCriteria: true,
        enrollments: {
          where: { status: { not: "dropped" } },
          include: { scores: true, student: true },
          omit: withSheet,
        },
      },
    });

    // I and W are given by hand; every other grade must come from a score on every criterion
    const missing: Missing[] = [];
    for (const e of course.enrollments) {
      const special = e.workingLetterGrade === "I" || e.workingLetterGrade === "W";
      if (!e.workingLetterGrade) {
        missing.push({ studentId: e.studentId, studentCode: e.student.studentId, reason: "no grade" });
      } else if (!special && course.gradingCriteria.some((c) => !e.scores.some((s) => s.criteriaId === c.id))) {
        missing.push({ studentId: e.studentId, studentCode: e.student.studentId, reason: "criteria missing" });
      }
    }
    if (missing.length > 0) {
      throw new AppError(409, "Some students do not have a complete grade yet; nothing was published", { missing });
    }

    const now = new Date();
    await tx.course.update({ where: { id: courseId }, data: { gradesPublishedAt: now } });
    for (const e of course.enrollments) {
      await tx.enrollment.update({
        where: { id: e.id },
        data: { total: e.workingTotal, letterGrade: e.workingLetterGrade, remarks: e.workingRemarks, gradedBy: e.gradedBy ?? actorUserId, gradedAt: now },
      });
      await tx.gradeHistory.create({
        data: { enrollmentId: e.id, modifiedBy: actorUserId, previousGrade: e.letterGrade, newGrade: e.workingLetterGrade ?? "N/A", reason: "Grades published" },
      });
      await tx.timelineEvent.create({
        data: {
          studentId: e.studentId,
          type: "grade",
          title: `Grade published: ${course.code}`,
          titleThai: `ประกาศผลการเรียน: ${course.code}`,
          description: `ผลการเรียนวิชา ${course.name} คือ ${e.workingLetterGrade}`,
          semester: course.semester,
          academicYear: course.academicYear,
          relatedId: course.id,
          relatedType: "course",
          tags: ["grade", course.code],
        },
      });
    }
    for (const studentId of new Set(course.enrollments.map((e) => e.studentId))) {
      await recalculateAcademicStats(studentId, tx);
    }
    return { ...course, gradesPublishedAt: now };
  }, { timeout: 30_000, maxWait: 10_000 });

  await createAuditLog({
    userId: actorUserId,
    action: "GRADES_PUBLISHED",
    resource: "Course",
    resourceId: courseId,
    req: reqIp ? ({ ip: reqIp } as never) : undefined,
    changes: { students: course.enrollments.length },
  }).catch((error) => console.error("grade publish audit log failed", error));
  for (const e of course.enrollments) {
    await notifyGrade(e.student.userId, course.code, e.workingLetterGrade);
  }
  return course;
};
