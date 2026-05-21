import { Role } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../lib/passport";
import { prisma } from "../lib/prisma";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import { createNotification, createNotificationsForRole } from "../services/notification.service";
import { asyncHandler } from "../utils/async-handler";
import { hashPassword } from "../utils/auth";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";

const router = Router();

const userQuerySchema = z.object({
  q: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
  isActive: z.enum(["true", "false"]).optional(),
});

const userCreateSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  nameThai: z.string().optional(),
  role: z.nativeEnum(Role),
  password: z.string().min(8).optional(),
  phone: z.string().optional(),
  avatar: z.string().url().optional(),
  isActive: z.boolean().optional(),
  profile: z.record(z.any()).default({}),
});

const userUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  nameThai: z.string().min(1).optional(),
  phone: z.string().optional().nullable(),
  avatar: z.string().url().optional().nullable(),
  isActive: z.boolean().optional(),
  roleData: z.record(z.any()).default({}),
});

const directoryQuerySchema = z.object({
  q: z.string().optional(),
  role: z.nativeEnum(Role).optional(),
});

const lecturerQuerySchema = z.object({
  q: z.string().optional(),
});

const companyQuerySchema = z.object({
  q: z.string().optional(),
});

const notificationBroadcastSchema = z.object({
  title: z.string().min(1),
  titleThai: z.string().optional(),
  message: z.string().min(1),
  messageThai: z.string().optional(),
  type: z.string().default("info"),
  priority: z.string().default("medium"),
  channels: z.array(z.string()).default(["in-app"]),
  targetRoles: z.array(z.nativeEnum(Role)).default([]),
  userIds: z.array(z.string()).default([]),
  actionUrl: z.string().optional(),
  actionLabel: z.string().optional(),
  expiresAt: z.coerce.date().optional(),
});

router.get(
  "/users",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(userQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      where: {
        AND: [
          req.query.q
            ? {
                OR: [
                  { name: { contains: String(req.query.q), mode: "insensitive" } },
                  { nameThai: { contains: String(req.query.q), mode: "insensitive" } },
                  { email: { contains: String(req.query.q), mode: "insensitive" } },
                ],
              }
            : {},
          req.query.role ? { role: req.query.role as Role } : {},
          typeof req.query.isActive !== "undefined"
            ? { isActive: req.query.isActive === "true" }
            : {},
        ],
      },
      include: {
        studentProfile: true,
        lecturerProfile: true,
        staffProfile: true,
        companyProfile: true,
        adminProfile: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      users,
    });
  }),
);

const profileId = (prefix: string) => `${prefix}${Date.now().toString().slice(-7)}`;

