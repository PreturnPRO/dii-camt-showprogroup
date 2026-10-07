import { z } from "zod";

const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM");

export const moveCheckSchema = z.object({
  sectionId: z.string().min(1),
  originalDate: day,
  originalStart: time,
  newDate: day,
  newStart: time,
  facilityId: z.string().min(1).optional(),
});
export const moveInputSchema = moveCheckSchema.extend({ reason: z.string().trim().min(1) });
export const moveRangeSchema = z.object({ from: day, to: day });
export const moveDecisionSchema = z.object({ note: z.string().trim().min(1) });
export const moveIdParamsSchema = z.object({ id: z.string().min(1) });
