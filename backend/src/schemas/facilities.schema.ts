import { z } from "zod";

export const facilitySchema = z.object({
  code: z.string().min(1),
  name: z.string().min(1),
  building: z.string().min(1),
  room: z.string().optional(),
  floor: z.string().optional(),
  type: z.string().min(1),
  capacity: z.coerce.number().int().nonnegative().default(0),
  isActive: z.boolean().optional(),
  notes: z.string().optional(),
});

export const facilityUpdateSchema = facilitySchema.partial();
