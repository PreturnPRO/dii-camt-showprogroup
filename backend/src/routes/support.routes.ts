import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  requestSchema,
  requestCommentSchema,
  requestStatusSchema,
  appointmentSchema,
  appointmentStatusSchema,
  officeHourQuerySchema,
  officeHoursUpdateSchema,
  messageCreateSchema,
} from "../schemas/support.schema";
import {
  getRequests,
  createRequest,
  createRequestComment,
  updateRequestStatus,
  getAppointments,
  createAppointment,
  updateAppointmentStatus,
  getOfficeHours,
  updateOfficeHours,
  getMessages,
  createMessage,
  markMessageRead,
} from "../controllers/support.controller";

const router = Router();

router.get(
  "/requests",
  requireAuth,
  getRequests
);

router.post(
  "/requests",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(requestSchema),
  createRequest
);

router.post(
  "/requests/:id/comment",
  requireAuth,
  validate(requestCommentSchema),
  createRequestComment
);

router.patch(
  "/requests/:id/status",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(requestStatusSchema),
  updateRequestStatus
);

router.get(
  "/appointments",
  requireAuth,
  getAppointments
);

router.post(
  "/appointments",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(appointmentSchema),
  createAppointment
);

router.patch(
  "/appointments/:id/status",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(appointmentStatusSchema),
  updateAppointmentStatus
);

router.get(
  "/office-hours/:lecturerId",
  requireAuth,
  validate(officeHourQuerySchema, "query"),
  getOfficeHours
);

router.put(
  "/office-hours",
  requireAuth,
  checkRole([Role.LECTURER]),
  validate(officeHoursUpdateSchema),
  updateOfficeHours
);

router.get(
  "/messages",
  requireAuth,
  getMessages
);

router.post(
  "/messages",
  requireAuth,
  validate(messageCreateSchema),
  createMessage
);

router.patch(
  "/messages/:id/read",
  requireAuth,
  markMessageRead
);

export const supportRoutes = router;
