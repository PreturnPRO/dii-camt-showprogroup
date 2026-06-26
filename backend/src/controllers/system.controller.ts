import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { createNotification, createNotificationsForRole } from "../services/notification.service";
import { asyncHandler } from "../utils/async-handler";
import { hashPassword } from "../utils/auth";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



const profileId = (prefix: string) => `${prefix}${Date.now().toString().slice(-7)}`;
const normalizePhone = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const safeIdentifier = (value: string, fallback: string) =>
  value.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() || fallback.toLowerCase();

type ImportResult = {
  rowNumber: number;
  status: "created" | "failed";
  userId?: string;
  identifier?: string;
  temporaryPassword?: string;
  message?: string;
};

export const getUsersHandler = asyncHandler(async (req, res) => {
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
          : { isActive: true }, // D-19: default ไม่แสดง user ที่ถูก soft delete (isActive=false)
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
});

export const createUserHandler = asyncHandler(async (req, res) => {
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
});

export const importCompaniesHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const results: ImportResult[] = [];

  for (const [index, row] of req.body.rows.entries()) {
    const rowNumber = Number(row.rowNumber ?? index + 2);
    const temporaryPassword = row.password ?? "Password123!";
    const email =
      row.email ??
      `${safeIdentifier(row.phone || row.companyId, `company${rowNumber}`)}@company.showpro.local`;

    try {
      const normalizedPhone = normalizePhone(row.phone);
      const companies = await prisma.user.findMany({
        where: { role: Role.COMPANY },
        include: { companyProfile: true },
      });
      const duplicatePhone = companies.some((item) => {
        const userPhone = normalizePhone(item.phone);
        const contactPhone = normalizePhone(item.companyProfile?.contactPersonPhone);
        return normalizedPhone && (userPhone === normalizedPhone || contactPhone === normalizedPhone);
      });
      const duplicateEmail = await prisma.user.findUnique({ where: { email } });
      const duplicateCompany = await prisma.companyProfile.findUnique({
        where: { companyId: row.companyId },
      });

      if (duplicateEmail || duplicatePhone || duplicateCompany) {
        results.push({
          rowNumber,
          status: "failed",
          identifier: row.companyId,
          message: "Duplicate company email, phone, or companyId",
        });
        continue;
      }

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash: await hashPassword(temporaryPassword),
            name: row.companyName,
            nameThai: row.companyNameThai || row.companyName,
            role: Role.COMPANY,
            phone: row.phone,
            isActive: true,
            companyProfile: {
              create: {
                companyId: row.companyId,
                companyName: row.companyName,
                companyNameThai: row.companyNameThai || row.companyName,
                industry: row.industry,
                size: row.size,
                website: row.website || undefined,
                address: row.address || undefined,
                locationMapUrl: row.locationMapUrl || undefined,
                productsServices: row.productsServices || undefined,
                contactPersonName: row.contactPersonName || undefined,
                contactPersonRole: row.contactPersonRole || undefined,
                contactPersonEmail: row.contactPersonEmail || row.email || undefined,
                contactPersonPhone: row.contactPersonPhone || row.phone || undefined,
                socialMedia: row.socialMedia || undefined,
                onboardingStatus: "profile_incomplete",
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: currentUser.id,
            action: "COMPANY_IMPORTED",
            resource: "User",
            resourceId: user.id,
            changes: { companyId: row.companyId, email },
          },
        });

        return user;
      });

      results.push({
        rowNumber,
        status: "created",
        userId: created.id,
        identifier: row.companyId,
        temporaryPassword,
      });
    } catch (error) {
      results.push({
        rowNumber,
        status: "failed",
        identifier: row.companyId,
        message: error instanceof Error ? error.message : "Import failed",
      });
    }
  }

  const createdCount = results.filter((item) => item.status === "created").length;
  const failedCount = results.length - createdCount;

  res.status(201).json({
    success: failedCount === 0,
    createdCount,
    updatedCount: 0,
    failedCount,
    results,
  });
});

export const importStudentsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const results: ImportResult[] = [];

  for (const [index, row] of req.body.rows.entries()) {
    const rowNumber = Number(row.rowNumber ?? index + 2);
    const temporaryPassword = row.password ?? "Password123!";
    const email =
      row.email ??
      `${safeIdentifier(row.studentId, `student${rowNumber}`)}@student.showpro.local`;

    try {
      const duplicateEmail = await prisma.user.findUnique({ where: { email } });
      const duplicateStudent = await prisma.studentProfile.findUnique({
        where: { studentId: row.studentId },
      });

      if (duplicateEmail || duplicateStudent) {
        results.push({
          rowNumber,
          status: "failed",
          identifier: row.studentId,
          message: "Duplicate student email or studentId",
        });
        continue;
      }

      const created = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            passwordHash: await hashPassword(temporaryPassword),
            name: row.name,
            nameThai: row.nameThai || row.name,
            role: Role.STUDENT,
            phone: row.phone || undefined,
            isActive: true,
            studentProfile: {
              create: {
                studentId: row.studentId,
                major: row.major,
                program: row.program,
                year: Number(row.year),
                semester: Number(row.semester),
                academicYear: row.academicYear,
                academicStatus: row.academicStatus || "normal",
                consent: {
                  create: {
                    allowDataSharing: false,
                    allowPortfolioSharing: false,
                  },
                },
              },
            },
          },
        });

        await tx.auditLog.create({
          data: {
            userId: currentUser.id,
            action: "STUDENT_IMPORTED",
            resource: "User",
            resourceId: user.id,
            changes: { studentId: row.studentId, email },
          },
        });

        return user;
      });

      results.push({
        rowNumber,
        status: "created",
        userId: created.id,
        identifier: row.studentId,
        temporaryPassword,
      });
    } catch (error) {
      results.push({
        rowNumber,
        status: "failed",
        identifier: row.studentId,
        message: error instanceof Error ? error.message : "Import failed",
      });
    }
  }

  const createdCount = results.filter((item) => item.status === "created").length;
  const failedCount = results.length - createdCount;

  res.status(201).json({
    success: failedCount === 0,
    createdCount,
    updatedCount: 0,
    failedCount,
    results,
  });
});

