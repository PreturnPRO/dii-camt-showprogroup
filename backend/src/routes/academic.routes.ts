import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/passport";
import { prisma } from "../lib/prisma";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import { prepareCourseSections } from "../services/facility.service";
import { bulkUpdateGrades } from "../services/grade.service";
import {
  getLecturerProfileByUserId,
  getStudentProfileByAnyId,
  getStudentProfileByUserId,
} from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";

const router = Router();

const courseQuerySchema = z.object({
  q: z.string().optional(),
  semester: z.coerce.number().int().optional(),
  academicYear: z.string().optional(),
  lecturerId: z.string().optional(),
});

const courseCreateSchema = z.object({
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

const courseUpdateSchema = courseCreateSchema.partial().extend({
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  credits: z.coerce.number().int().positive().optional(),
  semester: z.coerce.number().int().positive().optional(),
  academicYear: z.string().min(1).optional(),
  year: z.coerce.number().int().positive().optional(),
  lecturerId: z.string().min(1).optional(),
});

const enrollSchema = z.object({
  studentId: z.string().min(1).optional(),
  courseId: z.string().min(1),
  sectionId: z.string().optional(),
});

const gradeBulkSchema = z.object({
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

const gradesHistoryParamsSchema = z.object({
  studentId: z.string().min(1),
});

const transcriptQuerySchema = z.object({
  studentId: z.string().optional(),
});

const attendanceQuerySchema = z.object({
  courseId: z.string().optional(),
  studentId: z.string().optional(),
});

const attendanceCheckInSchema = z.object({
  enrollmentId: z.string().min(1),
  date: z.coerce.date(),
  status: z.string().default("present"),
});

const assignmentsQuerySchema = z.object({
  courseId: z.string().optional(),
  includeSubmissions: z.coerce.boolean().optional(),
});

const assignmentCreateSchema = z.object({
  courseId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  type: z.string().min(1),
  dueDate: z.coerce.date(),
  maxScore: z.coerce.number().positive(),
  isPublished: z.boolean().optional(),
});

const assignmentUpdateSchema = assignmentCreateSchema.partial();

const assignmentParamsSchema = z.object({
  id: z.string().min(1),
});

const submissionCreateSchema = z.object({
  files: z.array(z.string().min(1)).min(1),
});

const submissionUpdateSchema = z.object({
  score: z.coerce.number().min(0).optional(),
  feedback: z.string().optional(),
  status: z.string().optional(),
});

router.get(
  "/courses",
  validate(courseQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const { q, semester, academicYear, lecturerId } = req.query;

    const courses = await prisma.course.findMany({
      where: {
        AND: [
          q
            ? {
                OR: [
                  { code: { contains: String(q), mode: "insensitive" } },
                  { name: { contains: String(q), mode: "insensitive" } },
                  { nameThai: { contains: String(q), mode: "insensitive" } },
                ],
              }
            : {},
          semester ? { semester: Number(semester) } : {},
          academicYear ? { academicYear: String(academicYear) } : {},
          lecturerId ? { lecturerId: String(lecturerId) } : {},
        ],
      },
      include: {
        lecturer: { include: { user: true } },
        sections: { include: { facility: true } },
        materials: true,
        assignments: true,
        enrollments: true,
      },
      orderBy: [{ academicYear: "desc" }, { semester: "desc" }, { code: "asc" }],
    });

    res.json({
      success: true,
      courses,
    });
  }),
);

router.get(
  "/courses/:id",
  asyncHandler(async (req, res) => {
    const courseIdentifier = String(req.params.id);
    const course = await prisma.course.findFirst({
      where: {
        OR: [{ id: courseIdentifier }, { code: courseIdentifier }],
      },
      include: {
        lecturer: { include: { user: true } },
        sections: { include: { facility: true } },
        materials: true,
        assignments: { include: { submissions: true } },
        enrollments: {
          include: {
            student: { include: { user: true } },
            section: true,
            history: true,
            attendance: true,
          },
        },
      },
    });

    if (!course) {
      throw new AppError(404, "Course not found");
    }

    res.json({
      success: true,
      course,
    });
  }),
);

router.post(
  "/courses",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN, Role.LECTURER]),
  validate(courseCreateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const sections = await prepareCourseSections(req.body.sections);
    const course = await prisma.course.create({
      data: {
        code: req.body.code,
        name: req.body.name,
        nameThai: req.body.nameThai,
        credits: req.body.credits,
        semester: req.body.semester,
        academicYear: req.body.academicYear,
        year: req.body.year,
        lecturerId: req.body.lecturerId,
        description: req.body.description,
        prerequisites: req.body.prerequisites,
        learningOutcomes: req.body.learningOutcomes,
        syllabus: req.body.syllabus,
        schedule: req.body.schedule,
        room: req.body.room,
        status: req.body.status || (currentUser.role === Role.LECTURER ? "pending" : "active"),
        maxStudents: req.body.maxStudents,
        minStudents: req.body.minStudents,
        sections: {
          create: sections.map((section) => ({
            number: section.number,
            room: section.room,
            facilityId: section.facilityId ?? undefined,
            maxStudents: section.maxStudents,
            schedule: section.schedule,
          })),
        },
        materials: {
          create: req.body.materials,
        },
      },
      include: {
        lecturer: { include: { user: true } },
        sections: { include: { facility: true } },
        materials: true,
      },
    });

    res.status(201).json({
      success: true,
      course,
    });
  }),
);

