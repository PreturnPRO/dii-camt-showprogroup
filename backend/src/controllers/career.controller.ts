import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { createNotification } from "../services/notification.service";
import { getCompanyProfileByUserId, getStudentProfileByUserId } from "../services/profile.service";
import { searchTalent } from "../services/talent.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



const scoreFromLevel = (level: string) => {
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

const parseMinimumGpa = (requirements: string[]) => {
  const text = requirements.join(" ").toLowerCase();
  const match = text.match(/(?:gpa|gpax|เกรด|เกรดเฉลี่ย)[^\d]*(\d(?:\.\d{1,2})?)/i);
  return match ? Number(match[1]) : 3;
};

const matchSkills = (requiredSkills: string[], studentSkills: string[]) => {
  const normalizedStudentSkills = studentSkills.map((skill) => skill.toLowerCase());
  const matched = requiredSkills.filter((skill) =>
    normalizedStudentSkills.some((studentSkill) => studentSkill.includes(skill.toLowerCase()) || skill.toLowerCase().includes(studentSkill)),
  );
  const missing = requiredSkills.filter((skill) => !matched.includes(skill));
  const matchScore = requiredSkills.length
    ? Math.round((matched.length / requiredSkills.length) * 100)
    : 100;
  return { matched, missing, matchScore };
};

export const getJobsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const company =
    currentUser.role === Role.COMPANY
      ? await getCompanyProfileByUserId(currentUser.id)
      : null;
  // Company/Admin may see full applicant lists; everyone else (student, lecturer,
  // staff browsing the job board) only ever sees posting details, never other
  // people's application/user records.
  const isPrivileged = currentUser.role === Role.ADMIN || Boolean(company);

  const jobs = await prisma.jobPosting.findMany({
    where: {
      AND: [
        req.query.type ? { type: String(req.query.type) } : {},
        req.query.status ? { status: String(req.query.status) } : {},
        // A company can only ever query its own postings — companyId is never
        // trusted from the client for that role. Admin may still filter by any
        // companyId via the query param.
        company
          ? { companyId: company.id }
          : req.query.companyId && currentUser.role === Role.ADMIN
            ? { companyId: String(req.query.companyId) }
            : {},
        !isPrivileged ? { status: "open" } : {},
        req.query.q
          ? {
              OR: [
                { title: { contains: String(req.query.q), mode: "insensitive" } },
                { description: { contains: String(req.query.q), mode: "insensitive" } },
                { location: { contains: String(req.query.q), mode: "insensitive" } },
              ],
            }
          : {},
      ],
    },
    include: {
      company: { include: { user: { select: { id: true, name: true, email: true } } } },
      ...(isPrivileged
        ? {
            applications: {
              include: {
                student: { include: { user: { select: { id: true, name: true, email: true } } } },
              },
            },
          }
        : {}),
    },
    orderBy: [{ postedAt: "desc" }],
  });

  res.json({
    success: true,
    jobs,
  });
});

export const getCareerTargetsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);
  const studentSkills = student.skills.map((item) => item.skill.name);
  const skillAverage =
    student.skills.length > 0
      ? student.skills.reduce((sum, item) => sum + scoreFromLevel(item.level), 0) / student.skills.length
      : 3;

  const jobs = await prisma.jobPosting.findMany({
    where: { status: "open" },
    include: {
      company: { include: { user: true } },
      applications: {
        where: { studentId: student.id },
      },
    },
    orderBy: [{ postedAt: "desc" }],
    take: 20,
  });

  const targets = jobs
    .map((job) => {
      const preferredSkills = job.preferredSkills.length ? job.preferredSkills : job.requirements.slice(0, 5);
      const skillMatch = matchSkills(preferredSkills, studentSkills);
      const minimumGpa = parseMinimumGpa(job.requirements);
      const technicalMinimum = Math.min(4.5, Math.max(3, 3 + preferredSkills.length * 0.12));
      const softMinimum = job.type === "internship" ? 3.3 : 3.6;

      return {
        id: job.id,
        jobId: job.id,
        companyId: job.companyId,
        name: job.company.companyNameThai || job.company.companyName,
        companyName: job.company.companyName,
        role: job.title,
        type: job.type,
        location: job.location,
        deadline: job.deadline,
        salary: job.salary,
        preferredSkills,
        matchedSkills: skillMatch.matched,
        missingSkills: skillMatch.missing,
        matchScore: skillMatch.matchScore,
        applicationStatus: job.applications[0]?.status ?? null,
        requirements: {
          gpa: minimumGpa,
          technicalSkills: {
            functionality: Number(technicalMinimum.toFixed(1)),
            readability: Number(Math.max(3, technicalMinimum - 0.2).toFixed(1)),
            bestPractice: Number(technicalMinimum.toFixed(1)),
          },
          softSkills: {
            communication: Number(softMinimum.toFixed(1)),
            openness: Number(Math.max(3, softMinimum - 0.1).toFixed(1)),
          },
        },
        readiness: {
          gpaMet: student.gpa >= minimumGpa,
          skillScore: Number(skillAverage.toFixed(2)),
          skillMatch: skillMatch.matchScore,
        },
      };
    })
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, 6);

  res.json({
    success: true,
    targets,
  });
});

