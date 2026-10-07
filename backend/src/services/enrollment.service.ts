import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { findEnrollmentViolation, MAX_TERM_CREDITS, parseSlots } from "./enrollment-rules";
import { getLecturerProfileByUserId, getStudentProfileByAnyId, getStudentProfileByUserId } from "./profile.service";

export const getEnrollments = async (currentUser: any, query: { studentId?: string; courseId?: string }) => {
  const { studentId, courseId } = query;
  let where: Record<string, unknown> = {};

  if (currentUser.role === Role.STUDENT) {
    const student = await getStudentProfileByUserId(currentUser.id);
    where = { studentId: student.id };
  } else if (currentUser.role === Role.COMPANY) {
    throw new AppError(403, "Companies cannot list enrollments");
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
    where: { ...where, status: { not: "dropped" } }, // ไม่แสดงวิชาที่ถอนแล้ว
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

const enrollmentInclude = {
  student: { include: { user: true } },
  course: true,
  section: true,
} as const;

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

  const course = await prisma.course.findUnique({ where: { id: data.courseId }, include: { sections: true } });
  if (!course) {
    throw new AppError(404, "Course not found");
  }

  if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    if (course.lecturerId !== lecturer.id) {
      throw new AppError(403, "Lecturers can only enroll students in their own courses");
    }
  }

  // every role: the section must belong to this course
  let section: (typeof course.sections)[number] | null = null;
  if (course.sections.length > 0) {
    if (!data.sectionId) throw new AppError(400, "sectionId is required for a course with sections");
    section = course.sections.find((s) => s.id === data.sectionId) ?? null;
    if (!section) throw new AppError(400, "Section does not belong to this course");
  } else if (data.sectionId) {
    throw new AppError(400, "This course has no sections");
  }

  // owner decision 7/10/69: staff/admin enroll on the faculty's behalf and skip the registration rules
  const skipRules = currentUser.role === Role.STAFF || currentUser.role === Role.ADMIN;

  try {
    return await prisma.$transaction(async (tx) => {
      // serialize per student (credits, times, duplicates) and per section (seats)
      await tx.$queryRaw`SELECT id FROM "StudentProfile" WHERE id = ${student.id} FOR UPDATE`;
      if (section) await tx.$queryRaw`SELECT id FROM "Section" WHERE id = ${section.id} FOR UPDATE`;

      const existing = await tx.enrollment.findFirst({ where: { studentId: student.id, courseId: course.id } });
      if (existing && existing.status !== "dropped") {
        throw new AppError(409, "Student is already enrolled in this course");
      }

      if (!skipRules) {
        const history = await tx.enrollment.findMany({
          where: { studentId: student.id },
          include: { course: { select: { code: true, credits: true, semester: true, academicYear: true } }, section: { select: { schedule: true } } },
        });
        const known = await tx.course.findMany({ where: { code: { in: course.prerequisites } }, select: { code: true } });
        const seatsTaken = section
          ? await tx.enrollment.count({ where: { sectionId: section.id, status: { not: "dropped" } } })
          : 0;

        const violation = findEnrollmentViolation({
          student: { semester: student.semester, academicYear: student.academicYear },
          course,
          section: section ? { maxStudents: section.maxStudents, slots: parseSlots(section.schedule) } : null,
          sectionSeatsTaken: seatsTaken,
          knownCourseCodes: new Set(known.map((k) => k.code)),
          history: history.map((e) => ({ courseCode: e.course.code, status: e.status, letterGrade: e.letterGrade })),
          termEnrollments: history
            .filter(
              (e) =>
                e.courseId !== course.id &&
                e.status !== "dropped" &&
                e.letterGrade !== "W" &&
                e.course.semester === course.semester &&
                e.course.academicYear === course.academicYear,
            )
            .map((e) => ({ courseCode: e.course.code, credits: e.course.credits, letterGrade: e.letterGrade, slots: parseSlots(e.section?.schedule) })),
        });
        if (violation) throw new AppError(violation.status, violation.message);
      }

      // re-enrolling after a drop reuses the row (unique studentId+courseId) and starts clean
      if (existing) {
        await tx.enrollmentScore.deleteMany({ where: { enrollmentId: existing.id } });
      }
      const enrollment = existing
        ? await tx.enrollment.update({
            where: { id: existing.id },
            data: { status: "enrolled", sectionId: section?.id ?? null, total: null, letterGrade: null, remarks: null, gradedBy: null, gradedAt: null },
            include: enrollmentInclude,
          })
        : await tx.enrollment.create({
            data: { studentId: student.id, courseId: course.id, sectionId: section?.id ?? null },
            include: enrollmentInclude,
          });

      await tx.timelineEvent.create({
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
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "Student is already enrolled in this course");
    }
    throw error;
  }
};

export const dropCourseByStudent = async (currentUser: any, courseId: string) => {
  const student = await getStudentProfileByUserId(currentUser.id);
  const existing = await prisma.enrollment.findFirst({
    where: {
      courseId,
      studentId: student.id,
      status: { not: "dropped" } // หาเฉพาะวิชาที่ยังลงอยู่
    },
    include: {
      student: { include: { user: true } },
      course: true
    }
  });

  if (!existing) {
    throw new AppError(404, "Enrollment not found");
  }
  // owner decision 7/10/69: a course that already has a grade stays on the record
  if (existing.letterGrade !== null) {
    throw new AppError(409, "A graded course cannot be dropped");
  }

  // soft delete: เปลี่ยนสถานะเป็น dropped (กัน FK กับ gradeHistory/scores + เก็บประวัติเกรด)
  await prisma.enrollment.update({
    where: { id: existing.id },
    data: { status: "dropped" }
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

export const getRegistrationSummary = async (currentUser: any) => {
  const student = await getStudentProfileByUserId(currentUser.id);
  const rows = await prisma.enrollment.findMany({
    where: { studentId: student.id, status: { not: "dropped" } },
    select: { letterGrade: true, course: { select: { credits: true, semester: true, academicYear: true } } },
  });
  // same definition as the credit limit check: this term, not dropped, not W
  const termCredits = rows
    .filter((r) => r.letterGrade !== "W" && r.course.semester === student.semester && r.course.academicYear === student.academicYear)
    .reduce((sum, r) => sum + r.course.credits, 0);
  const inProgressCredits = rows.filter((r) => r.letterGrade === null).reduce((sum, r) => sum + r.course.credits, 0);
  return { semester: student.semester, academicYear: student.academicYear, termCredits, inProgressCredits, maxCredits: MAX_TERM_CREDITS };
};
