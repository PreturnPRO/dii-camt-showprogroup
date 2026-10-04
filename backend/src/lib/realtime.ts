import type { Role } from "@prisma/client";
import jwt from "jsonwebtoken";
import type { Server as HttpServer } from "http";
import { Server } from "socket.io";
import { env } from "../config/env";

type AuthPayload = {
  sub: string;
  role: Role;
  email: string;
};

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

export const attachRealtime = (server: HttpServer) => {
  io = new Server(server, {
    cors: {
      origin: getOrigins(),
      credentials: true,
    },
  });

  io.use((socket, next) => {
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

      const payload = jwt.verify(token, env.JWT_SECRET) as AuthPayload;
      socket.data.user = {
        id: payload.sub,
        role: payload.role,
        email: payload.email,
      };
      return next();
    } catch (error) {
      return next(error as Error);
    }
  });

  io.on("connection", (socket) => {
    const user = socket.data.user as
      | {
          id: string;
          role: Role;
          email: string;
        }
      | undefined;

    if (!user) {
      socket.join("public");
      return;
    }

    socket.join(`user:${user.id}`);
    socket.join(`role:${user.role}`);
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