export const createJobHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const company =
    currentUser.role === Role.COMPANY
      ? await getCompanyProfileByUserId(currentUser.id)
      : req.body.companyId
        ? await prisma.companyProfile.findUnique({ where: { id: req.body.companyId } })
        : null;

  if (!company) {
    throw new AppError(404, "Company profile not found");
  }

  const job = await prisma.jobPosting.create({
    data: {
      companyId: company.id,
      title: req.body.title,
      type: req.body.type,
      positions: req.body.positions,
      description: req.body.description,
      responsibilities: req.body.responsibilities,
      requirements: req.body.requirements,
      preferredSkills: req.body.preferredSkills,
      salary: req.body.salary,
      benefits: req.body.benefits,
      location: req.body.location,
      workType: req.body.workType,
      startDate: req.body.startDate,
      // No deadline supplied = "continuous hiring" — the column itself is still
      // required, so this stands in for "no closing date" without a schema
      // migration; the UI never surfaces this far-future value to anyone.
      deadline: req.body.deadline ?? new Date(Date.now() + 5 * 365 * 24 * 60 * 60 * 1000),
      maxApplicants: req.body.maxApplicants,
      // New postings always start as draft — they must be explicitly published
      // before students can see them (fixes the phantom-posting leak).
      status: req.body.status ?? "draft",
    },
    include: {
      company: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  res.status(201).json({
    success: true,
    job,
  });
});

export const updateJobHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const jobId = String(req.params.id);
  const company =
    currentUser.role === Role.COMPANY
      ? await getCompanyProfileByUserId(currentUser.id)
      : null;

  const existing = await prisma.jobPosting.findUnique({
    where: { id: jobId },
  });

  if (!existing) {
    throw new AppError(404, "Job posting not found");
  }

  if (company && existing.companyId !== company.id) {
    throw new AppError(403, "You can only manage your own job postings");
  }

  // companyId must never be settable through this endpoint — the ownership
  // check above only validates the *current* owner, so without stripping
  // this, a company could PATCH its own job's companyId to reassign it into
  // another company's account.
  const { companyId: _ignoredCompanyId, ...updateData } = req.body;

  const job = await prisma.jobPosting.update({
    where: { id: jobId },
    data: updateData,
    include: {
      company: { include: { user: { select: { id: true, name: true, email: true } } } },
      applications: {
        include: {
          student: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
    },
  });

  res.json({
    success: true,
    job,
  });
});

export const deleteJobHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const jobId = String(req.params.id);
  const company =
    currentUser.role === Role.COMPANY
      ? await getCompanyProfileByUserId(currentUser.id)
      : null;

  const existing = await prisma.jobPosting.findUnique({
    where: { id: jobId },
  });

  if (!existing) {
    throw new AppError(404, "Job posting not found");
  }

  if (company && existing.companyId !== company.id) {
    throw new AppError(403, "You can only delete your own job postings");
  }

  await prisma.application.deleteMany({
    where: { jobPostingId: jobId },
  });

  const job = await prisma.jobPosting.delete({
    where: { id: jobId },
  });

  res.json({
    success: true,
    job,
  });
});

