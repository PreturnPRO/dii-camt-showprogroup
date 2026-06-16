import { z } from "zod";

export const studentProfileParamsSchema = z.object({
  id: z.string().min(1),
});

export const studentProfileUpdateSchema = z.object({
  studentId: z.string().optional(),
  major: z.string().optional(),
  program: z.string().optional(),
  year: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().positive().optional(),
  academicYear: z.string().optional(),
  academicStatus: z.string().optional(),
  cvUrl: z.string().url().optional(),
  advisorId: z.string().optional(),
  skills: z
    .array(
      z.object({
        name: z.string().min(1),
        category: z.string().min(1),
        level: z.string().min(1),
        verifiedBy: z.string().optional(),
        yearsOfExperience: z.coerce.number().int().min(0).optional(),
      }),
    )
    .optional(),
  portfolio: z
    .object({
      summary: z.string().optional(),
      summaryThai: z.string().optional(),
      githubUrl: z.string().url().optional().or(z.literal("")),
      linkedinUrl: z.string().url().optional().or(z.literal("")),
      personalWebsite: z.string().url().optional().or(z.literal("")),
      isPublic: z.boolean().optional(),
      sharedWith: z.array(z.string()).optional(),
      projects: z
        .array(
          z.object({
            title: z.string().min(1),
            description: z.string().min(1),
            technologies: z.array(z.string()).default([]),
            role: z.string().min(1),
            startDate: z.coerce.date(),
            endDate: z.coerce.date().optional(),
            url: z.string().url().optional().or(z.literal("")),
            images: z.array(z.string()).default([]),
            highlights: z.array(z.string()).default([]),
          }),
        )
        .optional(),
    })
    .optional(),
  consent: z
    .object({
      allowDataSharing: z.boolean().optional(),
      allowPortfolioSharing: z.boolean().optional(),
      sharedWithCompanies: z.array(z.string()).optional(),
      emailNotifications: z.boolean().optional(),
      smsNotifications: z.boolean().optional(),
      inAppNotifications: z.boolean().optional(),
      showInLeaderboard: z.boolean().optional(),
      profileVisibility: z.string().optional(),
    })
    .optional(),
});

export const studentStatsQuerySchema = z.object({
  studentId: z.string().optional(),
});

export const studentListQuerySchema = z.object({
  q: z.string().optional(),
  year: z.coerce.number().int().positive().optional(),
  status: z.string().optional(),
  advisorId: z.string().optional(),
});

export const studentProfileQuerySchema = z.object({
  studentId: z.string().optional(),
});
