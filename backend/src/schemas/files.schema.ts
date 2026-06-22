import { z } from "zod";

export const uploadQuerySchema = z.object({
  category: z.string().optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

export const assetIdParamsSchema = z.object({
  id: z.string().min(1),
});

export const signedDownloadQuerySchema = z.object({
  token: z.string().min(1),
});