router.post(
  "/users",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(userCreateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const temporaryPassword = req.body.password ?? "Password123!";
    const passwordHash = await hashPassword(temporaryPassword);
    const profile = req.body.profile ?? {};

    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email: req.body.email,
          passwordHash,
          name: req.body.name,
          nameThai: req.body.nameThai ?? req.body.name,
          role: req.body.role,
          phone: req.body.phone,
          avatar: req.body.avatar,
          isActive: req.body.isActive ?? true,
        },
      });

      switch (req.body.role) {
        case Role.STUDENT:
          await tx.studentProfile.create({
            data: {
              userId: created.id,
              studentId: String(profile.studentId ?? profileId("STU")),
              major: String(profile.major ?? "Digital Industry Integration"),
              program: String(profile.program ?? "bachelor"),
              year: Number(profile.year ?? 1),
              semester: Number(profile.semester ?? 1),
              academicYear: String(profile.academicYear ?? "2569"),
              consent: {
                create: {
                  allowDataSharing: Boolean(profile.allowDataSharing ?? false),
                  allowPortfolioSharing: Boolean(profile.allowPortfolioSharing ?? false),
                },
              },
            },
          });
          break;
        case Role.LECTURER:
          await tx.lecturerProfile.create({
            data: {
              userId: created.id,
              lecturerId: String(profile.lecturerId ?? profileId("LEC")),
              department: String(profile.department ?? "Digital Industry Integration"),
              position: String(profile.position ?? "Lecturer"),
              specialization: Array.isArray(profile.specialization)
                ? profile.specialization.map(String)
                : [],
              researchInterests: Array.isArray(profile.researchInterests)
                ? profile.researchInterests.map(String)
                : [],
            },
          });
          break;
        case Role.STAFF:
          await tx.staffProfile.create({
            data: {
              userId: created.id,
              staffId: String(profile.staffId ?? profileId("STA")),
              department: String(profile.department ?? "DII Office"),
              position: String(profile.position ?? "Staff"),
              permissions: Array.isArray(profile.permissions) ? profile.permissions.map(String) : [],
              canManageUsers: Boolean(profile.canManageUsers ?? true),
              canManageCourses: Boolean(profile.canManageCourses ?? true),
              canManageSchedules: Boolean(profile.canManageSchedules ?? true),
              canViewReports: Boolean(profile.canViewReports ?? true),
              canManageInternships: Boolean(profile.canManageInternships ?? true),
            },
          });
          break;
        case Role.COMPANY:
          await tx.companyProfile.create({
            data: {
              userId: created.id,
              companyId: String(profile.companyId ?? profileId("COM")),
              companyName: String(profile.companyName ?? req.body.name),
              companyNameThai: String(profile.companyNameThai ?? req.body.nameThai ?? req.body.name),
              industry: String(profile.industry ?? "Technology"),
              size: String(profile.size ?? "small"),
              website: profile.website ? String(profile.website) : undefined,
              address: profile.address ? String(profile.address) : undefined,
              locationMapUrl: profile.locationMapUrl ? String(profile.locationMapUrl) : undefined,
              productsServices: profile.productsServices ? String(profile.productsServices) : undefined,
              contactPersonName: profile.contactPersonName ? String(profile.contactPersonName) : undefined,
              contactPersonRole: profile.contactPersonRole ? String(profile.contactPersonRole) : undefined,
              contactPersonEmail: profile.contactPersonEmail ? String(profile.contactPersonEmail) : undefined,
              contactPersonPhone: profile.contactPersonPhone ? String(profile.contactPersonPhone) : undefined,
              socialMedia: profile.socialMedia ? String(profile.socialMedia) : undefined,
              onboardingStatus: String(profile.onboardingStatus ?? "pending_review"),
              privacyProtocolAcceptedAt: profile.privacyProtocolAcceptedAt
                ? new Date(String(profile.privacyProtocolAcceptedAt))
                : undefined,
              internshipSlots: Number(profile.internshipSlots ?? 0),
            },
          });
          break;
        case Role.ADMIN:
          await tx.adminProfile.create({
            data: {
              userId: created.id,
              adminId: String(profile.adminId ?? profileId("ADM")),
              isSuperAdmin: Boolean(profile.isSuperAdmin ?? false),
              permissions: Array.isArray(profile.permissions)
                ? profile.permissions.map(String)
                : ["*"],
            },
          });
          break;
      }

      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: "USER_CREATED",
          resource: "User",
          resourceId: created.id,
          changes: { role: created.role, email: created.email },
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: created.id },
        include: {
          studentProfile: true,
          lecturerProfile: true,
          staffProfile: true,
          companyProfile: true,
          adminProfile: true,
        },
      });
    });

    res.status(201).json({
      success: true,
      user,
      temporaryPassword,
    });
  }),
);

