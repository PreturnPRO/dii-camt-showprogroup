import { Role } from "@prisma/client";
import { thaiDateTime, thaiDay } from "../services/attendance";

const BOOKING_DAYS_AHEAD = 30;
const APPOINTMENT_STATUS_TH: Record<string, string> = { pending: "รอยืนยัน", confirmed: "ยืนยันแล้ว", completed: "พบแล้ว", cancelled: "ยกเลิกแล้ว" };

import { prisma } from "../lib/prisma";
import { getLecturerProfileByUserId, getStudentProfileByUserId } from "../services/profile.service";
import { getAvailableOfficeHourSlots, replaceOfficeHours } from "../services/appointment.service";
import { createNotification, createNotificationsForRole } from "../services/notification.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";
import { isStaffOrAdmin } from "../services/access-policy";



// who a message or appointment involves, never how to reach them outside the system (Por 8/10/69)
const MESSAGE_PERSON = { id: true, name: true, nameThai: true, role: true, avatar: true } as const;

export const getRequests = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  if (currentUser.role !== Role.STUDENT && !isStaffOrAdmin(currentUser.role)) {
    throw new AppError(403, "You cannot view student requests");
  }

  const requests =
    currentUser.role === Role.STUDENT
      ? await prisma.request.findMany({
          where: {
            student: {
              userId: currentUser.id,
            },
          },
          include: {
            student: { include: { user: true } },
            comments: true,
          },
          orderBy: { submittedAt: "desc" },
        })
      : await prisma.request.findMany({
          include: {
            student: { include: { user: true } },
            comments: true,
          },
          orderBy: { submittedAt: "desc" },
        });

  res.json({
    success: true,
    requests,
  });
});

export const createRequest = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);

  const request = await prisma.request.create({
    data: {
      studentId: student.id,
      type: req.body.type,
      title: req.body.title,
      description: req.body.description,
      documents: req.body.documents,
    },
    include: {
      student: { include: { user: true } },
      comments: true,
    },
  });

  await createNotificationsForRole(Role.STAFF, {
    title: "New student request",
    titleThai: "มีคำร้องนักศึกษาใหม่",
    message: `${student.user.name} submitted a new ${request.type} request.`,
    messageThai: `${student.user.nameThai} ส่งคำร้องประเภท ${request.type}`,
    type: "info",
    priority: "medium",
    channels: ["in-app"],
    actionUrl: "/requests",
    actionLabel: "Open request",
  });

  res.status(201).json({
    success: true,
    request,
  });
});

export const createRequestComment = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const requestId = String(req.params.id);
  const existingRequest = await prisma.request.findUnique({
    where: { id: requestId },
    include: {
      student: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!existingRequest) {
    throw new AppError(404, "Request not found");
  }
  if (!isStaffOrAdmin(currentUser.role) && existingRequest.student.userId !== currentUser.id) {
    throw new AppError(403, "You can only comment on your own requests");
  }

  const comment = await prisma.requestComment.create({
    data: {
      requestId,
      authorId: currentUser.id,
      text: req.body.text,
    },
  });

  if (currentUser.role === Role.STUDENT) {
    await createNotificationsForRole(Role.STAFF, {
      title: "New request comment",
      titleThai: "มีความเห็นใหม่ในคำร้อง",
      message: `${existingRequest.student.user.name} added a comment to request "${existingRequest.title}".`,
      messageThai: `${existingRequest.student.user.nameThai} เพิ่มความเห็นในคำร้อง "${existingRequest.title}"`,
      type: "info",
      priority: "low",
      channels: ["in-app"],
      actionUrl: "/requests",
    });
  } else {
    await createNotification({
      userId: existingRequest.student.userId,
      title: "Request updated",
      titleThai: "คำร้องของคุณมีการอัปเดต",
      message: `There is a new comment on "${existingRequest.title}".`,
      messageThai: `มีความเห็นใหม่ในคำร้อง "${existingRequest.title}"`,
      type: "info",
      priority: "medium",
      channels: ["in-app"],
      actionUrl: "/requests",
    });
  }

  res.status(201).json({
    success: true,
    comment,
  });
});