export const createApplicationHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);
  const jobPostingId = req.body.jobPostingId || String(req.params.jobId);

  if (!jobPostingId) {
    throw new AppError(400, "jobPostingId is required");
  }

  const application = await prisma.application.create({
    data: {
      jobPostingId,
      studentId: student.id,
      coverLetter: req.body.coverLetter,
      resumeUrl: req.body.resumeUrl,
      notes: req.body.notes,
    },
    include: {
      student: { include: { user: true } },
      jobPosting: { include: { company: { include: { user: true } } } },
    },
  });

  await createNotification({
    userId: application.jobPosting.company.userId,
    title: "New job application",
    titleThai: "มีผู้สมัครงานใหม่",
    message: `${application.student.user.name} applied for ${application.jobPosting.title}.`,
    messageThai: `${application.student.user.nameThai} สมัคร ${application.jobPosting.title}`,
    type: "application",
    priority: "medium",
    channels: ["in-app"],
    actionUrl: "/applicants",
  });

  res.status(201).json({
    success: true,
    application,
  });
});

export const getApplicationsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const company =
    currentUser.role === Role.COMPANY
      ? await getCompanyProfileByUserId(currentUser.id)
      : null;
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : null;

  const applications = await prisma.application.findMany({
    where: {
      AND: [
        req.query.jobId ? { jobPostingId: String(req.query.jobId) } : {},
        req.query.status ? { status: String(req.query.status) } : {},
        company ? { jobPosting: { companyId: company.id } } : {},
        student ? { studentId: student.id } : {},
      ],
    },
    include: {
      student: {
        include: {
          user: { select: { id: true, name: true, nameThai: true, email: true } },
          skills: { include: { skill: true } },
        },
      },
      jobPosting: { include: { company: { include: { user: { select: { id: true, name: true, email: true } } } } } },
    },
    orderBy: { appliedAt: "desc" },
  });

  res.json({
    success: true,
    applications,
  });
});

export const updateApplicationHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const applicationId = String(req.params.id);
  const company =
    currentUser.role === Role.COMPANY
      ? await getCompanyProfileByUserId(currentUser.id)
      : null;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      jobPosting: true,
    },
  });

  if (!application) {
    throw new AppError(404, "Application not found");
  }

  if (company && application.jobPosting.companyId !== company.id) {
    throw new AppError(403, "You can only manage applications for your own job postings");
  }

  const updated = await prisma.application.update({
    where: { id: applicationId },
    data: {
      status: req.body.status,
      notes: req.body.notes,
    },
    include: {
      student: { include: { user: true } },
      jobPosting: { include: { company: { include: { user: true } } } },
    },
  });

  await createNotification({
    userId: updated.student.userId,
    title: "Application status updated",
    titleThai: "สถานะใบสมัครมีการอัปเดต",
    message: `Your application for ${updated.jobPosting.title} is now ${updated.status}.`,
    messageThai: `ใบสมัคร ${updated.jobPosting.title} ของคุณมีสถานะเป็น ${updated.status}`,
    type: "application",
    priority: "high",
    channels: ["in-app"],
    actionUrl: "/internships",
  });

  res.json({
    success: true,
    application: updated,
  });
});

export const getInternshipsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT ? await getStudentProfileByUserId(currentUser.id) : null;
  const company =
    currentUser.role === Role.COMPANY ? await getCompanyProfileByUserId(currentUser.id) : null;

  const internships = await prisma.internshipRecord.findMany({
    where: {
      ...(student ? { studentId: student.id } : {}),
      ...(company ? { companyId: company.id } : {}),
    },
    include: {
      student: { include: { user: true } },
      company: { include: { user: true } },
      logs: { orderBy: { date: "desc" } },
      documents: true,
      evaluation: true,
    },
    orderBy: { updatedAt: "desc" },
  });

  res.json({
    success: true,
    internships,
  });
});

export const getInternshipLogsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : req.query.studentId
        ? await prisma.studentProfile.findFirst({
            where: {
              OR: [{ id: String(req.query.studentId) }, { studentId: String(req.query.studentId) }],
            },
          })
        : null;

  if (!student) {
    throw new AppError(400, "studentId query is required for non-student roles");
  }

  const record =
    (await prisma.internshipRecord.findUnique({
      where: { studentId: student.id },
      include: {
        company: { include: { user: true } },
        logs: { orderBy: { date: "desc" } },
        documents: true,
        evaluation: true,
      },
    })) ??
    (await prisma.internshipRecord.create({
      data: {
        studentId: student.id,
      },
      include: {
        logs: true,
        documents: true,
        evaluation: true,
        company: { include: { user: true } },
      },
    }));

  res.json({
    success: true,
    internship: record,
  });
});

