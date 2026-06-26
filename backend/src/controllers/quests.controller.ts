import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { acceptQuest, completeQuestTask, getPlayerStats } from "../services/quest.service";
import { getStudentProfileByUserId } from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



export const getQuests = asyncHandler(async (req, res) => {
  const quests = await prisma.quest.findMany({
    where: {
      ...(req.query.type ? { type: String(req.query.type) } : {}),
      ...(req.query.category ? { category: String(req.query.category) } : {}),
      ...(req.query.difficulty ? { difficulty: String(req.query.difficulty) } : {}),
    },
    include: {
      tasks: true,
      enrollments: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
    orderBy: [{ deadline: "asc" }, { createdAt: "desc" }],
  });

  res.json({
    success: true,
    quests,
  });
});

export const createQuest = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);

  const quest = await prisma.quest.create({
    data: {
      title: req.body.title,
      titleEn: req.body.titleEn,
      description: req.body.description,
      descriptionEn: req.body.descriptionEn,
      type: req.body.type,
      difficulty: req.body.difficulty,
      category: req.body.category,
      xp: req.body.xp,
      coins: req.body.coins,
      deadline: req.body.deadline,
      assignerId: currentUser.id,
      assignerType: req.body.assignerType,
      tasks: {
        create: req.body.tasks.map((task: { title: string; titleEn: string; sortOrder?: number }) => ({
          title: task.title,
          titleEn: task.titleEn,
          sortOrder: task.sortOrder ?? 0,
        })),
      },
    },
    include: {
      tasks: true,
    },
  });

  res.status(201).json({
    success: true,
    quest,
  });
});

export const getQuestById = asyncHandler(async (req, res) => {
  const questId = String(req.params.id);
  const quest = await prisma.quest.findUnique({
    where: { id: questId },
    include: {
      tasks: true,
      enrollments: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
  });

  if (!quest) {
    throw new AppError(404, "Quest not found");
  }

  res.json({
    success: true,
    quest,
  });
});

export const acceptQuestHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);

  const enrollment = await acceptQuest(req.body.questId, student.id);
  res.status(201).json({
    success: true,
    enrollment,
  });
});

export const completeQuestTaskHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);

  const enrollment = await completeQuestTask(req.body.questId, req.body.taskId, student.id);
  res.json({
    success: true,
    enrollment,
  });
});

export const getPlayerStatsHandler = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const student = await getStudentProfileByUserId(currentUser.id);

  res.json({
    success: true,
    stats: await getPlayerStats(student.id),
  });
});
