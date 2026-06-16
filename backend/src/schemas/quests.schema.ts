import { z } from "zod";

export const questQuerySchema = z.object({
  type: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().optional(),
});

export const questCreateSchema = z.object({
  title: z.string().min(1),
  titleEn: z.string().min(1),
  description: z.string().min(1),
  descriptionEn: z.string().min(1),
  type: z.string().min(1),
  difficulty: z.string().min(1),
  category: z.string().min(1),
  xp: z.coerce.number().int().nonnegative(),
  coins: z.coerce.number().int().nonnegative(),
  deadline: z.coerce.date(),
  assignerType: z.string().min(1),
  tasks: z.array(
    z.object({
      title: z.string().min(1),
      titleEn: z.string().min(1),
      sortOrder: z.coerce.number().int().nonnegative().optional(),
    }),
  ),
});

export const acceptQuestSchema = z.object({
  questId: z.string().min(1),
});

export const completeQuestTaskSchema = z.object({
  questId: z.string().min(1),
  taskId: z.string().min(1),
});
