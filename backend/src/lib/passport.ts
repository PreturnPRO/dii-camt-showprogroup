import { Strategy as JwtStrategy, ExtractJwt } from "passport-jwt";
import type { NextFunction, Request, Response } from "express";
import passport from "passport";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "./prisma";
import { isAccessPayload } from "../utils/auth";

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

        if (!user || !user.isActive) {
          return done(null, false);
        }

        return done(null, {
          id: user.id,
          email: user.email,
          role: user.role,
          name: user.name,
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

    if (user?.isActive) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        name: user.name,
      };
    }

    return next();
  } catch (error) {
    return next(error);
  }
};
