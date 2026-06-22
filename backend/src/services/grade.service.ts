import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { createAuditLog } from "./audit.service";
import { createNotification } from "./notification.service";

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

const gradePointMap: Record<string, number> = {
  A: 4,
  "B+": 3.5,
  B: 3,
  "C+": 2.5,
  C: 2,
  "D+": 1.5,
  D: 1,
  F: 0,
};

const passingGrades = new Set(["A", "B+", "B", "C+", "C", "D+", "D"]);

const recalculateAcademicStats = async (studentId: string) => {
  const enrollments = await prisma.enrollment.findMany({
    where: {
      studentId,
      letterGrade: { not: null },
    },
    include: {
      course: true,
    },
  });

  const totalCredits = enrollments.reduce((sum, item) => sum + item.course.credits, 0);
  const earnedCredits = enrollments.reduce(
    (sum, item) => sum + (item.letterGrade && passingGrades.has(item.letterGrade) ? item.course.credits : 0),
    0,
  );
  const weightedPoints = enrollments.reduce((sum, item) => {
    if (!item.letterGrade) {
      return sum;
    }

    return sum + (gradePointMap[item.letterGrade] ?? 0) * item.course.credits;
  }, 0);

  const gpax = totalCredits > 0 ? Number((weightedPoints / totalCredits).toFixed(2)) : 0;

  await prisma.studentProfile.update({
    where: { id: studentId },
    data: {
      earnedCredits,
      gpax,
      gpa: gpax,
    },
  });
};

export const bulkUpdateGrades = async (
  actorUserId: string,
  grades: GradeInput[],
  reqIp?: string,
) => {
  if (grades.length === 0) {
    throw new AppError(400, "At least one grade item is required");
  }

  const updated = [];
  const actor = await prisma.user.findUnique({
    where: { id: actorUserId },
    include: { lecturerProfile: true },
  });

  for (const grade of grades) {
    const enrollment =
      (grade.enrollmentId
        ? await prisma.enrollment.findUnique({
            where: { id: grade.enrollmentId },
            include: { course: { include: { gradingCriteria: true, gradeCutoffs: true } } },
          })
        : await prisma.enrollment.findUnique({
            where: {
              studentId_courseId: {
                studentId: grade.studentId,
                courseId: grade.courseId,
              },
            },
            include: { course: { include: { gradingCriteria: true, gradeCutoffs: true } } },
          })) ?? null;

    if (!enrollment) {
      throw new AppError(
        404,
        `Enrollment not found for student ${grade.studentId} and course ${grade.courseId}`,
      );
    }

    if (actor?.role === Role.LECTURER && enrollment.course.lecturerId !== actor.lecturerProfile?.id) {
      throw new AppError(403, "You can only update grades for your own courses");
    }

    const previousGrade = enrollment.letterGrade;
    
    let computedTotal = grade.total ?? 0;
    if (grade.scores && grade.scores.length > 0 && enrollment.course.gradingCriteria) {
      let calcTotal = 0;
      for (const s of grade.scores) {
        const c = enrollment.course.gradingCriteria.find(x => x.id === s.criteriaId);
        if (c) {
          calcTotal += (s.score / c.maxScore) * c.weightPercentage;
        }
      }
      computedTotal = Math.round(calcTotal * 100) / 100;
    } else if (grade.total !== undefined) {
      computedTotal = grade.total;
    }

    let finalLetterGrade = grade.letterGrade;
    if (!finalLetterGrade && enrollment.course.gradeCutoffs && enrollment.course.gradeCutoffs.length > 0) {
      const cutoffs = [...enrollment.course.gradeCutoffs].sort((a, b) => b.minScore - a.minScore);
      const cutoff = cutoffs.find(c => computedTotal >= c.minScore);
      finalLetterGrade = cutoff ? cutoff.grade : "F";
    }

    const result = await prisma.$transaction(async (tx) => {
      if (grade.scores && grade.scores.length > 0) {
        for (const s of grade.scores) {
          await tx.enrollmentScore.upsert({
            where: {
              enrollmentId_criteriaId: {
                enrollmentId: enrollment.id,
                criteriaId: s.criteriaId,
              },
            },
            update: { score: s.score },
            create: { enrollmentId: enrollment.id, criteriaId: s.criteriaId, score: s.score },
          });
        }
      }

      return tx.enrollment.update({
        where: { id: enrollment.id },
        data: {

          total: computedTotal,
          letterGrade: finalLetterGrade,
          remarks: grade.remarks,
          gradedBy: actorUserId,
          gradedAt: new Date(),
        },
        include: {
          course: true,
          student: { include: { user: true } },
          scores: true,
        },
      });
    });

    await prisma.gradeHistory.create({
      data: {
        enrollmentId: enrollment.id,
        modifiedBy: actorUserId,
        previousGrade,
        newGrade: finalLetterGrade ?? "N/A",
        reason: grade.reason ?? "Bulk grade update",
      },
    });

    await createAuditLog({
      userId: actorUserId,
      action: "GRADE_UPDATED",
      resource: "Enrollment",
      resourceId: enrollment.id,
      req: reqIp ? ({ ip: reqIp } as never) : undefined,
      changes: {
        previousGrade,
        newGrade: finalLetterGrade,
        total: computedTotal,
      },
    });

    await prisma.timelineEvent.create({
      data: {
        studentId: result.studentId,
        type: "grade",
        title: `Grade updated: ${result.course.code}`,
        titleThai: `อัปเดตผลการเรียน: ${result.course.code}`,
        description: `ผลการเรียนวิชา ${result.course.name} ถูกบันทึกเป็น ${finalLetterGrade ?? "-"}`,
        semester: result.course.semester,
        academicYear: result.course.academicYear,
        relatedId: result.courseId,
        relatedType: "course",
        tags: ["grade", result.course.code],
      },
    });

    await createNotification({
      userId: result.student.userId,
      title: "Grade updated",
      titleThai: "ผลการเรียนมีการอัปเดต",
      message: `Your grade for ${result.course.code} has been updated to ${finalLetterGrade ?? "-"}.`,
      messageThai: `ผลการเรียนวิชา ${result.course.code} ถูกอัปเดตเป็น ${finalLetterGrade ?? "-"}`,
      type: "grade",
      priority: "high",
      channels: ["in-app"],
      actionUrl: "/grades",
    });

    await recalculateAcademicStats(result.studentId);
    updated.push(result);
  }

  return updated;
};
