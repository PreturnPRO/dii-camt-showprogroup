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
  careerGoalUpdateSchema,
  trackWatchCreateSchema,
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
  getCareerTracksHandler,
  getMyCareerGoalHandler,
  updateMyCareerGoalHandler,
  getTrackWatchesHandler,
  createTrackWatchHandler,
  deleteTrackWatchHandler,
} from "../controllers/career.controller";

const router = Router();

router.get(
  "/jobs",
  requireAuth,
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
  // Only student (own applications) and company (own postings' applications)
  // get scoped in getApplicationsHandler; any other role fell through with
  // no where-clause at all and got every application system-wide, resumes
  // and cover letters included. Admin is the only other role with a
  // legitimate reason to see everything.
  checkRole([Role.STUDENT, Role.COMPANY, Role.ADMIN]),
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

router.get(
  "/career-tracks",
  requireAuth,
  getCareerTracksHandler
);

router.get(
  "/students/career-goal",
  requireAuth,
  checkRole([Role.STUDENT]),
  getMyCareerGoalHandler
);

router.put(
  "/students/career-goal",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(careerGoalUpdateSchema),
  updateMyCareerGoalHandler
);

router.get(
  "/company/track-watches",
  requireAuth,
  checkRole([Role.COMPANY]),
  getTrackWatchesHandler
);

router.post(
  "/company/track-watches",
  requireAuth,
  checkRole([Role.COMPANY]),
  validate(trackWatchCreateSchema),
  createTrackWatchHandler
);

router.delete(
  "/company/track-watches/:id",
  requireAuth,
  checkRole([Role.COMPANY]),
  deleteTrackWatchHandler
);

export const careerRoutes = router;
