import { Role } from "@prisma/client";
import { z } from "zod";

export const roleSchema = z.nativeEnum(Role);

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  nameThai: z.string().min(1),
  role: roleSchema,
  avatar: z.string().url().optional(),
  phone: z.string().optional(),
  profile: z.record(z.any()).default({}),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const companyLoginSchema = z.object({
  phone: z.string().min(6),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
});

export const avatarSchema = z
  .string()
  .refine(
    (value) => {
      if (value.startsWith("/api/files/")) return true;
      return z.string().url().safeParse(value).success;
    },
    { message: "Avatar must be a URL or managed file path" },
  );

export const updateUserProfileSchema = z.object({
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  avatar: avatarSchema.nullable().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().min(8).optional(),
  newPassword: z.string().min(8).optional(),
  roleData: z.record(z.any()).default({}),
});
