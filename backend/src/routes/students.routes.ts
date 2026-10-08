import { Role } from "@prisma/client";
import { Router } from "express";
import { optionalAuth, requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  studentListQuerySchema,
  studentProfileQuerySchema,
  studentProfileParamsSchema,
  studentProfileUpdateSchema,
  studentStatsQuerySchema,
} from "../schemas/students.schema";
import {
  getStudentsHandler,
  getStudentProfileHandler,
  getStudentProfileByIdHandler,
  getStudentProfilesHandler,
  updateStudentProfileHandler,
  getStudentStatsHandler,
  getStudentBadgesHandler,
} from "../controllers/students.controller";

const router = Router();

router.get(
  "/students",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(studentListQuerySchema, "query"),
  getStudentsHandler
);

router.get(
  "/students/profile",
  requireAuth,
  validate(studentProfileQuerySchema, "query"),
  getStudentProfileHandler
);

router.get(
  "/students/badges",
  requireAuth,
  checkRole([Role.STUDENT]),
  getStudentBadgesHandler
);

router.get(
  "/students/profile/:id",
  optionalAuth,
  validate(studentProfileParamsSchema, "params"),
  getStudentProfileByIdHandler
);

router.get(
  "/student-profiles",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN, Role.STAFF, Role.LECTURER]),
  getStudentProfilesHandler
);

router.patch(
  "/students/profile",
  requireAuth,
  checkRole([Role.STUDENT, Role.ADMIN]),
  validate(studentProfileUpdateSchema),
  updateStudentProfileHandler
);

router.get(
  "/students/stats",
  requireAuth,
  validate(studentStatsQuerySchema, "query"),
  getStudentStatsHandler
);

export const studentsRoutes = router;
