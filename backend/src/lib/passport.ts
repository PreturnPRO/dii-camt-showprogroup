import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "./prisma";
import { isAccessPayload } from "../utils/auth";
import { isSessionLive } from "../services/session.service";

passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: env.JWT_SECRET,
    },
    async (payload, done) => {
      if (!isAccessPayload(payload)) {
        return done(null, false);
      }
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            role: true,
            name: true,
            isActive: true,
          },
        });

        // a logged-out, revoked or expired device session ends the token even before the JWT expires
        if (!user || !user.isActive || !(await isSessionLive(payload.sid, user.id))) {
          return done(null, false);
        }

        return done(null, {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
          sessionId: payload.sid,
        });
      } catch (error) {
        return done(error, false);
      }
    },
  ),
);

export const initializePassport = () => passport.initialize();
export const requireAuth = passport.authenticate("jwt", { session: false });

export const optionalAuth = async (req: Request, _res: Response, next: NextFunction) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next();
    }

    const token = header.slice("Bearer ".length);
    const payload = jwt.verify(token, env.JWT_SECRET);
    if (!isAccessPayload(payload)) {
      return next();
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        isActive: true,
      },
    });

    if (user?.isActive && (await isSessionLive(payload.sid, user.id))) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
        sessionId: payload.sid,
      };
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
