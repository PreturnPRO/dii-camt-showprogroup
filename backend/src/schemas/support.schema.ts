import { z } from "zod";

export const requestSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  documents: z.array(z.string()).default([]),
});

export const requestCommentSchema = z.object({
  text: z.string().min(1),
});

export const requestStatusSchema = z.object({
  status: z.string().min(1),
  reviewNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  completedAt: z.coerce.date().optional(),
});

export const appointmentSchema = z.object({
  lecturerId: z.string().min(1),
  date: z.coerce.date(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().min(1),
  purpose: z.string().min(1),
  notes: z.string().optional(),
});

export const appointmentStatusSchema = z.object({
  status: z.string().min(1),
  meetingNotes: z.string().optional(),
  followUp: z.string().optional(),
});

export const officeHourQuerySchema = z.object({
  date: z.string().optional(),
});

export const officeHoursUpdateSchema = z.object({
  officeHours: z.array(
    z.object({
      day: z.string().min(1),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
      location: z.string().min(1),
      isAvailable: z.boolean().optional(),
    }),
  ),
});

export const messageCreateSchema = z.object({
  toId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.string().default("general"),
  attachments: z.array(z.object({ name: z.string(), url: z.string().url(), size: z.string() })).optional(),
});
