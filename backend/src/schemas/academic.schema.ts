import { z } from "zod";

export const courseQuerySchema = z.object({
  q: z.string().optional(),
  semester: z.coerce.number().int().optional(),
  academicYear: z.string().optional(),
  lecturerId: z.string().optional(),
});

export const courseCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  nameThai: z.string().min(1),
  credits: z.coerce.number().int().positive(),
  semester: z.coerce.number().int().positive(),
  academicYear: z.string().min(1),
  year: z.coerce.number().int().positive(),
  lecturerId: z.string().min(1),
  description: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  learningOutcomes: z.array(z.string()).default([]),
  syllabus: z.string().optional(),
  schedule: z.any().optional(),
  room: z.string().optional(),
  status: z.string().optional(),
  maxStudents: z.coerce.number().int().positive().default(60),
  minStudents: z.coerce.number().int().nonnegative().default(0),
  sections: z
    .array(
      z.object({
        number: z.string().min(1),
        room: z.string().optional(),
        facilityId: z.string().optional(),
        maxStudents: z.coerce.number().int().positive().default(60),
        schedule: z.any(),
      }),
    )
    .default([]),
  materials: z
    .array(
      z.object({
        title: z.string().min(1),
        type: z.string().min(1),
        url: z.string().url(),
        size: z.string().optional(),
      }),
    )
    .default([]),
});

export const courseUpdateSchema = courseCreateSchema.partial().extend({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  credits: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().positive().optional(),
  academicYear: z.string().min(1).optional(),
  year: z.coerce.number().int().positive().optional(),
  lecturerId: z.string().min(1).optional(),
});

export const enrollSchema = z.object({
  studentId: z.string().min(1).optional(),
  courseId: z.string().min(1),
  sectionId: z.string().optional(),
});

export const gradeBulkSchema = z.object({
  grades: z.array(
    z.object({
      enrollmentId: z.string().optional(),
      studentId: z.string().min(1),
      courseId: z.string().min(1),
      midterm: z.coerce.number().optional(),
      final: z.coerce.number().optional(),
      assignments: z.coerce.number().optional(),
      participation: z.coerce.number().optional(),
      project: z.coerce.number().optional(),
      total: z.coerce.number().optional(),
      letterGrade: z.string().optional(),
      remarks: z.string().optional(),
      reason: z.string().optional(),
    }),
  ),
});

export const gradesHistoryParamsSchema = z.object({
  studentId: z.string().min(1),
});

export const transcriptQuerySchema = z.object({
  studentId: z.string().optional(),
});

export const attendanceQuerySchema = z.object({
  courseId: z.string().optional(),
  studentId: z.string().optional(),
});

export const attendanceCheckInSchema = z.object({
  enrollmentId: z.string().min(1),
  date: z.coerce.date(),
  status: z.string().default("present"),
});

export const assignmentsQuerySchema = z.object({
  courseId: z.string().optional(),
  includeSubmissions: z.coerce.boolean().optional(),
});

export const assignmentCreateSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.string().min(1),
  dueDate: z.coerce.date(),
  maxScore: z.coerce.number().positive(),
  isPublished: z.boolean().optional(),
});

export const assignmentUpdateSchema = assignmentCreateSchema.partial();

export const assignmentParamsSchema = z.object({
  id: z.string().min(1),
});

export const submissionCreateSchema = z.object({
  files: z.array(z.string().min(1)).min(1),
});

export const submissionUpdateSchema = z.object({
  score: z.coerce.number().min(0).optional(),
  feedback: z.string().optional(),
  status: z.string().optional(),
});
