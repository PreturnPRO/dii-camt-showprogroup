import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { getCompanyProfileByUserId, getLecturerProfileByUserId } from "../services/profile.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



export const getBudget = asyncHandler(async (_req, res) => {
  const budget = await prisma.budgetRecord.findMany({
    orderBy: { date: "desc" },
  });

  res.json({
    success: true,
    budget,
  });
});

export const createBudget = asyncHandler(async (req, res) => {
  const record = await prisma.budgetRecord.create({
    data: {
      title: req.body.title,
      amount: req.body.amount,
      type: req.body.type,
      category: req.body.category,
      date: req.body.date,
      status: req.body.status ?? "pending",
      note: req.body.note,
    },
  });

  res.status(201).json({
    success: true,
    budget: record,
  });
});

export const updateBudget = asyncHandler(async (req, res) => {
  const budgetId = String(req.params.id);
  const existing = await prisma.budgetRecord.findUnique({ where: { id: budgetId } });

  if (!existing) {
    throw new AppError(404, "Budget record not found");
  }

  const record = await prisma.budgetRecord.update({
    where: { id: budgetId },
    data: {
      title: req.body.title,
      amount: req.body.amount,
      type: req.body.type,
      category: req.body.category,
      date: req.body.date,
      status: req.body.status,
      note: req.body.note,
    },
  });

  res.json({
    success: true,
    budget: record,
  });
});

export const deleteBudget = asyncHandler(async (req, res) => {
  const budgetId = String(req.params.id);
  const existing = await prisma.budgetRecord.findUnique({ where: { id: budgetId } });

  if (!existing) {
    throw new AppError(404, "Budget record not found");
  }

  const record = await prisma.budgetRecord.delete({
    where: { id: budgetId },
  });

  res.json({
    success: true,
    budget: record,
  });
});

export const getPersonnel = asyncHandler(async (_req, res) => {
  const personnel = await prisma.user.findMany({
    where: {
      role: { in: [Role.LECTURER, Role.STAFF, Role.ADMIN] },
    },
    include: {
      lecturerProfile: true,
      staffProfile: true,
      adminProfile: true,
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    personnel,
  });
});

export const getCooperation = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const company = currentUser.role === Role.COMPANY ? await getCompanyProfileByUserId(currentUser.id) : null;

  const cooperation = await prisma.cooperationRecord.findMany({
    where: company ? { companyId: company.id } : undefined,
    include: {
      company: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    cooperation,
  });
});

export const createCooperation = asyncHandler(async (req, res) => {
  const cooperation = await prisma.cooperationRecord.create({
    data: {
      companyId: req.body.companyId,
      title: req.body.title,
      type: req.body.type,
      details: req.body.details,
      expiryDate: req.body.expiryDate,
      status: req.body.status ?? "active",
    },
    include: {
      company: { include: { user: true } },
    },
  });

  res.status(201).json({
    success: true,
    cooperation,
  });
});

export const getWorkload = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const lecturer =
    currentUser.role === Role.LECTURER ? await getLecturerProfileByUserId(currentUser.id) : null;

  const workload = await prisma.workloadRecord.findMany({
    where: lecturer ? { lecturerId: lecturer.id } : undefined,
    include: {
      lecturer: { include: { user: true } },
    },
    orderBy: [{ academicYear: "desc" }, { semester: "desc" }],
  });

  res.json({
    success: true,
    workload,
  });
});

export const createWorkload = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const lecturerId =
    currentUser.role === Role.LECTURER
      ? (await getLecturerProfileByUserId(currentUser.id)).id
      : req.body.lecturerId;

  if (!lecturerId) {
    throw new AppError(400, "lecturerId is required");
  }

  const record = await prisma.workloadRecord.create({
    data: {
      lecturerId,
      academicYear: req.body.academicYear,
      semester: req.body.semester,
      teachingHours: req.body.teachingHours,
      researchHours: req.body.researchHours,
      advisingHours: req.body.advisingHours,
      serviceHours: req.body.serviceHours,
    },
    include: {
      lecturer: { include: { user: true } },
    },
  });

  res.status(201).json({
    success: true,
    workload: record,
  });
});
