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
const loadEnrollment = (id: string) => prisma.enrollment.findUnique({ where: { id }, include: enrollmentInclude });

type RowError = { index: number; studentId: string; message: string };

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
      ? await prisma.enrollment.findUnique({ where: { id: grade.enrollmentId }, include: enrollmentInclude })
      : await prisma.enrollment.findUnique({
          where: { studentId_courseId: { studentId: grade.studentId, courseId: grade.courseId } },
          include: enrollmentInclude,
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
    const written = [];
    for (const { grade, enrollment } of checked) {
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
      let total = enrollment.total;
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

      let letterGrade = grade.letterGrade ?? enrollment.letterGrade;
      if (!grade.letterGrade && total !== null && enrollment.course.gradeCutoffs.length > 0) {
        const cutoff = [...enrollment.course.gradeCutoffs]
          .sort((a, b) => b.minScore - a.minScore)
          .find((c) => total! >= c.minScore);
        letterGrade = cutoff ? cutoff.grade : "F";
      }

      // the sheet re-sends every row; a row that changes nothing writes nothing and tells no one
      const remarksChanged = grade.remarks !== undefined && grade.remarks !== enrollment.remarks;
      if (!scoresChanged && !remarksChanged && total === enrollment.total && letterGrade === enrollment.letterGrade) {
        continue;
      }

      const result = await tx.enrollment.update({
        where: { id: enrollment.id },
        data: { total, letterGrade, remarks: grade.remarks, gradedBy: actorUserId, gradedAt: new Date() },
        include: { course: true, student: { include: { user: true } }, scores: true },
      });

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

      written.push({ result, previousGrade: enrollment.letterGrade, letterGrade, total });
    }
    // GPA/GPAX are part of the same commit, so a failing side effect below cannot leave them stale
    for (const studentId of new Set(written.map((w) => w.result.studentId))) {
      await recalculateAcademicStats(studentId, tx);
    }
    return written;
  }, { timeout: 30_000, maxWait: 10_000 });

  // 3) side effects only after the commit; best effort — the grades are already saved
  for (const { result, previousGrade, letterGrade, total } of results) {
    await createAuditLog({
      userId: actorUserId,
      action: "GRADE_UPDATED",
      resource: "Enrollment",
      resourceId: result.id,
      req: reqIp ? ({ ip: reqIp } as never) : undefined,
      changes: { previousGrade, newGrade: letterGrade, total },
    }).catch((error) => console.error("grade audit log failed", error));
    await createNotification({
      userId: result.student.userId,
      title: "Grade updated",
      titleThai: "ผลการเรียนมีการอัปเดต",
      message: `Your grade for ${result.course.code} has been updated to ${letterGrade ?? "-"}.`,
      messageThai: `ผลการเรียนวิชา ${result.course.code} ถูกอัปเดตเป็น ${letterGrade ?? "-"}`,
      type: "grade",
      priority: "high",
      channels: ["in-app"],
      actionUrl: "/grades",
    }).catch((error) => console.error("grade notification failed", error));
  }

  return results.map((r) => r.result);
};
