import { Role } from "@prisma/client";
import { createHash } from "node:crypto";
import { Router } from "express";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { requireAuth } from "../lib/passport";
import { prisma } from "../lib/prisma";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import { createAuditLog } from "../services/audit.service";
import { getUserWithProfiles } from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { comparePassword, hashPassword, signToken } from "../utils/auth";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";

const router = Router();

const roleSchema = z.nativeEnum(Role);

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  nameThai: z.string().min(1),
  role: roleSchema,
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  profile: z.record(z.any()).default({}),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

const avatarSchema = z
  .string()
  .refine(
    (value) => {
      if (value.startsWith("/api/files/")) return true;
      return z.string().url().safeParse(value).success;
    },
    { message: "Avatar must be a URL or managed file path" },
  );

const updateUserProfileSchema = z.object({
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  avatar: avatarSchema.nullable().optional(),
  phone: z.string().optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
  roleData: z.record(z.any()).default({}),
});

const requireFields = (profile: Record<string, unknown>, fields: string[]) => {
  for (const field of fields) {
    if (
      profile[field] === undefined ||
      profile[field] === null ||
      profile[field] === ""
    ) {
      throw new AppError(400, `Field "${field}" is required for the selected role`);
    }
  }
};

const passwordMarker = (passwordHash: string) =>
  createHash("sha256").update(passwordHash).digest("hex");

const createPasswordResetToken = (user: { id: string; email: string; passwordHash: string }) =>
  jwt.sign(
    {
      sub: user.id,
      email: user.email,
      purpose: "password-reset",
      marker: passwordMarker(user.passwordHash),
    },
    env.JWT_SECRET,
    { expiresIn: "30m" as SignOptions["expiresIn"] },
  );

const frontendOrigin = (req: { get: (name: string) => string | undefined }) =>
  env.FRONTEND_URL || req.get("origin") || env.CORS_ORIGIN.split(",")[0] || "http://localhost:8080";

const sendPasswordResetEmail = async (payload: {
  email: string;
  name: string;
  resetUrl: string;
}) => {
  if (!env.PASSWORD_RESET_WEBHOOK_URL) {
    if (env.NODE_ENV === "production") {
      console.warn("PASSWORD_RESET_WEBHOOK_URL is not configured; reset email was not sent.");
    }
    return;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.PASSWORD_RESET_WEBHOOK_TOKEN) {
    headers.Authorization = `Bearer ${env.PASSWORD_RESET_WEBHOOK_TOKEN}`;
  }

  const response = await fetch(env.PASSWORD_RESET_WEBHOOK_URL, {
    method: "POST",
    headers,
    body: JSON.stringify({
      type: "password-reset",
      to: payload.email,
      name: payload.name,
      resetUrl: payload.resetUrl,
      expiresInMinutes: 30,
    }),
  });

  if (!response.ok) {
    throw new AppError(502, "Password reset email provider rejected the request");
  }
};

