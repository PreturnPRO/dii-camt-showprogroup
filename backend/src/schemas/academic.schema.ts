import { z } from "zod";
import { ATTENDANCE_STATUSES } from "../services/attendance";
import { ALL_GRADES, COUNTED_GRADES } from "../services/gpa";
import { httpUrl } from "./url";

export const courseQuerySchema = z.object({
  q: z.string().optional(),
  semester: z.coerce.number().int().optional(),
  academicYear: z.string().optional(),
  lecturerId: z.string().optional(),
});

const gradingCriterionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  weightPercentage: z.coerce.number().min(0).max(100),
  maxScore: z.coerce.number().positive(),
  orderIndex: z.coerce.number().int().min(0).optional(),
});

// cutoffs map a total to a counted grade; W and I are never computed from scores
const gradeCutoffSchema = z.object({
  grade: z.enum(COUNTED_GRADES),
  minScore: z.coerce.number().min(0).max(100),
});

export const courseCreateSchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  nameThai: z.string().min(1),
  credits: z.coerce.number().int().positive(),
  semester: z.coerce.number().int().nonnegative(),
  academicYear: z.string().min(1),
  year: z.coerce.number().int().positive(),
  lecturerId: z.string().min(1),
  description: z.string().optional(),
  prerequisites: z.array(z.string()).default([]),
  learningOutcomes: z.array(z.string()).default([]),
  syllabus: z.string().optional(),
  status: z.string().optional(),
  sections: z
    .array(
      z.object({
        number: z.string().min(1),
        room: z.string().optional(),
        facilityId: z.string().optional(),
        maxStudents: z.coerce.number().int().positive().default(60),
        minStudents: z.coerce.number().int().nonnegative().default(0),
        schedule: z.any(),
      }),
    )
    .default([]),
  materials: z
    .array(
      z.object({
        title: z.string().min(1),
        type: z.string().min(1),
        url: httpUrl,
        size: z.string().optional(),
      }),
    )
    .default([]),
  gradingCriteria: z.array(gradingCriterionSchema).optional(),
  gradeCutoffs: z.array(gradeCutoffSchema).optional(),
});

export const courseUpdateSchema = courseCreateSchema.partial().extend({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  credits: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().nonnegative().optional(),
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
  grades: z
    .array(
      z.object({
        enrollmentId: z.string().optional(),
        studentId: z.string().min(1),
        courseId: z.string().min(1),
        scores: z
          .array(
            z.object({
              criteriaId: z.string().min(1),
              score: z.coerce.number().min(0),
            }),
          )
          .optional(),
        total: z.coerce.number().min(0).max(100).optional(),
        letterGrade: z.enum(ALL_GRADES).optional(),
        remarks: z.string().optional(),
        reason: z.string().optional(),
      }),
    )
    .min(1),
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
  status: z.enum(ATTENDANCE_STATUSES),
});

export const startAttendanceSessionSchema = z.object({
  courseId: z.string().min(1),
  durationMinutes: z.coerce.number().int().positive().default(15),
});

export const qrCheckInSchema = z.object({
  token: z.string().min(1),
});
export const attendanceSummaryParamsSchema = z.object({
  courseId: z.string().min(1),
});

export const attendanceHistoryParamsSchema = z.object({
  courseId: z.string().min(1),
  studentId: z.string().min(1),
});

export const closeSessionParamsSchema = z.object({
  id: z.string().min(1),
});
