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

const normalizePhone = (value: unknown) => {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("66")) {
    digits = "0" + digits.slice(2);
  }
  if (digits.length > 0 && !digits.startsWith("0")) {
    if (digits.length === 9 || digits.length === 8) {
      digits = "0" + digits;
    }
  }
  return digits;
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
});

export const login = asyncHandler(async (req, res) => {
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
});

export const companyLogin = asyncHandler(async (req, res) => {
  const submittedPhone = normalizePhone(req.body.phone);

  const users = await prisma.user.findMany({
    where: {
      role: Role.COMPANY,
      isActive: true,
    },
    include: {
      companyProfile: true,
    },
  });

  const user = users.find((item) => {
    const userPhone = normalizePhone(item.phone);
    const contactPhone = normalizePhone(item.companyProfile?.contactPersonPhone);
    return (
      (userPhone && userPhone === submittedPhone) ||
      (contactPhone && contactPhone === submittedPhone)
    );
  });

  if (!user) {
    throw new AppError(401, "Invalid company phone number");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLogin: new Date() },
  });

  const token = signToken({ sub: user.id, role: user.role, email: user.email });

  await createAuditLog({
    userId: user.id,
    action: "COMPANY_PHONE_LOGIN",
    resource: "User",
    resourceId: user.id,
    changes: { phoneLoginAt: new Date().toISOString() },
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
    include: { companyProfile: true },
  });

  if (!existingUser) {
    throw new AppError(404, "User not found");
  }

  if (email && email !== existingUser.email) {
    const duplicateEmail = await prisma.user.findUnique({
      where: { email },
    });
    if (duplicateEmail) {
      throw new AppError(409, "Email is already in use by another account");
    }
  }

  let passwordHash: string | undefined;
  if (newPassword) {
    const canSetCompanyFirstPassword =
      currentUser.role === Role.COMPANY &&
      existingUser.companyProfile?.onboardingStatus !== "completed";

    if (!currentPassword && !canSetCompanyFirstPassword) {
      throw new AppError(400, "currentPassword is required to set a new password");
    }

    if (currentPassword) {
      const isPasswordValid = await comparePassword(currentPassword, existingUser.passwordHash);
      if (!isPasswordValid) {
        throw new AppError(401, "Current password is incorrect");
      }
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
