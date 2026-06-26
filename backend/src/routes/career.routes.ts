import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  jobQuerySchema,
  jobCreateSchema,
  jobUpdateSchema,
  applySchema,
  updateApplicationSchema,
  applicationQuerySchema,
  internshipLogQuerySchema,
  internshipLogCreateSchema,
  internshipDocumentCreateSchema,
  internshipDocumentStatusSchema,
  talentQuerySchema,
} from "../schemas/career.schema";
import {
  getJobsHandler,
  getCareerTargetsHandler,
  createJobHandler,
  updateJobHandler,
  deleteJobHandler,
  createApplicationHandler,
  getApplicationsHandler,
  updateApplicationHandler,
  getInternshipsHandler,
  getInternshipLogsHandler,
  createInternshipLogHandler,
  createInternshipDocumentHandler,
  updateInternshipDocumentStatusHandler,
  searchTalentHandler,
} from "../controllers/career.controller";

const router = Router();

router.get(
  "/jobs",
  validate(jobQuerySchema, "query"),
  getJobsHandler
);

router.get(
  "/career-targets",
  requireAuth,
  checkRole([Role.STUDENT]),
  getCareerTargetsHandler
);

router.post(
  "/jobs",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN]),
  validate(jobCreateSchema),
  createJobHandler
);

router.patch(
  "/jobs/:id",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN]),
  validate(jobUpdateSchema),
  updateJobHandler
);

router.delete(
  "/jobs/:id",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN]),
  deleteJobHandler
);

router.post(
  "/applications",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(applySchema),
  createApplicationHandler
);

router.post(
  "/apply/:jobId",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(applySchema),
  createApplicationHandler
);

router.get(
  "/applications",
  requireAuth,
  validate(applicationQuerySchema, "query"),
  getApplicationsHandler
);

router.patch(
  "/applications/:id",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN]),
  validate(updateApplicationSchema),
  updateApplicationHandler
);

router.get(
  "/internships",
  requireAuth,
  checkRole([Role.STUDENT, Role.COMPANY, Role.LECTURER, Role.STAFF, Role.ADMIN]),
  getInternshipsHandler
);

router.get(
  "/internship/logs",
  requireAuth,
  validate(internshipLogQuerySchema, "query"),
  getInternshipLogsHandler
);

router.post(
  "/internship/logs",
  requireAuth,
  checkRole([Role.STUDENT, Role.STAFF, Role.ADMIN]),
  validate(internshipLogCreateSchema),
  createInternshipLogHandler
);

router.post(
  "/internship/documents",
  requireAuth,
  checkRole([Role.STUDENT, Role.STAFF, Role.ADMIN]),
  validate(internshipDocumentCreateSchema),
  createInternshipDocumentHandler
);

router.patch(
  "/internship/documents/:id/status",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(internshipDocumentStatusSchema),
  updateInternshipDocumentStatusHandler
);

router.get(
  "/talent/search",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN, Role.STAFF, Role.LECTURER]),
  validate(talentQuerySchema, "query"),
  searchTalentHandler
);

export const careerRoutes = router;
