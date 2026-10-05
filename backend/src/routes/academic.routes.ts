import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  courseQuerySchema,
  courseCreateSchema,
  courseUpdateSchema,
  enrollSchema,
  gradeBulkSchema,
  gradesHistoryParamsSchema,
  transcriptQuerySchema,
  attendanceQuerySchema,
  attendanceCheckInSchema,
  startAttendanceSessionSchema,
  qrCheckInSchema,
  attendanceSummaryParamsSchema,
  attendanceHistoryParamsSchema,
  closeSessionParamsSchema,
} from "../schemas/academic.schema";
import {
  getCoursesHandler,
  getCourseByIdHandler,
  createCourseHandler,
  updateCourseHandler,
  scheduleHandler,
  getEnrollmentsHandler,
  createEnrollmentHandler,
  dropCourseHandler,
  gradeBulkHandler,
  getGradesHistoryHandler,
  getStudentTranscriptHandler,
  getAttendanceReportHandler,
  attendanceCheckInHandler,
  deleteCourseHandler,
  startAttendanceSessionHandler,
  qrCheckInHandler,
  getAttendanceSummaryHandler,
  getStudentAttendanceHistoryHandler,
  closeAttendanceSessionHandler,
  exportGradesCsvHandler,
} from "../controllers/academic.controller";

const router = Router();

router.get(
  "/courses",
  validate(courseQuerySchema, "query"),
  getCoursesHandler
);

router.get(
  "/courses/:id",
  getCourseByIdHandler
);

router.post(
  "/courses",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN, Role.LECTURER]),
  validate(courseCreateSchema),
  createCourseHandler
);

router.patch(
  "/courses/:id",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(courseUpdateSchema),
  updateCourseHandler
);

router.delete(
  "/courses/:id",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN, Role.LECTURER]),
  deleteCourseHandler
);

router.get("/lecturer/schedule", requireAuth, scheduleHandler);
router.get("/courses/lecturer/schedule", requireAuth, scheduleHandler);

router.get(
  "/enrollments",
  requireAuth,
  getEnrollmentsHandler
);

router.post(
  "/enrollments",
  requireAuth,
  checkRole([Role.STUDENT, Role.STAFF, Role.ADMIN, Role.LECTURER]),
  validate(enrollSchema),
  createEnrollmentHandler
);

router.delete(
  "/enrollments/course/:courseId",
  requireAuth,
  checkRole([Role.STUDENT]),
  dropCourseHandler
);

router.patch(
  "/grades/bulk",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(gradeBulkSchema),
  gradeBulkHandler
);

router.post(
  "/grades",
  requireAuth,
  checkRole([Role.LECTURER, Role.ADMIN]),
  validate(gradeBulkSchema),
  gradeBulkHandler
);

router.get(
  "/grades/history/:studentId",
  requireAuth,
  validate(gradesHistoryParamsSchema, "params"),
  getGradesHistoryHandler
);

router.get(
  "/student/transcript",
  requireAuth,
  validate(transcriptQuerySchema, "query"),
  getStudentTranscriptHandler
);

router.get(
  "/courses/:courseId/grades/export",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  exportGradesCsvHandler
);

router.get(
  "/attendance/report",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(attendanceQuerySchema, "query"),
  getAttendanceReportHandler
);

router.post(
  "/attendance/check-in",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(attendanceCheckInSchema),
  attendanceCheckInHandler
);

router.post(
  "/attendance/sessions",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(startAttendanceSessionSchema),
  startAttendanceSessionHandler
);

router.post(
  "/attendance/sessions/check-in",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(qrCheckInSchema),
  qrCheckInHandler
);

router.get(
  "/attendance/summary/:courseId",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(attendanceSummaryParamsSchema, "params"),
  getAttendanceSummaryHandler
);

router.get(
  "/attendance/history/:courseId/:studentId",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN, Role.STUDENT]),
  validate(attendanceHistoryParamsSchema, "params"),
  getStudentAttendanceHistoryHandler
);

router.patch(
  "/attendance/sessions/:id/close",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(closeSessionParamsSchema, "params"),
  closeAttendanceSessionHandler
);
export const academicRoutes = router;
