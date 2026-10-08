import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { computeGpa, isPassing, termGpas, type GradedRow } from "../services/gpa";
import { assertCanViewStudentRecord, canViewStudentRecord, gpaBand, isStaffOrAdmin, lecturerProfileIdOf, lecturerStudentsWhere } from "../services/access-policy";
import { evaluateStudentBadges, getBadgeProgress } from "../services/badge.service";
import {
  getLecturerProfileByUserId,
  getCompanyProfileByUserId,
  getStudentProfileByAnyId,
  getStudentProfileByUserId,
} from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



export const serializeStudentProfile = (student: Awaited<ReturnType<typeof getStudentProfileByAnyId>>) => ({
  id: student.id,
  studentId: student.studentId,
  name: student.user.name,
  nameThai: student.user.nameThai,
  major: student.major,
  program: student.program,
  year: student.year,
  semester: student.semester,
  academicYear: student.academicYear,
  gpa: student.gpa,
  gpax: student.gpax,
  earnedCredits: student.earnedCredits,
  requiredCredits: student.requiredCredits,
  academicStatus: student.academicStatus,
  advisor: student.advisor
    ? {
        id: student.advisor.id,
        name: student.advisor.user.name,
        lecturerId: student.advisor.lecturerId,
      }
    : null,
  skills: student.skills.map((item) => ({
    id: item.id,
    name: item.skill.name,
    category: item.skill.category,
    level: item.level,
    verifiedBy: item.verifiedBy,
    yearsOfExperience: item.yearsOfExperience,
  })),
  portfolio: student.portfolio,
  internship: student.internship,
  badges: student.badges,
  consent: student.consent,
  timeline: student.timeline,
});

/** Company view: no exact grades, consent settings, internship or timeline — only a GPA band. */
export const serializeStudentProfileForCompany = (student: Awaited<ReturnType<typeof getStudentProfileByAnyId>>) => {
  const { gpa, gpax, consent, internship, timeline, ...rest } = serializeStudentProfile(student);
  return { ...rest, gpaBand: gpaBand(gpax || gpa) };
};

const gradePoints: Record<string, number> = {
  A: 4,
  "B+": 3.5,
  B: 3,
  "C+": 2.5,
  C: 2,
  "D+": 1.5,
  D: 1,
  F: 0,
};

export const getStudentsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const lecturer =
    currentUser.role === Role.LECTURER ? await getLecturerProfileByUserId(currentUser.id) : null;

  const students = await prisma.studentProfile.findMany({
    where: {
      AND: [
        req.query.q
          ? {
              OR: [
                { studentId: { contains: String(req.query.q), mode: "insensitive" } },
                { major: { contains: String(req.query.q), mode: "insensitive" } },
                { user: { name: { contains: String(req.query.q), mode: "insensitive" } } },
                { user: { nameThai: { contains: String(req.query.q), mode: "insensitive" } } },
              ],
            }
          : {},
        req.query.year ? { year: Number(req.query.year) } : {},
        req.query.status ? { academicStatus: String(req.query.status) } : {},
        req.query.advisorId ? { advisorId: String(req.query.advisorId) } : {},
        lecturer
          ? {
              OR: [
                { advisorId: lecturer.id },
                {
                  enrollments: {
                    some: {
                      course: {
                        lecturerId: lecturer.id,
                      },
                    },
                  },
                },
              ],
            }
          : {},
      ],
    },
    include: {
      user: true,
      advisor: { include: { user: true } },
      skills: { include: { skill: true } },
      badges: true,
      enrollments: {
        include: {
          course: true,
        },
      },
    },
    orderBy: [{ year: "asc" }, { studentId: "asc" }],
  });

  res.json({
    success: true,
    students: students.map((student) => ({
      id: student.id,
      userId: student.userId,
      studentId: student.studentId,
      name: student.user.name,
      nameThai: student.user.nameThai,
      email: student.user.email,
      major: student.major,
      program: student.program,
      year: student.year,
      semester: student.semester,
      academicYear: student.academicYear,
      gpa: student.gpa,
      gpax: student.gpax,
      earnedCredits: student.earnedCredits,
      requiredCredits: student.requiredCredits,
      academicStatus: student.academicStatus,
      advisor: student.advisor
        ? {
            id: student.advisor.id,
            lecturerId: student.advisor.lecturerId,
            name: student.advisor.user.name,
            nameThai: student.advisor.user.nameThai,
          }
        : null,
      skills: student.skills.map((item) => ({
        id: item.id,
        name: item.skill.name,
        category: item.skill.category,
        level: item.level,
      })),
      badges: student.badges,
      enrolledCourses: student.enrollments.map((item) => ({
        id: item.course.id,
        code: item.course.code,
        name: item.course.name,
        letterGrade: item.letterGrade,
      })),
    })),
  });
});