router.patch(
  "/users/:id",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(userUpdateSchema),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const userId = String(req.params.id);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        studentProfile: true,
        lecturerProfile: true,
        staffProfile: true,
        companyProfile: true,
        adminProfile: true,
      },
    });

    if (!user) {
      throw new AppError(404, "User not found");
    }

    const roleData = req.body.roleData ?? {};

    const updated = await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: {
          name: req.body.name,
          nameThai: req.body.nameThai,
          phone: req.body.phone ?? undefined,
          avatar: req.body.avatar ?? undefined,
          isActive: req.body.isActive,
        },
      });

      switch (user.role) {
        case Role.STUDENT:
          if (user.studentProfile) {
            await tx.studentProfile.update({
              where: { userId: user.id },
              data: {
                major: roleData.major,
                program: roleData.program,
                year: roleData.year,
                semester: roleData.semester,
                academicYear: roleData.academicYear,
              },
            });
          }
          break;
        case Role.LECTURER:
          if (user.lecturerProfile) {
            await tx.lecturerProfile.update({
              where: { userId: user.id },
              data: {
                department: roleData.department,
                position: roleData.position,
              },
            });
          }
          break;
        case Role.STAFF:
          if (user.staffProfile) {
            await tx.staffProfile.update({
              where: { userId: user.id },
              data: {
                department: roleData.department,
                position: roleData.position,
              },
            });
          }
          break;
        case Role.COMPANY:
          if (user.companyProfile) {
            await tx.companyProfile.update({
              where: { userId: user.id },
              data: {
                companyName: roleData.companyName,
                companyNameThai: roleData.companyNameThai,
                industry: roleData.industry,
                size: roleData.size,
                website: roleData.website,
                address: roleData.address,
                locationMapUrl: roleData.locationMapUrl,
                productsServices: roleData.productsServices,
                contactPersonName: roleData.contactPersonName,
                contactPersonRole: roleData.contactPersonRole,
                contactPersonEmail: roleData.contactPersonEmail,
                contactPersonPhone: roleData.contactPersonPhone,
                socialMedia: roleData.socialMedia,
                onboardingStatus: roleData.onboardingStatus,
                privacyProtocolAcceptedAt: roleData.privacyProtocolAcceptedAt
                  ? new Date(String(roleData.privacyProtocolAcceptedAt))
                  : undefined,
              },
            });
          }
          break;
        case Role.ADMIN:
          if (user.adminProfile) {
            await tx.adminProfile.update({
              where: { userId: user.id },
              data: {
                isSuperAdmin:
                  typeof roleData.isSuperAdmin === "boolean" ? roleData.isSuperAdmin : undefined,
              },
            });
          }
          break;
      }

      await tx.auditLog.create({
        data: {
          userId: currentUser.id,
          action: "USER_UPDATED",
          resource: "User",
          resourceId: user.id,
          changes: { name: req.body.name, isActive: req.body.isActive },
        },
      });

      return tx.user.findUniqueOrThrow({
        where: { id: user.id },
        include: {
          studentProfile: true,
          lecturerProfile: true,
          staffProfile: true,
          companyProfile: true,
          adminProfile: true,
        },
      });
    });

    res.json({
      success: true,
      user: updated,
    });
  }),
);

router.delete(
  "/users/:id",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const userId = String(req.params.id);

    if (userId === currentUser.id) {
      throw new AppError(400, "You cannot deactivate your own account");
    }

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
      include: {
        studentProfile: true,
        lecturerProfile: true,
        staffProfile: true,
        companyProfile: true,
        adminProfile: true,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: currentUser.id,
        action: "USER_DEACTIVATED",
        resource: "User",
        resourceId: user.id,
        changes: { isActive: false },
      },
    });

    res.json({
      success: true,
      user,
    });
  }),
);