export const updateUserHandler = asyncHandler(async (req, res) => {
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
  const newRole = req.body.role as Role | undefined;
  const roleChanged = Boolean(newRole && newRole !== user.role);
  const newPasswordHash = req.body.password ? await hashPassword(req.body.password) : undefined;

  const updated = await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: req.body.name,
        nameThai: req.body.nameThai,
        phone: req.body.phone ?? undefined,
        avatar: req.body.avatar ?? undefined,
        isActive: req.body.isActive,
        ...(roleChanged ? { role: newRole } : {}), // D-14: เปลี่ยน role
        ...(newPasswordHash ? { passwordHash: newPasswordHash } : {}), // D-15: reset password
      },
    });

    // D-14: เปลี่ยน role แล้วสร้าง profile ใหม่ของ role นั้นถ้ายังไม่มี (เก็บ profile เดิมไว้กันข้อมูลหาย)
    if (roleChanged && newRole) {
      switch (newRole) {
        case Role.STUDENT:
          if (!user.studentProfile) {
            await tx.studentProfile.create({
              data: {
                userId: user.id,
                studentId: profileId("STU"),
                major: "Digital Industry Integration",
                program: "bachelor",
                year: 1,
                semester: 1,
                academicYear: "2569",
                consent: { create: { allowDataSharing: false, allowPortfolioSharing: false } },
              },
            });
          }
          break;
        case Role.LECTURER:
          if (!user.lecturerProfile) {
            await tx.lecturerProfile.create({
              data: {
                userId: user.id,
                lecturerId: profileId("LEC"),
                department: "Digital Industry Integration",
                position: "Lecturer",
                specialization: [],
                researchInterests: [],
              },
            });
          }
          break;
        case Role.STAFF:
          if (!user.staffProfile) {
            await tx.staffProfile.create({
              data: {
                userId: user.id,
                staffId: profileId("STA"),
                department: "DII Office",
                position: "Staff",
                permissions: [],
                canManageUsers: true,
                canManageCourses: true,
                canManageSchedules: true,
                canViewReports: true,
                canManageInternships: true,
              },
            });
          }
          break;
        case Role.COMPANY:
          if (!user.companyProfile) {
            await tx.companyProfile.create({
              data: {
                userId: user.id,
                companyId: profileId("COM"),
                companyName: user.name,
                companyNameThai: user.nameThai ?? user.name,
                industry: "Technology",
                size: "small",
                onboardingStatus: "pending_review",
                internshipSlots: 0,
              },
            });
          }
          break;
        case Role.ADMIN:
          if (!user.adminProfile) {
            await tx.adminProfile.create({
              data: {
                userId: user.id,
                adminId: profileId("ADM"),
                isSuperAdmin: false,
                permissions: ["*"],
              },
            });
          }
          break;
      }
    }

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
});

export const deleteUserHandler = asyncHandler(async (req, res) => {
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
});

export const getDirectoryUsersHandler = asyncHandler(async (req, res) => {
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
});

export const getLecturersHandler = asyncHandler(async (req, res) => {
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
});

export const getCompaniesHandler = asyncHandler(async (req, res) => {
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
});

export const getNotificationsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const notifications = await prisma.notification.findMany({
    where: { userId: currentUser.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    notifications,
  });
});

export const readAllNotificationsHandler = asyncHandler(async (req, res) => {
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
});

export const readNotificationHandler = asyncHandler(async (req, res) => {
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
});

export const deleteNotificationHandler = asyncHandler(async (req, res) => {
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
});

export const broadcastNotificationHandler = asyncHandler(async (req, res) => {
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
});

export const auditHandler = asyncHandler(async (_req, res) => {
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

export const getSystemUsageReportHandler = asyncHandler(async (_req, res) => {
  const totalUsers = await prisma.user.count();
  const activeUsers = await prisma.user.count({ where: { isActive: true } });
  const usersByRole = await prisma.user.groupBy({
    by: ["role"],
    _count: { role: true },
  });
  const totalCourses = await prisma.course.count();
  const totalJobs = await prisma.jobPosting.count();
  const pendingRequests = await prisma.request.count({
    where: { status: { in: ["pending", "under_review"] } }, // D-12: รวม under_review ด้วย
  });
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
});