export const createInternshipLogHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : req.body.studentId
        ? await prisma.studentProfile.findFirst({
            where: {
              OR: [{ id: req.body.studentId }, { studentId: req.body.studentId }],
            },
          })
        : null;

  if (!student) {
    throw new AppError(400, "studentId is required for non-student roles");
  }

  const record =
    (await prisma.internshipRecord.findUnique({
      where: { studentId: student.id },
    })) ??
    (await prisma.internshipRecord.create({
      data: {
        studentId: student.id,
      },
    }));

  const log = await prisma.internshipLog.create({
    data: {
      recordId: record.id,
      date: req.body.date,
      activities: req.body.activities,
      hours: req.body.hours,
      learnings: req.body.learnings,
      challenges: req.body.challenges,
    },
  });

  res.status(201).json({
    success: true,
    log,
  });
});

export const createInternshipDocumentHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student =
    currentUser.role === Role.STUDENT
      ? await getStudentProfileByUserId(currentUser.id)
      : req.body.studentId
        ? await prisma.studentProfile.findFirst({
            where: {
              OR: [{ id: req.body.studentId }, { studentId: req.body.studentId }],
            },
          })
        : null;

  if (!student) {
    throw new AppError(400, "studentId is required for non-student roles");
  }

  const record =
    (await prisma.internshipRecord.findUnique({
      where: { studentId: student.id },
    })) ??
    (await prisma.internshipRecord.create({
      data: {
        studentId: student.id,
      },
    }));

  const document = await prisma.internshipDocument.create({
    data: {
      recordId: record.id,
      type: req.body.type,
      title: req.body.title,
      url: req.body.url,
    },
  });

  res.status(201).json({
    success: true,
    document,
  });
});

export const updateInternshipDocumentStatusHandler = asyncHandler(async (req, res) => {
  const documentId = String(req.params.id);
  const document = await prisma.internshipDocument.update({
    where: { id: documentId },
    data: {
      status: req.body.status,
    },
    include: {
      record: {
        include: {
          student: true,
        },
      },
    },
  });

  await createNotification({
    userId: document.record.student.userId,
    title: "Internship document reviewed",
    titleThai: "เอกสารฝึกงานได้รับการตรวจแล้ว",
    message: `${document.title} is now ${document.status}.`,
    messageThai: `${document.title} มีสถานะเป็น ${document.status}`,
    type: "info",
    priority: "medium",
    channels: ["in-app"],
    actionUrl: "/internships",
  });

  res.json({
    success: true,
    document,
  });
});

export const searchTalentHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);

  if (currentUser.role === Role.COMPANY) {
    const company = await getCompanyProfileByUserId(currentUser.id);
    return res.json({
      success: true,
      talents: await searchTalent(company.id, {
        jobId: req.query.jobId ? String(req.query.jobId) : undefined,
        skills: req.query.skills
          ? String(req.query.skills).split(",").map((s) => s.trim()).filter(Boolean)
          : undefined,
        careerTrackId: req.query.careerTrackId ? String(req.query.careerTrackId) : undefined,
        q: req.query.q ? String(req.query.q) : undefined,
        major: req.query.major ? String(req.query.major) : undefined,
        minGpax:
          typeof req.query.minGpax !== "undefined" ? Number(req.query.minGpax) : undefined,
        year: typeof req.query.year !== "undefined" ? Number(req.query.year) : undefined,
      }),
    });
  }

  const students = await prisma.studentProfile.findMany({
    where: {
      AND: [
        req.query.major ? { major: { contains: String(req.query.major), mode: "insensitive" } } : {},
        typeof req.query.minGpax !== "undefined"
          ? { gpax: { gte: Number(req.query.minGpax) } }
          : {},
      ],
    },
    include: {
      user: { select: { id: true, name: true, nameThai: true } },
      skills: { include: { skill: true } },
      portfolio: { include: { projects: true } },
      badges: true,
    },
    orderBy: { gpax: "desc" },
  });

  res.json({
    success: true,
    talents: students.map((student) => ({
      id: student.id,
      name: student.user.name,
      studentId: student.studentId,
      major: student.major,
      gpax: student.gpax,
      skills: student.skills.map((item) => item.skill.name),
      badges: student.badges,
    })),
  });
});

