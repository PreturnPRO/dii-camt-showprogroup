import { Role } from "@prisma/client";
import { z } from "zod";

export const userQuerySchema = z.object({
  q: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

export const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  nameThai: z.string().optional(),
  role: z.nativeEnum(Role),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  isActive: z.boolean().optional(),
  profile: z.record(z.any()).default({}),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  roleData: z.record(z.any()).default({}),
});

export const directoryQuerySchema = z.object({
  q: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
});

export const lecturerQuerySchema = z.object({
  q: z.string().optional(),
});

export const companyQuerySchema = z.object({
  q: z.string().optional(),
});

export const notificationBroadcastSchema = z.object({
  title: z.string().min(1),
  titleThai: z.string().optional(),
  message: z.string().min(1),
  messageThai: z.string().optional(),
  type: z.string().default("info"),
  priority: z.string().default("medium"),
  channels: z.array(z.string()).default(["in-app"]),
  targetRoles: z.array(z.nativeEnum(Role)).default([]),
  userIds: z.array(z.string()).default([]),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
});
