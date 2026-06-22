import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

export const getGradesDistribution = async (courseId: string) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { courseId, status: { not: "dropped" } },
    select: { letterGrade: true },
  });

  const distribution = enrollments.reduce((acc: Record<string, number>, curr) => {
    const grade = curr.letterGrade || "Pending";
    acc[grade] = (acc[grade] || 0) + 1;
    return acc;
  }, {});

  return distribution;
};

export const getStudentTranscript = async (studentId: string) => {
  return await prisma.enrollment.findMany({
    where: { studentId },
    include: {
      course: true,
      section: true,
    },
    orderBy: [{ course: { academicYear: "desc" } }, { course: { semester: "desc" } }],
  });
};

export const getAttendance = async (query: { courseId?: string; studentId?: string }) => {
  return await prisma.attendanceRecord.findMany({
    where: {
      ...(query.courseId ? { enrollment: { courseId: String(query.courseId) } } : {}),
      ...(query.studentId ? { enrollment: { studentId: String(query.studentId) } } : {}),
    },
    include: {
      enrollment: {
        include: {
          student: { include: { user: true } },
          course: true,
        },
      },
    },
    orderBy: { date: "desc" },
  });
};

export const recordAttendance = async (data: { enrollmentId: string; date: Date; status: string }) => {
  return await prisma.attendanceRecord.create({
    data,
    include: {
      enrollment: {
        include: {
          student: { include: { user: true } },
          course: true,
        },
      },
    },
  });
};

export const getAssignments = async (query: { courseId?: string; includeSubmissions?: boolean }) => {
  return await prisma.assignment.findMany({
    where: {
      ...(query.courseId ? { courseId: String(query.courseId) } : {}),
    },
    include: {
      course: true,
      ...(query.includeSubmissions ? { submissions: { include: { student: { include: { user: true } } } } } : {}),
    },
    orderBy: { dueDate: "asc" },
  });
};

export const createAssignment = async (data: any) => {
  return await prisma.assignment.create({
    data,
    include: { course: true },
  });
};

export const submitAssignment = async (assignmentId: string, studentId: string, files: string[]) => {
  return await prisma.submission.create({
    data: {
      assignmentId,
      studentId,
      files,
    },
    include: {
      assignment: true,
      student: { include: { user: true } },
    },
  });
};
