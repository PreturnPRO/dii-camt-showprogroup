import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { bulkUpdateGrades } from "../services/grade.service";
import {
  getLecturerProfileByUserId,
  getStudentProfileByAnyId,
  getStudentProfileByUserId,
} from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";
import { getCourses, getCourseById, createCourse, updateCourse } from "../services/course.service";
import { getEnrollments, createEnrollment, dropCourseByStudent } from "../services/enrollment.service";
import { getStudentTranscript } from "../services/academic-core.service";



export const getCoursesHandler = asyncHandler(async (req, res) => {
  const courses = await getCourses(req.query as any);
  res.json({ success: true, courses });
});

export const getCourseByIdHandler = asyncHandler(async (req, res) => {
  const course = await getCourseById(String(req.params.id));
  res.json({ success: true, course });
});

export const createCourseHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const courseData = {
    ...req.body,
    status: req.body.status || (currentUser.role === Role.LECTURER ? "pending" : "active")
  };
  const course = await createCourse(courseData);
  res.status(201).json({ success: true, course });
});

export const updateCourseHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const courseId = String(req.params.id);
  const course = await updateCourse(currentUser, courseId, req.body);

  res.json({
    success: true,
    course,
  });
});

export const scheduleHandler = asyncHandler(async (req, res) => {
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

export const getEnrollmentsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const enrollments = await getEnrollments(currentUser, req.query as any);

  res.json({
    success: true,
    enrollments,
  });
});

export const createEnrollmentHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const enrollment = await createEnrollment(currentUser, req.body);

  res.status(201).json({
    success: true,
    enrollment,
  });
});

export const dropCourseHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const result = await dropCourseByStudent(currentUser, String(req.params.courseId));

  res.json({
    success: true,
    message: result.message,
  });
});

export const gradeBulkHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const updates = await bulkUpdateGrades(currentUser.id, req.body.grades, req.ip);

  res.json({
    success: true,
    updatedCount: updates.length,
    grades: updates,
  });
});

export const getGradesHistoryHandler = asyncHandler(async (req, res) => {
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
});

export const getStudentTranscriptHandler = asyncHandler(async (req, res) => {
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

  const enrollments = await getStudentTranscript(student.id);

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
});

export const getAttendanceReportHandler = asyncHandler(async (req, res) => {
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
});

export const attendanceCheckInHandler = asyncHandler(async (req, res) => {
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
});

export const getAssignmentsHandler = asyncHandler(async (req, res) => {
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
});

export const getAssignmentByIdHandler = asyncHandler(async (req, res) => {
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
});

export const createAssignmentHandler = asyncHandler(async (req, res) => {
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
});

export const updateAssignmentHandler = asyncHandler(async (req, res) => {
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
});

export const deleteCourseHandler = asyncHandler(async (req, res) => {
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
});

export const deleteAssignmentHandler = asyncHandler(async (req, res) => {
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
});

export const submitAssignmentHandler = asyncHandler(async (req, res) => {
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
});

export const updateSubmissionHandler = asyncHandler(async (req, res) => {
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
});
