import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  registerSchema,
  loginSchema,
  companyLoginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateUserProfileSchema,
} from "../schemas/auth.schema";
import {
  register,
  login,
  companyLogin,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
  updateProfile,
  bootstrapUsers,
} from "../controllers/auth.controller";

const router = Router();

router.post(
  "/auth/register",
  validate(registerSchema),
  register
);

router.post(
  "/auth/login",
  validate(loginSchema),
  login
);

router.post(
  "/auth/company-login",
  validate(companyLoginSchema),
  companyLogin
);

router.post(
  "/auth/forgot-password",
  validate(forgotPasswordSchema),
  forgotPassword
);

router.post(
  "/auth/reset-password",
  validate(resetPasswordSchema),
  resetPassword
);

router.get(
  "/auth/me",
  requireAuth,
  getMe
);

router.post(
  "/auth/logout",
  requireAuth,
  logout
);

router.patch(
  "/users/profile",
  requireAuth,
  validate(updateUserProfileSchema),
  updateProfile
);

router.get(
  "/users/bootstrap",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  bootstrapUsers
);

export const authRoutes = router;
