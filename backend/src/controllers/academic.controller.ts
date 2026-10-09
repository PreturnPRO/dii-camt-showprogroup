import { Prisma, Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { bulkUpdateGrades, publishCourseGrades } from "../services/grade.service";
import {
  getLecturerProfileByUserId,
  getStudentProfileByAnyId,
  getStudentProfileByUserId,
} from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { csvRow } from "../utils/csv";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";
import { getCourses, getCourseById, createCourse, updateCourse } from "../services/course.service";
import { getEnrollments, createEnrollment, dropCourseByStudent, getRegistrationSummary } from "../services/enrollment.service";
import { getStudentTranscript } from "../services/academic-core.service";
import crypto from "crypto";
import { emitToUser } from "../lib/realtime";
import { attendanceRate, ATTENDANCE_WARNING_PERCENT, thaiDay } from "../services/attendance";
import { assertCanViewStudentRecord, assertCourseManager, isStaffOrAdmin, lecturerProfileIdOf, scopeCourseForViewer, viewerContext } from "../services/access-policy";



export const getCoursesHandler = asyncHandler(async (req, res) => {
  const courses = await getCourses(req.query as any);
  const viewer = await viewerContext(req);
  res.json({ success: true, courses: courses.map((c) => scopeCourseForViewer(c, viewer)) });
});

export const getCourseByIdHandler = asyncHandler(async (req, res) => {
  const course = await getCourseById(String(req.params.id));
  res.json({ success: true, course: scopeCourseForViewer(course, await viewerContext(req)) });
});

export const createCourseHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const courseData =
    currentUser.role === Role.LECTURER
      ? { ...req.body, lecturerId: await lecturerProfileIdOf(currentUser.id), status: "pending" }
      : { ...req.body, status: req.body.status || "active" };
  const course = await createCourse(courseData);
  res.status(201).json({ success: true, course });
});

