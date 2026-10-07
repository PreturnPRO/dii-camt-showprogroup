import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { errorHandler } from "./middleware/error-handler";
import { notFoundHandler } from "./middleware/not-found";
import { initializePassport } from "./lib/passport";
import { openApiSpec } from "./openapi";
import { router } from "./routes";
import { isAccessPayload } from "./utils/auth";

// key a request by its verified user, else by IP — a forged token must not spend someone else's budget
const rateKey = (req: express.Request) => {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    try {
      const payload = jwt.verify(header.slice("Bearer ".length), env.JWT_SECRET);
      if (isAccessPayload(payload)) return `u:${payload.sub}`;
    } catch {
      // invalid or expired token: count it against the caller's IP
    }
  }
  return `ip:${req.ip}`;
};

export function createApp(
  options: { authRateLimitMax?: number; apiRateLimitMax?: number; uploadRateLimitMax?: number } = {},
) {
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
  app.post(["/api/auth/forgot-password", "/api/auth/reset-password"], limiterFor(false));

  // a generous ceiling for everything else, so a script can't hammer the API; normal use never gets near it
  app.use(
    "/api",
    rateLimit({
      windowMs: 60 * 1000,
      limit: options.apiRateLimitMax ?? env.API_RATE_LIMIT_MAX,
      keyGenerator: rateKey,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { success: false, message: "Too many requests. Please slow down." },
    }),
  );
  app.post(
    "/api/files/upload",
    rateLimit({
      windowMs: 60 * 60 * 1000,
      limit: options.uploadRateLimitMax ?? env.UPLOAD_RATE_LIMIT_MAX,
      keyGenerator: rateKey,
      standardHeaders: "draft-7",
      legacyHeaders: false,
      message: { success: false, message: "Too many uploads. Please try again later." },
    }),
  );

  app.use("/api", router);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
