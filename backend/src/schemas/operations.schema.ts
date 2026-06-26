import { z } from "zod";

export const budgetSchema = z.object({
  title: z.string().min(1),
  amount: z.coerce.number().positive(),
  type: z.string().min(1),
  category: z.string().min(1),
  date: z.coerce.date(),
  status: z.string().optional(),
  note: z.string().optional(),
});

export const budgetUpdateSchema = budgetSchema.partial();

export const cooperationSchema = z.object({
  companyId: z.string().min(1),
  title: z.string().min(1),
  type: z.string().min(1),
  details: z.string().optional(),
  expiryDate: z.coerce.date().optional(),
  status: z.string().optional(),
});

export const workloadSchema = z.object({
  lecturerId: z.string().optional(),
  academicYear: z.string().min(1),
  semester: z.coerce.number().int().positive(),
  teachingHours: z.coerce.number().int().nonnegative(),
  researchHours: z.coerce.number().int().nonnegative(),
  advisingHours: z.coerce.number().int().nonnegative(),
  serviceHours: z.coerce.number().int().nonnegative().default(0),
});

export const paymentSchema = z.object({
  companyId: z.string().optional(),
  amount: z.coerce.number().positive(),
  planName: z.string().min(1),
  status: z.string().optional(),
  receiptUrl: z.string().url().optional(),
  referenceNumber: z.string().optional(),
});

export const paymentQuerySchema = z.object({
  companyId: z.string().optional(),
});
