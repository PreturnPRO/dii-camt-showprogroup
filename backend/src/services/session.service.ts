import type { Prisma, Role } from "@prisma/client";
import { randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { disconnectSessions } from "../lib/realtime";
import { signToken } from "../utils/auth";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Signs in one device: creates its Session row and returns an access token bound to it.
 * Also drops this user's expired sessions and those revoked more than 30 days ago (recently
 * revoked ones stay for the audit trail).
 */
export const issueSessionToken = async (user: { id: string; role: Role; email: string }, userAgent?: string) => {
  await prisma.session.deleteMany({
    where: {
      userId: user.id,
      OR: [{ expiresAt: { lt: new Date() } }, { revokedAt: { lt: new Date(Date.now() - 30 * DAY_MS) } }],
    },
  });
  // sign first with a fresh id, then store the row once with the token's real expiry — a row that
  // briefly carried a placeholder expiry could be pruned by a parallel login of the same user
  const id = randomUUID();
  const token = signToken({ sub: user.id, role: user.role, email: user.email, sid: id });
  const { exp } = jwt.decode(token) as { exp: number };
  await prisma.session.create({
    data: { id, userId: user.id, userAgent: userAgent?.slice(0, 255), expiresAt: new Date(exp * 1000) },
  });
  return token;
};

export const isSessionLive = async (sessionId: string, userId: string) => {
  const session = await prisma.session.findUnique({ where: { id: sessionId } });
  return Boolean(session && session.userId === userId && !session.revokedAt && session.expiresAt > new Date());
};

/** ends one device's session (logout) */
export const revokeSession = async (sessionId: string) => {
  await prisma.session.updateMany({ where: { id: sessionId, revokedAt: null }, data: { revokedAt: new Date() } });
  disconnectSessions([sessionId]);
};

/**
 * Ends every live session of a user, except `except` (the device that asked, e.g. on a password change).
 * Inside a transaction (`tx`) the caller must call disconnectSessions(ids) after the commit.
 */
export const revokeSessions = async (
  userId: string,
  opts: { except?: string; tx?: Prisma.TransactionClient } = {},
) => {
  const db = opts.tx ?? prisma;
  const live = await db.session.findMany({
    where: { userId, revokedAt: null, ...(opts.except ? { id: { not: opts.except } } : {}) },
    select: { id: true },
  });
  const ids = live.map((s) => s.id);
  if (ids.length > 0) {
    await db.session.updateMany({ where: { id: { in: ids } }, data: { revokedAt: new Date() } });
  }
  if (!opts.tx) disconnectSessions(ids);
  return ids;
};
