import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  studentQuerySchema,
  cooperationParamsSchema,
} from "../schemas/documents.schema";
import {
  getTranscript,
  getInternshipCertificate,
  getCooperationSummary,
} from "../controllers/documents.controller";

const router = Router();

router.get(
  "/documents/transcript",
  requireAuth,
  checkRole([Role.STUDENT, Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(studentQuerySchema, "query"),
  getTranscript
);

router.get(
  "/documents/internship-certificate",
  requireAuth,
  checkRole([Role.STUDENT, Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(studentQuerySchema, "query"),
  getInternshipCertificate
);

router.get(
  "/documents/cooperation-summary/:id",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN, Role.COMPANY]),
  validate(cooperationParamsSchema, "params"),
  getCooperationSummary
);

export const documentsRoutes = router;
