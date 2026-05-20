import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/passport";
import { prisma } from "../lib/prisma";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import { getLecturerProfileByUserId, getStudentProfileByAnyId, getStudentProfileByUserId } from "../services/profile.service";
import { getAvailableOfficeHourSlots, replaceOfficeHours } from "../services/appointment.service";
import { createNotification, createNotificationsForRole } from "../services/notification.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";

const router = Router();

const requestSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  documents: z.array(z.string()).default([]),
});

const requestCommentSchema = z.object({
  text: z.string().min(1),
});

const requestStatusSchema = z.object({
  status: z.string().min(1),
  reviewNotes: z.string().optional(),
  assignedTo: z.string().optional(),
  completedAt: z.coerce.date().optional(),
});

const appointmentSchema = z.object({
  lecturerId: z.string().min(1),
  date: z.coerce.date(),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  location: z.string().min(1),
  purpose: z.string().min(1),
  notes: z.string().optional(),
});

const appointmentStatusSchema = z.object({
  status: z.string().min(1),
  meetingNotes: z.string().optional(),
  followUp: z.string().optional(),
});

const officeHourQuerySchema = z.object({
  date: z.string().optional(),
});

const officeHoursUpdateSchema = z.object({
  officeHours: z.array(
    z.object({
      day: z.string().min(1),
      startTime: z.string().min(1),
      endTime: z.string().min(1),
      location: z.string().min(1),
      isAvailable: z.boolean().optional(),
    }),
  ),
});

const messageCreateSchema = z.object({
  toId: z.string().min(1),
  subject: z.string().min(1),
  body: z.string().min(1),
  category: z.string().default("general"),
  attachments: z.array(z.object({ name: z.string(), url: z.string().url(), size: z.string() })).optional(),
});

router.get(
  "/requests",
  requireAuth,
  asyncHandler(async (req, res) => {
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
  }),
);

router.post(
  "/requests",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(requestSchema),
  asyncHandler(async (req, res) => {
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
  }),
);

router.post(
  "/requests/:id/comment",
  requireAuth,
  validate(requestCommentSchema),
  asyncHandler(async (req, res) => {
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
  }),
);

router.patch(
  "/requests/:id/status",
  requireAuth,
  checkRole([Role.STAFF, Role.ADMIN]),
  validate(requestStatusSchema),
  asyncHandler(async (req, res) => {
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
  }),
);

router.get(
  "/appointments",
  requireAuth,
  asyncHandler(async (req, res) => {
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
  }),
);

router.post(
  "/appointments",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(appointmentSchema),
  asyncHandler(async (req, res) => {
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

    res.status(201).json({
      success: true,
      appointment,
    });
  }),
);

router.patch(
  "/appointments/:id/status",
  requireAuth,
  checkRole([Role.LECTURER, Role.STAFF, Role.ADMIN]),
  validate(appointmentStatusSchema),
  asyncHandler(async (req, res) => {
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
  }),
);

router.get(
  "/office-hours/:lecturerId",
  requireAuth,
  validate(officeHourQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const slots = await getAvailableOfficeHourSlots(
      String(req.params.lecturerId),
      req.query.date ? String(req.query.date) : undefined,
    );

    res.json({
      success: true,
      ...slots,
    });
  }),
);

router.put(
  "/office-hours",
  requireAuth,
  checkRole([Role.LECTURER]),
  validate(officeHoursUpdateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const lecturer = await getLecturerProfileByUserId(currentUser.id);

    const officeHours = await replaceOfficeHours(lecturer.id, req.body.officeHours);

    res.json({
      success: true,
      officeHours,
    });
  }),
);

router.get(
  "/messages",
  requireAuth,
  asyncHandler(async (req, res) => {
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
  }),
);

router.post(
  "/messages",
  requireAuth,
  validate(messageCreateSchema),
  asyncHandler(async (req, res) => {
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
  }),
);

router.patch(
  "/messages/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
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
  }),
);

export const supportRoutes = router;
