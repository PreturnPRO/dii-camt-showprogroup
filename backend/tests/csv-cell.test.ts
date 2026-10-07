import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { csvCell } from "../src/utils/csv";
import { loginAs } from "./helpers/auth";

describe("csvCell", () => {
  it.each([
    ['=HYPERLINK("http://x")', `"'=HYPERLINK(""http://x"")"`],
    ["+1", `"'+1"`],
    ["-2+3", `"'-2+3"`],
    ["@SUM(A1)", `"'@SUM(A1)"`],
    ["\tx", `"'\tx"`],
    ["สมชาย", `"สมชาย"`],
    ['a"b', `"a""b"`],
  ])("%s", (input, out) => {
    expect(csvCell(input)).toBe(out);
  });

  it("keeps numbers (including negatives) numeric", () => {
    expect(csvCell(-1.5)).toBe("-1.5");
    expect(csvCell(80)).toBe("80");
  });

  it("blank for null/undefined", () => {
    expect(csvCell(null)).toBe("");
    expect(csvCell(undefined)).toBe("");
  });
});

describe("GET /api/courses/:id/grades/export", () => {
  let restore: (() => Promise<unknown>) | undefined;
  afterAll(async () => {
    await restore?.();
  });

  it("a remark that looks like a formula is exported as text", async () => {
    const enrollment = await prisma.enrollment.findFirstOrThrow({ include: { course: true } });
    const before = enrollment.remarks;
    restore = () => prisma.enrollment.update({ where: { id: enrollment.id }, data: { remarks: before } });
    await prisma.enrollment.update({ where: { id: enrollment.id }, data: { remarks: "=1+1" } });

    const token = await loginAs("staff@showpro.local");
    const res = await request(app)
      .get(`/api/courses/${enrollment.courseId}/grades/export`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(`"'=1+1"`);
    expect(res.text).not.toContain(`"=1+1"`);
  });
});
