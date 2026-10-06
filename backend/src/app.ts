import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { initializePassport } from "./lib/passport";
import { openApiSpec } from "./openapi";
import { router } from "./routes";

export function createApp(options: { authRateLimitMax?: number } = {}) {
  const app = express();

  const configuredCorsOrigins = env.CORS_ORIGIN.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  const developmentCorsOrigins =
    env.NODE_ENV === "development"
      ? ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]
      : [];

  const allowedCorsOrigins = new Set([...configuredCorsOrigins, ...developmentCorsOrigins]);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedCorsOrigins.has(origin)) {
          callback(null, true);
          return;
        }

        callback(new Error(`Origin ${origin} is not allowed by CORS`));
      },
      credentials: true,
    }),
  );
  app.use(helmet());
  app.use(morgan("dev"));
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: true }));
  app.use(initializePassport());

  app.get("/health", (_req, res) => {
    res.json({
      success: true,
      message: "ShowPro backend is healthy",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/docs.json", (_req, res) => {
    res.json(openApiSpec);
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(openApiSpec));

  // Limit only the credential actions, never session reads like GET /auth/me (called on every page load).
  // Key by IP + email so students sharing one campus NAT don't exhaust each other's budget,
  // and don't count successful logins.
  const authLimit = options.authRateLimitMax ?? env.AUTH_RATE_LIMIT_MAX;
  const limiterFor = (skipSuccessfulRequests: boolean) =>
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: authLimit,
      skipSuccessfulRequests,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      keyGenerator: (req) => `${req.ip}|${String(req.body?.email ?? "").trim().toLowerCase()}`,
      message: { success: false, message: "Too many attempts. Please wait 15 minutes and try again." },
    });
  app.post("/api/auth/login", limiterFor(true));
  app.post(["/api/auth/forgot-password", "/api/auth/register", "/api/auth/reset-password"], limiterFor(false));

  app.use("/api", router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