export const updateRequestStatus = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const requestId = String(req.params.id);

  const request = await prisma.request.update({
    where: { id: requestId },
    data: {
      status: req.body.status,
      reviewNotes: req.body.reviewNotes,
      assignedTo: req.body.assignedTo ?? currentUser.id,
      reviewedBy: currentUser.id,
      reviewedAt: new Date(),
      completedAt:
        req.body.status === "completed" ? req.body.completedAt ?? new Date() : undefined,
    },
    include: {
      student: {
        include: {
          user: true,
        },
      },
      comments: true,
    },
  });

  await createNotification({
    userId: request.student.userId,
    title: "Request status updated",
    titleThai: "สถานะคำร้องมีการอัปเดต",
    message: `Your request "${request.title}" is now ${request.status}.`,
    messageThai: `คำร้อง "${request.title}" ของคุณมีสถานะเป็น ${request.status}`,
    type: "info",
    priority: "medium",
    channels: ["in-app"],
    actionUrl: "/requests",
  });

  res.json({
    success: true,
    request,
  });
});

export const getAppointments = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  if (currentUser.role === Role.COMPANY) {
    throw new AppError(403, "You cannot view appointments");
  }

  const appointments =
    currentUser.role === Role.STUDENT
      ? await prisma.appointment.findMany({
          where: {
            student: { userId: currentUser.id },
          },
          include: {
            lecturer: { include: { user: { select: MESSAGE_PERSON } } },
            student: { include: { user: { select: MESSAGE_PERSON } } },
          },
          orderBy: { date: "asc" },
        })
      : currentUser.role === Role.LECTURER
        ? await prisma.appointment.findMany({
            where: {
              lecturer: { userId: currentUser.id },
            },
            include: {
              lecturer: { include: { user: { select: MESSAGE_PERSON } } },
              student: { include: { user: { select: MESSAGE_PERSON } } },
            },
            orderBy: { date: "asc" },
          })
        : await prisma.appointment.findMany({
            include: {
              lecturer: { include: { user: { select: MESSAGE_PERSON } } },
              student: { include: { user: { select: MESSAGE_PERSON } } },
            },
            orderBy: { date: "asc" },
          });

  res.json({
    success: true,
    appointments,
  });
});

