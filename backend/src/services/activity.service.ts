import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { evaluateStudentBadges } from "./badge.service";

export const grantActivityReward = async (activityEnrollmentId: string) => {
  const activityEnrollment = await prisma.activityEnrollment.findUnique({
    where: { id: activityEnrollmentId },
    include: {
      activity: true,
      student: true,
    },
  });

  if (!activityEnrollment) {
    throw new AppError(404, "Activity enrollment not found");
  }

  if (activityEnrollment.rewardGranted) {
    return activityEnrollment;
  }

  // an activity staff have not approved yet grants nothing (audit F1)
  if (["pending", "draft"].includes(activityEnrollment.activity.status)) {
    throw new AppError(409, "This activity has not been approved yet");
  }

  await prisma.$transaction(async (tx) => {
    await tx.activityEnrollment.update({
      where: { id: activityEnrollment.id },
      data: {
        rewardGranted: true,
        status: "completed",
        checkedInAt: new Date(),
      },
    });

    await tx.studentProfile.update({
      where: { id: activityEnrollment.studentId },
      data: {
        gamificationPoints: { increment: activityEnrollment.activity.gamificationPoints },
        totalActivityHours: { increment: activityEnrollment.activity.activityHours },
      },
    });

    await tx.timelineEvent.create({
      data: {
        studentId: activityEnrollment.studentId,
        type: "activity",
        title: `Completed ${activityEnrollment.activity.title}`,
        titleThai: `เข้าร่วม ${activityEnrollment.activity.titleThai} สำเร็จ`,
        description: `ได้รับ ${activityEnrollment.activity.gamificationPoints} คะแนน และ ${activityEnrollment.activity.activityHours} ชั่วโมงกิจกรรม`,
        semester: 1,
        academicYear: new Date().getFullYear().toString(),
        relatedId: activityEnrollment.activityId,
        relatedType: "activity",
        isImportant: true,
        tags: ["activity", "gamification"],
        metadata: {
          points: activityEnrollment.activity.gamificationPoints,
          hours: activityEnrollment.activity.activityHours,
        },
      },
    });
  });

  await evaluateStudentBadges(activityEnrollment.studentId);

  return prisma.activityEnrollment.findUnique({
    where: { id: activityEnrollmentId },
    include: { activity: true, student: true },
  });
};

export const checkInToActivity = async (activityId: string, studentId: string) => {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
  });

  if (!activity) {
    throw new AppError(404, "Activity not found");
  }

  if (!activity.checkInEnabled) {
    throw new AppError(400, "Activity check-in is not enabled");
  }

  const enrollment =
    (await prisma.activityEnrollment.findUnique({
      where: {
        activityId_studentId: {
          activityId,
          studentId,
        },
      },
    })) ??
    (await prisma.activityEnrollment.create({
      data: {
        activityId,
        studentId,
        status: "registered",
      },
    }));

  return grantActivityReward(enrollment.id);
};
