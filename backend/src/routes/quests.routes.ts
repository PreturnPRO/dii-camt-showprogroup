import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import {
  questQuerySchema,
  questCreateSchema,
  acceptQuestSchema,
  completeQuestTaskSchema,
} from "../schemas/quests.schema";
import {
  getQuests,
  createQuest,
  getQuestById,
  acceptQuestHandler,
  completeQuestTaskHandler,
  getPlayerStatsHandler,
} from "../controllers/quests.controller";

const router = Router();

router.get(
  "/quests",
  validate(questQuerySchema, "query"),
  getQuests
);

router.post(
  "/quests",
  requireAuth,
  checkRole([Role.LECTURER, Role.COMPANY, Role.ADMIN]),
  validate(questCreateSchema),
  createQuest
);

router.get(
  "/quests/:id",
  getQuestById
);

router.post(
  "/quests/accept",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(acceptQuestSchema),
  acceptQuestHandler
);

router.patch(
  "/quests/task/complete",
  requireAuth,
  checkRole([Role.STUDENT]),
  validate(completeQuestTaskSchema),
  completeQuestTaskHandler
);

router.get(
  "/player/stats",
  requireAuth,
  checkRole([Role.STUDENT]),
  getPlayerStatsHandler
);

export const questsRoutes = router;