router.patch(
  "/courses/:id",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(courseUpdateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const courseId = String(req.params.id);
    const existing = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: { include: { facility: true } },
        materials: true,
      },
    });

    if (!existing) {
      throw new AppError(404, "Course not found");
    }

    if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      if (existing.lecturerId !== lecturer.id) {
        throw new AppError(403, "You can only update your own courses");
      }
      if (req.body.lecturerId && req.body.lecturerId !== lecturer.id) {
        throw new AppError(403, "Lecturers cannot reassign courses");
      }
    }

    const sections = req.body.sections
      ? await prepareCourseSections(req.body.sections, existing.id)
      : null;

    const course = await prisma.$transaction(async (tx) => {
      if (sections) {
        await tx.section.deleteMany({
          where: { courseId: existing.id },
        });
      }

      if (req.body.materials) {
        await tx.courseMaterial.deleteMany({
          where: { courseId: existing.id },
        });
      }

      return tx.course.update({
        where: { id: existing.id },
        data: {
          code: req.body.code,
          name: req.body.name,
          nameThai: req.body.nameThai,
          credits: req.body.credits,
          semester: req.body.semester,
          academicYear: req.body.academicYear,
          year: req.body.year,
          lecturerId: req.body.lecturerId,
          description: req.body.description,
          prerequisites: req.body.prerequisites,
          learningOutcomes: req.body.learningOutcomes,
          syllabus: req.body.syllabus,
          schedule: req.body.schedule,
          room: req.body.room,
          status: req.body.status,
          maxStudents: req.body.maxStudents,
          minStudents: req.body.minStudents,
          sections: sections
            ? {
                create: sections.map((section) => ({
                  number: section.number,
                  room: section.room,
                  facilityId: section.facilityId ?? undefined,
                  maxStudents: section.maxStudents,
                  schedule: section.schedule,
                })),
              }
            : undefined,
          materials: req.body.materials
            ? {
                create: req.body.materials,
              }
            : undefined,
        },
        include: {
          lecturer: { include: { user: true } },
          sections: { include: { facility: true } },
          materials: true,
          assignments: true,
        },
      });
    });

    res.json({
      success: true,
      course,
    });
  }),
);

const scheduleHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);

  if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    return res.json({
      success: true,
      lecturer,
      schedule: lecturer.courses,
    });
  }

  if (req.query.lecturerId) {
    const lecturer = await prisma.lecturerProfile.findFirst({
      where: {
        OR: [{ id: String(req.query.lecturerId) }, { lecturerId: String(req.query.lecturerId) }],
      },
      include: {
        user: true,
        courses: {
          include: {
            sections: { include: { facility: true } },
            enrollments: true,
          },
        },
      },
    });

    if (!lecturer) {
      throw new AppError(404, "Lecturer profile not found");
    }

    return res.json({
      success: true,
      lecturer,
      schedule: lecturer.courses,
    });
  }

  throw new AppError(400, "lecturerId query is required for non-lecturer roles");
});

router.get("/lecturer/schedule", requireAuth, scheduleHandler);
router.get("/courses/lecturer/schedule", requireAuth, scheduleHandler);

