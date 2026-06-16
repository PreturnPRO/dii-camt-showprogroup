import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  automationRuleSchema,
  automationRuleUpdateSchema,
} from "../schemas/automation.schema";
import {
  getAutomationRules,
  createAutomationRule,
  updateAutomationRule,
  runAutomationRule,
  deleteAutomationRule,
} from "../controllers/automation.controller";

const router = Router();

router.get(
  "/automation-rules",
  requireAuth,
  checkRole([Role.ADMIN]),
  getAutomationRules
);

router.post(
  "/automation-rules",
  requireAuth,
  checkRole([Role.ADMIN]),
  validate(automationRuleSchema),
  createAutomationRule
);

router.patch(
  "/automation-rules/:id",
  requireAuth,
  checkRole([Role.ADMIN]),
  validate(automationRuleUpdateSchema),
  updateAutomationRule
);

router.post(
  "/automation-rules/:id/run",
  requireAuth,
  checkRole([Role.ADMIN]),
  runAutomationRule
);

router.delete(
  "/automation-rules/:id",
  requireAuth,
  checkRole([Role.ADMIN]),
  deleteAutomationRule
);

export const automationRoutes = router;