export const getStudentProfileHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByAnyId(currentUser.id)
      : req.query.studentId
        ? await getStudentProfileByAnyId(String(req.query.studentId))
        : null;

  if (!student) {
    throw new AppError(400, "studentId query is required for non-student roles");
  }

  const isOwner = currentUser.id === student.userId;
  const isPrivileged =
    isStaffOrAdmin(currentUser.role) ||
    (currentUser.role === Role.LECTURER && (await canViewStudentRecord(currentUser, student)));
  const companyProfile =
    currentUser.role === Role.COMPANY ? await getCompanyProfileByUserId(currentUser.id) : null;
  const canViewCompanyData =
    currentUser.role === Role.COMPANY &&
    (student.consent?.allowDataSharing === true ||
      student.consent?.sharedWithCompanies.includes(companyProfile?.id ?? "no-company") === true);

  if (!isOwner && !isPrivileged && !canViewCompanyData) {
    throw new AppError(403, "This student profile is not available for your access level");
  }

  res.json({
    success: true,
    profile:
      !isOwner && !isPrivileged && canViewCompanyData
        ? serializeStudentProfileForCompany(student)
        : serializeStudentProfile(student),
  });
});

export const getStudentProfileByIdHandler = asyncHandler(async (req, res) => {
  const student = await getStudentProfileByAnyId(String(req.params.id));

  const viewer = req.user;
  const isOwner = viewer?.id === student.userId;
  const isPrivileged = viewer
    ? isStaffOrAdmin(viewer.role) ||
      (viewer.role === Role.LECTURER && (await canViewStudentRecord(viewer, student)))
    : false;
  const canViewPublicPortfolio = student.portfolio?.isPublic && student.consent?.allowPortfolioSharing;
  const canViewCompanyData = viewer?.role === Role.COMPANY && student.consent?.allowDataSharing;

  if (!isOwner && !isPrivileged && !canViewPublicPortfolio && !canViewCompanyData) {
    throw new AppError(403, "This student profile is not available for your access level");
  }

  if (isOwner || isPrivileged) {
    return res.json({
      success: true,
      profile: serializeStudentProfile(student),
    });
  }

  if (canViewCompanyData) {
    return res.json({
      success: true,
      profile: serializeStudentProfileForCompany(student),
    });
  }

  return res.json({
    success: true,
    profile: {
      id: student.id,
      studentId: student.studentId,
      name: student.user.name,
      nameThai: student.user.nameThai,
      major: student.major,
      year: student.year,
      // only what the student shows on the portfolio; who it is shared with stays private
      portfolio: student.portfolio
        ? {
            summary: student.portfolio.summary,
            summaryThai: student.portfolio.summaryThai,
            githubUrl: student.portfolio.githubUrl,
            linkedinUrl: student.portfolio.linkedinUrl,
            personalWebsite: student.portfolio.personalWebsite,
            projects: student.portfolio.projects,
            isPublic: student.portfolio.isPublic,
          }
        : null,
      skills: student.skills.map((item) => ({
        name: item.skill.name,
        category: item.skill.category,
        level: item.level,
      })),
      badges: student.badges,
    },
  });
});