router.get(
  "/directory/users",
  requireAuth,
  validate(directoryQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const company =
      currentUser.role === Role.COMPANY
        ? await prisma.companyProfile.findUnique({
            where: { userId: currentUser.id },
          })
        : null;

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { isActive: true },
          { id: { not: currentUser.id } },
          req.query.role ? { role: req.query.role as Role } : {},
          req.query.q
            ? {
                OR: [
                  { name: { contains: String(req.query.q), mode: "insensitive" } },
                  { nameThai: { contains: String(req.query.q), mode: "insensitive" } },
                  { email: { contains: String(req.query.q), mode: "insensitive" } },
                ],
              }
            : {},
          currentUser.role === Role.COMPANY
            ? {
                OR: [
                  { role: { in: [Role.STAFF, Role.ADMIN, Role.LECTURER, Role.COMPANY] } },
                  {
                    studentProfile: {
                      consent: {
                        OR: [
                          { allowDataSharing: true },
                          {
                            sharedWithCompanies: {
                              has: company?.id ?? "no-company",
                            },
                          },
                        ],
                      },
                    },
                  },
                ],
              }
            : {},
        ],
      },
      include: {
        studentProfile: {
          include: {
            consent: true,
          },
        },
        lecturerProfile: true,
        staffProfile: true,
        companyProfile: true,
        adminProfile: true,
      },
      orderBy: { name: "asc" },
    });

    res.json({
      success: true,
      users: users.map((user) => ({
        id: user.id,
        email: user.email,
        name: user.name,
        nameThai: user.nameThai,
        role: user.role,
        avatar: user.avatar,
        phone: user.phone,
        studentProfile: user.studentProfile
          ? {
              id: user.studentProfile.id,
              studentId: user.studentProfile.studentId,
              major: user.studentProfile.major,
              year: user.studentProfile.year,
            }
          : null,
        lecturerProfile: user.lecturerProfile,
        companyProfile: user.companyProfile,
      })),
    });
  }),
);

router.get(
  "/lecturers",
  requireAuth,
  validate(lecturerQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const lecturers = await prisma.lecturerProfile.findMany({
      where: req.query.q
        ? {
            OR: [
              { lecturerId: { contains: String(req.query.q), mode: "insensitive" } },
              { department: { contains: String(req.query.q), mode: "insensitive" } },
              { user: { name: { contains: String(req.query.q), mode: "insensitive" } } },
              { user: { nameThai: { contains: String(req.query.q), mode: "insensitive" } } },
            ],
          }
        : undefined,
      include: {
        user: true,
        officeHours: true,
        courses: true,
        advisees: {
          include: {
            user: true,
          },
        },
      },
      orderBy: { lecturerId: "asc" },
    });

    res.json({
      success: true,
      lecturers,
    });
  }),
);

router.get(
  "/companies",
  requireAuth,
  validate(companyQuerySchema, "query"),
  asyncHandler(async (req, res) => {
    const companies = await prisma.companyProfile.findMany({
      where: req.query.q
        ? {
            OR: [
              { companyId: { contains: String(req.query.q), mode: "insensitive" } },
              { companyName: { contains: String(req.query.q), mode: "insensitive" } },
              { companyNameThai: { contains: String(req.query.q), mode: "insensitive" } },
              { industry: { contains: String(req.query.q), mode: "insensitive" } },
            ],
          }
        : undefined,
      include: {
        user: true,
        cooperation: true,
        payments: true,
        jobPostings: true,
      },
      orderBy: { companyName: "asc" },
    });

    res.json({
      success: true,
      companies,
    });
  }),
);

router.get(
  "/notifications",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const notifications = await prisma.notification.findMany({
      where: { userId: currentUser.id },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      notifications,
    });
  }),
);

router.patch(
  "/notifications/read-all",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const result = await prisma.notification.updateMany({
      where: {
        userId: currentUser.id,
        isRead: false,
      },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      updatedCount: result.count,
    });
  }),
);

router.patch(
  "/notifications/:id/read",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const notificationId = String(req.params.id);
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing || existing.userId !== currentUser.id) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    const notification = await prisma.notification.update({
      where: { id: notificationId },
      data: {
        isRead: true,
        readAt: new Date(),
      },
    });

    res.json({
      success: true,
      notification,
    });
  }),
);