router.get(
  "/enrollments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const { studentId, courseId } = req.query;

    let where: Record<string, unknown> = {};

    if (currentUser.role === Role.STUDENT) {
      const student = await getStudentProfileByUserId(currentUser.id);
      where = { studentId: student.id };
    } else if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      where = { course: { lecturerId: lecturer.id } };
    } else {
      where = {
        ...(studentId ? { studentId: String(studentId) } : {}),
        ...(courseId ? { courseId: String(courseId) } : {}),
      };
    }

    const enrollments = await prisma.enrollment.findMany({
      where,
      include: {
        student: { include: { user: true } },
        course: true,
        section: true,
        history: { orderBy: { modifiedAt: "desc" } },
        attendance: { orderBy: { date: "desc" } },
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      enrollments,
    });
  }),
);

router.post(
  "/enrollments",
  requireAuth,
  checkRole([Role.STUDENT, Role.STAFF, Role.ADMIN, Role.LECTURER]),
  validate(enrollSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const student =
      currentUser.role === Role.STUDENT
        ? await getStudentProfileByUserId(currentUser.id)
        : req.body.studentId
          ? await getStudentProfileByAnyId(req.body.studentId)
          : null;

    if (!student) {
      throw new AppError(400, "studentId is required for staff, admin, and lecturer enrollments");
    }

    const existing = await prisma.enrollment.findFirst({
      where: {
        studentId: student.id,
        courseId: req.body.courseId,
      },
    });

    if (existing) {
      throw new AppError(409, "Student is already enrolled in this course");
    }

    const enrollment = await prisma.enrollment.create({
      data: {
        studentId: student.id,
        courseId: req.body.courseId,
        sectionId: req.body.sectionId,
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

    res.status(201).json({
      success: true,
      enrollment,
    });
  }),
);

const gradeBulkHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const updates = await bulkUpdateGrades(currentUser.id, req.body.grades, req.ip);

  res.json({
    success: true,
    updatedCount: updates.length,
    grades: updates,
  });
});

router.patch(
  "/grades/bulk",
  requireAuth,
  checkRole([Role.LECTURER, Role.ADMIN]),
  validate(gradeBulkSchema),
  gradeBulkHandler,
);

router.post(
  "/grades",
  requireAuth,
  checkRole([Role.LECTURER, Role.ADMIN]),
  validate(gradeBulkSchema),
  gradeBulkHandler,
);

router.get(
  "/grades/history/:studentId",
  requireAuth,
  validate(gradesHistoryParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const student = await getStudentProfileByAnyId(String(req.params.studentId));

    if (currentUser.role === Role.STUDENT && student.userId !== currentUser.id) {
      throw new AppError(403, "Students can only view their own grade history");
    }

    const history = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        course: true,
        history: { orderBy: { modifiedAt: "desc" } },
      },
      orderBy: [{ course: { academicYear: "desc" } }, { course: { semester: "desc" } }],
    });

    res.json({
      success: true,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name,
      },
      history,
    });
  }),
);

router.get(
  "/student/transcript",
  requireAuth,
  validate(transcriptQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);

    const student =
      currentUser.role === Role.STUDENT
        ? await getStudentProfileByUserId(currentUser.id)
        : req.query.studentId
          ? await getStudentProfileByAnyId(String(req.query.studentId))
          : null;

    if (!student) {
      throw new AppError(400, "studentId query is required for non-student roles");
    }

    const enrollments = await prisma.enrollment.findMany({
      where: { studentId: student.id },
      include: {
        course: true,
        section: true,
      },
      orderBy: [{ course: { academicYear: "desc" } }, { course: { semester: "desc" } }],
    });

    res.json({
      success: true,
      student: {
        id: student.id,
        studentId: student.studentId,
        name: student.user.name,
        gpax: student.gpax,
        earnedCredits: student.earnedCredits,
        requiredCredits: student.requiredCredits,
      },
      transcript: enrollments,
    });
  }),
);

