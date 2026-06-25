import { z } from "zod";

export const automationRuleSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  trigger: z.record(z.any()),
  action: z.record(z.any()),
  isActive: z.boolean().optional(),
});

export const automationRuleUpdateSchema = automationRuleSchema.partial();