router.post(
  "/auth/register",
  validate(registerSchema),
  asyncHandler(async (req, res) => {
    const { email, password, name, nameThai, role, avatar, phone, profile } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(409, "Email is already registered");
    }

    const passwordHash = await hashPassword(password);

    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          nameThai,
          role,
          avatar,
          phone,
        },
      });

      switch (role) {
        case Role.STUDENT: {
          requireFields(profile, [
            "studentId",
            "major",
            "program",
            "year",
            "semester",
            "academicYear",
          ]);
          const student = await tx.studentProfile.create({
            data: {
              userId: createdUser.id,
              studentId: String(profile.studentId),
              major: String(profile.major),
              program: String(profile.program),
              year: Number(profile.year),
              semester: Number(profile.semester),
              academicYear: String(profile.academicYear),
              advisorId: profile.advisorId ? String(profile.advisorId) : undefined,
              cvUrl: profile.cvUrl ? String(profile.cvUrl) : undefined,
            },
          });
          await tx.dataConsent.create({
            data: {
              studentId: student.id,
              allowDataSharing: Boolean(profile.allowDataSharing ?? false),
              allowPortfolioSharing: Boolean(profile.allowPortfolioSharing ?? false),
            },
          });
          break;
        }
        case Role.LECTURER:
          requireFields(profile, ["lecturerId", "department", "position"]);
          await tx.lecturerProfile.create({
            data: {
              userId: createdUser.id,
              lecturerId: String(profile.lecturerId),
              department: String(profile.department),
              position: String(profile.position),
              specialization: Array.isArray(profile.specialization)
                ? profile.specialization.map(String)
                : [],
              researchInterests: Array.isArray(profile.researchInterests)
                ? profile.researchInterests.map(String)
                : [],
            },
          });
          break;
        case Role.STAFF:
          requireFields(profile, ["staffId", "department", "position"]);
          await tx.staffProfile.create({
            data: {
              userId: createdUser.id,
              staffId: String(profile.staffId),
              department: String(profile.department),
              position: String(profile.position),
              permissions: Array.isArray(profile.permissions)
                ? profile.permissions.map(String)
                : [],
              canManageUsers: Boolean(profile.canManageUsers ?? true),
              canManageCourses: Boolean(profile.canManageCourses ?? true),
              canManageSchedules: Boolean(profile.canManageSchedules ?? true),
              canViewReports: Boolean(profile.canViewReports ?? true),
              canManageInternships: Boolean(profile.canManageInternships ?? true),
            },
          });
          break;
        case Role.COMPANY:
          requireFields(profile, [
            "companyId",
            "companyName",
            "companyNameThai",
            "industry",
            "size",
          ]);
          await tx.companyProfile.create({
            data: {
              userId: createdUser.id,
              companyId: String(profile.companyId),
              companyName: String(profile.companyName),
              companyNameThai: String(profile.companyNameThai),
              industry: String(profile.industry),
              size: String(profile.size),
              website: profile.website ? String(profile.website) : undefined,
              address: profile.address ? String(profile.address) : undefined,
              locationMapUrl: profile.locationMapUrl ? String(profile.locationMapUrl) : undefined,
              productsServices: profile.productsServices ? String(profile.productsServices) : undefined,
              contactPersonName: profile.contactPersonName ? String(profile.contactPersonName) : undefined,
              contactPersonRole: profile.contactPersonRole ? String(profile.contactPersonRole) : undefined,
              contactPersonEmail: profile.contactPersonEmail ? String(profile.contactPersonEmail) : undefined,
              contactPersonPhone: profile.contactPersonPhone ? String(profile.contactPersonPhone) : undefined,
              socialMedia: profile.socialMedia ? String(profile.socialMedia) : undefined,
              onboardingStatus: String(profile.onboardingStatus ?? "pending_review"),
              privacyProtocolAcceptedAt: profile.privacyProtocolAcceptedAt
                ? new Date(String(profile.privacyProtocolAcceptedAt))
                : undefined,
              internshipSlots: Number(profile.internshipSlots ?? 0),
            },
          });
          break;
        case Role.ADMIN:
          requireFields(profile, ["adminId"]);
          await tx.adminProfile.create({
            data: {
              userId: createdUser.id,
              adminId: String(profile.adminId),
              isSuperAdmin: Boolean(profile.isSuperAdmin ?? false),
              permissions: Array.isArray(profile.permissions)
                ? profile.permissions.map(String)
                : ["*"],
            },
          });
          break;
      }

      return createdUser;
    });

    const token = signToken({ sub: user.id, role: user.role, email: user.email });
    const payload = await getUserWithProfiles(user.id);

    await createAuditLog({
      userId: user.id,
      action: "USER_REGISTERED",
      resource: "User",
      resourceId: user.id,
      changes: { role: user.role, email: user.email },
    });

    res.status(201).json({
      success: true,
      token,
      expiresIn: env.JWT_EXPIRES_IN,
      user: payload,
    });
  }),
);

