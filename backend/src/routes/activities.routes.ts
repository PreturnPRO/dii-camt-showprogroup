import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  activityCreateSchema,
  activityQuerySchema,
  activityUpdateSchema,
  enrollmentStatusSchema,
} from "../schemas/activities.schema";
import {
  getActivities,
  getUpcomingActivities,
  createActivity,
  enrollActivity,
  checkInActivity,
  updateEnrollmentStatus,
  updateActivity,
  deleteActivity,
} from "../controllers/activities.controller";

const router = Router();

router.get(
  "/activities",
  requireAuth,
  validate(activityQuerySchema, "query"),
  getActivities
);

router.get(
  "/activities/upcoming",
  getUpcomingActivities
);

router.post(
  "/activities",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(activityCreateSchema),
  createActivity
);

router.post(
  "/activities/enroll/:activityId",
  requireAuth,
  checkRole([Role.STUDENT]),
  enrollActivity
);

router.post(
  "/activities/check-in/:activityId",
  requireAuth,
  checkRole([Role.STUDENT]),
  checkInActivity
);

router.patch(
  "/activities/enrollments/:id/status",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(enrollmentStatusSchema),
  updateEnrollmentStatus
);

router.patch(
  "/activities/:id",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(activityUpdateSchema),
  updateActivity
);

router.delete(
  "/activities/:id",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  deleteActivity
);

export const activitiesRoutes = router;
