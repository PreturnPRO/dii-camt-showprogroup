import { FileVisibility, Role } from "@prisma/client";
import type { Request } from "express";
import fs from "fs";
import { promises as fsp } from "fs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import { randomUUID, createHash } from "crypto";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { AppError } from "../utils/errors";

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const uploadRoot = path.resolve(process.cwd(), env.UPLOAD_DIR);

const normalizeCategory = (input?: string) =>
  (input ?? "general")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "general";

const ensureDirectory = (directoryPath: string) => {
  fs.mkdirSync(directoryPath, { recursive: true });
};

ensureDirectory(uploadRoot);

const storage = multer.diskStorage({
  destination: (req, _file, callback) => {
    const category = normalizeCategory(
      typeof req.body.category === "string"
        ? req.body.category
        : typeof req.query.category === "string"
          ? req.query.category
          : undefined,
    );
    const targetDirectory = path.join(uploadRoot, category);
    ensureDirectory(targetDirectory);
    callback(null, targetDirectory);
  },
  filename: (_req, file, callback) => {
    const extension = path.extname(file.originalname);
    callback(null, `${Date.now()}-${randomUUID()}${extension}`);
  },
});

// extension → MIME types we accept for it; both must match (a renamed .html sent as image/png is refused)
const ALLOWED_UPLOADS: Record<string, string[]> = {
  ".pdf": ["application/pdf"],
  ".jpg": ["image/jpeg"],
  ".jpeg": ["image/jpeg"],
  ".png": ["image/png"],
  ".webp": ["image/webp"],
  ".gif": ["image/gif"],
  ".doc": ["application/msword"],
  ".docx": ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
  ".xls": ["application/vnd.ms-excel"],
  ".xlsx": ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ".ppt": ["application/vnd.ms-powerpoint"],
  ".pptx": ["application/vnd.openxmlformats-officedocument.presentationml.presentation"],
  ".zip": ["application/zip", "application/x-zip-compressed"],
  ".csv": ["text/csv", "application/vnd.ms-excel"],
};

export const isAllowedUpload = (originalName: string, mimeType: string) =>
  ALLOWED_UPLOADS[path.extname(originalName).toLowerCase()]?.includes(mimeType.toLowerCase()) ?? false;

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: (_req, file, callback) =>
    isAllowedUpload(file.originalname, file.mimetype)
      ? callback(null, true)
      : callback(new AppError(400, "This file type is not allowed (PDF, images, Office documents, ZIP or CSV only)")),
});

const toManagedAssetUrl = (assetId: string) => `/api/files/assets/${assetId}`;

export const toFileVisibility = (value?: string) =>
  value?.toLowerCase() === "public" ? FileVisibility.PUBLIC : FileVisibility.PRIVATE;

const computeChecksum = async (absolutePath: string) => {
  const content = await fsp.readFile(absolutePath);
  return createHash("sha256").update(content).digest("hex");
};

export const createManagedFileAsset = async (
  file: Express.Multer.File,
  options: {
    uploaderId?: string;
    visibility?: FileVisibility;
    category?: string;
  },
) => {
  const checksum = await computeChecksum(file.path);
  const storagePath = path.relative(uploadRoot, file.path).replace(/\\/g, "/");

  const asset = await prisma.fileAsset.create({
    data: {
      uploaderId: options.uploaderId,
      originalName: file.originalname,
      filename: file.filename,
      mimeType: file.mimetype,
      size: file.size,
      storagePath,
      visibility: options.visibility ?? FileVisibility.PRIVATE,
      category: normalizeCategory(options.category),
      checksum,
    },
  });

  return {
    ...asset,
    url: toManagedAssetUrl(asset.id),
  };
};

export const getFileAssetById = async (assetId: string) => {
  const asset = await prisma.fileAsset.findUnique({
    where: { id: assetId },
  });

  if (!asset) {
    throw new AppError(404, "File asset not found");
  }

  return asset;
};

export const resolveAssetAbsolutePath = (storagePath: string) => path.join(uploadRoot, storagePath);

const parseSignedDownloadToken = (token: string) =>
  jwt.verify(token, env.JWT_SECRET) as {
    assetId: string;
    scope: "file-download";
  };

export const createSignedDownloadToken = (assetId: string, expiresInMinutes = env.PRIVATE_FILE_TTL_MINUTES) =>
  jwt.sign(
    {
      assetId,
      scope: "file-download",
    },
    env.JWT_SECRET,
    {
      expiresIn: `${expiresInMinutes}m`,
    },
  );

export const getFileAssetFromSignedToken = async (token: string) => {
  try {
    const payload = parseSignedDownloadToken(token);
    return getFileAssetById(payload.assetId);
  } catch (error) {
    throw new AppError(401, "Invalid or expired file token", error);
  }
};

export const canDirectlyAccessAsset = (
  asset: { visibility: FileVisibility; uploaderId: string | null },
  user?: { id: string; role: Role },
) => {
  if (asset.visibility === FileVisibility.PUBLIC) {
    return true;
  }

  if (!user) {
    return false;
  }

  return (
    asset.uploaderId === user.id ||
    user.role === Role.ADMIN ||
    user.role === Role.STAFF
  );
};

export const serializeFileAsset = (asset: Awaited<ReturnType<typeof getFileAssetById>>) => ({
  id: asset.id,
  originalName: asset.originalName,
  mimeType: asset.mimeType,
  size: asset.size,
  category: asset.category,
  visibility: asset.visibility,
  createdAt: asset.createdAt,
  url: toManagedAssetUrl(asset.id),
});

export const buildManagedAssetResponse = (asset: Awaited<ReturnType<typeof getFileAssetById>>) => ({
  ...serializeFileAsset(asset),
  signedUrl:
    asset.visibility === FileVisibility.PRIVATE
      ? `/api/files/download?token=${createSignedDownloadToken(asset.id)}`
      : null,
});

export const resolveManagedUrlToAssetId = (url?: string | null) => {
  if (!url) {
    return null;
  }

  const match = url.match(/\/api\/files\/assets\/([^/?#]+)/);
  return match?.[1] ?? null;
};

export const requireUploadedFile = (req: Request) => {
  if (!req.file) {
    throw new AppError(400, "File upload field \"file\" is required");
  }

  return req.file;
};
