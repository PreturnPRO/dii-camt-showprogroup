import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("course grading settings", () => {
  it("the owning lecturer can save criteria and cutoffs and they persist", async () => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    const res = await request(app).patch(`/api/courses/${dii340.id}`).set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`).send({
      gradingCriteria: [
        { name: "Midterm", weightPercentage: 40, maxScore: 100, orderIndex: 0 },
        { name: "Final", weightPercentage: 60, maxScore: 100, orderIndex: 1 },
      ],
      gradeCutoffs: [{ grade: "A", minScore: 80 }, { grade: "B", minScore: 70 }, { grade: "C", minScore: 60 }, { grade: "D", minScore: 50 }],
    });
    expect(res.status).toBe(200);
    const saved = await prisma.courseGradingCriteria.findMany({ where: { courseId: dii340.id }, orderBy: { orderIndex: "asc" } });
    expect(saved.map((c) => [c.name, c.weightPercentage])).toEqual([["Midterm", 40], ["Final", 60]]);
    expect((await prisma.courseGradeCutoff.findMany({ where: { courseId: dii340.id } })).length).toBe(4);
  });

  it.each([
    { gradingCriteria: [{ name: "x", weightPercentage: 120, maxScore: 100 }] },
    { gradingCriteria: [{ name: "x", weightPercentage: 60, maxScore: 0 }] },
    { gradeCutoffs: [{ grade: "W", minScore: 10 }] },
    { gradeCutoffs: [{ grade: "A", minScore: 150 }] },
  ])("rejects %o", async (bad) => {
    const dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
    const res = await request(app).patch(`/api/courses/${dii340.id}`).set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`).send(bad);
    expect(res.status).toBe(400);
  });
});
