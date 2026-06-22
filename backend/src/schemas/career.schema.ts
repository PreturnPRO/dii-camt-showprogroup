import { z } from "zod";

export const jobQuerySchema = z.object({
  type: z.string().optional(),
  status: z.string().optional(),
  q: z.string().optional(),
  companyId: z.string().optional(),
});

export const jobCreateSchema = z.object({
  companyId: z.string().optional(),
  title: z.string().min(1),
  type: z.string().min(1),
  positions: z.coerce.number().int().positive().default(1),
  description: z.string().min(1),
  responsibilities: z.array(z.string()).default([]),
  requirements: z.array(z.string()).default([]),
  preferredSkills: z.array(z.string()).default([]),
  salary: z.string().optional(),
  benefits: z.array(z.string()).default([]),
  location: z.string().min(1),
  workType: z.string().min(1),
  startDate: z.coerce.date().optional(),
  deadline: z.coerce.date(),
  maxApplicants: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
});

export const jobUpdateSchema = jobCreateSchema.partial();

export const applySchema = z.object({
  jobPostingId: z.string().min(1).optional(),
  coverLetter: z.string().optional(),
  resumeUrl: z.string().url().optional(),
  notes: z.string().optional(),
});

export const updateApplicationSchema = z.object({
  status: z.string().min(1),
  notes: z.string().optional(),
});

export const applicationQuerySchema = z.object({
  jobId: z.string().optional(),
  status: z.string().optional(),
});

export const internshipLogQuerySchema = z.object({
  studentId: z.string().optional(),
});

export const internshipLogCreateSchema = z.object({
  studentId: z.string().optional(),
  date: z.coerce.date(),
  activities: z.string().min(1),
  hours: z.coerce.number().int().positive(),
  learnings: z.string().optional(),
  challenges: z.string().optional(),
});

export const internshipDocumentCreateSchema = z.object({
  studentId: z.string().optional(),
  type: z.string().min(1),
  title: z.string().min(1),
  url: z.string().url(),
});

export const internshipDocumentStatusSchema = z.object({
  status: z.enum(["pending", "approved", "rejected"]),
});

export const talentQuerySchema = z.object({
  jobId: z.string().optional(),
  q: z.string().optional(),
  major: z.string().optional(),
  minGpax: z.coerce.number().optional(),
});
