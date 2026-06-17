import { type Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

export const fullUserInclude = {
  studentProfile: {
    include: {
      advisor: { include: { user: true } },
      skills: { include: { skill: true } },
      portfolio: { include: { projects: true } },
      badges: true,
      consent: true,
      timeline: { orderBy: { date: "desc" as const }, take: 25 },
    },
  },
  lecturerProfile: true,
  staffProfile: true,
  companyProfile: true,
  adminProfile: true,
} satisfies Prisma.UserInclude;

export const getUserWithProfiles = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: fullUserInclude,
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  return user;
};

export const getStudentProfileByAnyId = async (identifier: string) => {
  const student = await prisma.studentProfile.findFirst({
    where: {
      OR: [{ id: identifier }, { userId: identifier }, { studentId: identifier }],
    },
    include: {
      user: true,
      advisor: { include: { user: true } },
      skills: { include: { skill: true } },
      portfolio: { include: { projects: true } },
      internship: {
        include: {
          logs: { orderBy: { date: "desc" } },
          documents: true,
          evaluation: true,
          company: { include: { user: true } },
        },
      },
      badges: true,
      consent: true,
      timeline: { orderBy: { date: "desc" }, take: 50 },
      enrollments: {
        include: {
          course: true,
          section: true,
          history: { orderBy: { modifiedAt: "desc" } },
        },
      },
      activityEnrollments: { include: { activity: true } },
      questEnrollments: { include: { quest: true } },
      applications: { include: { jobPosting: { include: { company: true } } } },
    },
  });

  if (!student) {
    throw new AppError(404, "Student profile not found");
  }

  return student;
};

export const getStudentProfileByUserId = async (userId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: true,
      advisor: { include: { user: true } },
      skills: { include: { skill: true } },
      portfolio: { include: { projects: true } },
      consent: true,
      badges: true,
      timeline: { orderBy: { date: "desc" }, take: 25 },
    },
  });

  if (!student) {
    throw new AppError(404, "Student profile not found for this account");
  }

  return student;
};

export const getLecturerProfileByUserId = async (userId: string) => {
  const lecturer = await prisma.lecturerProfile.findUnique({
    where: { userId },
    include: {
      user: true,
      officeHours: true,
      courses: { include: { sections: { include: { facility: true } }, enrollments: true, lecturer: { include: { user: true } } } },
      advisees: { include: { user: true } },
      appointments: { include: { student: { include: { user: true } } } },
      workload: true,
    },
  });

  if (!lecturer) {
    throw new AppError(404, "Lecturer profile not found for this account");
  }

  return lecturer;
};

export const getCompanyProfileByUserId = async (userId: string) => {
  const company = await prisma.companyProfile.findUnique({
    where: { userId },
    include: {
      user: true,
      jobPostings: true,
      cooperation: true,
      payments: true,
    },
  });

  if (!company) {
    throw new AppError(404, "Company profile not found for this account");
  }

  return company;
};

export const getAdminOrStaffDirectory = async () =>
  prisma.user.findMany({
    include: fullUserInclude,
    orderBy: { createdAt: "desc" },
  });

export const getProfileForRole = async (userId: string, role: Role) => {
  switch (role) {
    case Role.STUDENT:
      return getStudentProfileByUserId(userId);
    case Role.LECTURER:
      return getLecturerProfileByUserId(userId);
    case Role.COMPANY:
      return getCompanyProfileByUserId(userId);
    default:
      return getUserWithProfiles(userId);
  }
};