export const updateCourseHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const courseId = String(req.params.id);
  if (currentUser.role === Role.LECTURER) {
    delete req.body.status;
    delete req.body.lecturerId;
  }
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

    if (isStaffOrAdmin(currentUser.role)) {
      return res.json({ success: true, lecturer, schedule: lecturer.courses });
    }

    const viewer = await viewerContext(req);
    const schedule = lecturer.courses.map((c) => scopeCourseForViewer(c, viewer));
    return res.json({
      success: true,
      lecturer: {
        id: lecturer.id,
        lecturerId: lecturer.lecturerId,
        department: lecturer.department,
        position: lecturer.position,
        user: {
          name: lecturer.user.name,
          nameThai: lecturer.user.nameThai,
          avatar: lecturer.user.avatar,
          email: lecturer.user.email,
        },
        courses: schedule,
      },
      schedule,
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

export const registrationSummaryHandler = asyncHandler(async (req, res) => {
  const summary = await getRegistrationSummary(requireUser(req));
  res.json({ success: true, summary });
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

export const publishCourseGradesHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const courseId = String(req.params.courseId);
  await assertCourseManager(currentUser, courseId);
  const course = await publishCourseGrades(currentUser.id, courseId, req.ip);
  res.json({ success: true, course: { id: course.id, gradesPublishedAt: course.gradesPublishedAt } });
});

export const exportGradesCsvHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const courseId = String(req.params.courseId);

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      gradingCriteria: { orderBy: { orderIndex: 'asc' } },
      enrollments: {
        include: {
          student: { include: { user: true } },
          scores: true,
        },
        // the export is the grade sheet (staff/lecturer only), drafts included
        omit: { workingTotal: false, workingLetterGrade: false, workingRemarks: false },
      },
    },
  });

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    if (course.lecturerId !== lecturer.id) {
      throw new AppError(403, "You can only export grades for your own courses");
    }
  }

  const criteriaList = course.gradingCriteria;

  // every text cell goes through csvCell, so names/remarks starting with = + - @ are exported as text, not formulas
  const lines = [
    csvRow(["Student ID", "Name", ...criteriaList.map((c) => `${c.name} (${c.maxScore})`), "Total", "Grade", "Remarks"]),
    ...course.enrollments.map((enrollment) =>
      csvRow([
        enrollment.student.studentId,
        enrollment.student.user.name,
        ...criteriaList.map((c) => enrollment.scores.find((s) => s.criteriaId === c.id)?.score ?? null),
        enrollment.workingTotal ?? null,
        enrollment.workingLetterGrade ?? null,
        enrollment.workingRemarks ?? null,
      ]),
    ),
  ];
  const csv = `${lines.join("\n")}\n`;

  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="grades_${course.code}.csv"`);
  res.send(csv);
});

export const getGradesHistoryHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByAnyId(String(req.params.studentId));
  await assertCanViewStudentRecord(currentUser, student);

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
  await assertCanViewStudentRecord(currentUser, student);

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
  const currentUser = requireUser(req);
  if (req.query.courseId) {
    await assertCourseManager(currentUser, String(req.query.courseId));
  }
  const ownCourses =
    currentUser.role === Role.LECTURER
      ? { course: { lecturerId: (await lecturerProfileIdOf(currentUser.id)) ?? "no-lecturer-profile" } }
      : {};

  const report = await prisma.attendanceRecord.findMany({
    where: {
      enrollment: {
        ...ownCourses,
        ...(req.query.courseId ? { courseId: String(req.query.courseId) } : {}),
        ...(req.query.studentId ? { studentId: String(req.query.studentId) } : {}),
      },
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
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: String(req.body.enrollmentId) },
    select: { courseId: true, status: true },
  });
  if (!enrollment) {
    throw new AppError(404, "Enrollment not found");
  }
  await assertCourseManager(requireUser(req), enrollment.courseId);
  if (enrollment.status === "dropped") {
    throw new AppError(409, "This student has dropped the course");
  }
  // owner decision 7/10/69: attendance is recorded up to today (Thai time), never ahead
  const day = thaiDay(req.body.date);
  if (day.getTime() > thaiDay(new Date()).getTime()) {
    throw new AppError(400, "Attendance cannot be recorded for a future date");
  }

  const record = await prisma.attendanceRecord.upsert({
    where: {
      enrollmentId_date: {
        enrollmentId: req.body.enrollmentId,
        date: day,
      },
    },
    update: {
      status: req.body.status,
      checkedInAt: new Date(),
    },
    create: {
      enrollmentId: req.body.enrollmentId,
      date: day,
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

  // Call warning logic without blocking
  checkAttendanceWarning(record.enrollmentId).catch(err => console.error("Error in checkAttendanceWarning:", err));

  res.status(201).json({
    success: true,
    attendance: record,
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
    // an open course is closed by staff (owner decision 9/10/69)
    if (existing.status === "active") {
      throw new AppError(403, "An open course can only be closed by staff");
    }
  }

  // owner decision 9/10/69: a course anyone ever enrolled in (or took attendance for) keeps its history
  // and is archived; only a course with no history is removed
  const history =
    (await prisma.enrollment.count({ where: { courseId: existing.id } })) +
    (await prisma.attendanceSession.count({ where: { courseId: existing.id } }));
  if (history > 0) {
    await prisma.course.update({ where: { id: existing.id }, data: { status: "archived" } });
    return res.json({ success: true, archived: true, message: "The course has enrollment history, so it was archived instead of deleted" });
  }

  try {
  await prisma.$transaction(async (tx) => {
    const sectionIds = (await tx.section.findMany({ where: { courseId: existing.id }, select: { id: true } })).map((s) => s.id);
    await tx.classMove.deleteMany({ where: { sectionId: { in: sectionIds } } });
    await tx.section.deleteMany({ where: { courseId: existing.id } });
    await tx.courseGradingCriteria.deleteMany({ where: { courseId: existing.id } });
    await tx.courseGradeCutoff.deleteMany({ where: { courseId: existing.id } });
    await tx.courseMaterial.deleteMany({ where: { courseId: existing.id } });
    await tx.course.delete({ where: { id: existing.id } });
  });
  } catch (error) {
    // someone enrolled between the history check and the delete: keep it, archived
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      await prisma.course.update({ where: { id: existing.id }, data: { status: "archived" } });
      return res.json({ success: true, archived: true, message: "The course has enrollment history, so it was archived instead of deleted" });
    }
    throw error;
  }

  res.json({
    success: true,
    archived: false,
    message: "Course deleted successfully",
  });
});

export const startAttendanceSessionHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const { courseId, durationMinutes } = req.body;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: { lecturer: true },
  });

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  if (currentUser.role === Role.LECTURER && course.lecturer.userId !== currentUser.id) {
    throw new AppError(403, "You can only manage attendance for your own courses");
  }

  // Generate a random token
  const token = crypto.randomBytes(16).toString("hex");
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const session = await prisma.attendanceSession.create({
    data: {
      courseId,
      token,
      expiresAt,
    },
  });

  res.status(201).json({
    success: true,
    session,
  });
});

export const qrCheckInHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const { token } = req.body;

  const session = await prisma.attendanceSession.findUnique({
    where: { token },
    include: {
      course: {
        include: {
          lecturer: true,
        },
      },
    },
  });

  if (!session || !session.isActive) {
    throw new AppError(400, "Invalid or inactive session");
  }

  if (new Date() > session.expiresAt) {
    throw new AppError(400, "This check-in session has expired");
  }

  const student = await getStudentProfileByUserId(currentUser.id);

  const enrollment = await prisma.enrollment.findUnique({
    where: {
      studentId_courseId: {
        studentId: student.id,
        courseId: session.courseId,
      },
    },
  });

  if (!enrollment || enrollment.status === "dropped") {
    throw new AppError(403, "You are not enrolled in this course");
  }

  const today = thaiDay(new Date());
  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: { enrollmentId_date: { enrollmentId: enrollment.id, date: today } },
  });
  // owner decision 7/10/69: a status the lecturer already set is never overwritten by a scan
  if (existingRecord) {
    throw new AppError(
      409,
      existingRecord.status === "present" || existingRecord.status === "late"
        ? "You have already checked in for this course today"
        : "Your lecturer has already recorded your attendance today",
    );
  }

  let record;
  try {
    record = await prisma.attendanceRecord.create({
      data: { enrollmentId: enrollment.id, date: today, status: "present", sessionId: session.id },
      include: { enrollment: { include: { student: { include: { user: true } }, course: true } } },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new AppError(409, "You have already checked in for this course today");
    }
    throw error;
  }

  // Emit real-time event to the lecturer
  emitToUser(session.course.lecturer.userId, "attendance:checked-in", record);

  // Call warning logic without blocking
  checkAttendanceWarning(record.enrollmentId).catch(err => console.error("Error in checkAttendanceWarning:", err));

  res.status(200).json({
    success: true,
    attendance: record,
  });
});

async function checkAttendanceWarning(enrollmentId: string) {
  const enrollment = await prisma.enrollment.findUnique({
    where: { id: enrollmentId },
    include: {
      course: true,
      student: { include: { user: true } },
    },
  });

  if (!enrollment || enrollment.status === "dropped") return;

  const records = await prisma.attendanceRecord.findMany({ where: { enrollmentId: enrollment.id }, select: { status: true } });
  const { percentage } = attendanceRate(records.map((r) => r.status));
  if (percentage === null || percentage >= ATTENDANCE_WARNING_PERCENT) return;

  const title = `Low Attendance Warning: ${enrollment.course.code}`;
  // one warning per course per week
  const recentWarning = await prisma.notification.findFirst({
    where: {
      userId: enrollment.student.userId,
      type: "ATTENDANCE_WARNING",
      title,
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    },
  });

  if (!recentWarning) {
    await prisma.notification.create({
      data: {
        userId: enrollment.student.userId,
        title,
        titleThai: `เตือนเวลาเรียนต่ำกว่าเกณฑ์: ${enrollment.course.code}`,
        message: `Your attendance is currently at ${percentage.toFixed(1)}%, which is below the ${ATTENDANCE_WARNING_PERCENT}% requirement.`,
        messageThai: `เวลาเรียนของคุณในวิชานี้อยู่ที่ ${percentage.toFixed(1)}% ซึ่งต่ำกว่าเกณฑ์ ${ATTENDANCE_WARNING_PERCENT}%`,
        type: 'ATTENDANCE_WARNING',
      }
    });
    emitToUser(enrollment.student.userId, 'notification:created', { type: 'ATTENDANCE_WARNING' });
  }
}

export const getAttendanceSummaryHandler = asyncHandler(async (req, res) => {
  const courseIdStr = String(req.params.courseId);
  await assertCourseManager(requireUser(req), courseIdStr);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: courseIdStr, status: { not: "dropped" } },
    include: { student: { include: { user: true } } },
  });
  const records = await prisma.attendanceRecord.findMany({
    where: { enrollmentId: { in: enrollments.map((e) => e.id) } },
    select: { enrollmentId: true, date: true, status: true },
  });
  // a session = a Thai day on which at least one current student was marked
  const sessionDays = new Set(records.map((r) => r.date.toISOString()));
  const totalSessions = sessionDays.size;

  const summary = enrollments.map((enrollment) => {
    const own = records.filter((r) => r.enrollmentId === enrollment.id);
    return {
      studentId: enrollment.studentId,
      studentCode: enrollment.student.studentId,
      name: enrollment.student.user.name,
      ...attendanceRate(own.map((r) => r.status)),
      unmarked: totalSessions - own.length,
    };
  });

  res.json({ success: true, totalSessions, summary });
});

export const getStudentAttendanceHistoryHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const { courseId, studentId } = req.params;

  if (currentUser.role === Role.STUDENT) {
    const student = await getStudentProfileByUserId(currentUser.id);
    if (student.id !== studentId) {
      throw new AppError(403, "You can only view your own attendance history");
    }
  } else {
    await assertCourseManager(currentUser, String(courseId));
  }

  const records = await prisma.attendanceRecord.findMany({
    where: {
      enrollment: {
        courseId: String(courseId),
        studentId: String(studentId),
      },
    },
    orderBy: { date: 'desc' },
  });

  res.json({
    success: true,
    history: records,
  });
});

export const closeAttendanceSessionHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const id = String(req.params.id);

  const session = await prisma.attendanceSession.findUnique({
    where: { id },
    include: { course: true },
  });

  if (!session) {
    throw new AppError(404, "Session not found");
  }

  if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    if (session.course.lecturerId !== lecturer.id) {
      throw new AppError(403, "You can only manage sessions for your own courses");
    }
  }

  const updatedSession = await prisma.attendanceSession.update({
    where: { id },
    data: {
      isActive: false,
      expiresAt: new Date(), // expire it now
    },
  });

  res.json({
    success: true,
    session: updatedSession,
  });
});
