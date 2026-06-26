import { FileVisibility, Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import {
  buildManagedAssetResponse,
  canDirectlyAccessAsset,
  createManagedFileAsset,
  createSignedDownloadToken,
  getFileAssetById,
  getFileAssetFromSignedToken,
  requireUploadedFile,
  resolveAssetAbsolutePath,
  serializeFileAsset,
  toFileVisibility,
} from "../services/file-storage.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



export const uploadFile = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const file = requireUploadedFile(req);

  const asset = await createManagedFileAsset(file, {
    uploaderId: currentUser.id,
    visibility: toFileVisibility(
      typeof req.query.visibility === "string" ? req.query.visibility : undefined,
    ),
    category: typeof req.query.category === "string" ? req.query.category : undefined,
  });

  res.status(201).json({
    success: true,
    asset: buildManagedAssetResponse(asset),
  });
});

export const getAssetById = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const asset = await getFileAssetById(String(req.params.id));

  if (!canDirectlyAccessAsset(asset, currentUser)) {
    throw new AppError(403, "You do not have access to this file");
  }

  const absolutePath = resolveAssetAbsolutePath(asset.storagePath);
  return res.download(absolutePath, asset.originalName);
});

export const getPublicAsset = asyncHandler(async (req, res) => {
  const asset = await getFileAssetById(String(req.params.id));

  if (asset.visibility !== FileVisibility.PUBLIC) {
    throw new AppError(403, "This file is private");
  }

  const absolutePath = resolveAssetAbsolutePath(asset.storagePath);
  return res.download(absolutePath, asset.originalName);
});

export const signAsset = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const asset = await getFileAssetById(String(req.params.id));

  if (!canDirectlyAccessAsset(asset, currentUser)) {
    throw new AppError(403, "You do not have access to sign this file");
  }

  res.json({
    success: true,
    asset: serializeFileAsset(asset),
    signedUrl: `/api/files/download?token=${createSignedDownloadToken(asset.id)}`,
  });
});

export const downloadSignedAsset = asyncHandler(async (req, res) => {
  const token = String(req.query.token);
  const asset = await getFileAssetFromSignedToken(token);
  const absolutePath = resolveAssetAbsolutePath(asset.storagePath);

  return res.download(absolutePath, asset.originalName);
});

export const getAllAssets = asyncHandler(async (_req, res) => {
  const assetRows = await prisma.fileAsset.findMany({
    orderBy: { createdAt: "desc" },
  });
  const assets = assetRows.map((asset) => buildManagedAssetResponse(asset));

  res.json({
    success: true,
    assets,
  });
});