router.get(
  "/attendance/report",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(attendanceQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const report = await prisma.attendanceRecord.findMany({
      where: {
        ...(req.query.courseId
          ? {
              enrollment: {
                courseId: String(req.query.courseId),
              },
            }
          : {}),
        ...(req.query.studentId
          ? {
              enrollment: {
                studentId: String(req.query.studentId),
              },
            }
          : {}),
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

    res.json({
      success: true,
      attendance: report,
    });
  }),
);

router.post(
  "/attendance/check-in",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(attendanceCheckInSchema),
  asyncHandler(async (req, res) => {
    const record = await prisma.attendanceRecord.upsert({
      where: {
        enrollmentId_date: {
          enrollmentId: req.body.enrollmentId,
          date: req.body.date,
        },
      },
      update: {
        status: req.body.status,
        checkedInAt: new Date(),
      },
      create: {
        enrollmentId: req.body.enrollmentId,
        date: req.body.date,
        status: req.body.status,
      },
      include: {
        enrollment: {
          include: {
            student: { include: { user: true } },
            course: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      attendance: record,
    });
  }),
);

router.get(
  "/assignments",
  requireAuth,
  checkRole([Role.STUDENT, Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(assignmentsQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const includeSubmissions = Boolean(req.query.includeSubmissions);
    const courseId = req.query.courseId ? String(req.query.courseId) : undefined;

    let where: Record<string, unknown> = {};

    if (currentUser.role === Role.STUDENT) {
      const student = await getStudentProfileByUserId(currentUser.id);
      where = {
        isPublished: true,
        ...(courseId ? { courseId } : {}),
        course: {
          enrollments: {
            some: {
              studentId: student.id,
            },
          },
        },
      };
    } else if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      where = {
        ...(courseId ? { courseId } : {}),
        course: {
          lecturerId: lecturer.id,
        },
      };
    } else {
      where = courseId ? { courseId } : {};
    }

    const assignments = await prisma.assignment.findMany({
      where,
      include: {
        course: {
          include: {
            lecturer: {
              include: {
                user: true,
              },
            },
          },
        },
        submissions:
          includeSubmissions || currentUser.role === Role.STUDENT
            ? {
                where:
                  currentUser.role === Role.STUDENT
                    ? {
                        student: {
                          userId: currentUser.id,
                        },
                      }
                    : undefined,
                include: {
                  student: {
                    include: {
                      user: true,
                    },
                  },
                },
                orderBy: {
                  submittedAt: "desc",
                },
              }
            : false,
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
    });

    res.json({
      success: true,
      assignments,
    });
  }),
);

router.get(
  "/assignments/:id",
  requireAuth,
  checkRole([Role.STUDENT, Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(assignmentParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const assignment = await prisma.assignment.findUnique({
      where: { id: String(req.params.id) },
      include: {
        course: {
          include: {
            lecturer: {
              include: {
                user: true,
              },
            },
            enrollments: {
              select: {
                studentId: true,
                student: {
                  select: {
                    userId: true,
                  },
                },
              },
            },
          },
        },
        submissions: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
          orderBy: {
            submittedAt: "desc",
          },
        },
      },
    });

    if (!assignment) {
      throw new AppError(404, "Assignment not found");
    }

    if (currentUser.role === Role.STUDENT) {
      const ownsEnrollment = assignment.course.enrollments.some(
        (item) => item.student.userId === currentUser.id,
      );

      if (!ownsEnrollment || !assignment.isPublished) {
        throw new AppError(403, "You do not have access to this assignment");
      }

      return res.json({
        success: true,
        assignment: {
          ...assignment,
          submissions: assignment.submissions.filter(
            (item) => item.student.userId === currentUser.id,
          ),
        },
      });
    }

    if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);

      if (assignment.course.lecturerId !== lecturer.id) {
        throw new AppError(403, "You do not manage this assignment");
      }
    }

    res.json({
      success: true,
      assignment,
    });
  }),
);

router.post(
  "/assignments",
  requireAuth,
  checkRole([Role.LECTURER, Role.ADMIN]),
  validate(assignmentCreateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const course = await prisma.course.findUnique({
      where: { id: req.body.courseId },
    });

    if (!course) {
      throw new AppError(404, "Course not found");
    }

    if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      if (course.lecturerId !== lecturer.id) {
        throw new AppError(403, "You can only create assignments for your own courses");
      }
    }

    const assignment = await prisma.assignment.create({
      data: {
        courseId: req.body.courseId,
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        dueDate: req.body.dueDate,
        maxScore: req.body.maxScore,
        isPublished: req.body.isPublished ?? false,
      },
      include: {
        course: {
          include: {
            lecturer: {
              include: {
                user: true,
              },
            },
          },
        },
        submissions: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      assignment,
    });
  }),
);

router.patch(
  "/assignments/:id",
  requireAuth,
  checkRole([Role.LECTURER, Role.ADMIN]),
  validate(assignmentParamsSchema, "params"),
  validate(assignmentUpdateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const existing = await prisma.assignment.findUnique({
      where: { id: String(req.params.id) },
      include: {
        course: true,
      },
    });

    if (!existing) {
      throw new AppError(404, "Assignment not found");
    }

    if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      if (existing.course.lecturerId !== lecturer.id) {
        throw new AppError(403, "You can only update assignments for your own courses");
      }
    }

    const assignment = await prisma.assignment.update({
      where: { id: existing.id },
      data: {
        title: req.body.title,
        description: req.body.description,
        type: req.body.type,
        dueDate: req.body.dueDate,
        maxScore: req.body.maxScore,
        isPublished: req.body.isPublished,
      },
      include: {
        course: {
          include: {
            lecturer: {
              include: {
                user: true,
              },
            },
          },
        },
        submissions: {
          include: {
            student: {
              include: {
                user: true,
              },
            },
          },
          orderBy: {
            submittedAt: "desc",
          },
        },
      },
    });

    res.json({
      success: true,
      assignment,
    });
  }),
);

router.delete(
  "/courses/:id",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN, Role.LECTURER]),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const existing = await prisma.course.findUnique({
      where: { id: String(req.params.id) },
      include: { lecturer: true },
    });

    if (!existing) {
      throw new AppError(404, "Course not found");
    }

    if (currentUser.role === Role.LECTURER) {
      if (existing.lecturer?.userId !== currentUser.id) {
        throw new AppError(403, "You can only delete your own courses");
      }
    }

    await prisma.course.delete({
      where: { id: existing.id },
    });

    res.json({
      success: true,
      message: "Course deleted successfully",
    });
  }),
);

