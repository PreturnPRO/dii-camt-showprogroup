import { z } from "zod";

export const activityCreateSchema = z.object({
  title: z.string().min(1),
  titleThai: z.string().min(1),
  description: z.string().min(1),
  type: z.string().min(1),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  location: z.string().min(1),
  organizer: z.string().min(1),
  activityHours: z.coerce.number().int().nonnegative(),
  gamificationPoints: z.coerce.number().int().nonnegative(),
  maxParticipants: z.coerce.number().int().positive().optional(),
  isGroupActivity: z.boolean().optional(),
  teamSize: z.coerce.number().int().positive().optional(),
  qrCode: z.string().optional(),
  checkInEnabled: z.boolean().optional(),
  status: z.string().optional(),
  registrationStatus: z.string().optional(),
  requiresPeerEvaluation: z.boolean().optional(),
  evaluations: z.any().optional(),
});

export const activityQuerySchema = z.object({
  q: z.string().optional(),
  status: z.string().optional(),
  type: z.string().optional(),
  mine: z.enum(["true", "false"]).optional(),
});

export const activityUpdateSchema = activityCreateSchema.partial();

export const enrollmentStatusSchema = z.object({
  status: z.string().min(1),
});
