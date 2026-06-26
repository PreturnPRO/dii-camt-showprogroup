import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const optionalUrl = z.preprocess(
  (value) => (value === "" ? undefined : value),
  z.string().url().optional(),
);

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  FRONTEND_URL: optionalUrl,
  PASSWORD_RESET_WEBHOOK_URL: optionalUrl,
  PASSWORD_RESET_WEBHOOK_TOKEN: z.string().optional(),
  UPLOAD_DIR: z.string().default("storage/uploads"),
  PRIVATE_FILE_TTL_MINUTES: z.coerce.number().int().positive().default(30),
  AUTOMATION_POLL_SECONDS: z.coerce.number().int().positive().default(60),
  PDF_FONT_PATH: z.string().optional(),
});

export const env = envSchema.parse(process.env);
