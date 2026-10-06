import { Role } from "@prisma/client";
import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import type { SignOptions } from "jsonwebtoken";

import { env } from "../config/env";
import { prisma } from "../lib/prisma";
import { createAuditLog } from "../services/audit.service";
import { getUserWithProfiles } from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { comparePassword, hashPassword, signToken } from "../utils/auth";
import { AppError } from "../utils/errors";
import { assertHttpUrls } from "../schemas/url";
import { requireUser } from "../utils/user";



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

export const register = asyncHandler(async (req, res) => {
  const { email, password, name, nameThai, avatar, phone, profile } = req.body;

  // Public self-registration creates STUDENT accounts only (the schema rejects any other role).
  // Lecturer, staff and company accounts are created by staff/admin through Users management.
  const existingUser = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
  });

  if (existingUser) {
    throw new AppError(409, "Email is already registered");
  }

  assertHttpUrls(profile, ["cvUrl"]);
  const passwordHash = await hashPassword(password);

  const user = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        nameThai,
        role: Role.STUDENT,
        avatar,
        phone,
      },
    });

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
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    include: {
      studentProfile: true,
      lecturerProfile: true,
      staffProfile: true,
      companyProfile: true,
      adminProfile: true,
    },
    omit: { passwordHash: false },
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
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    omit: { passwordHash: false },
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

    if (env.EXPOSE_RESET_TOKEN) {
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
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { token, password } = req.body;
  let payload: unknown;

  try {
    payload = jwt.verify(token, env.JWT_SECRET);
  } catch {
    throw new AppError(400, "Password reset link is invalid or has expired");
  }

  const tokenPayload = {
    success: typeof payload === 'object' && payload !== null && 'sub' in payload && 'email' in payload && 'marker' in payload,
    data: payload as any
  };

  if (!tokenPayload.success || (payload as { purpose?: unknown }).purpose !== "password-reset") {
    throw new AppError(400, "Password reset link is invalid or has expired");
  }

  const data = tokenPayload.data;

  const user = await prisma.user.findUnique({
    where: { id: data.sub },
    omit: { passwordHash: false },
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
});

export const getMe = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const user = await getUserWithProfiles(currentUser.id);

  res.json({
    success: true,
    user,
  });
});

export const logout = asyncHandler(async (req, res) => {
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
});

export const updateProfile = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const { name, nameThai, avatar, phone, email, currentPassword, newPassword, roleData } = req.body;

  const existingUser = await prisma.user.findUnique({
    where: { id: currentUser.id },
    include: { companyProfile: true, studentProfile: { select: { cvUrl: true } } },
    omit: { passwordHash: false },
  });

  if (!existingUser) {
    throw new AppError(404, "User not found");
  }

  if (currentUser.role === Role.STUDENT) assertHttpUrls(roleData, ["cvUrl"], existingUser.studentProfile ?? {});
  if (currentUser.role === Role.COMPANY) {
    assertHttpUrls(roleData, ["website", "locationMapUrl"], existingUser.companyProfile ?? {});
  }

  if (email && email !== existingUser.email) {
    if (!currentPassword) {
      throw new AppError(400, "currentPassword is required to change the email");
    }
    if (!(await comparePassword(currentPassword, existingUser.passwordHash))) {
      throw new AppError(401, "Current password is incorrect");
    }
    const duplicateEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (duplicateEmail) {
      throw new AppError(409, "Email is already in use by another account");
    }
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
        email: email || undefined,
        ...(passwordHash ? { passwordHash, mustChangePassword: false } : {}),
      },
    });

    switch (currentUser.role) {
      case Role.STUDENT:
        await tx.studentProfile.update({
          where: { userId: currentUser.id },
          // academic fields are staff/admin only (audit S6); the UI echoes them, so they are ignored, not rejected
          data: {
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
            // onboardingStatus is set by staff only (audit S6)
            privacyProtocolAcceptedAt: roleData.privacyProtocolAcceptedAt
              ? new Date(String(roleData.privacyProtocolAcceptedAt))
              : undefined,
          },
        });
        break;
      case Role.ADMIN:
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
});

export const bootstrapUsers = asyncHandler(async (_req, res) => {
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
});