router.delete(
  "/assignments/:id",
  requireAuth,
  checkRole([Role.LECTURER, Role.ADMIN]),
  validate(assignmentParamsSchema, "params"),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const existing = await prisma.assignment.findUnique({
      where: { id: String(req.params.id) },
      include: {
        course: true,
      },
    });

    if (!existing) {
      throw new AppError(404, "Assignment not found");
    }

    if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      if (existing.course.lecturerId !== lecturer.id) {
        throw new AppError(403, "You can only delete assignments for your own courses");
      }
    }

    const assignment = await prisma.assignment.delete({
      where: { id: existing.id },
    });

    res.json({
      success: true,
      assignment,
    });
  }),
);

router.post(
  "/assignments/:id/submissions",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(assignmentParamsSchema, "params"),
  validate(submissionCreateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const student = await getStudentProfileByUserId(currentUser.id);
    const assignment = await prisma.assignment.findUnique({
      where: { id: String(req.params.id) },
      include: {
        course: {
          include: {
            enrollments: true,
          },
        },
      },
    });

    if (!assignment) {
      throw new AppError(404, "Assignment not found");
    }

    const isEnrolled = assignment.course.enrollments.some((item) => item.studentId === student.id);
    if (!assignment.isPublished || !isEnrolled) {
      throw new AppError(403, "You do not have access to submit this assignment");
    }

    const submission = await prisma.submission.upsert({
      where: {
        assignmentId_studentId: {
          assignmentId: assignment.id,
          studentId: student.id,
        },
      },
      update: {
        files: req.body.files,
        submittedAt: new Date(),
        status: new Date() > assignment.dueDate ? "late" : "submitted",
      },
      create: {
        assignmentId: assignment.id,
        studentId: student.id,
        files: req.body.files,
        status: new Date() > assignment.dueDate ? "late" : "submitted",
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        assignment: {
          include: {
            course: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      submission,
    });
  }),
);

router.patch(
  "/submissions/:id",
  requireAuth,
  checkRole([Role.LECTURER, Role.ADMIN]),
  validate(assignmentParamsSchema, "params"),
  validate(submissionUpdateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const existing = await prisma.submission.findUnique({
      where: { id: String(req.params.id) },
      include: {
        assignment: {
          include: {
            course: true,
          },
        },
        student: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!existing) {
      throw new AppError(404, "Submission not found");
    }

    if (currentUser.role === Role.LECTURER) {
      const lecturer = await getLecturerProfileByUserId(currentUser.id);
      if (existing.assignment.course.lecturerId !== lecturer.id) {
        throw new AppError(403, "You can only grade submissions for your own courses");
      }
    }

    const submission = await prisma.submission.update({
      where: { id: existing.id },
      data: {
        score: req.body.score,
        feedback: req.body.feedback,
        status: req.body.status,
      },
      include: {
        student: {
          include: {
            user: true,
          },
        },
        assignment: {
          include: {
            course: true,
          },
        },
      },
    });

    res.json({
      success: true,
      submission,
    });
  }),
);

export const academicRoutes = router;