router.post(
  "/auth/login",
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        studentProfile: true,
        lecturerProfile: true,
        staffProfile: true,
        companyProfile: true,
        adminProfile: true,
      },
    });

    if (!user || !(await comparePassword(password, user.passwordHash))) {
      throw new AppError(401, "Invalid email or password");
    }

    if (!user.isActive) {
      throw new AppError(403, "This account is inactive");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() },
    });

    const token = signToken({ sub: user.id, role: user.role, email: user.email });

    await createAuditLog({
      userId: user.id,
      action: "USER_LOGGED_IN",
      resource: "User",
      resourceId: user.id,
      changes: { lastLogin: new Date().toISOString() },
    });

    res.json({
      success: true,
      token,
      expiresIn: env.JWT_EXPIRES_IN,
      user: await getUserWithProfiles(user.id),
    });
  }),
);

router.post(
  "/auth/forgot-password",
  validate(forgotPasswordSchema),
  asyncHandler(async (req, res) => {
    const { email } = req.body;
    const user = await prisma.user.findUnique({
      where: { email },
    });

    const response: {
      success: true;
      message: string;
      resetToken?: string;
      resetUrl?: string;
    } = {
      success: true,
      message: "If this email exists, a password reset link has been prepared.",
    };

    if (user?.isActive) {
      const resetToken = createPasswordResetToken(user);
      const resetUrl = `${frontendOrigin(req)}/reset-password?token=${encodeURIComponent(resetToken)}`;
      await sendPasswordResetEmail({
        email: user.email,
        name: user.name,
        resetUrl,
      }).catch((error) => {
        console.error("Password reset email delivery failed", error);
      });

      if (env.NODE_ENV !== "production") {
        response.resetToken = resetToken;
        response.resetUrl = resetUrl;
      }

      await createAuditLog({
        userId: user.id,
        action: "PASSWORD_RESET_REQUESTED",
        resource: "User",
        resourceId: user.id,
      });
    }

    res.json(response);
  }),
);

router.post(
  "/auth/reset-password",
  validate(resetPasswordSchema),
  asyncHandler(async (req, res) => {
    const { token, password } = req.body;
    let payload: unknown;

    try {
      payload = jwt.verify(token, env.JWT_SECRET);
    } catch {
      throw new AppError(400, "Password reset link is invalid or has expired");
    }

    const tokenPayload = z
      .object({
        sub: z.string().min(1),
        email: z.string().email(),
        purpose: z.literal("password-reset"),
        marker: z.string().min(1),
      })
      .safeParse(payload);

    if (!tokenPayload.success) {
      throw new AppError(400, "Password reset link is invalid or has expired");
    }

    const data = tokenPayload.data;

    const user = await prisma.user.findUnique({
      where: { id: data.sub },
    });

    if (!user || user.email !== data.email || data.marker !== passwordMarker(user.passwordHash)) {
      throw new AppError(400, "Password reset link is invalid or has expired");
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(password),
      },
    });

    await createAuditLog({
      userId: user.id,
      action: "PASSWORD_RESET_COMPLETED",
      resource: "User",
      resourceId: user.id,
    });

    res.json({
      success: true,
      message: "Password has been reset. You can now sign in with the new password.",
    });
  }),
);

router.get(
  "/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const user = await getUserWithProfiles(currentUser.id);

    res.json({
      success: true,
      user,
    });
  }),
);

router.post(
  "/auth/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);

    await createAuditLog({
      userId: currentUser.id,
      action: "USER_LOGGED_OUT",
      resource: "User",
      resourceId: currentUser.id,
    });

    res.json({
      success: true,
      message: "Logout successful. Discard the JWT on the client side.",
    });
  }),
);

