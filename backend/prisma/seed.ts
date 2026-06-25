import bcrypt from "bcryptjs";
import { Prisma, PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

const password = "Password123!";

const courseSchedule = (
  day: string,
  startTime: string,
  endTime: string,
  room: string,
  type = "lecture",
) =>
  [
    {
      day,
      startTime,
      endTime,
      room,
      type,
    },
  ] as Prisma.InputJsonValue;

const consentHistory = (action: "granted" | "modified", target: string) =>
  [
    {
      action,
      target,
      timestamp: new Date().toISOString(),
    },
  ] as Prisma.InputJsonValue;

const messageAttachments = [
  {
    name: "intern-brief.pdf",
    url: "https://files.example.com/intern-brief.pdf",
    size: "2.1 MB",
  },
] as Prisma.InputJsonValue;

const peerEvaluations = [
  {
    evaluatorId: "demo-peer-1",
    teamworkScore: 4.5,
    contributionScore: 4.7,
    communicationScore: 4.6,
  },
] as Prisma.InputJsonValue;

async function resetDatabase() {
  await prisma.requestComment.deleteMany();
  await prisma.request.deleteMany();
  await prisma.message.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.attendanceRecord.deleteMany();
  await prisma.gradeHistory.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.courseMaterial.deleteMany();
  await prisma.enrollmentScore.deleteMany();
  await prisma.enrollment.deleteMany();
  await prisma.section.deleteMany();
  await prisma.courseGradingCriteria.deleteMany();
  await prisma.courseGradeCutoff.deleteMany();
  await prisma.attendanceSession.deleteMany();
  await prisma.course.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.studentSkill.deleteMany();
  await prisma.skillRubric.deleteMany();
  await prisma.skill.deleteMany();
  await prisma.project.deleteMany();
  await prisma.portfolio.deleteMany();
  await prisma.badge.deleteMany();
  await prisma.officeHour.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.questEnrollment.deleteMany();
  await prisma.questTask.deleteMany();
  await prisma.quest.deleteMany();
  await prisma.internshipEvaluation.deleteMany();
  await prisma.internshipDocument.deleteMany();
  await prisma.internshipLog.deleteMany();
  await prisma.internshipRecord.deleteMany();
  await prisma.application.deleteMany();
  await prisma.jobPosting.deleteMany();
  await prisma.activityEnrollment.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.timelineEvent.deleteMany();
  await prisma.dataConsent.deleteMany();
  await prisma.budgetRecord.deleteMany();
  await prisma.cooperationRecord.deleteMany();
  await prisma.workloadRecord.deleteMany();
  await prisma.paymentHistory.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.adminProfile.deleteMany();
  await prisma.companyProfile.deleteMany();
  await prisma.staffProfile.deleteMany();
  await prisma.lecturerProfile.deleteMany();
  await prisma.studentProfile.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  const passwordHash = await bcrypt.hash(password, 12);
  await resetDatabase();

  const adminUser = await prisma.user.create({
    data: {
      email: "admin@showpro.local",
      passwordHash,
      name: "System Admin",
      nameThai: "ผู้ดูแลระบบ",
      role: Role.ADMIN,
      phone: "0800000001",
      adminProfile: {
        create: {
          adminId: "ADM-001",
          isSuperAdmin: true,
          permissions: ["*"],
        },
      },
    },
    include: { adminProfile: true },
  });

  const staffUser = await prisma.user.create({
    data: {
      email: "staff@showpro.local",
      passwordHash,
      name: "Operations Staff",
      nameThai: "เจ้าหน้าที่ปฏิบัติการ",
      role: Role.STAFF,
      phone: "0800000002",
      staffProfile: {
        create: {
          staffId: "STF-001",
          department: "Academic Support",
          position: "Senior Officer",
          permissions: ["users", "courses", "budget", "internship", "reports"],
          canManageUsers: true,
          canManageCourses: true,
          canManageSchedules: true,
          canViewReports: true,
          canManageInternships: true,
        },
      },
    },
    include: { staffProfile: true },
  });

  const lecturerA = await prisma.user.create({
    data: {
      email: "narin@showpro.local",
      passwordHash,
      name: "Dr. Narin Techakul",
      nameThai: "ดร.นรินทร์ เทคากุล",
      role: Role.LECTURER,
      phone: "0800000003",
      lecturerProfile: {
        create: {
          lecturerId: "LCT-001",
          department: "Digital Innovation",
          position: "associate_professor",
          specialization: ["Full Stack", "Software Engineering"],
          researchInterests: ["EdTech", "AI for Learning"],
        },
      },
    },
    include: { lecturerProfile: true },
  });

  const lecturerB = await prisma.user.create({
    data: {
      email: "mali@showpro.local",
      passwordHash,
      name: "Asst. Prof. Mali UX",
      nameThai: "ผศ.มะลิ ยูเอ็กซ์",
      role: Role.LECTURER,
      phone: "0800000004",
      lecturerProfile: {
        create: {
          lecturerId: "LCT-002",
          department: "Digital Innovation",
          position: "assistant_professor",
          specialization: ["UX Research", "Product Design"],
          researchInterests: ["Human-Centered Design", "Accessibility"],
        },
      },
    },
    include: { lecturerProfile: true },
  });

  const companyA = await prisma.user.create({
    data: {
      email: "talent@northernsoft.local",
      passwordHash,
      name: "Northern Soft Recruiter",
      nameThai: "ทีมสรรหา Northern Soft",
      role: Role.COMPANY,
      phone: "0800000005",
      companyProfile: {
        create: {
          companyId: "CMP-001",
          companyName: "Northern Soft Co., Ltd.",
          companyNameThai: "นอร์ทเทิร์นซอฟต์ จำกัด",
          industry: "Software Product",
          size: "medium",
          website: "https://northernsoft.example.com",
          address: "Chiang Mai Business Park",
          internshipSlots: 5,
          currentInterns: 1,
          subscription: "pro",
          subscriptionStatus: "active",
        },
      },
    },
    include: { companyProfile: true },
  });

  const companyB = await prisma.user.create({
    data: {
      email: "careers@creativelabs.local",
      passwordHash,
      name: "Creative Labs HR",
      nameThai: "ฝ่ายบุคคล Creative Labs",
      role: Role.COMPANY,
      phone: "0800000006",
      companyProfile: {
        create: {
          companyId: "CMP-002",
          companyName: "Creative Labs Studio",
          companyNameThai: "ครีเอทีฟแล็บส์ สตูดิโอ",
          industry: "Design & Innovation",
          size: "small",
          website: "https://creativelabs.example.com",
          address: "Nimman Road, Chiang Mai",
          internshipSlots: 3,
          currentInterns: 0,
          subscription: "free",
          subscriptionStatus: "inactive",
        },
      },
    },
    include: { companyProfile: true },
  });

  const studentAUser = await prisma.user.create({
    data: {
      email: "alice@student.showpro.local",
      passwordHash,
      name: "Alice Pongsakorn",
      nameThai: "อลิซ พงศกร",
      role: Role.STUDENT,
      phone: "0900000001",
      studentProfile: {
        create: {
          studentId: "65010001",
          major: "Digital Innovation",
          program: "bachelor",
          year: 3,
          semester: 1,
          academicYear: "2569",
          gpa: 3.74,
          gpax: 3.74,
          totalCredits: 120,
          requiredCredits: 120,
          earnedCredits: 78,
          academicStatus: "normal",
          cvUrl: "https://portfolio.example.com/alice/cv.pdf",
          advisorId: lecturerA.lecturerProfile!.id,
          xp: 180,
          coins: 95,
          gamificationPoints: 64,
          totalActivityHours: 24,
        },
      },
    },
    include: { studentProfile: true },
  });

  const studentBUser = await prisma.user.create({
    data: {
      email: "bob@student.showpro.local",
      passwordHash,
      name: "Bob Thananon",
      nameThai: "บ๊อบ ธนานนท์",
      role: Role.STUDENT,
      phone: "0900000002",
      studentProfile: {
        create: {
          studentId: "65010002",
          major: "Digital Innovation",
          program: "bachelor",
          year: 2,
          semester: 1,
          academicYear: "2569",
          gpa: 3.31,
          gpax: 3.31,
          totalCredits: 120,
          requiredCredits: 120,
          earnedCredits: 54,
          academicStatus: "normal",
          advisorId: lecturerA.lecturerProfile!.id,
          xp: 70,
          coins: 25,
          gamificationPoints: 10,
          totalActivityHours: 6,
        },
      },
    },
    include: { studentProfile: true },
  });

  const studentCUser = await prisma.user.create({
    data: {
      email: "chompoo@student.showpro.local",
      passwordHash,
      name: "Chompoo Arisa",
      nameThai: "ชมพู่ อริสา",
      role: Role.STUDENT,
      phone: "0900000003",
      studentProfile: {
        create: {
          studentId: "65010003",
          major: "Digital Innovation",
          program: "bachelor",
          year: 4,
          semester: 1,
          academicYear: "2569",
          gpa: 2.89,
          gpax: 2.89,
          totalCredits: 120,
          requiredCredits: 120,
          earnedCredits: 102,
          academicStatus: "risk",
          advisorId: lecturerB.lecturerProfile!.id,
          xp: 40,
          coins: 10,
          gamificationPoints: 4,
          totalActivityHours: 3,
        },
      },
    },
    include: { studentProfile: true },
  });

  const studentA = studentAUser.studentProfile!;
  const studentB = studentBUser.studentProfile!;
  const studentC = studentCUser.studentProfile!;

  await prisma.dataConsent.createMany({
    data: [
      {
        studentId: studentA.id,
        allowDataSharing: true,
        allowPortfolioSharing: true,
        sharedWithCompanies: [companyA.companyProfile!.id],
        profileVisibility: "public",
        history: consentHistory("granted", "public-portfolio"),
      },
      {
        studentId: studentB.id,
        allowDataSharing: true,
        allowPortfolioSharing: false,
        sharedWithCompanies: [],
        profileVisibility: "university",
        history: consentHistory("granted", "recruiter-search"),
      },
      {
        studentId: studentC.id,
        allowDataSharing: false,
        allowPortfolioSharing: false,
        sharedWithCompanies: [],
        profileVisibility: "private",
        history: consentHistory("granted", "private-profile"),
      },
    ],
  });

  const skills = await Promise.all([
    prisma.skill.create({ data: { name: "TypeScript", category: "programming" } }),
    prisma.skill.create({ data: { name: "React", category: "framework" } }),
    prisma.skill.create({ data: { name: "Node.js", category: "tool" } }),
    prisma.skill.create({ data: { name: "UX Research", category: "soft_skill" } }),
    prisma.skill.create({ data: { name: "Figma", category: "tool" } }),
    prisma.skill.create({ data: { name: "PostgreSQL", category: "tool" } }),
  ]);

  const skillByName = Object.fromEntries(skills.map((skill) => [skill.name, skill]));

  await prisma.studentSkill.createMany({
    data: [
      {
        studentId: studentA.id,
        skillId: skillByName.TypeScript.id,
        level: "advanced",
        verifiedBy: "CS340",
        yearsOfExperience: 2,
      },
      {
        studentId: studentA.id,
        skillId: skillByName.React.id,
        level: "advanced",
        verifiedBy: "Quest: React Dashboard",
        yearsOfExperience: 2,
      },
      {
        studentId: studentA.id,
        skillId: skillByName["Node.js"].id,
        level: "intermediate",
        verifiedBy: "Internship Project",
        yearsOfExperience: 1,
      },
      {
        studentId: studentA.id,
        skillId: skillByName.PostgreSQL.id,
        level: "intermediate",
        verifiedBy: "Database Systems",
        yearsOfExperience: 1,
      },
      {
        studentId: studentB.id,
        skillId: skillByName.React.id,
        level: "intermediate",
        verifiedBy: "Frontend Studio",
        yearsOfExperience: 1,
      },
      {
        studentId: studentB.id,
        skillId: skillByName.Figma.id,
        level: "intermediate",
        verifiedBy: "Design Workshop",
        yearsOfExperience: 1,
      },
      {
        studentId: studentC.id,
        skillId: skillByName["UX Research"].id,
        level: "intermediate",
        verifiedBy: "UX Research Methods",
        yearsOfExperience: 2,
      },
    ],
  });

  const portfolioA = await prisma.portfolio.create({
    data: {
      studentId: studentA.id,
      summary: "Frontend-oriented student building dashboard and workflow automation products.",
      summaryThai: "นักศึกษาสายฟรอนต์เอนด์ที่สนใจ dashboard และ workflow automation",
      githubUrl: "https://github.com/alice-showpro",
      linkedinUrl: "https://linkedin.com/in/alice-showpro",
      personalWebsite: "https://alice-showpro.example.com",
      isPublic: true,
      sharedWith: [companyA.companyProfile!.id],
    },
  });

  const portfolioB = await prisma.portfolio.create({
    data: {
      studentId: studentB.id,
      summary: "Product-minded student interested in design systems and interactive prototypes.",
      summaryThai: "นักศึกษาที่สนใจ design system และ interactive prototype",
      githubUrl: "https://github.com/bob-showpro",
      linkedinUrl: "https://linkedin.com/in/bob-showpro",
      isPublic: false,
      sharedWith: [],
    },
  });

  await prisma.project.createMany({
    data: [
      {
        portfolioId: portfolioA.id,
        title: "Campus Services Dashboard",
        description: "A full-stack dashboard for academic services and student workflow tracking.",
        technologies: ["React", "TypeScript", "Node.js", "PostgreSQL"],
        role: "Frontend Lead",
        startDate: new Date("2025-06-01"),
        endDate: new Date("2025-10-30"),
        url: "https://projects.example.com/campus-dashboard",
        images: ["https://images.example.com/dashboard-1.png"],
        highlights: ["Role-based access", "Data visualization", "Workflow automation"],
      },
      {
        portfolioId: portfolioA.id,
        title: "Intern Journal Mobile UI",
        description: "Prototype and implementation for internship logging on mobile devices.",
        technologies: ["React", "Figma"],
        role: "UI Engineer",
        startDate: new Date("2025-11-01"),
        url: "https://projects.example.com/intern-journal",
        images: ["https://images.example.com/intern-journal.png"],
        highlights: ["Thai-first UX", "Offline-ready patterns"],
      },
      {
        portfolioId: portfolioB.id,
        title: "Design Critique Board",
        description: "A critique workflow with live feedback cards for studio classes.",
        technologies: ["Figma", "React"],
        role: "Product Designer",
        startDate: new Date("2025-08-01"),
        endDate: new Date("2025-12-01"),
        url: "https://projects.example.com/design-board",
        images: [],
        highlights: ["Rapid prototyping", "Reusable components"],
      },
    ],
  });

  await prisma.skillRubric.createMany({
    data: [
      {
        studentId: studentA.id,
        category: "technical",
        skillName: "React",
        professorScore: 4.5,
        peerScore: 4.2,
        totalScore: 4.35,
      },
      {
        studentId: studentB.id,
        category: "soft",
        skillName: "Communication",
        professorScore: 4.0,
        peerScore: 4.4,
        totalScore: 4.2,
      },
    ],
  });

  const [facilityA, facilityB, facilityC] = await Promise.all([
    prisma.facility.create({
      data: {
        code: "FAC-DII-401",
        name: "Software Studio Room 401",
        building: "DII Building",
        room: "401",
        floor: "4",
        type: "classroom",
        capacity: 40,
      },
    }),
    prisma.facility.create({
      data: {
        code: "FAC-DII-502",
        name: "UX Strategy Studio Room 502",
        building: "DII Building",
        room: "502",
        floor: "5",
        type: "studio",
        capacity: 35,
      },
    }),
    prisma.facility.create({
      data: {
        code: "FAC-DII-LAB-1",
        name: "Creative Lab 1",
        building: "Innovation Hub",
        room: "Lab-1",
        floor: "2",
        type: "lab",
        capacity: 24,
      },
    }),
  ]);

  const courseA = await prisma.course.create({
    data: {
      code: "DII340",
      name: "Full Stack Product Development",
      nameThai: "การพัฒนาผลิตภัณฑ์ฟูลสแตก",
      credits: 3,
      semester: 1,
      academicYear: "2569",
      year: 3,
      lecturerId: lecturerA.lecturerProfile!.id,
      description: "From product scoping to deployment using a modern web stack.",
      prerequisites: ["DII210"],
      learningOutcomes: ["Build secure APIs", "Design maintainable frontends", "Ship MVPs"],
      syllabus: "https://docs.example.com/dii340-syllabus",
      schedule: courseSchedule("monday", "09:00", "12:00", "DII-401"),
      maxStudents: 40,
      minStudents: 10,
      sections: {
        create: [
          {
            number: "01",
            room: "DII-401",
            facilityId: facilityA.id,
            maxStudents: 40,
            schedule: courseSchedule("monday", "09:00", "12:00", "DII-401"),
          },
        ],
      },
      materials: {
        create: [
          {
            title: "Sprint Brief",
            type: "document",
            url: "https://docs.example.com/dii340/sprint-brief.pdf",
            size: "1.2 MB",
          },
        ],
      },
    },
    include: {
      sections: true,
    },
  });

  const courseB = await prisma.course.create({
    data: {
      code: "DII420",
      name: "UX Strategy Studio",
      nameThai: "สตูดิโอกลยุทธ์ประสบการณ์ผู้ใช้",
      credits: 3,
      semester: 1,
      academicYear: "2569",
      year: 4,
      lecturerId: lecturerB.lecturerProfile!.id,
      description: "Research-driven UX strategy and service design studio.",
      prerequisites: ["DII310"],
      learningOutcomes: ["Plan studies", "Synthesize insights", "Pitch UX roadmaps"],
      syllabus: "https://docs.example.com/dii420-syllabus",
      schedule: courseSchedule("wednesday", "13:00", "16:00", "DII-502"),
      maxStudents: 35,
      minStudents: 8,
      sections: {
        create: [
          {
            number: "01",
            room: "DII-502",
            facilityId: facilityB.id,
            maxStudents: 35,
            schedule: courseSchedule("wednesday", "13:00", "16:00", "DII-502"),
          },
        ],
      },
      materials: {
        create: [
          {
            title: "Research Playbook",
            type: "slide",
            url: "https://docs.example.com/dii420/research-playbook.pdf",
            size: "5.7 MB",
          },
        ],
      },
    },
    include: {
      sections: true,
    },
  });

  const enrollmentA1 = await prisma.enrollment.create({
    data: {
      studentId: studentA.id,
      courseId: courseA.id,
      sectionId: courseA.sections[0].id,
      total: 95,
      letterGrade: "A",
      gradedBy: lecturerA.id,
      gradedAt: new Date("2026-03-10"),
      remarks: "Outstanding project delivery",
    },
  });

  const enrollmentB1 = await prisma.enrollment.create({
    data: {
      studentId: studentB.id,
      courseId: courseA.id,
      sectionId: courseA.sections[0].id,
      total: 85,
      letterGrade: "B+",
      gradedBy: lecturerA.id,
      gradedAt: new Date("2026-03-10"),
      remarks: "Strong progression throughout the term",
    },
  });

  const enrollmentA2 = await prisma.enrollment.create({
    data: {
      studentId: studentA.id,
      courseId: courseB.id,
      sectionId: courseB.sections[0].id,
      total: 92,
      letterGrade: "A",
      gradedBy: lecturerB.id,
      gradedAt: new Date("2026-03-11"),
    },
  });

  const enrollmentC2 = await prisma.enrollment.create({
    data: {
      studentId: studentC.id,
      courseId: courseB.id,
      sectionId: courseB.sections[0].id,
      total: 69,
      letterGrade: "C+",
      gradedBy: lecturerB.id,
      gradedAt: new Date("2026-03-11"),
      remarks: "Needs stronger synthesis and final presentation",
    },
  });

  await prisma.gradeHistory.createMany({
    data: [
      {
        enrollmentId: enrollmentA1.id,
        modifiedBy: lecturerA.id,
        previousGrade: "B+",
        newGrade: "A",
        reason: "Final project moderation",
      },
      {
        enrollmentId: enrollmentB1.id,
        modifiedBy: lecturerA.id,
        previousGrade: "B",
        newGrade: "B+",
        reason: "Participation score updated",
      },
      {
        enrollmentId: enrollmentC2.id,
        modifiedBy: lecturerB.id,
        previousGrade: "C",
        newGrade: "C+",
        reason: "Recalculated research deliverable",
      },
    ],
  });

  await prisma.attendanceRecord.createMany({
    data: [
      {
        enrollmentId: enrollmentA1.id,
        date: new Date("2026-01-12"),
        status: "present",
      },
      {
        enrollmentId: enrollmentA1.id,
        date: new Date("2026-01-19"),
        status: "present",
      },
      {
        enrollmentId: enrollmentB1.id,
        date: new Date("2026-01-12"),
        status: "late",
      },
      {
        enrollmentId: enrollmentC2.id,
        date: new Date("2026-01-14"),
        status: "present",
      },
    ],
  });

  const assignmentA = await prisma.assignment.create({
    data: {
      courseId: courseA.id,
      title: "Sprint 2 Demo",
      description: "Ship the dashboard prototype with authenticated API integration.",
      type: "group",
      dueDate: new Date("2026-02-20"),
      maxScore: 100,
      isPublished: true,
    },
  });

  await prisma.submission.createMany({
    data: [
      {
        assignmentId: assignmentA.id,
        studentId: studentA.id,
        files: ["https://files.example.com/sprint2-alice.zip"],
        score: 95,
        feedback: "Excellent structure and polished UX.",
        status: "graded",
      },
      {
        assignmentId: assignmentA.id,
        studentId: studentB.id,
        files: ["https://files.example.com/sprint2-bob.zip"],
        score: 88,
        feedback: "Strong work, can improve API error handling.",
        status: "graded",
      },
    ],
  });

  const quest = await prisma.quest.create({
    data: {
      title: "React Dashboard Challenge",
      titleEn: "React Dashboard Challenge",
      description: "Build a role-based dashboard backed by a real API.",
      descriptionEn: "Build a role-based dashboard backed by a real API.",
      type: "challenge",
      difficulty: "hard",
      category: "frontend",
      xp: 120,
      coins: 60,
      deadline: new Date("2026-05-30"),
      assignerId: lecturerA.id,
      assignerType: "lecturer",
      tasks: {
        create: [
          {
            title: "Implement API auth flow",
            titleEn: "Implement API auth flow",
            sortOrder: 1,
          },
          {
            title: "Build analytics widgets",
            titleEn: "Build analytics widgets",
            sortOrder: 2,
          },
          {
            title: "Ship mobile responsive layout",
            titleEn: "Ship mobile responsive layout",
            sortOrder: 3,
          },
        ],
      },
    },
    include: { tasks: true },
  });

  await prisma.questEnrollment.createMany({
    data: [
      {
        questId: quest.id,
        studentId: studentA.id,
        status: "completed",
        progress: 100,
        completedTasks: quest.tasks.map((task) => task.id),
        rewardGranted: true,
        completedAt: new Date("2026-04-05"),
      },
      {
        questId: quest.id,
        studentId: studentB.id,
        status: "in-progress",
        progress: 67,
        completedTasks: quest.tasks.slice(0, 2).map((task) => task.id),
        rewardGranted: false,
      },
    ],
  });

  const activityCompleted = await prisma.activity.create({
    data: {
      title: "ShowPro Hackathon",
      titleThai: "แฮกกาธอน ShowPro",
      description: "48-hour sprint to solve internal student workflow pain points.",
      type: "hackathon",
      startDate: new Date("2026-02-10T09:00:00.000Z"),
      endDate: new Date("2026-02-12T18:00:00.000Z"),
      location: "Innovation Hub",
      organizer: "DII-CAMT",
      activityHours: 18,
      gamificationPoints: 50,
      maxParticipants: 80,
      isGroupActivity: true,
      teamSize: 4,
      qrCode: "SHOWPRO-HACK-2026",
      checkInEnabled: true,
      status: "completed",
      registrationStatus: "closed",
      requiresPeerEvaluation: true,
      evaluations: peerEvaluations,
    },
  });

  const activityUpcoming = await prisma.activity.create({
    data: {
      title: "Career Portfolio Workshop",
      titleThai: "เวิร์กช็อปเตรียมพอร์ตอาชีพ",
      description: "Hands-on workshop on portfolio storytelling and recruiter readiness.",
      type: "workshop",
      startDate: new Date("2026-06-18T09:00:00.000Z"),
      endDate: new Date("2026-06-18T16:00:00.000Z"),
      location: "DII Studio 2",
      organizer: "Career Services",
      activityHours: 6,
      gamificationPoints: 15,
      maxParticipants: 40,
      checkInEnabled: true,
      status: "upcoming",
      registrationStatus: "open",
      requiresPeerEvaluation: false,
    },
  });

  await prisma.activityEnrollment.createMany({
    data: [
      {
        activityId: activityCompleted.id,
        studentId: studentA.id,
        status: "completed",
        rewardGranted: true,
        checkedInAt: new Date("2026-02-10T09:05:00.000Z"),
      },
      {
        activityId: activityCompleted.id,
        studentId: studentB.id,
        status: "registered",
        rewardGranted: false,
      },
      {
        activityId: activityUpcoming.id,
        studentId: studentB.id,
        status: "registered",
        rewardGranted: false,
      },
    ],
  });

  const jobPostingA = await prisma.jobPosting.create({
    data: {
      companyId: companyA.companyProfile!.id,
      title: "Frontend Engineer Intern",
      type: "internship",
      positions: 2,
      description: "Work with the product team on dashboards and internal tooling.",
      responsibilities: ["Build dashboard pages", "Connect APIs", "Write UI tests"],
      requirements: ["TypeScript", "React", "Node.js"],
      preferredSkills: ["PostgreSQL", "Tailwind CSS"],
      salary: "12,000 THB / month",
      benefits: ["Hybrid work", "Mentorship"],
      location: "Chiang Mai",
      workType: "hybrid",
      startDate: new Date("2026-06-01"),
      deadline: new Date("2026-05-20"),
      maxApplicants: 50,
      status: "open",
    },
  });

  const jobPostingB = await prisma.jobPosting.create({
    data: {
      companyId: companyB.companyProfile!.id,
      title: "UX Design Intern",
      type: "internship",
      positions: 1,
      description: "Support UX research and prototype testing for client products.",
      responsibilities: ["Interview users", "Synthesize insights", "Prototype flows"],
      requirements: ["UX Research", "Figma"],
      preferredSkills: ["Communication"],
      salary: "10,000 THB / month",
      benefits: ["Flexible schedule"],
      location: "Chiang Mai",
      workType: "onsite",
      deadline: new Date("2026-05-25"),
      maxApplicants: 30,
      status: "open",
    },
  });

  await prisma.application.createMany({
    data: [
      {
        jobPostingId: jobPostingA.id,
        studentId: studentA.id,
        status: "reviewed",
        coverLetter: "I enjoy building dashboard systems and shipping production-ready UI.",
        resumeUrl: "https://portfolio.example.com/alice/cv.pdf",
      },
      {
        jobPostingId: jobPostingA.id,
        studentId: studentB.id,
        status: "shortlisted",
        coverLetter: "I want to strengthen my engineering craft while collaborating with product teams.",
        resumeUrl: "https://portfolio.example.com/bob/cv.pdf",
      },
      {
        jobPostingId: jobPostingB.id,
        studentId: studentC.id,
        status: "pending",
        coverLetter: "I want to deepen my UX research and service design practice.",
      },
    ],
  });

  const internshipRecordA = await prisma.internshipRecord.create({
    data: {
      studentId: studentA.id,
      startMonth: "2569-06",
      endMonth: "2569-08",
      duration: 3,
      companyId: companyA.companyProfile!.id,
      companyName: companyA.companyProfile!.companyName,
      position: "Frontend Engineer Intern",
      supervisor: "Korn Product Lead",
      supervisorContact: "korn@northernsoft.example.com",
      status: "in_progress",
    },
  });

  await prisma.internshipLog.createMany({
    data: [
      {
        recordId: internshipRecordA.id,
        date: new Date("2026-06-05"),
        activities: "Implemented recruiter dashboard widgets and API state handling.",
        hours: 8,
        learnings: "Improved API contract collaboration with backend team.",
        challenges: "Needed to reconcile edge cases in applicant filtering.",
      },
      {
        recordId: internshipRecordA.id,
        date: new Date("2026-06-06"),
        activities: "Refined application status board and prepared component documentation.",
        hours: 7,
        learnings: "Learned how product teams prioritize release-ready work.",
      },
    ],
  });

  await prisma.internshipDocument.createMany({
    data: [
      {
        recordId: internshipRecordA.id,
        type: "agreement",
        title: "Internship Agreement",
        url: "https://files.example.com/internship-agreement-alice.pdf",
        status: "approved",
      },
      {
        recordId: internshipRecordA.id,
        type: "report",
        title: "Weekly Report Week 1",
        url: "https://files.example.com/weekly-report-alice-w1.pdf",
        status: "pending",
      },
    ],
  });

  await prisma.internshipEvaluation.create({
    data: {
      recordId: internshipRecordA.id,
      evaluatedBy: "Korn Product Lead",
      technicalSkills: 4.6,
      softSkills: 4.4,
      workEthic: 4.8,
      problemSolving: 4.5,
      overallScore: 4.58,
      comments: "Excellent ownership and communication with cross-functional teams.",
      recommendations: "Keep strengthening backend integration confidence.",
    },
  });

  const requestA = await prisma.request.create({
    data: {
      studentId: studentB.id,
      type: "certificate",
      title: "Request English Enrollment Certificate",
      description: "Need official certificate for scholarship application.",
      documents: ["https://files.example.com/scholarship-form.pdf"],
      status: "under_review",
      assignedTo: staffUser.id,
    },
  });

  await prisma.requestComment.createMany({
    data: [
      {
        requestId: requestA.id,
        authorId: studentBUser.id,
        text: "Need the certificate before next Friday if possible.",
      },
      {
        requestId: requestA.id,
        authorId: staffUser.id,
        text: "Document received. We will process it within 2 business days.",
      },
    ],
  });

  await prisma.officeHour.createMany({
    data: [
      {
        lecturerId: lecturerA.lecturerProfile!.id,
        day: "tuesday",
        startTime: "13:00",
        endTime: "14:00",
        location: "DII Faculty Room 4",
      },
      {
        lecturerId: lecturerA.lecturerProfile!.id,
        day: "thursday",
        startTime: "10:00",
        endTime: "11:00",
        location: "DII Faculty Room 4",
      },
      {
        lecturerId: lecturerB.lecturerProfile!.id,
        day: "wednesday",
        startTime: "09:00",
        endTime: "10:00",
        location: "UX Lab",
      },
    ],
  });

  await prisma.appointment.createMany({
    data: [
      {
        studentId: studentA.id,
        lecturerId: lecturerA.lecturerProfile!.id,
        date: new Date("2026-05-06T13:00:00.000Z"),
        startTime: "13:00",
        endTime: "14:00",
        location: "DII Faculty Room 4",
        purpose: "Internship progress review",
        status: "confirmed",
      },
      {
        studentId: studentC.id,
        lecturerId: lecturerB.lecturerProfile!.id,
        date: new Date("2026-05-07T09:00:00.000Z"),
        startTime: "09:00",
        endTime: "10:00",
        location: "UX Lab",
        purpose: "Academic risk consultation",
        status: "pending",
      },
    ],
  });

  await prisma.budgetRecord.createMany({
    data: [
      {
        title: "Hackathon Prize Budget",
        amount: 30000,
        type: "expense",
        category: "student_activity",
        date: new Date("2026-02-01"),
        status: "approved",
        note: "Approved for ShowPro Hackathon finalists.",
      },
      {
        title: "Industry Workshop Sponsorship",
        amount: 15000,
        type: "income",
        category: "sponsorship",
        date: new Date("2026-03-01"),
        status: "approved",
      },
    ],
  });

  await prisma.cooperationRecord.createMany({
    data: [
      {
        companyId: companyA.companyProfile!.id,
        title: "Applied Talent Pipeline MOU",
        type: "MOU",
        details: "Internship pipeline and capstone mentoring collaboration.",
        expiryDate: new Date("2027-12-31"),
        status: "active",
      },
      {
        companyId: companyB.companyProfile!.id,
        title: "UX Research Partnership",
        type: "Partnership",
        details: "Joint studio critiques and research mentorship.",
        expiryDate: new Date("2027-06-30"),
        status: "active",
      },
    ],
  });

  await prisma.workloadRecord.createMany({
    data: [
      {
        lecturerId: lecturerA.lecturerProfile!.id,
        academicYear: "2569",
        semester: 1,
        teachingHours: 12,
        researchHours: 8,
        advisingHours: 6,
        serviceHours: 4,
      },
      {
        lecturerId: lecturerB.lecturerProfile!.id,
        academicYear: "2569",
        semester: 1,
        teachingHours: 9,
        researchHours: 10,
        advisingHours: 5,
        serviceHours: 3,
      },
    ],
  });

  await prisma.paymentHistory.create({
    data: {
      companyId: companyA.companyProfile!.id,
      amount: 4900,
      planName: "pro",
      referenceNumber: "PAY-2026-0001",
      status: "paid",
      receiptUrl: "https://files.example.com/receipts/pay-2026-0001.pdf",
    },
  });

  await prisma.timelineEvent.createMany({
    data: [
      {
        studentId: studentA.id,
        type: "achievement",
        title: "Completed React Dashboard Challenge",
        titleThai: "ทำภารกิจ React Dashboard สำเร็จ",
        description: "ได้รับ 120 XP และ 60 coins",
        semester: 1,
        academicYear: "2569",
        relatedId: quest.id,
        relatedType: "quest",
        isImportant: true,
        tags: ["quest", "achievement"],
        metadata: { xp: 120, coins: 60 } as Prisma.InputJsonValue,
      },
      {
        studentId: studentA.id,
        type: "activity",
        title: "Completed ShowPro Hackathon",
        titleThai: "เข้าร่วม ShowPro Hackathon สำเร็จ",
        description: "ได้รับ 50 คะแนนกิจกรรม",
        semester: 1,
        academicYear: "2569",
        relatedId: activityCompleted.id,
        relatedType: "activity",
        isImportant: true,
        tags: ["activity", "hackathon"],
      },
      {
        studentId: studentC.id,
        type: "warning",
        title: "Academic Support Follow-up",
        titleThai: "ติดตามสถานะทางวิชาการ",
        description: "GPAX ต่ำกว่าค่าเป้าหมายของหลักสูตร ต้องนัดอาจารย์ที่ปรึกษา",
        semester: 1,
        academicYear: "2569",
        relatedType: "academic",
        isImportant: true,
        tags: ["risk", "advisor"],
      },
    ],
  });

  await prisma.badge.createMany({
    data: [
      {
        studentId: studentA.id,
        name: "first-step",
        nameThai: "ก้าวแรก",
        description: "เริ่มสะสมกิจกรรมหรือภารกิจครั้งแรก",
        icon: "sparkles",
        criteria: "เข้าร่วมกิจกรรมหรือทำเควสต์ครบอย่างน้อย 1 รายการ",
      },
      {
        studentId: studentA.id,
        name: "quest-finisher",
        nameThai: "นักพิชิตภารกิจ",
        description: "ทำเควสต์สำเร็จอย่างน้อย 1 เควสต์",
        icon: "swords",
        criteria: "เควสต์สำเร็จอย่างน้อย 1 รายการ",
      },
      {
        studentId: studentA.id,
        name: "showcase-ready",
        nameThai: "พร้อมโชว์ผลงาน",
        description: "มี Portfolio พร้อมอย่างน้อย 1 โปรเจกต์",
        icon: "briefcase-business",
        criteria: "Portfolio มีโปรเจกต์อย่างน้อย 1 รายการ",
      },
      {
        studentId: studentA.id,
        name: "campus-contributor",
        nameThai: "ตัวจริงสายกิจกรรม",
        description: "สะสมคะแนนกิจกรรมอย่างน้อย 50 คะแนน",
        icon: "trophy",
        criteria: "มีคะแนนกิจกรรมอย่างน้อย 50",
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        fromId: companyA.id,
        toId: studentAUser.id,
        subject: "Interview Availability",
        preview: "We would like to schedule a quick interview next week.",
        body: "We reviewed your application and would like to schedule a quick interview next week.",
        category: "recruitment",
        hasAttachment: true,
        attachments: messageAttachments,
      },
      {
        fromId: lecturerA.id,
        toId: studentBUser.id,
        subject: "Portfolio Feedback",
        preview: "Please revise the case study narrative before the workshop.",
        body: "Please revise the case study narrative before the workshop. The structure is promising.",
        category: "advising",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: studentAUser.id,
        title: "Application Reviewed",
        titleThai: "ใบสมัครได้รับการตรวจแล้ว",
        message: "Northern Soft has reviewed your internship application.",
        messageThai: "Northern Soft ตรวจสอบใบสมัครฝึกงานของคุณแล้ว",
        type: "application",
        priority: "high",
        channels: ["in-app", "email"],
        actionUrl: "/jobs",
        actionLabel: "View application",
      },
      {
        userId: studentBUser.id,
        title: "Request Under Review",
        titleThai: "คำร้องกำลังได้รับการพิจารณา",
        message: "Your certificate request is currently under review.",
        messageThai: "คำร้องขอหนังสือรับรองของคุณกำลังอยู่ระหว่างการพิจารณา",
        type: "info",
        channels: ["in-app"],
      },
      {
        userId: lecturerA.id,
        title: "Upcoming Appointment",
        titleThai: "มีการนัดหมายกำลังจะมาถึง",
        message: "You have an internship progress review with Alice tomorrow.",
        messageThai: "คุณมีนัดติดตามฝึกงานกับ Alice ในวันพรุ่งนี้",
        type: "appointment",
        priority: "medium",
        channels: ["in-app"],
      },
    ],
  });

  await prisma.auditLog.createMany({
    data: [
      {
        userId: adminUser.id,
        action: "SYSTEM_SEED",
        resource: "Database",
        status: "success",
        changes: { seededAt: new Date().toISOString() } as Prisma.InputJsonValue,
      },
      {
        userId: lecturerA.id,
        action: "GRADE_UPDATED",
        resource: "Enrollment",
        resourceId: enrollmentA1.id,
        status: "success",
        changes: { previousGrade: "B+", newGrade: "A" } as Prisma.InputJsonValue,
      },
    ],
  });

  await prisma.automationRule.create({
    data: {
      adminId: adminUser.adminProfile!.id,
      name: "Daily Pending Request Digest",
      description: "Notify staff every morning when pending student requests exist.",
      trigger: {
        type: "schedule",
        schedule: "0 8 * * 1-5",
      } as Prisma.InputJsonValue,
      action: {
        type: "notification",
        target: "staff",
        template: "pending-request-digest",
      } as Prisma.InputJsonValue,
      nextRun: new Date("2026-04-29T01:00:00.000Z"),
    },
  });

  await prisma.automationRule.create({
    data: {
      adminId: adminUser.adminProfile!.id,
      name: "Auto Award Intern Master",
      description: "Award Intern Master badge to students with at least 400 internship hours.",
      trigger: {
        type: "student_metric",
        metric: "internshipHours",
        operator: "gte",
        value: 400,
        frequencyMinutes: 720,
      } as Prisma.InputJsonValue,
      action: {
        type: "award_badge",
        badge: {
          name: "intern-master",
          nameThai: "Intern Master",
          description: "Completed at least 400 internship hours.",
          icon: "award",
          criteria: "Internship hours must be at least 400.",
        },
      } as Prisma.InputJsonValue,
      nextRun: new Date("2026-04-29T03:00:00.000Z"),
    },
  });

  console.log("Seed completed.");
  console.log("Demo credentials:");
  console.log(`- admin@showpro.local / ${password}`);
  console.log(`- staff@showpro.local / ${password}`);
  console.log(`- narin@showpro.local / ${password}`);
  console.log(`- talent@northernsoft.local / ${password}`);
  console.log(`- alice@student.showpro.local / ${password}`);
}

main()
  .catch((error) => {
    console.error("Seed failed", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
