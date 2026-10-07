import type { NextFunction, Request, Response } from "express";
import { Prisma } from "@prisma/client";
import multer from "multer";
import { AppError } from "../utils/errors";

const send = (res: Response, status: number, message: string, details: unknown = null) =>
  res.status(status).json({ success: false, message, details });

export const errorHandler = (error: unknown, req: Request, res: Response, _next: NextFunction) => {
  if (error instanceof AppError) return send(res, error.statusCode, error.message, error.details ?? null);
  if (error instanceof multer.MulterError) {
    return error.code === "LIMIT_FILE_SIZE"
      ? send(res, 413, "File is too large (max 20MB)")
      : send(res, 400, "Invalid file upload");
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") return send(res, 409, "This record already exists");
    if (error.code === "P2025") return send(res, 404, "Record not found");
  }
  // body-parser marks its own errors (bad JSON, body too large) with a 4xx status
  const marked = error as { status?: unknown; statusCode?: unknown } | null;
  const status = marked?.status ?? marked?.statusCode;
  if (status === 400 || status === 413) return send(res, status, "Invalid request body");

  // anything else is ours: log it, but never show internals (Prisma queries, hosts, stack) to the caller
  console.error(`[${req.method} ${req.originalUrl}]`, error);
  return send(res, 500, "Unexpected error while processing request");
};
