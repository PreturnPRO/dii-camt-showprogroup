import { prisma } from "../lib/prisma";

type BadgeDefinition = {
  name: string;
  nameThai: string;
  description: string;
  icon: string;
  criteria: string;
  isEligible: (data: {
    xp: number;
    gamificationPoints: number;
    totalActivityHours: number;
    completedQuests: number;
    projects: number;
  }) => boolean;
};

const badgeDefinitions: BadgeDefinition[] = [
  {
    name: "first-step",
    nameThai: "ก้าวแรก",
    description: "เริ่มสะสมกิจกรรมหรือภารกิจครั้งแรก",
    icon: "sparkles",
    criteria: "เข้าร่วมกิจกรรมหรือทำเควสต์ครบอย่างน้อย 1 รายการ",
    isEligible: ({ completedQuests, totalActivityHours }) =>
      completedQuests >= 1 || totalActivityHours > 0,
  },
  {
    name: "quest-finisher",
    nameThai: "นักพิชิตภารกิจ",
    description: "ทำเควสต์สำเร็จอย่างน้อย 1 เควสต์",
    icon: "swords",
    criteria: "เควสต์สำเร็จอย่างน้อย 1 รายการ",
    isEligible: ({ completedQuests }) => completedQuests >= 1,
  },
  {
    name: "xp-explorer",
    nameThai: "นักเก็บ XP",
    description: "สะสม XP ถึง 100 คะแนน",
    icon: "badge-plus",
    criteria: "มี XP สะสมอย่างน้อย 100",
    isEligible: ({ xp }) => xp >= 100,
  },
  {
    name: "community-builder",
    nameThai: "พลังชุมชน",
    description: "ทำกิจกรรมรวมอย่างน้อย 20 ชั่วโมง",
    icon: "users",
    criteria: "มีชั่วโมงกิจกรรมสะสมอย่างน้อย 20 ชั่วโมง",
    isEligible: ({ totalActivityHours }) => totalActivityHours >= 20,
  },
  {
    name: "showcase-ready",
    nameThai: "พร้อมโชว์ผลงาน",
    description: "มี Portfolio พร้อมอย่างน้อย 1 โปรเจกต์",
    icon: "briefcase-business",
    criteria: "Portfolio มีโปรเจกต์อย่างน้อย 1 รายการ",
    isEligible: ({ projects }) => projects >= 1,
  },
  {
    name: "campus-contributor",
    nameThai: "ตัวจริงสายกิจกรรม",
    description: "สะสมคะแนนกิจกรรมอย่างน้อย 50 คะแนน",
    icon: "trophy",
    criteria: "มีคะแนนกิจกรรมอย่างน้อย 50",
    isEligible: ({ gamificationPoints }) => gamificationPoints >= 50,
  },
];

export const evaluateStudentBadges = async (studentId: string) => {
  const student = await prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      badges: true,
      portfolio: { include: { projects: true } },
    },
  });

  if (!student) {
    return [];
  }

  const badgeNames = new Set(student.badges.map((badge) => badge.name));
  const metrics = {
    xp: student.xp,
    gamificationPoints: student.gamificationPoints,
    totalActivityHours: student.totalActivityHours,
    completedQuests: 0,
    projects: student.portfolio?.projects.length ?? 0,
  };

  const newBadges = badgeDefinitions.filter(
    (badge) => !badgeNames.has(badge.name) && badge.isEligible(metrics),
  );

  if (newBadges.length === 0) {
    return [];
  }

  await prisma.badge.createMany({
    data: newBadges.map((badge) => ({
      studentId,
      name: badge.name,
      nameThai: badge.nameThai,
      description: badge.description,
      icon: badge.icon,
      criteria: badge.criteria,
    })),
  });

  return newBadges;
};
