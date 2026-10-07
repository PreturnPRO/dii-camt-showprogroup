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
import { getEnrollments, createEnrollment, dropCourseByStudent, getRegistrationSummary } from "../services/enrollment.service";
import { getStudentTranscript } from "../services/academic-core.service";
import crypto from "crypto";
import { emitToUser } from "../lib/realtime";
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
  
  // CSV Header
  let csv = "Student ID,Name,";
  criteriaList.forEach(c => {
    csv += `"${c.name} (${c.maxScore})",`;
  });
  // Dynamic criteria headers are used directly
  csv += "Total,Grade,Remarks\n";

  // CSV Rows
  course.enrollments.forEach(enrollment => {
    csv += `"${enrollment.student.studentId}","${enrollment.student.user.name}",`;
    
    criteriaList.forEach(c => {
      const scoreObj = enrollment.scores.find(s => s.criteriaId === c.id);
      csv += `${scoreObj ? scoreObj.score : ""},`;
    });

    csv += `${enrollment.total ?? ""},"${enrollment.letterGrade ?? ""}","${enrollment.remarks ?? ""}"\n`;
  });

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
    select: { courseId: true },
  });
  if (!enrollment) {
    throw new AppError(404, "Enrollment not found");
  }
  await assertCourseManager(requireUser(req), enrollment.courseId);

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
  }

  await prisma.course.delete({
    where: { id: existing.id },
  });

  res.json({
    success: true,
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

  if (!enrollment) {
    throw new AppError(403, "You are not enrolled in this course");
  }

  // Get start of day to match the existing unique constraint
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const existingRecord = await prisma.attendanceRecord.findUnique({
    where: {
      enrollmentId_date: {
        enrollmentId: enrollment.id,
        date: today,
      },
    },
  });

  if (existingRecord && existingRecord.status === "present") {
    throw new AppError(400, "You have already checked in for this course today");
  }

  const record = await prisma.attendanceRecord.upsert({
    where: {
      enrollmentId_date: {
        enrollmentId: enrollment.id,
        date: today,
      },
    },
    update: {
      status: "present",
      checkedInAt: new Date(),
      sessionId: session.id,
    },
    create: {
      enrollmentId: enrollment.id,
      date: today,
      status: "present",
      sessionId: session.id,
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

  if (!enrollment) return;

  // Calculate unique days for the course up to now
  const distinctDaysResult = await prisma.attendanceRecord.groupBy({
    by: ['date'],
    where: {
      enrollment: {
        courseId: enrollment.courseId,
      },
      date: { lte: new Date() },
    },
  });
  
  const totalSessions = distinctDaysResult.length;
  if (totalSessions === 0) return;

  const records = await prisma.attendanceRecord.findMany({
    where: { enrollmentId: enrollment.id },
  });

  const presentCount = records.filter(r => r.status === 'present' || r.status === 'late').length;
  const percentage = (presentCount / totalSessions) * 100;

  if (percentage < 80) {
    // Check if we recently sent a warning to avoid spamming
    const recentWarning = await prisma.notification.findFirst({
      where: {
        userId: enrollment.student.userId,
        type: 'ATTENDANCE_WARNING',
        createdAt: {
          gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Don't warn more than once a week
        }
      }
    });

    if (!recentWarning) {
      await prisma.notification.create({
        data: {
          userId: enrollment.student.userId,
          title: `Low Attendance Warning: ${enrollment.course.code}`,
          titleThai: `เตือนเวลาเรียนต่ำกว่าเกณฑ์: ${enrollment.course.code}`,
          message: `Your attendance is currently at ${percentage.toFixed(1)}%, which is below the 80% requirement.`,
          messageThai: `เวลาเรียนของคุณในวิชานี้อยู่ที่ ${percentage.toFixed(1)}% ซึ่งต่ำกว่าเกณฑ์ 80%`,
          type: 'ATTENDANCE_WARNING',
        }
      });
      emitToUser(enrollment.student.userId, 'notification:created', { type: 'ATTENDANCE_WARNING' });
    }
  }
}

export const getAttendanceSummaryHandler = asyncHandler(async (req, res) => {
  const { courseId } = req.params;
  const courseIdStr = String(courseId);
  await assertCourseManager(requireUser(req), courseIdStr);

  const enrollments = await prisma.enrollment.findMany({
    where: { courseId: String(courseId) },
    include: {
      student: { include: { user: true } },
    },
  });

  const records = await prisma.attendanceRecord.findMany({
    where: {
      enrollment: { courseId: String(courseId) },
    },
  });

  const distinctDaysResult = await prisma.attendanceRecord.groupBy({
    by: ['date'],
    where: {
      enrollment: { courseId: String(courseId) },
    },
  });
  const totalSessions = distinctDaysResult.length;

  const summary = enrollments.map(enrollment => {
    const studentRecords = records.filter(r => r.enrollmentId === enrollment.id);
    const presentCount = studentRecords.filter(r => r.status === 'present').length;
    const lateCount = studentRecords.filter(r => r.status === 'late').length;
    const leaveCount = studentRecords.filter(r => r.status === 'leave').length;
    const absentCount = studentRecords.filter(r => r.status === 'absent').length;
    
    // Default logic: late counts as present, leave doesn't penalize. Adjust as needed.
    // For now, percentage = (present + late) / totalSessions
    let percentage = 100;
    if (totalSessions > 0) {
      percentage = ((presentCount + lateCount) / totalSessions) * 100;
    }

    return {
      studentId: enrollment.studentId,
      studentCode: enrollment.student.studentId,
      name: enrollment.student.user.name,
      present: presentCount,
      late: lateCount,
      leave: leaveCount,
      absent: absentCount,
      percentage: Math.round(percentage * 10) / 10,
    };
  });

  res.json({
    success: true,
    totalSessions,
    summary,
  });
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

