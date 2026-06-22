import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { evaluateStudentBadges } from "../services/badge.service";
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

const average = (values: number[], fallback = 0) => {
  const clean = values.filter((value) => Number.isFinite(value));
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : fallback;
};

const roundScore = (value: number) => Number(Math.max(0, Math.min(5, value)).toFixed(2));

const skillLevelScore = (level: string) => {
  switch (level.toLowerCase()) {
    case "expert":
      return 4.8;
    case "advanced":
      return 4.2;
    case "intermediate":
      return 3.3;
    case "beginner":
      return 2.4;
    default:
      return 3;
  }
};

const courseCategory = (code: string): "required" | "ge" | "free" => {
  const normalized = code.toUpperCase();
  if (normalized.startsWith("GE")) return "ge";
  if (normalized.startsWith("FREE")) return "free";
  return "required";
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
    currentUser.role === Role.ADMIN ||
    currentUser.role === Role.STAFF ||
    currentUser.role === Role.LECTURER;
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
    profile: serializeStudentProfile(student),
  });
});

export const getStudentProfileByIdHandler = asyncHandler(async (req, res) => {
  const student = await getStudentProfileByAnyId(String(req.params.id));

  const viewer = req.user;
  const isOwner = viewer?.id === student.userId;
  const isPrivileged = viewer
    ? viewer.role === Role.ADMIN || viewer.role === Role.STAFF || viewer.role === Role.LECTURER
    : false;
  const canViewPublicPortfolio = student.portfolio?.isPublic && student.consent?.allowPortfolioSharing;
  const canViewCompanyData = viewer?.role === Role.COMPANY && student.consent?.allowDataSharing;

  if (!isOwner && !isPrivileged && !canViewPublicPortfolio && !canViewCompanyData) {
    throw new AppError(403, "This student profile is not available for your access level");
  }

  if (isOwner || isPrivileged || canViewCompanyData) {
    return res.json({
      success: true,
      profile: serializeStudentProfile(student),
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
      portfolio: student.portfolio,
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

  const profiles = await prisma.studentProfile.findMany({
    where:
      currentUser.role === Role.COMPANY
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

  const gpaBand = (gpax: number) => {
    if (gpax >= 3.5) return "3.50+";
    if (gpax >= 3) return "3.00-3.49";
    if (gpax >= 2.5) return "2.50-2.99";
    if (gpax > 0) return "below 2.50";
    return "not_disclosed";
  };
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

  const { skills, portfolio, consent, ...studentData } = req.body;

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
        const skill = await tx.skill.upsert({
          where: { name: item.name },
          update: { category: item.category },
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
            verifiedBy: item.verifiedBy,
            yearsOfExperience: item.yearsOfExperience ?? 0,
          },
          create: {
            studentId: student.id,
            skillId: skill.id,
            level: item.level,
            verifiedBy: item.verifiedBy,
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

  const enrollments = await prisma.enrollment.findMany({
    where: { studentId: student.id },
    include: {
      course: true,
      history: true,
    },
    orderBy: { updatedAt: "desc" },
  });

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

  const skillRubrics = await prisma.skillRubric.findMany({
    where: { studentId: student.id },
    orderBy: { updatedAt: "desc" },
  });

  const submissions = await prisma.submission.findMany({
    where: { studentId: student.id },
    include: {
      assignment: {
        select: {
          title: true,
        },
      },
    },
    orderBy: { submittedAt: "desc" },
    take: 20,
  });

  const skillScoreFallback = average(
    student.skills.map((item) => skillLevelScore(item.level)),
    0,
  );
  const technicalRubrics = skillRubrics.filter((item) => item.category.toLowerCase() === "technical");
  const softRubrics = skillRubrics.filter((item) => item.category.toLowerCase() === "soft");
  const scoreFor = (rubrics: typeof skillRubrics, terms: string[], fallback: number) => {
    const matched = rubrics.filter((item) =>
      terms.some((term) => item.skillName.toLowerCase().includes(term)),
    );
    return roundScore(average(matched.map((item) => item.totalScore), fallback));
  };

  const technicalSummary = {
    functionality: scoreFor(technicalRubrics, ["function", "react", "web", "code"], skillScoreFallback),
    readability: scoreFor(technicalRubrics, ["read", "clean", "document"], Math.max(0, skillScoreFallback - 0.2)),
    bestPractice: scoreFor(technicalRubrics, ["best", "practice", "architecture", "pattern"], skillScoreFallback),
    professorWeight: 60,
    peerWeight: 40,
    professorScore: roundScore(average(technicalRubrics.map((item) => item.professorScore), skillScoreFallback)),
    peerScore: roundScore(average(technicalRubrics.map((item) => item.peerScore), skillScoreFallback)),
    commentTags: {
      bug: submissions.filter((item) => (item.score ?? 100) < 60 || item.feedback?.toLowerCase().includes("bug")).length,
      suggestion: submissions.filter((item) => item.feedback && (item.score ?? 0) < 85).length,
      goodJob: submissions.filter((item) => (item.score ?? 0) >= 85).length,
    },
  };

  const softFallback = average(
    student.skills
      .filter((item) => item.skill.category.toLowerCase() === "soft_skill")
      .map((item) => skillLevelScore(item.level)),
    0,
  );
  const softSummary = {
    communication: scoreFor(softRubrics, ["communication", "document", "presentation"], softFallback),
    openness: scoreFor(softRubrics, ["open", "feedback", "team", "collaboration"], softFallback),
    professorWeight: 60,
    peerWeight: 40,
    professorScore: roundScore(average(softRubrics.map((item) => item.professorScore), softFallback)),
    peerScore: roundScore(average(softRubrics.map((item) => item.peerScore), softFallback)),
    feedbackHistory: softRubrics.slice(0, 5).map((item) => ({
      projectName: item.skillName,
      date: item.updatedAt,
      communicationScore: item.skillName.toLowerCase().includes("communication")
        ? item.totalScore
        : softFallback,
      opennessScore: item.skillName.toLowerCase().includes("open") || item.skillName.toLowerCase().includes("feedback")
        ? item.totalScore
        : softFallback,
      comments: submissions.filter((submission) => submission.feedback).length,
    })),
  };

  const categoryCredits = enrollments.reduce(
    (result, item) => {
      result[courseCategory(item.course.code)] += item.course.credits;
      return result;
    },
    { required: 0, ge: 0, free: 0 } as Record<"required" | "ge" | "free", number>,
  );
  const categoryTotals = {
    required: Math.max(student.requiredCredits - 15, categoryCredits.required),
    ge: Math.max(9, categoryCredits.ge),
    free: Math.max(6, categoryCredits.free),
  };
  const curriculumCourses = enrollments.map((item) => ({
    id: item.course.id,
    code: item.course.code,
    nameTH: item.course.nameThai,
    nameEN: item.course.name,
    credits: item.course.credits,
    year: item.course.year,
    semester: item.course.semester,
    category: courseCategory(item.course.code),
    status: item.letterGrade ? "completed" : item.status === "enrolled" ? "inProgress" : "remaining",
    grade: item.letterGrade,
    prerequisites: item.course.prerequisites,
    description: item.course.description ?? "",
  }));

  const activitySummary = await prisma.activityEnrollment.aggregate({
    where: { studentId: student.id, rewardGranted: true },
    _count: { id: true },
  });

  const completedQuests = await prisma.questEnrollment.count({
    where: {
      studentId: student.id,
      status: "completed",
    },
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
      completedQuests,
      badges: student.badges,
      gradeHistory,
      skillRubrics,
      skillSummary: {
        technical: technicalSummary,
        soft: softSummary,
      },
      curriculumProgress: {
        categoryTotals,
        courses: curriculumCourses,
      },
    },
  });
});
