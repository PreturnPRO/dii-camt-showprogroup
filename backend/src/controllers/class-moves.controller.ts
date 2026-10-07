import { asyncHandler } from "../utils/async-handler";
import { requireUser } from "../utils/user";
import { approveMove, cancelMove, checkMoveFor, createMove, listMoves, listPending, rejectMove, withdrawMove } from "../services/class-move.service";

export const listMovesHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, moves: await listMoves(requireUser(req), String(req.query.from), String(req.query.to)) });
});

export const checkMoveHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await checkMoveFor(requireUser(req), req.body)) });
});

export const createMoveHandler = asyncHandler(async (req, res) => {
  res.status(201).json({ success: true, ...(await createMove(requireUser(req), req.body)) });
});

export const listPendingHandler = asyncHandler(async (_req, res) => {
  res.json({ success: true, moves: await listPending() });
});

export const approveMoveHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await approveMove(requireUser(req), String(req.params.id))) });
});

export const rejectMoveHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await rejectMove(requireUser(req), String(req.params.id), req.body.note)) });
});

export const withdrawMoveHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await withdrawMove(requireUser(req), String(req.params.id))) });
});

export const cancelMoveHandler = asyncHandler(async (req, res) => {
  res.json({ success: true, ...(await cancelMove(requireUser(req), String(req.params.id))) });
});
