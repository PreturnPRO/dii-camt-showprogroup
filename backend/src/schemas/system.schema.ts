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

const companyImportRowSchema = z.object({
  rowNumber: z.number().int().positive().optional(),
  companyId: z.string().min(1),
  companyName: z.string().min(1),
  companyNameThai: z.string().optional(),
  phone: z.string().min(1),
  email: z.string().email().optional(),
  password: z.string().min(8).optional(),
  industry: z.string().min(1),
  size: z.string().min(1),
  website: z.string().optional(),
  address: z.string().optional(),
  locationMapUrl: z.string().optional(),
  productsServices: z.string().optional(),
  contactPersonName: z.string().optional(),
  contactPersonRole: z.string().optional(),
  contactPersonEmail: z.string().email().optional(),
  contactPersonPhone: z.string().optional(),
  socialMedia: z.string().optional(),
});

const studentImportRowSchema = z.object({
  rowNumber: z.number().int().positive().optional(),
  studentId: z.string().min(1),
  name: z.string().min(1),
  nameThai: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  major: z.string().min(1),
  program: z.string().min(1),
  year: z.coerce.number().int().positive(),
  semester: z.coerce.number().int().positive(),
  academicYear: z.string().min(1),
  academicStatus: z.string().optional(),
});

export const companyImportSchema = z.object({
  rows: z.array(companyImportRowSchema).min(1).max(1000),
});

export const studentImportSchema = z.object({
  rows: z.array(studentImportRowSchema).min(1).max(1000),
});

export const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  role: z.nativeEnum(Role).optional(), // D-14: อนุญาตให้ admin/staff เปลี่ยน role
  password: z.string().min(8).optional(), // D-15: admin/staff reset password
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
