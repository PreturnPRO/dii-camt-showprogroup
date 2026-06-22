import { Role } from "@prisma/client";
import { Router } from "express";
import { optionalAuth, requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import { uploadMiddleware } from "../services/file-storage.service";
import {
  uploadQuerySchema,
  assetIdParamsSchema,
  signedDownloadQuerySchema,
} from "../schemas/files.schema";
import {
  uploadFile,
  getAssetById,
  getPublicAsset,
  signAsset,
  downloadSignedAsset,
  getAllAssets,
} from "../controllers/files.controller";

const router = Router();

router.post(
  "/files/upload",
  requireAuth,
  validate(uploadQuerySchema, "query"),
  uploadMiddleware.single("file"),
  uploadFile
);

router.get(
  "/files/assets/:id",
  requireAuth,
  validate(assetIdParamsSchema, "params"),
  getAssetById
);

router.get(
  "/files/public/:id",
  optionalAuth,
  validate(assetIdParamsSchema, "params"),
  getPublicAsset
);

router.get(
  "/files/assets/:id/sign",
  requireAuth,
  validate(assetIdParamsSchema, "params"),
  signAsset
);

router.get(
  "/files/download",
  validate(signedDownloadQuerySchema, "query"),
  downloadSignedAsset
);

router.get(
  "/files/assets",
  requireAuth,
  checkRole([Role.ADMIN, Role.STAFF]),
  getAllAssets
);

export const filesRoutes = router;
