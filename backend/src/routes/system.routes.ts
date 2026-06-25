import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  userQuerySchema,
  userCreateSchema,
  userUpdateSchema,
  companyImportSchema,
  studentImportSchema,
  directoryQuerySchema,
  lecturerQuerySchema,
  companyQuerySchema,
  notificationBroadcastSchema,
} from "../schemas/system.schema";
import {
  getUsersHandler,
  createUserHandler,
  importCompaniesHandler,
  importStudentsHandler,
  updateUserHandler,
  deleteUserHandler,
  getDirectoryUsersHandler,
  getLecturersHandler,
  getCompaniesHandler,
  getNotificationsHandler,
  readAllNotificationsHandler,
  readNotificationHandler,
  deleteNotificationHandler,
  broadcastNotificationHandler,
  auditHandler,
  getSystemUsageReportHandler,
} from "../controllers/system.controller";

const router = Router();

router.get(
  "/users",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(userQuerySchema, "query"),
  getUsersHandler
);

router.post(
  "/users",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(userCreateSchema),
  createUserHandler
);

router.post(
  "/users/import/companies",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(companyImportSchema),
  importCompaniesHandler
);

router.post(
  "/users/import/students",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(studentImportSchema),
  importStudentsHandler
);

router.patch(
  "/users/:id",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(userUpdateSchema),
  updateUserHandler
);

router.delete(
  "/users/:id",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  deleteUserHandler
);

router.get(
  "/directory/users",
  requireAuth,
  validate(directoryQuerySchema, "query"),
  getDirectoryUsersHandler
);

router.get(
  "/lecturers",
  requireAuth,
  validate(lecturerQuerySchema, "query"),
  getLecturersHandler
);

router.get(
  "/companies",
  requireAuth,
  validate(companyQuerySchema, "query"),
  getCompaniesHandler
);

router.get(
  "/notifications",
  requireAuth,
  getNotificationsHandler
);

router.patch(
  "/notifications/read-all",
  requireAuth,
  readAllNotificationsHandler
);

router.patch(
  "/notifications/:id/read",
  requireAuth,
  readNotificationHandler
);

router.delete(
  "/notifications/:id",
  requireAuth,
  deleteNotificationHandler
);

router.post(
  "/notifications/broadcast",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(notificationBroadcastSchema),
  broadcastNotificationHandler
);

router.get("/audit", requireAuth, checkRole([Role.ADMIN, Role.STAFF]), auditHandler);
router.get("/audit-logs", requireAuth, checkRole([Role.ADMIN, Role.STAFF]), auditHandler);

router.get(
  "/reports/system-usage",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  getSystemUsageReportHandler
);

export const systemRoutes = router;
