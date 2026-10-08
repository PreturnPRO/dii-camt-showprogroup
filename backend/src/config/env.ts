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
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(20),
  API_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(300),
  UPLOAD_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(30),
  EXPOSE_RESET_TOKEN: z
    .enum(["true", "false"])
    .default("false")
    .transform((value) => value === "true"),
});

/** Settings production cannot run without; FRONTEND_URL is printed into every issued PDF's QR code. */
export function assertProductionEnv(config: { NODE_ENV: string; FRONTEND_URL?: string; EXPOSE_RESET_TOKEN: boolean }) {
  if (config.NODE_ENV !== "production") return;
  if (config.EXPOSE_RESET_TOKEN) throw new Error("EXPOSE_RESET_TOKEN must never be true in production");
  if (!config.FRONTEND_URL) throw new Error("FRONTEND_URL is required in production (it goes into document QR codes)");
}

export const env = envSchema.parse(process.env);
assertProductionEnv(env);
