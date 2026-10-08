import { z } from "zod";
import { httpUrl } from "./url";

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
  status: z.enum(["approved", "rejected", "completed"]),
  reviewNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  completedAt: z.coerce.date().optional(),
});

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use HH:MM");
const WEEKDAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

// a booking names one of the lecturer's office-hour slots on a date; the place comes from that slot (M1)
export const appointmentSchema = z.object({
  lecturerId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
  startTime: hhmm,
  endTime: hhmm,
  location: z.string().optional(),
  purpose: z.string().trim().min(1).max(500),
  notes: z.string().max(2000).optional(),
});

export const appointmentStatusSchema = z.object({
  // pending → confirmed | cancelled, confirmed → completed | cancelled (checked in the controller)
  status: z.enum(["confirmed", "cancelled", "completed"]),
  meetingNotes: z.string().optional(),
  followUp: z.string().optional(),
});

export const officeHourQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD").optional(),
});

export const officeHoursUpdateSchema = z.object({
  officeHours: z
    .array(
      z
        .object({
          day: z.enum(WEEKDAYS),
          startTime: hhmm,
          endTime: hhmm,
          location: z.string().trim().min(1),
          isAvailable: z.boolean().optional(),
        })
        .refine((slot) => slot.startTime < slot.endTime, { message: "A slot must end after it starts", path: ["endTime"] }),
    )
    .max(50)
    // two rows of one day may not overlap, or one lecturer could be booked twice at once
    .refine(
      (slots) =>
        slots.every((a, i) =>
          slots.every((b, j) => i === j || a.day !== b.day || a.endTime <= b.startTime || b.endTime <= a.startTime),
        ),
      { message: "Office hours on the same day must not overlap" },
    ),
});

export const messageCreateSchema = z.object({
  toId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.string().default("general"),
  attachments: z.array(z.object({ name: z.string(), url: httpUrl, size: z.string() })).optional(),
});
