import { Role } from "@prisma/client";
import { Router } from "express";
import { requireAuth } from "../lib/passport";
import { checkRole } from "../middleware/check-role";
import { validate } from "../middleware/validate";
import { moveCheckSchema, moveDecisionSchema, moveIdParamsSchema, moveInputSchema, moveRangeSchema } from "../schemas/class-move.schema";
import { approveMoveHandler, cancelMoveHandler, checkMoveHandler, createMoveHandler, listMovesHandler, listPendingHandler, rejectMoveHandler, withdrawMoveHandler } from "../controllers/class-moves.controller";

const router = Router();
const movers = checkRole([Role.STAFF, Role.ADMIN, Role.LECTURER]);

const deciders = checkRole([Role.STAFF, Role.ADMIN]);
router.get("/class-moves/pending", requireAuth, deciders, listPendingHandler);
router.post("/class-moves/:id/approve", requireAuth, deciders, validate(moveIdParamsSchema, "params"), approveMoveHandler);
router.post("/class-moves/:id/reject", requireAuth, deciders, validate(moveIdParamsSchema, "params"), validate(moveDecisionSchema), rejectMoveHandler);
router.post("/class-moves/:id/withdraw", requireAuth, checkRole([Role.LECTURER]), validate(moveIdParamsSchema, "params"), withdrawMoveHandler);
router.post("/class-moves/:id/cancel", requireAuth, deciders, validate(moveIdParamsSchema, "params"), cancelMoveHandler);

router.get("/class-moves", requireAuth, validate(moveRangeSchema, "query"), listMovesHandler);
router.post("/class-moves/check", requireAuth, movers, validate(moveCheckSchema), checkMoveHandler);
router.post("/class-moves", requireAuth, movers, validate(moveInputSchema), createMoveHandler);

export const classMovesRoutes = router;
