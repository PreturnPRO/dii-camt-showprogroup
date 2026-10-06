import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { scopeActivityForViewer } from "../services/access-policy";
import { checkInToActivity, grantActivityReward } from "../services/activity.service";
import { getStudentProfileByUserId } from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



export const getActivities = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT && req.query.mine === "true"
      ? await getStudentProfileByUserId(currentUser.id)
      : null;

  const activities = await prisma.activity.findMany({
    where: {
      AND: [
        req.query.q
          ? {
              OR: [
                { title: { contains: String(req.query.q), mode: "insensitive" } },
                { titleThai: { contains: String(req.query.q), mode: "insensitive" } },
                { description: { contains: String(req.query.q), mode: "insensitive" } },
                { organizer: { contains: String(req.query.q), mode: "insensitive" } },
              ],
            }
          : {},
        req.query.status ? { status: String(req.query.status) } : {},
        req.query.type ? { type: String(req.query.type) } : {},
        student
          ? {
              enrollments: {
                some: {
                  studentId: student.id,
                },
              },
            }
          : {},
      ],
    },
    include: {
      enrollments: {
        include: {
          student: {
            include: {
              user: true,
            },
          },
        },
      },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
  });

  res.json({
    success: true,
    activities: activities.map((a) => scopeActivityForViewer(a, currentUser)),
  });
});

export const getUpcomingActivities = asyncHandler(async (req, res) => {
  const viewer = requireUser(req);
  const activities = await prisma.activity.findMany({
    where: {
      startDate: { gte: new Date() },
    },
    include: {
      enrollments: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
    orderBy: { startDate: "asc" },
  });

  res.json({
    success: true,
    activities: activities.map((a) => scopeActivityForViewer(a, viewer)),
  });
});

/** statuses an activity has before staff approve it (audit F1) */
export const UNAPPROVED = ["pending", "draft"];
const REWARD_FIELDS = ["gamificationPoints", "activityHours"] as const;

const assertActivityManager = async (user: { id: string; role: Role }, activityId: string) => {
  const activity = await prisma.activity.findUnique({ where: { id: activityId } });
  if (!activity) throw new AppError(404, "Activity not found");
  if (user.role === Role.STAFF || user.role === Role.ADMIN) return activity;
  if (user.role === Role.LECTURER && activity.createdById === user.id) return activity;
  throw new AppError(403, "You can only manage activities you created");
};

export const createActivity = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const activity = await prisma.activity.create({
    // a lecturer's activity waits for staff approval (audit F1)
    data: {
      ...req.body,
      createdById: currentUser.id,
      ...(currentUser.role === Role.LECTURER ? { status: "pending" } : {}),
    },
  });

  res.status(201).json({
    success: true,
    activity,
  });
});

export const enrollActivity = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);
  const activityId = String(req.params.activityId);

  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    include: { enrollments: true },
  });

  if (!activity) {
    throw new AppError(404, "Activity not found");
  }

  if (UNAPPROVED.includes(activity.status)) {
    throw new AppError(409, "This activity has not been approved yet");
  }

  if (activity.registrationStatus !== "open") {
    throw new AppError(400, "Registration is closed for this activity");
  }

  if (
    activity.maxParticipants &&
    activity.enrollments.length >= activity.maxParticipants
  ) {
    throw new AppError(400, "This activity is full");
  }

  const enrollment = await prisma.activityEnrollment.upsert({
    where: {
      activityId_studentId: {
        activityId: activity.id,
        studentId: student.id,
      },
    },
    update: {
      status: "registered",
    },
    create: {
      activityId: activity.id,
      studentId: student.id,
      status: "registered",
    },
    include: {
      activity: true,
    },
  });

  res.status(201).json({
    success: true,
    enrollment,
  });
});

export const checkInActivity = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);
  const enrollment = await checkInToActivity(String(req.params.activityId), student.id);

  res.json({
    success: true,
    enrollment,
  });
});

export const updateEnrollmentStatus = asyncHandler(async (req, res) => {
  const enrollmentId = String(req.params.id);
  const target = await prisma.activityEnrollment.findUnique({
    where: { id: enrollmentId },
    select: { activityId: true },
  });
  if (!target) {
    throw new AppError(404, "Activity enrollment not found");
  }
  await assertActivityManager(requireUser(req), target.activityId);
  if (req.body.status === "completed") {
    const rewarded = await grantActivityReward(enrollmentId);
    return res.json({
      success: true,
      enrollment: rewarded,
    });
  }

  const enrollment = await prisma.activityEnrollment.update({
    where: { id: enrollmentId },
    data: {
      status: req.body.status,
    },
    include: {
      activity: true,
      student: { include: { user: true } },
    },
  });

  return res.json({
    success: true,
    enrollment,
  });
});

export const updateActivity = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const activityId = String(req.params.id);
  const existing = await assertActivityManager(currentUser, activityId);
  delete req.body.createdById;
  if (currentUser.role === Role.LECTURER) {
    delete req.body.status;
    // changing the reward of an approved activity needs approval again
    const changesReward = REWARD_FIELDS.some(
      (field) => req.body[field] !== undefined && Number(req.body[field]) !== existing[field],
    );
    if (changesReward && !UNAPPROVED.includes(existing.status)) {
      req.body.status = "pending";
    }
  }

  const activity = await prisma.activity.update({
    where: { id: activityId },
    data: req.body,
  });

  res.json({
    success: true,
    activity,
  });
});

export const deleteActivity = asyncHandler(async (req, res) => {
  const activityId = String(req.params.id);
  await assertActivityManager(requireUser(req), activityId);
  await prisma.activityEnrollment.deleteMany({
    where: { activityId },
  });

  const activity = await prisma.activity.delete({
    where: { id: activityId },
  });

  res.json({
    success: true,
    activity,
  });
});
