import type { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";
import { isAccessPayload } from "../utils/auth";
import { prisma } from "./prisma";

type SocketUser = { id: string; role: Role; email: string; sessionId: string };

let io: Server | null = null;

const getOrigins = () => {
  const configured = env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean);
  const devOrigins =
    env.NODE_ENV === "development"
      ? ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:5173", "http://127.0.0.1:5173"]
      : [];
  return [...new Set([...configured, ...devOrigins])];
};

const extractToken = (authToken?: string, authorizationHeader?: string) => {
  if (authToken) {
    return authToken;
  }

  if (authorizationHeader?.startsWith("Bearer ")) {
    return authorizationHeader.slice("Bearer ".length);
  }

  return null;
};

/**
 * The user behind a socket token, or null: the token must be an access token whose session is
 * still live (not logged out, not revoked, not expired) and whose user is active.
 * (Same rule as requireAuth; the session check is inlined to avoid importing session.service here.)
 */
export const authenticateSocketToken = async (token: string): Promise<SocketUser | null> => {
  let verified: unknown;
  try {
    verified = jwt.verify(token, env.JWT_SECRET);
  } catch {
    return null;
  }
  if (!isAccessPayload(verified)) return null;
  const session = await prisma.session.findUnique({
    where: { id: verified.sid },
    include: { user: { select: { id: true, role: true, email: true, isActive: true } } },
  });
  if (!session || session.userId !== verified.sub || session.revokedAt || session.expiresAt <= new Date()) return null;
  if (!session.user.isActive) return null;
  return { id: session.user.id, role: session.user.role, email: session.user.email, sessionId: session.id };
};

/** drops the open sockets of these sessions (after logout / revocation); no-op before the server starts */
export const disconnectSessions = (sessionIds: string[]) => {
  for (const id of sessionIds) io?.in(`session:${id}`).disconnectSockets(true);
};

export const attachRealtime = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: getOrigins(),
      credentials: true,
    },
  });

  io.use(async (socket, next) => {
    try {
      const token = extractToken(
        typeof socket.handshake.auth.token === "string" ? socket.handshake.auth.token : undefined,
        typeof socket.handshake.headers.authorization === "string"
          ? socket.handshake.headers.authorization
          : undefined,
      );

      if (!token) {
        return next();
      }

      const user = await authenticateSocketToken(token);
      if (!user) {
        return next(new Error("Unauthorized"));
      }
      socket.data.user = user;
      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as SocketUser | undefined;

    if (!user) {
      socket.join("public");
      return;
    }

    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
    socket.join(`session:${user.sessionId}`);
  });

  return io;
};

export const getRealtimeServer = () => io;

export const emitToUser = (userId: string, event: string, payload: unknown) => {
  io?.to(`user:${userId}`).emit(event, payload);
};

export const emitToRole = (role: Role, event: string, payload: unknown) => {
  io?.to(`role:${role}`).emit(event, payload);
};

export const emitSystemEvent = (event: string, payload: unknown) => {
  io?.emit(event, payload);
};
