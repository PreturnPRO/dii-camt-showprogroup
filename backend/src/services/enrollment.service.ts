import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { getLecturerProfileByUserId, getStudentProfileByAnyId, getStudentProfileByUserId } from "./profile.service";

export const getEnrollments = async (currentUser: any, query: { studentId?: string; courseId?: string }) => {
  const { studentId, courseId } = query;
  let where: Record<string, unknown> = {};

  if (currentUser.role === Role.STUDENT) {
    const student = await getStudentProfileByUserId(currentUser.id);
    where = { studentId: student.id };
  } else if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    where = { 
      course: { lecturerId: lecturer.id },
      ...(studentId ? { studentId: String(studentId) } : {}),
      ...(courseId ? { courseId: String(courseId) } : {}),
    };
  } else {
    where = {
      ...(studentId ? { studentId: String(studentId) } : {}),
      ...(courseId ? { courseId: String(courseId) } : {}),
    };
  }

  return await prisma.enrollment.findMany({
    where,
    include: {
      student: { include: { user: true } },
      course: {
        include: {
          lecturer: { include: { user: true } },
          sections: { include: { facility: true } },
        },
      },
      section: true,
      history: { orderBy: { modifiedAt: "desc" } },
      attendance: { orderBy: { date: "desc" } },
      scores: { include: { criteria: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const createEnrollment = async (currentUser: any, data: { studentId?: string; courseId: string; sectionId?: string }) => {
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : data.studentId
        ? await getStudentProfileByAnyId(data.studentId)
        : null;

  if (!student) {
    throw new AppError(400, "studentId is required for staff, admin, and lecturer enrollments");
  }

  const existing = await prisma.enrollment.findFirst({
    where: {
      studentId: student.id,
      courseId: data.courseId,
    },
  });

  if (existing) {
    throw new AppError(409, "Student is already enrolled in this course");
  }

  // Check Schedule Conflicts
  const targetCourse = await prisma.course.findUnique({
    where: { id: data.courseId }
  });

  if (!targetCourse) {
    throw new AppError(404, "Course not found");
  }

  const currentEnrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: { course: true }
  });

  const targetSchedule = Array.isArray(targetCourse.schedule) ? targetCourse.schedule as any[] : [];
  
  if (targetSchedule.length > 0) {
    const toMinutes = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return (h || 0) * 60 + (m || 0);
    };

    for (const enrolled of currentEnrollments) {
      const enrolledSchedule = Array.isArray(enrolled.course.schedule) ? enrolled.course.schedule as any[] : [];
      for (const tSlot of targetSchedule) {
        for (const eSlot of enrolledSchedule) {
          if (tSlot.day === eSlot.day) {
            const tStart = toMinutes(tSlot.startTime);
            const tEnd = toMinutes(tSlot.endTime);
            const eStart = toMinutes(eSlot.startTime);
            const eEnd = toMinutes(eSlot.endTime);

            if (Math.max(tStart, eStart) < Math.min(tEnd, eEnd)) {
              throw new AppError(409, `เวลาเรียนชนกับวิชา ${enrolled.course.code} ${enrolled.course.nameThai || enrolled.course.name}`);
            }
          }
        }
      }
    }
  }

  const enrollment = await prisma.enrollment.create({
    data: {
      studentId: student.id,
      courseId: data.courseId,
      sectionId: data.sectionId,
    },
    include: {
      student: { include: { user: true } },
      course: true,
      section: true,
    },
  });

  await prisma.timelineEvent.create({
    data: {
      studentId: enrollment.studentId,
      type: "enrollment",
      title: `Enrolled in ${enrollment.course.code}`,
      titleThai: `ลงทะเบียน ${enrollment.course.code}`,
      description: `ลงทะเบียนเรียนวิชา ${enrollment.course.name} สำเร็จ`,
      semester: enrollment.course.semester,
      academicYear: enrollment.course.academicYear,
      relatedId: enrollment.courseId,
      relatedType: "course",
      tags: ["enrollment", enrollment.course.code],
    },
  });

  return enrollment;
};

export const dropCourseByStudent = async (currentUser: any, courseId: string) => {
  const student = await getStudentProfileByUserId(currentUser.id);
  const existing = await prisma.enrollment.findFirst({
    where: { 
      courseId,
      studentId: student.id
    },
    include: {
      student: { include: { user: true } },
      course: true
    }
  });

  if (!existing) {
    throw new AppError(404, "Enrollment not found");
  }

  await prisma.enrollment.delete({
    where: { id: existing.id }
  });

  await prisma.timelineEvent.create({
    data: {
      studentId: existing.studentId,
      type: "enrollment",
      title: `Dropped ${existing.course.code}`,
      titleThai: `ถอนวิชา ${existing.course.code}`,
      description: `ถอนรายวิชา ${existing.course.name} สำเร็จ`,
      semester: existing.course.semester,
      academicYear: existing.course.academicYear,
      relatedId: existing.courseId,
      relatedType: "course",
      tags: ["enrollment", "dropped", existing.course.code],
    },
  });

  return { message: "Course dropped successfully" };
};
