import { Role } from "@prisma/client";

const STAFF_MANAGEABLE = new Set<Role>([Role.STUDENT, Role.LECTURER, Role.COMPANY]);

export const canManageRole = (actor: Role, target: Role): boolean => {
  if (actor === Role.ADMIN) return true;
  if (actor === Role.STAFF) return STAFF_MANAGEABLE.has(target);
  return false;
};

export const canChangeRole = (actor: Role): boolean => actor === Role.ADMIN;