router.delete(
  "/notifications/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const notificationId = String(req.params.id);
    const existing = await prisma.notification.findUnique({
      where: { id: notificationId },
    });

    if (!existing) {
      throw new AppError(404, "Notification not found");
    }

    if (
      existing.userId !== currentUser.id &&
      currentUser.role !== Role.ADMIN &&
      currentUser.role !== Role.STAFF
    ) {
      throw new AppError(403, "You cannot delete this notification");
    }

    const notification = await prisma.notification.delete({
      where: { id: notificationId },
    });

    res.json({
      success: true,
      notification,
    });
  }),
);

router.post(
  "/notifications/broadcast",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  validate(notificationBroadcastSchema),
  asyncHandler(async (req, res) => {
    const notifications = [];

    if (req.body.userIds.length > 0) {
      const created = await Promise.all(
        req.body.userIds.map((userId: string) =>
          createNotification({
            userId,
            title: req.body.title,
            titleThai: req.body.titleThai,
            message: req.body.message,
            messageThai: req.body.messageThai,
            type: req.body.type,
            priority: req.body.priority,
            channels: req.body.channels,
            actionUrl: req.body.actionUrl,
            actionLabel: req.body.actionLabel,
            expiresAt: req.body.expiresAt,
          }),
        ),
      );
      notifications.push(...created);
    } else if (req.body.targetRoles.length > 0) {
      for (const role of req.body.targetRoles) {
        const created = await createNotificationsForRole(role, {
          title: req.body.title,
          titleThai: req.body.titleThai,
          message: req.body.message,
          messageThai: req.body.messageThai,
          type: req.body.type,
          priority: req.body.priority,
          channels: req.body.channels,
          actionUrl: req.body.actionUrl,
          actionLabel: req.body.actionLabel,
          expiresAt: req.body.expiresAt,
        });
        notifications.push(...created);
      }
    } else {
      const users = await prisma.user.findMany({
        where: { isActive: true },
        select: { id: true },
      });

      const created = await Promise.all(
        users.map((user) =>
          createNotification({
            userId: user.id,
            title: req.body.title,
            titleThai: req.body.titleThai,
            message: req.body.message,
            messageThai: req.body.messageThai,
            type: req.body.type,
            priority: req.body.priority,
            channels: req.body.channels,
            actionUrl: req.body.actionUrl,
            actionLabel: req.body.actionLabel,
            expiresAt: req.body.expiresAt,
          }),
        ),
      );
      notifications.push(...created);
    }

    res.status(201).json({
      success: true,
      notifications,
    });
  }),
);

const auditHandler = asyncHandler(async (_req, res) => {
  const logs = await prisma.auditLog.findMany({
    include: {
      user: true,
    },
    orderBy: { timestamp: "desc" },
  });

  res.json({
    success: true,
    logs,
    });
  });

router.get("/audit", requireAuth, checkRole([Role.ADMIN, Role.STAFF]), auditHandler);
router.get("/audit-logs", requireAuth, checkRole([Role.ADMIN, Role.STAFF]), auditHandler);

router.get(
  "/reports/system-usage",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  asyncHandler(async (_req, res) => {
    const totalUsers = await prisma.user.count();
    const activeUsers = await prisma.user.count({ where: { isActive: true } });
    const usersByRole = await prisma.user.groupBy({
      by: ["role"],
      _count: { role: true },
    });
    const totalCourses = await prisma.course.count();
    const totalJobs = await prisma.jobPosting.count();
    const pendingRequests = await prisma.request.count({ where: { status: "pending" } });
    const totalAppointments = await prisma.appointment.count();
    const unreadNotifications = await prisma.notification.count({ where: { isRead: false } });
    const totalAuditLogs = await prisma.auditLog.count();

    res.json({
      success: true,
      report: {
        totalUsers,
        activeUsers,
        usersByRole: usersByRole.reduce((acc: Record<string, number>, item) => {
          acc[item.role] = item._count.role;
          return acc;
        }, {}),
        totalCourses,
        totalJobs,
        pendingRequests,
        totalAppointments,
        unreadNotifications,
        totalAuditLogs,
      },
    });
  }),
);

export const systemRoutes = router;