router.patch(
  "/users/profile",
  requireAuth,
  validate(updateUserProfileSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const { name, nameThai, avatar, phone, currentPassword, newPassword, roleData } = req.body;

    const existingUser = await prisma.user.findUnique({
      where: { id: currentUser.id },
    });

    if (!existingUser) {
      throw new AppError(404, "User not found");
    }

    let passwordHash: string | undefined;
    if (newPassword) {
      if (!currentPassword) {
        throw new AppError(400, "currentPassword is required to set a new password");
      }

      const isPasswordValid = await comparePassword(currentPassword, existingUser.passwordHash);
      if (!isPasswordValid) {
        throw new AppError(401, "Current password is incorrect");
      }

      passwordHash = await hashPassword(newPassword);
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: currentUser.id },
        data: {
          name,
          nameThai,
          avatar,
          phone,
          ...(passwordHash ? { passwordHash } : {}),
        },
      });

      switch (currentUser.role) {
        case Role.STUDENT:
          await tx.studentProfile.update({
            where: { userId: currentUser.id },
            data: {
              major: roleData.major,
              program: roleData.program,
              year: roleData.year,
              semester: roleData.semester,
              academicYear: roleData.academicYear,
              cvUrl: roleData.cvUrl,
            },
          });
          break;
        case Role.LECTURER:
          await tx.lecturerProfile.update({
            where: { userId: currentUser.id },
            data: {
              department: roleData.department,
              position: roleData.position,
              specialization: Array.isArray(roleData.specialization)
                ? roleData.specialization.map(String)
                : undefined,
              researchInterests: Array.isArray(roleData.researchInterests)
                ? roleData.researchInterests.map(String)
                : undefined,
            },
          });
          break;
        case Role.STAFF:
          await tx.staffProfile.update({
            where: { userId: currentUser.id },
            data: {
              department: roleData.department,
              position: roleData.position,
              permissions: Array.isArray(roleData.permissions)
                ? roleData.permissions.map(String)
                : undefined,
            },
          });
          break;
        case Role.COMPANY:
          await tx.companyProfile.update({
            where: { userId: currentUser.id },
            data: {
              companyName: roleData.companyName,
              companyNameThai: roleData.companyNameThai,
              industry: roleData.industry,
              size: roleData.size,
              website: roleData.website,
              address: roleData.address,
              locationMapUrl: roleData.locationMapUrl,
              productsServices: roleData.productsServices,
              contactPersonName: roleData.contactPersonName,
              contactPersonRole: roleData.contactPersonRole,
              contactPersonEmail: roleData.contactPersonEmail,
              contactPersonPhone: roleData.contactPersonPhone,
              socialMedia: roleData.socialMedia,
              onboardingStatus: roleData.onboardingStatus,
              privacyProtocolAcceptedAt: roleData.privacyProtocolAcceptedAt
                ? new Date(String(roleData.privacyProtocolAcceptedAt))
                : undefined,
            },
          });
          break;
        case Role.ADMIN:
          await tx.adminProfile.update({
            where: { userId: currentUser.id },
            data: {
              permissions: Array.isArray(roleData.permissions)
                ? roleData.permissions.map(String)
                : undefined,
              isSuperAdmin:
                typeof roleData.isSuperAdmin === "boolean"
                  ? roleData.isSuperAdmin
                  : undefined,
            },
          });
          break;
      }
    });

    await createAuditLog({
      userId: currentUser.id,
      action: "USER_PROFILE_UPDATED",
      resource: "User",
      resourceId: currentUser.id,
      changes: { name, nameThai, phone, role: currentUser.role },
    });

    res.json({
      success: true,
      user: await getUserWithProfiles(currentUser.id),
    });
  }),
);

router.get(
  "/users/bootstrap",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  asyncHandler(async (_req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        studentProfile: true,
        lecturerProfile: true,
        staffProfile: true,
        companyProfile: true,
        adminProfile: true,
      },
    });

    res.json({
      success: true,
      users,
    });
  }),
);

export const authRoutes = router;
