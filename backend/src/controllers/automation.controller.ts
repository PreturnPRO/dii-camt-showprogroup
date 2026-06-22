import { Role } from "@prisma/client";

import { prisma } from "../lib/prisma";
import { computeNextAutomationRun, runAutomationRuleById } from "../services/automation.service";
import { createAuditLog } from "../services/audit.service";
import { asyncHandler } from "../utils/async-handler";
import { AppError } from "../utils/errors";
import { requireUser } from "../utils/user";



export const getAutomationRules = asyncHandler(async (req, res) => {
  const rules = await prisma.automationRule.findMany({
    include: {
      admin: {
        include: {
          user: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  res.json({
    success: true,
    rules,
  });
});

export const createAutomationRule = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const admin = await prisma.adminProfile.findUnique({
    where: { userId: currentUser.id },
  });

  if (!admin) {
    throw new AppError(403, "Only administrators can create automation rules");
  }

  const nextRun = computeNextAutomationRun(req.body.trigger);

  const rule = await prisma.automationRule.create({
    data: {
      adminId: admin.id,
      name: req.body.name,
      description: req.body.description,
      trigger: req.body.trigger,
      action: req.body.action,
      isActive: req.body.isActive ?? true,
      nextRun,
    },
  });

  await createAuditLog({
    userId: currentUser.id,
    action: "AUTOMATION_RULE_CREATED",
    resource: "AutomationRule",
    resourceId: rule.id,
    changes: {
      name: rule.name,
      nextRun: nextRun.toISOString(),
    },
  });

  res.status(201).json({
    success: true,
    rule,
  });
});

export const updateAutomationRule = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const existing = await prisma.automationRule.findUnique({
    where: { id: String(req.params.id) },
  });

  if (!existing) {
    throw new AppError(404, "Automation rule not found");
  }

  const trigger = req.body.trigger ?? existing.trigger;
  const nextRun = computeNextAutomationRun(trigger);

  const rule = await prisma.automationRule.update({
    where: { id: existing.id },
    data: {
      name: req.body.name,
      description: req.body.description,
      trigger: req.body.trigger,
      action: req.body.action,
      isActive: req.body.isActive,
      nextRun,
    },
  });

  await createAuditLog({
    userId: currentUser.id,
    action: "AUTOMATION_RULE_UPDATED",
    resource: "AutomationRule",
    resourceId: rule.id,
    changes: {
      name: rule.name,
      nextRun: nextRun.toISOString(),
    },
  });

  res.json({
    success: true,
    rule,
  });
});

export const runAutomationRule = asyncHandler(async (req, res) => {
  const result = await runAutomationRuleById(String(req.params.id));

  res.json({
    success: true,
    result,
  });
});

export const deleteAutomationRule = asyncHandler(async (req, res) => {
  const currentUser = requireUser(req);
  const rule = await prisma.automationRule.delete({
    where: { id: String(req.params.id) },
  });

  await createAuditLog({
    userId: currentUser.id,
    action: "AUTOMATION_RULE_DELETED",
    resource: "AutomationRule",
    resourceId: rule.id,
    changes: {
      name: rule.name,
    },
  });

  res.json({
    success: true,
    rule,
  });
});
