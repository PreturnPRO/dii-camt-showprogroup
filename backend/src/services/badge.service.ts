import { prisma } from "../lib/prisma";

type BadgeMetrics = {
  xp: number;
  gamificationPoints: number;
  totalActivityHours: number;
  projects: number;
};

// every badge is "metric reaches target", so the same numbers drive both awarding and the progress shown to students
type BadgeDefinition = {
  name: string;
  nameThai: string;
  description: string;
  icon: string;
  criteria: string;
  metric: keyof BadgeMetrics;
  target: number;
  unit: string;
};

// "quest-finisher" was dropped with quests: nothing can complete one any more, so it could never unlock
const badgeDefinitions: BadgeDefinition[] = [
  {
    name: "first-step",
    nameThai: "ก้าวแรก",
    description: "เริ่มสะสมชั่วโมงกิจกรรมครั้งแรก",
    icon: "sparkles",
    criteria: "มีชั่วโมงกิจกรรมสะสมอย่างน้อย 1 ชั่วโมง",
    metric: "totalActivityHours",
    target: 1,
    unit: "ชั่วโมง",
  },
  {
    name: "xp-explorer",
    nameThai: "นักเก็บ XP",
    description: "สะสม XP ถึง 100 คะแนน",
    icon: "badge-plus",
    criteria: "มี XP สะสมอย่างน้อย 100",
    metric: "xp",
    target: 100,
    unit: "XP",
  },
  {
    name: "community-builder",
    nameThai: "พลังชุมชน",
    description: "ทำกิจกรรมรวมอย่างน้อย 20 ชั่วโมง",
    icon: "users",
    criteria: "มีชั่วโมงกิจกรรมสะสมอย่างน้อย 20 ชั่วโมง",
    metric: "totalActivityHours",
    target: 20,
    unit: "ชั่วโมง",
  },
  {
    name: "showcase-ready",
    nameThai: "พร้อมโชว์ผลงาน",
    description: "มี Portfolio พร้อมอย่างน้อย 1 โปรเจกต์",
    icon: "briefcase-business",
    criteria: "Portfolio มีโปรเจกต์อย่างน้อย 1 รายการ",
    metric: "projects",
    target: 1,
    unit: "โปรเจกต์",
  },
  {
    name: "campus-contributor",
    nameThai: "ตัวจริงสายกิจกรรม",
    description: "สะสมคะแนนกิจกรรมอย่างน้อย 50 คะแนน",
    icon: "trophy",
    criteria: "มีคะแนนกิจกรรมอย่างน้อย 50",
    metric: "gamificationPoints",
    target: 50,
    unit: "คะแนน",
  },
];

const loadStudent = (studentId: string) =>
  prisma.studentProfile.findUnique({
    where: { id: studentId },
    include: {
      badges: true,
      portfolio: { include: { projects: true } },
    },
  });

const metricsOf = (student: NonNullable<Awaited<ReturnType<typeof loadStudent>>>): BadgeMetrics => ({
  xp: student.xp,
  gamificationPoints: student.gamificationPoints,
  totalActivityHours: student.totalActivityHours,
  projects: student.portfolio?.projects.length ?? 0,
});

export type BadgeProgress = {
  name: string;
  nameThai: string;
  description: string;
  icon: string;
  criteria: string;
  unlocked: boolean;
  earnedAt: Date | null;
  /** null for badges awarded outside the catalogue (automation), which have no counter */
  current: number | null;
  target: number | null;
  unit: string | null;
};

export const getBadgeProgress = async (studentId: string): Promise<BadgeProgress[]> => {
  // award first, so a target reached by a path that never evaluated badges (e.g. a staff XP edit) is not shown as "locked at 100%"
  await evaluateStudentBadges(studentId);
  const student = await loadStudent(studentId);
  if (!student) return [];
  const metrics = metricsOf(student);
  const earned = new Map(student.badges.map((badge) => [badge.name, badge]));
  const catalogue = badgeDefinitions.map((badge) => ({
    name: badge.name,
    nameThai: badge.nameThai,
    description: badge.description,
    icon: badge.icon,
    criteria: badge.criteria,
    unlocked: earned.has(badge.name),
    earnedAt: earned.get(badge.name)?.earnedAt ?? null,
    current: metrics[badge.metric],
    target: badge.target,
    unit: badge.unit,
  }));
  const known = new Set(badgeDefinitions.map((badge) => badge.name));
  const extra = student.badges
    .filter((badge) => !known.has(badge.name))
    .map((badge) => ({
      name: badge.name,
      nameThai: badge.nameThai,
      description: badge.description,
      icon: badge.icon,
      criteria: badge.criteria,
      unlocked: true,
      earnedAt: badge.earnedAt,
      current: null,
      target: null,
      unit: null,
    }));
  return [...catalogue, ...extra];
};

export const evaluateStudentBadges = async (studentId: string) => {
  const student = await loadStudent(studentId);

  if (!student) {
    return [];
  }

  const badgeNames = new Set(student.badges.map((badge) => badge.name));
  const metrics = metricsOf(student);

  const newBadges = badgeDefinitions.filter(
    (badge) => !badgeNames.has(badge.name) && metrics[badge.metric] >= badge.target,
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
