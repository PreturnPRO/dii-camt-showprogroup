import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  budgetSchema,
  budgetUpdateSchema,
  cooperationSchema,
  workloadSchema,
  paymentSchema,
  paymentQuerySchema,
} from "../schemas/operations.schema";
import {
  getBudget,
  createBudget,
  updateBudget,
  deleteBudget,
  getPersonnel,
  getCooperation,
  createCooperation,
  getWorkload,
  createWorkload,
  getSubscriptionPlans,
  getSubscriptionPayments,
  createSubscriptionPayment,
} from "../controllers/operations.controller";

const router = Router();

router.get(
  "/budget",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  getBudget
);

router.post(
  "/budget",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(budgetSchema),
  createBudget
);

router.patch(
  "/budget/:id",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(budgetUpdateSchema),
  updateBudget
);

router.delete(
  "/budget/:id",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  deleteBudget
);

router.get(
  "/personnel",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  getPersonnel
);

router.get(
  "/cooperation",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN, Role.COMPANY]),
  getCooperation
);

router.post(
  "/cooperation",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(cooperationSchema),
  createCooperation
);

router.get(
  "/workload",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  getWorkload
);

router.post(
  "/workload",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(workloadSchema),
  createWorkload
);

router.get(
  "/subscription/plans",
  getSubscriptionPlans
);

router.get(
  "/subscription/payments",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN]),
  validate(paymentQuerySchema, "query"),
  getSubscriptionPayments
);

router.post(
  "/subscription/payment",
  requireAuth,
  checkRole([Role.COMPANY, Role.ADMIN]),
  validate(paymentSchema),
  createSubscriptionPayment
);

export const operationsRoutes = router;
