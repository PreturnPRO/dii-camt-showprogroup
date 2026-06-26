import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { getLecturerProfileByUserId, getStudentProfileByUserId } from "../services/profile.service";
import { getAvailableOfficeHourSlots, replaceOfficeHours } from "../services/appointment.service";
import { createNotification, createNotificationsForRole } from "../services/notification.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



export const getRequests = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);

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

  const appointments =
    currentUser.role === Role.STUDENT
      ? await prisma.appointment.findMany({
          where: {
            student: { userId: currentUser.id },
          },
          include: {
            lecturer: { include: { user: true } },
            student: { include: { user: true } },
          },
          orderBy: { date: "asc" },
        })
      : currentUser.role === Role.LECTURER
        ? await prisma.appointment.findMany({
            where: {
              lecturer: { userId: currentUser.id },
            },
            include: {
              lecturer: { include: { user: true } },
              student: { include: { user: true } },
            },
            orderBy: { date: "asc" },
          })
        : await prisma.appointment.findMany({
            include: {
              lecturer: { include: { user: true } },
              student: { include: { user: true } },
            },
            orderBy: { date: "asc" },
          });

  res.json({
    success: true,
    appointments,
  });
});

export const createAppointment = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);

  const appointment = await prisma.appointment.create({
    data: {
      studentId: student.id,
      lecturerId: req.body.lecturerId,
      date: req.body.date,
      startTime: req.body.startTime,
      endTime: req.body.endTime,
      location: req.body.location,
      purpose: req.body.purpose,
      notes: req.body.notes,
    },
    include: {
      lecturer: { include: { user: true } },
      student: { include: { user: true } },
    },
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
  const appointmentId = String(req.params.id);
  const appointment = await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: req.body.status,
      meetingNotes: req.body.meetingNotes,
      followUp: req.body.followUp,
    },
    include: {
      lecturer: { include: { user: true } },
      student: { include: { user: true } },
    },
  });

  await createNotification({
    userId: appointment.student.userId,
    title: "Appointment status updated",
    titleThai: "สถานะการนัดหมายมีการอัปเดต",
    message: `Your appointment is now marked as ${appointment.status}.`,
    messageThai: `การนัดหมายของคุณถูกอัปเดตเป็น ${appointment.status}`,
    type: "appointment",
    priority: "medium",
    channels: ["in-app"],
    actionUrl: "/appointments",
  });

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
    include: {
      from: true,
      to: true,
    },
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
    include: {
      from: true,
      to: true,
    },
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
    include: {
      from: true,
      to: true,
    },
  });

  res.json({
    success: true,
    message: updated,
  });
});
