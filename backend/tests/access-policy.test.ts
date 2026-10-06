import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { assertCourseManager, canViewStudentRecord, gpaBand } from "../src/services/access-policy";

const userOf = async (email: string) => {
  const u = await prisma.user.findUniqueOrThrow({ where: { email } });
  return { id: u.id, role: u.role };
};
const studentOf = async (email: string) =>
  prisma.studentProfile.findFirstOrThrow({ where: { user: { email } }, select: { id: true, userId: true, advisorId: true } });

describe("canViewStudentRecord", () => {
  it("student sees only themselves", async () => {
    expect(await canViewStudentRecord(await userOf("alice@student.showpro.local"), await studentOf("alice@student.showpro.local"))).toBe(true);
    expect(await canViewStudentRecord(await userOf("alice@student.showpro.local"), await studentOf("bob@student.showpro.local"))).toBe(false);
  });
  it("lecturer sees advisees and students in courses they teach, nobody else", async () => {
    const mali = await userOf("mali@showpro.local");
    expect(await canViewStudentRecord(mali, await studentOf("chompoo@student.showpro.local"))).toBe(true); // advisee
    expect(await canViewStudentRecord(mali, await studentOf("alice@student.showpro.local"))).toBe(true); // in DII420
    expect(await canViewStudentRecord(mali, await studentOf("bob@student.showpro.local"))).toBe(false);
  });
  it("company never sees academic records; staff and admin always do", async () => {
    const bob = await studentOf("bob@student.showpro.local");
    expect(await canViewStudentRecord(await userOf("talent@northernsoft.local"), bob)).toBe(false);
    expect(await canViewStudentRecord(await userOf("staff@showpro.local"), bob)).toBe(true);
    expect(await canViewStudentRecord(await userOf("admin@showpro.local"), bob)).toBe(true);
  });
});

describe("assertCourseManager", () => {
  it("lets the owning lecturer, staff and admin through and blocks others", async () => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    await expect(assertCourseManager(await userOf("narin@showpro.local"), dii340.id)).resolves.toMatchObject({ id: dii340.id });
    await expect(assertCourseManager(await userOf("staff@showpro.local"), dii340.id)).resolves.toBeTruthy();
    await expect(assertCourseManager(await userOf("mali@showpro.local"), dii340.id)).rejects.toMatchObject({ statusCode: 403 });
    await expect(assertCourseManager(await userOf("alice@student.showpro.local"), dii340.id)).rejects.toMatchObject({ statusCode: 403 });
  });
});

describe("gpaBand", () => {
  it("maps GPAX to the company-visible band", () => {
    expect(gpaBand(3.8)).toBe("3.50+");
    expect(gpaBand(3.2)).toBe("3.00-3.49");
    expect(gpaBand(0)).toBe("not_disclosed");
    expect(gpaBand(null)).toBe("not_disclosed");
  });
});