export const getCareerTracksHandler = asyncHandler(async (_req, res) => {
  const tracks = await prisma.careerTrack.findMany({ orderBy: { name: "asc" } });
  res.json({ success: true, tracks });
});

export const getMyCareerGoalHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);
  const goal = await prisma.studentCareerGoal.findUnique({
    where: { studentId: student.id },
    include: { careerTrack: true },
  });
  res.json({ success: true, goal });
});

export const updateMyCareerGoalHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);
  const careerTrackId = req.body.careerTrackId as string | null;

  if (careerTrackId === null) {
    await prisma.studentCareerGoal.deleteMany({ where: { studentId: student.id } });
    res.json({ success: true, goal: null });
    return;
  }

  const track = await prisma.careerTrack.findUnique({ where: { id: careerTrackId } });
  if (!track) {
    throw new AppError(404, "Career track not found");
  }

  const goal = await prisma.studentCareerGoal.upsert({
    where: { studentId: student.id },
    update: { careerTrackId },
    create: { studentId: student.id, careerTrackId },
    include: { careerTrack: true },
  });

  res.json({ success: true, goal });
});

export const getTrackWatchesHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const company = await getCompanyProfileByUserId(currentUser.id);
  const watches = await prisma.companyTrackWatch.findMany({
    where: { companyId: company.id },
    include: { careerTrack: true },
    orderBy: { createdAt: "asc" },
  });

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const results = await Promise.all(
    watches.map(async (watch) => {
      const goalSetters = await prisma.studentCareerGoal.findMany({
        where: { careerTrackId: watch.careerTrackId },
        include: { student: { include: { skills: { include: { skill: true } } } } },
      });
      const desired = watch.desiredSkills.map((skill) => skill.toLowerCase());
      // No desired skills specified = nothing to clear, everyone who set the
      // goal counts as "reached" it.
      const matchedCount = desired.length === 0
        ? goalSetters.length
        : goalSetters.filter((goal) => {
            const skillSet = new Set(goal.student.skills.map((item) => item.skill.name.toLowerCase()));
            return desired.every((skill) => skillSet.has(skill));
          }).length;
      const newCount = goalSetters.filter((goal) => goal.createdAt >= sevenDaysAgo).length;

      return {
        id: watch.id,
        careerTrack: {
          id: watch.careerTrack.id,
          name: watch.careerTrack.name,
          nameThai: watch.careerTrack.nameThai,
        },
        desiredSkills: watch.desiredSkills,
        totalGoalSetters: goalSetters.length,
        matchedCount,
        newCount,
      };
    }),
  );

  res.json({ success: true, watches: results });
});

export const createTrackWatchHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const company = await getCompanyProfileByUserId(currentUser.id);
  const careerTrackId = String(req.body.careerTrackId);

  const track = await prisma.careerTrack.findUnique({ where: { id: careerTrackId } });
  if (!track) {
    throw new AppError(404, "Career track not found");
  }

  const watch = await prisma.companyTrackWatch.upsert({
    where: { companyId_careerTrackId: { companyId: company.id, careerTrackId } },
    update: { desiredSkills: Array.isArray(req.body.desiredSkills) ? req.body.desiredSkills.map(String) : [] },
    create: {
      companyId: company.id,
      careerTrackId,
      desiredSkills: Array.isArray(req.body.desiredSkills) ? req.body.desiredSkills.map(String) : [],
    },
    include: { careerTrack: true },
  });

  res.status(201).json({ success: true, watch });
});

export const deleteTrackWatchHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const company = await getCompanyProfileByUserId(currentUser.id);
  const watchId = String(req.params.id);

  const existing = await prisma.companyTrackWatch.findUnique({ where: { id: watchId } });
  if (!existing || existing.companyId !== company.id) {
    throw new AppError(404, "Track watch not found");
  }

  await prisma.companyTrackWatch.delete({ where: { id: watchId } });
  res.json({ success: true });
});
