import { z } from "zod";

export const studentQuerySchema = z.object({
  studentId: z.string().optional(),
});

export const cooperationParamsSchema = z.object({
  id: z.string().min(1),
});