const WEEKDAY_NAMES = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const createAppointment = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);

  const lecturer = await prisma.lecturerProfile.findFirst({
    where: { id: String(req.body.lecturerId), user: { isActive: true } },
    select: { id: true },
  });
  if (!lecturer) throw new AppError(404, "Lecturer not found");

  // dates are Thai calendar days stored as UTC midnight (see services/attendance)
  const date = new Date(`${req.body.date}T00:00:00.000Z`);
  // "2027-02-30" would roll over to March; refuse it rather than book another day
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== req.body.date) {
    throw new AppError(400, "That date does not exist");
  }
  if (thaiDateTime(date, req.body.startTime) <= new Date()) {
    throw new AppError(400, "Choose a time that has not passed yet");
  }
  // owner decision 9/10/69 (G6): at most 30 days ahead
  if (date.getTime() > thaiDay(new Date()).getTime() + BOOKING_DAYS_AHEAD * 86400000) {
    throw new AppError(400, `Book at most ${BOOKING_DAYS_AHEAD} days ahead`, { code: "TOO_FAR", days: BOOKING_DAYS_AHEAD });
  }
  const slot = await prisma.officeHour.findFirst({
    where: {
      lecturerId: lecturer.id,
      day: WEEKDAY_NAMES[date.getUTCDay()],
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      isAvailable: true,
    },
  });
  if (!slot) throw new AppError(400, "That time is not one of the lecturer's office hours");

  const appointment = await prisma.$transaction(async (tx) => {
    // one booking at a time per lecturer and day, then check nothing active overlaps this slot
    // owner decision 9/10/69 (G6): one upcoming booking per student and lecturer — serialized per pair
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment-student|${student.id}|${lecturer.id}`}))::text`;
    const upcoming = await tx.appointment.findMany({
      where: { studentId: student.id, lecturerId: lecturer.id, status: { in: ["pending", "confirmed"] }, date: { gte: thaiDay(new Date()) } },
      select: { date: true, endTime: true },
    });
    if (upcoming.some((a) => thaiDateTime(a.date, a.endTime) > new Date())) {
      throw new AppError(409, "You already have an upcoming appointment with this lecturer", { code: "ONE_PER_LECTURER" });
    }
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`appointment|${lecturer.id}|${req.body.date}`}))::text`;
    const taken = await tx.appointment.count({
      where: {
        lecturerId: lecturer.id,
        date,
        status: { in: ["pending", "confirmed"] },
        // HH:MM strings are zero-padded, so they compare like times
        startTime: { lt: slot.endTime },
        endTime: { gt: slot.startTime },
      },
    });
    if (taken) throw new AppError(409, "Someone has just booked this slot. Please choose another time.");
    return tx.appointment.create({
      data: {
        studentId: student.id,
        lecturerId: lecturer.id,
        date,
        startTime: slot.startTime,
        endTime: slot.endTime,
        location: slot.location,
        purpose: req.body.purpose,
        notes: req.body.notes,
      },
      include: {
        lecturer: { include: { user: { select: MESSAGE_PERSON } } },
        student: { include: { user: { select: MESSAGE_PERSON } } },
      },
    });
  });

  await createNotification({
    userId: appointment.lecturer.userId,
    title: "New appointment request",
    titleThai: "มีคำขอนัดหมายใหม่",
    message: `${student.user.name} requested an appointment on ${appointment.date.toISOString().slice(0, 10)}.`,
    messageThai: `${student.user.nameThai} ขอจองนัดหมายวันที่ ${appointment.date.toISOString().slice(0, 10)}`,
    type: "appointment",
    priority: "medium",
    channels: ["in-app"],
    actionUrl: "/appointments",
  });

  await createNotification({
    userId: student.userId,
    title: "Appointment requested",
    titleThai: "ส่งคำขอนัดหมายแล้ว",
    message: `You have successfully requested an appointment with ${appointment.lecturer.user.name} on ${appointment.date.toISOString().slice(0, 10)}.`,
    messageThai: `คุณได้ส่งคำขอนัดหมายกับ ${appointment.lecturer.user.nameThai} ในวันที่ ${appointment.date.toISOString().slice(0, 10)} สำเร็จแล้ว`,
    type: "appointment",
    priority: "low",
    channels: ["in-app"],
    actionUrl: "/appointments",
  });

  res.status(201).json({
    success: true,
    appointment,
  });
});

export const updateAppointmentStatus = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const appointmentId = String(req.params.id);
  const existing = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    select: { status: true, date: true, startTime: true, lecturer: { select: { userId: true } }, student: { select: { userId: true } } },
  });
  if (!existing) {
    throw new AppError(404, "Appointment not found");
  }
  const isStudent = currentUser.role === Role.STUDENT;
  // the lecturer runs their own bookings; a student may only cancel their own (owner decision 9/10/69)
  if (isStudent ? existing.student.userId !== currentUser.id : existing.lecturer.userId !== currentUser.id) {
    throw new AppError(403, "You can only update your own appointments");
  }
  if (isStudent && req.body.status !== "cancelled") {
    throw new AppError(403, "A student can only cancel a booking");
  }
  const allowed: Record<string, string[]> = { pending: ["confirmed", "cancelled"], confirmed: ["completed", "cancelled"] };
  if (!allowed[existing.status]?.includes(req.body.status)) {
    // a cancelled or completed booking stays closed; its slot may already belong to someone else
    throw new AppError(409, `An appointment that is ${existing.status} cannot become ${req.body.status}`, { code: "CLOSED" });
  }
  const started = thaiDateTime(existing.date, existing.startTime) <= new Date();
  if (req.body.status === "completed" && !started) {
    throw new AppError(409, "A meeting can be marked as met only once it has started", { code: "NOT_STARTED" });
  }
  // a waiting booking whose time has come can only be cancelled (review L5)
  if (req.body.status === "confirmed" && started) {
    throw new AppError(409, "This booking's time has passed; cancel it instead", { code: "STARTED" });
  }
  if (isStudent && started) {
    throw new AppError(409, "A booking can be cancelled only before it starts", { code: "STARTED" });
  }
  // claim the change: only a booking still in the status we checked moves, so confirm and cancel cannot both win
  const claimed = await prisma.appointment.updateMany({
    where: { id: appointmentId, status: existing.status },
    // the notes are the lecturer's; a student only cancels (review L2)
    data: { status: req.body.status, ...(isStudent ? {} : { meetingNotes: req.body.meetingNotes, followUp: req.body.followUp }) },
  });
  if (claimed.count !== 1) {
    throw new AppError(409, "The appointment changed meanwhile; reload and try again", { code: "CHANGED" });
  }
  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    include: {
      lecturer: { include: { user: { select: MESSAGE_PERSON } } },
      student: { include: { user: { select: MESSAGE_PERSON } } },
    },
  });

  const day = appointment.date.toISOString().slice(0, 10);
  const statusTh = APPOINTMENT_STATUS_TH[appointment.status] ?? appointment.status;
  // a failed notification never turns a committed change into an error (review L3)
  await createNotification(isStudent
    ? {
        userId: appointment.lecturer.userId,
        title: "Appointment cancelled by the student",
        titleThai: "นักศึกษายกเลิกนัดหมาย",
        message: `${appointment.student.user.name} cancelled the appointment on ${day} ${appointment.startTime}.`,
        messageThai: `${appointment.student.user.nameThai} ยกเลิกนัดหมายวันที่ ${day} เวลา ${appointment.startTime}`,
        type: "appointment",
        priority: "medium",
        channels: ["in-app"],
        actionUrl: "/appointments",
      }
    : {
        userId: appointment.student.userId,
        title: "Appointment status updated",
        titleThai: "สถานะการนัดหมายมีการอัปเดต",
        message: `Your appointment on ${day} ${appointment.startTime} is now ${appointment.status}.`,
        messageThai: `นัดหมายวันที่ ${day} เวลา ${appointment.startTime} ของคุณ: ${statusTh}`,
        type: "appointment",
        priority: "medium",
        channels: ["in-app"],
        actionUrl: "/appointments",
      }).catch((error) => console.error("appointment notification failed", error));

  res.json({
    success: true,
    appointment,
  });
});

export const getOfficeHours = asyncHandler(async (req, res) => {
  const slots = await getAvailableOfficeHourSlots(
    String(req.params.lecturerId),
    req.query.date ? String(req.query.date) : undefined,
  );

  res.json({
    success: true,
    ...slots,
  });
});

export const updateOfficeHours = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const lecturer = await getLecturerProfileByUserId(currentUser.id);

  const officeHours = await replaceOfficeHours(lecturer.id, req.body.officeHours);

  res.json({
    success: true,
    officeHours,
  });
});

export const getMessages = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ fromId: currentUser.id }, { toId: currentUser.id }],
    },
    include: { from: { select: MESSAGE_PERSON }, to: { select: MESSAGE_PERSON } },
    orderBy: { timestamp: "desc" },
  });

  res.json({
    success: true,
    messages,
  });
});

export const createMessage = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const body = req.body.body as string;
  const recipient = await prisma.user.findUnique({
    where: { id: req.body.toId },
    select: { id: true },
  });

  if (!recipient) {
    throw new AppError(404, "Recipient user not found");
  }

  const message = await prisma.message.create({
    data: {
      fromId: currentUser.id,
      toId: req.body.toId,
      subject: req.body.subject,
      preview: body.slice(0, 160),
      body,
      category: req.body.category,
      hasAttachment: Boolean(req.body.attachments?.length),
      attachments: req.body.attachments ?? [],
    },
    include: { from: { select: MESSAGE_PERSON }, to: { select: MESSAGE_PERSON } },
  });

  await createNotification({
    userId: message.toId,
    title: "New message",
    titleThai: "คุณมีข้อความใหม่",
    message: `New message from ${message.from.name}: ${message.subject}`,
    messageThai: `ข้อความใหม่จาก ${message.from.nameThai}: ${message.subject}`,
    type: "info",
    priority: "medium",
    channels: ["in-app"],
    actionUrl: "/messages",
  });

  res.status(201).json({
    success: true,
    message,
  });
});

export const markMessageRead = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const messageId = String(req.params.id);
  const message = await prisma.message.findUnique({
    where: { id: messageId },
  });

  if (!message) {
    throw new AppError(404, "Message not found");
  }

  if (message.toId !== currentUser.id && message.fromId !== currentUser.id) {
    throw new AppError(403, "You cannot update this message");
  }

  const updated = await prisma.message.update({
    where: { id: messageId },
    data: {
      read: true,
    },
    include: { from: { select: MESSAGE_PERSON }, to: { select: MESSAGE_PERSON } },
  });

  res.json({
    success: true,
    message: updated,
  });
});
