import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  facilitySchema,
  facilityUpdateSchema,
} from "../schemas/facilities.schema";
import {
  getFacilities,
  createFacility,
  updateFacility,
  deleteFacility,
} from "../controllers/facilities.controller";

const router = Router();

router.get(
  "/facilities",
  requireAuth,
  getFacilities
);

router.post(
  "/facilities",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(facilitySchema),
  createFacility
);

router.patch(
  "/facilities/:id",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(facilityUpdateSchema),
  updateFacility
);

router.delete(
  "/facilities/:id",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  deleteFacility
);

export const facilitiesRoutes = router;
