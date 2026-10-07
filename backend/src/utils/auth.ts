import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import jwt from "jsonwebtoken";
import type { Role } from "@prisma/client";
import type { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";

export const hashPassword = async (password: string) => bcrypt.hash(password, 12);

export const comparePassword = async (password: string, hash: string) =>
  bcrypt.compare(password, hash);

// sid = the Session row of this device; the token is accepted only while that session is live
export const signToken = (payload: { sub: string; role: Role; email: string; sid: string }) =>
  jwt.sign({ ...payload, typ: "access" }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"],
  });

export const isAccessPayload = (payload: unknown): payload is { sub: string; typ: "access"; sid: string } =>
  typeof payload === "object" &&
  payload !== null &&
  (payload as { typ?: unknown }).typ === "access" &&
  typeof (payload as { sub?: unknown }).sub === "string" &&
  typeof (payload as { sid?: unknown }).sid === "string";

export const generateTemporaryPassword = () => randomBytes(9).toString("base64url");