export const getStudentProfilesHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const companyProfile =
    currentUser.role === Role.COMPANY
      ? await getCompanyProfileByUserId(currentUser.id)
      : null;

  const lecturerId =
    currentUser.role === Role.LECTURER ? await lecturerProfileIdOf(currentUser.id) : null;

  const profiles = await prisma.studentProfile.findMany({
    where:
      currentUser.role === Role.LECTURER
        ? lecturerStudentsWhere(lecturerId ?? "no-lecturer-profile")
        : currentUser.role === Role.COMPANY
        ? {
            OR: [
              { consent: { allowDataSharing: true } },
              {
                consent: {
                  sharedWithCompanies: {
                    has: companyProfile?.id ?? "no-company",
                  },
                },
              },
            ],
          }
        : undefined,
    include: {
      user: true,
      advisor: { include: { user: true } },
      skills: { include: { skill: true } },
      portfolio: { include: { projects: true } },
      consent: true,
      badges: true,
      internship: {
        include: {
          company: { include: { user: true } },
          documents: true,
          evaluation: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const canSeeExactGrades = currentUser.role !== Role.COMPANY;

  res.json({
    success: true,
    profiles: profiles.map((student) => ({
      id: student.id,
      studentId: student.studentId,
      name: student.user.name,
      nameThai: student.user.nameThai,
      email: currentUser.role === Role.COMPANY ? undefined : student.user.email,
      phone: currentUser.role === Role.COMPANY ? undefined : student.user.phone,
      major: student.major,
      program: student.program,
      year: student.year,
      semester: student.semester,
      academicYear: student.academicYear,
      academicStatus: student.academicStatus,
      totalCredits: student.totalCredits,
      earnedCredits: student.earnedCredits,
      requiredCredits: student.requiredCredits,
      ...(canSeeExactGrades ? { gpa: student.gpa, gpax: student.gpax } : {}),
      gpaBand: gpaBand(student.gpax || student.gpa),
      exactGradeVisible: canSeeExactGrades,
      cvUrl: student.cvUrl,
      advisorId: student.advisorId,
      advisorName: student.advisor?.user.nameThai ?? student.advisor?.user.name,
      advisorEmail: student.advisor?.user.email,
      advisorUserId: student.advisor?.userId,
      skills: student.skills.map((item) => ({
        name: item.skill.name,
        category: item.skill.category,
        level: item.level,
        verifiedBy: item.verifiedBy,
        yearsOfExperience: item.yearsOfExperience,
      })),
      portfolio: student.portfolio,
      portfolioVisible: student.portfolio?.isPublic ?? false,
      badges: student.badges,
      internship: student.internship
        ? {
            id: student.internship.id,
            companyName:
              student.internship.companyName ??
              student.internship.company?.companyNameThai ??
              student.internship.company?.companyName,
            position: student.internship.position,
            supervisor: currentUser.role === Role.COMPANY ? undefined : student.internship.supervisor,
            status: student.internship.status,
            startMonth: student.internship.startMonth,
            endMonth: student.internship.endMonth,
            duration: student.internship.duration,
            documentsCount: student.internship.documents.length,
            hasEvaluation: Boolean(student.internship.evaluation),
          }
        : null,
      dataConsent: student.consent,
      privacy: {
        gradeAccess: canSeeExactGrades ? "visible_for_staff_or_advisor" : "advisor_approval_required",
        gradeAccessMessage:
          "Exact GPA/transcript is restricted. Company/HR must request permission through the student's advisor before access.",
        advisorName: student.advisor?.user.nameThai ?? student.advisor?.user.name,
        advisorEmail: student.advisor?.user.email,
        advisorUserId: student.advisor?.userId,
      },
    })),
  });
});

const STUDENT_EDITABLE = ["cvUrl"] as const;
const ADMIN_EDITABLE = ["cvUrl", "major", "program", "year", "semester", "academicYear", "academicStatus", "advisorId"] as const;

export const updateStudentProfileHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);

  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : req.body.studentId
        ? await getStudentProfileByAnyId(req.body.studentId)
        : null;

  if (!student) {
    throw new AppError(404, "Student profile not found");
  }

  const { skills, portfolio, consent } = req.body;
  const editable = currentUser.role === Role.STUDENT ? STUDENT_EDITABLE : ADMIN_EDITABLE;
  // studentId is the admin's selector for which student to edit; it is never written (audit S6)
  const studentData = Object.fromEntries(
    editable.filter((key) => req.body[key] !== undefined).map((key) => [key, req.body[key]]),
  );

  if (studentData.advisorId) {
    const advisor = await prisma.lecturerProfile.findUnique({
      where: { id: String(studentData.advisorId) },
      select: { id: true },
    });
    if (!advisor) throw new AppError(400, "advisorId must be a lecturer profile id");
  }
  const canVerifySkills = currentUser.role !== Role.STUDENT;

  await prisma.$transaction(async (tx) => {
    await tx.studentProfile.update({
      where: { id: student.id },
      data: studentData,
    });

    if (consent) {
      const currentHistory = (student.consent?.history as Array<Record<string, unknown>> | null) ?? [];
      await tx.dataConsent.upsert({
        where: { studentId: student.id },
        update: {
          ...consent,
          history: [
            ...currentHistory,
            {
              action: "modified",
              target: "profile-consent",
              timestamp: new Date().toISOString(),
            },
          ],
        },
        create: {
          studentId: student.id,
          allowDataSharing: consent.allowDataSharing ?? false,
          allowPortfolioSharing: consent.allowPortfolioSharing ?? false,
          sharedWithCompanies: consent.sharedWithCompanies ?? [],
          emailNotifications: consent.emailNotifications ?? true,
          smsNotifications: consent.smsNotifications ?? false,
          inAppNotifications: consent.inAppNotifications ?? true,
          showInLeaderboard: consent.showInLeaderboard ?? true,
          profileVisibility: consent.profileVisibility ?? "university",
          history: [
            {
              action: "granted",
              target: "profile-consent",
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    }

    if (skills) {
      const skillIds: string[] = [];
      for (const item of skills) {
        // the skill row is shared by everyone, so a profile edit never changes its category
        const skill = await tx.skill.upsert({
          where: { name: item.name },
          update: {},
          create: {
            name: item.name,
            category: item.category,
          },
        });
        skillIds.push(skill.id);

        await tx.studentSkill.upsert({
          where: {
            studentId_skillId: {
              studentId: student.id,
              skillId: skill.id,
            },
          },
          update: {
            level: item.level,
            yearsOfExperience: item.yearsOfExperience ?? 0,
            ...(canVerifySkills && item.verifiedBy !== undefined ? { verifiedBy: item.verifiedBy } : {}),
          },
          create: {
            studentId: student.id,
            skillId: skill.id,
            level: item.level,
            verifiedBy: canVerifySkills ? item.verifiedBy : null,
            yearsOfExperience: item.yearsOfExperience ?? 0,
          },
        });
      }

      await tx.studentSkill.deleteMany({
        where:
          skillIds.length > 0
            ? {
                studentId: student.id,
                skillId: { notIn: skillIds },
              }
            : { studentId: student.id },
      });
    }

    if (portfolio) {
      const savedPortfolio = await tx.portfolio.upsert({
        where: { studentId: student.id },
        update: {
          summary: portfolio.summary,
          summaryThai: portfolio.summaryThai,
          githubUrl: portfolio.githubUrl || null,
          linkedinUrl: portfolio.linkedinUrl || null,
          personalWebsite: portfolio.personalWebsite || null,
          isPublic: portfolio.isPublic,
          sharedWith: portfolio.sharedWith ?? [],
        },
        create: {
          studentId: student.id,
          summary: portfolio.summary ?? "",
          summaryThai: portfolio.summaryThai ?? "",
          githubUrl: portfolio.githubUrl || null,
          linkedinUrl: portfolio.linkedinUrl || null,
          personalWebsite: portfolio.personalWebsite || null,
          isPublic: portfolio.isPublic ?? true,
          sharedWith: portfolio.sharedWith ?? [],
        },
      });

      if (portfolio.projects) {
        await tx.project.deleteMany({
          where: { portfolioId: savedPortfolio.id },
        });

        if (portfolio.projects.length > 0) {
          await tx.project.createMany({
            data: portfolio.projects.map((project: {
              title: string;
              description: string;
              technologies: string[];
              role: string;
              startDate: Date;
              endDate?: Date;
              url?: string;
              images: string[];
              highlights: string[];
            }) => ({
              portfolioId: savedPortfolio.id,
              title: project.title,
              description: project.description,
              technologies: project.technologies,
              role: project.role,
              startDate: project.startDate,
              endDate: project.endDate,
              url: project.url || null,
              images: project.images,
              highlights: project.highlights,
            })),
          });
        }
      }
    }
  });

  await evaluateStudentBadges(student.id);

  res.json({
    success: true,
    profile: serializeStudentProfile(await getStudentProfileByAnyId(student.id)),
  });
});

export const getStudentStatsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);

  let student;
  if (currentUser.role === Role.STUDENT) {
    student = await getStudentProfileByUserId(currentUser.id);
  } else {
    if (!req.query.studentId) {
      throw new AppError(400, "studentId query is required for non-student roles");
    }
    student = await getStudentProfileByAnyId(String(req.query.studentId));
  }
  await assertCanViewStudentRecord(currentUser, student);

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id, status: { not: "dropped" } },
    include: {
      course: true,
      history: true,
    },
    orderBy: { updatedAt: "desc" },
  });
  const gradedRows: GradedRow[] = enrollments.map((item) => ({
    letterGrade: item.letterGrade,
    credits: item.course.credits,
    status: item.status,
    semester: item.course.semester,
    academicYear: item.course.academicYear,
  }));
  const termGpa = termGpas(gradedRows);
  const currentTermGpa = computeGpa(
    gradedRows.filter((row) => row.semester === student.semester && row.academicYear === student.academicYear),
  ).gpa;

  const gradeHistory = enrollments.map((item) => ({
    courseId: item.courseId,
    courseCode: item.course.code,
    courseName: item.course.name,
    courseNameThai: item.course.nameThai,
    credits: item.course.credits,
    semester: item.course.semester,
    academicYear: item.course.academicYear,
    total: item.total,
    letterGrade: item.letterGrade,
    gradePoint: item.letterGrade ? gradePoints[item.letterGrade] ?? 0 : null,
    gradedAt: item.gradedAt,
    history: item.history,
  }));

  // owner decision 7/10/69: real course credits, no categories (courses carry none) and never dropped courses
  const courseStatus = (letterGrade: string | null, status: string) => {
    if (!letterGrade) return status === "enrolled" ? "inProgress" : "notGraded";
    if (letterGrade === "W") return "withdrawn";
    if (letterGrade === "I") return "incomplete";
    return isPassing(letterGrade) ? "completed" : "failed";
  };
  const curriculumCourses = enrollments.map((item) => ({
    id: item.course.id,
    code: item.course.code,
    nameTH: item.course.nameThai,
    nameEN: item.course.name,
    credits: item.course.credits,
    year: item.course.year,
    semester: item.course.semester,
    status: courseStatus(item.letterGrade, item.status),
    grade: item.letterGrade,
    prerequisites: item.course.prerequisites,
    description: item.course.description ?? "",
  }));
  const completedCredits = computeGpa(gradedRows).earnedCredits;
  const inProgressCredits = curriculumCourses.filter((c) => c.status === "inProgress").reduce((sum, c) => sum + c.credits, 0);

  const activitySummary = await prisma.activityEnrollment.aggregate({
    where: { studentId: student.id, rewardGranted: true },
    _count: { id: true },
  });


  res.json({
    success: true,
    stats: {
      gpax: student.gpax,
      gpa: student.gpa,
      earnedCredits: student.earnedCredits,
      requiredCredits: student.requiredCredits,
      degreeProgress:
        student.requiredCredits > 0
          ? Number(((student.earnedCredits / student.requiredCredits) * 100).toFixed(2))
          : 0,
      academicStatus: student.academicStatus,
      xp: student.xp,
      coins: student.coins,
      gamificationPoints: student.gamificationPoints,
      totalActivityHours: student.totalActivityHours,
      completedActivities: activitySummary._count.id,
      badges: student.badges,
      gradeHistory,
      termGpa,
      currentTermGpa,
      curriculumProgress: {
        requiredCredits: student.requiredCredits,
        completedCredits,
        inProgressCredits,
        courses: curriculumCourses,
      },
    },
  });
});

// the student's badges: earned ones plus locked catalogue badges with their real counter
export const getStudentBadgesHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByAnyId(currentUser.id);
  if (!student) {
    throw new AppError(404, "Student profile not found");
  }
  res.json({ success: true, badges: await getBadgeProgress(student.id) });
});
