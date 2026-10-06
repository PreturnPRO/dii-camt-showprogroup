import { Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import { canChangeRole, canManageRole } from "../src/services/user-policy";

describe("user policy", () => {
  it("ADMIN can manage every role", () => {
    for (const target of Object.values(Role)) expect(canManageRole(Role.ADMIN, target)).toBe(true);
  });

  it("STAFF can manage only students, lecturers and companies", () => {
    expect(canManageRole(Role.STAFF, Role.STUDENT)).toBe(true);
    expect(canManageRole(Role.STAFF, Role.LECTURER)).toBe(true);
    expect(canManageRole(Role.STAFF, Role.COMPANY)).toBe(true);
    expect(canManageRole(Role.STAFF, Role.STAFF)).toBe(false);
    expect(canManageRole(Role.STAFF, Role.ADMIN)).toBe(false);
  });

  it("other roles manage nobody", () => {
    for (const actor of [Role.STUDENT, Role.LECTURER, Role.COMPANY]) {
      for (const target of Object.values(Role)) expect(canManageRole(actor, target)).toBe(false);
    }
  });

  it("only ADMIN can change roles", () => {
    expect(canChangeRole(Role.ADMIN)).toBe(true);
    expect(canChangeRole(Role.STAFF)).toBe(false);
  });
});
