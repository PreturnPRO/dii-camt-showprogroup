import { Router } from "express";
import { academicRoutes } from "./academic.routes";
import { activitiesRoutes } from "./activities.routes";
import { automationRoutes } from "./automation.routes";
import { authRoutes } from "./auth.routes";
import { careerRoutes } from "./career.routes";
import { documentsRoutes } from "./documents.routes";
import { facilitiesRoutes } from "./facilities.routes";
import { filesRoutes } from "./files.routes";
import { operationsRoutes } from "./operations.routes";
import { studentsRoutes } from "./students.routes";
import { supportRoutes } from "./support.routes";
import { systemRoutes } from "./system.routes";

export const router = Router();

router.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "DII-CAMT ShowPro API",
  });
});

router.use(authRoutes);
router.use(studentsRoutes);
router.use(academicRoutes);
router.use(careerRoutes);
router.use(activitiesRoutes);
router.use(operationsRoutes);
router.use(supportRoutes);
router.use(systemRoutes);
router.use(automationRoutes);
router.use(filesRoutes);
router.use(documentsRoutes);
router.use(facilitiesRoutes);
