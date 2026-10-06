import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

let narin: string;
let dii340: { id: string };
let alice: { id: string };
let bob: { id: string };
const post = (grades: unknown[]) => request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${narin}`).send({ grades });

beforeAll(async () => {
  narin = await loginAs("narin@showpro.local");
  dii340 = await prisma.course.findFirstOrThrow({ where: { code: "DII340" } });
  alice = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "alice@student.showpro.local" } } });
  bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
});

describe("grade validation", () => {
  it.each([{ letterGrade: "A+" }, { letterGrade: "Z" }, { total: 140 }, { total: -1 }])("rejects %o", async (bad) => {
    expect((await post([{ studentId: bob.id, courseId: dii340.id, ...bad }])).status).toBe(400);
  });

  it("rejects a criterion from another course and a score above the criterion's max", async () => {
    const other = await prisma.courseGradingCriteria.findFirstOrThrow({ where: { courseId: { not: dii340.id } } });
    const own = await prisma.courseGradingCriteria.findFirstOrThrow({ where: { courseId: dii340.id } });
    expect((await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: other.id, score: 10 }] }])).status).toBe(400);
    expect((await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: own.id, score: own.maxScore + 1 }] }])).status).toBe(400);
  });
});

describe("all or nothing", () => {
  it("one bad row saves nothing and reports every bad row", async () => {
    const before = await prisma.enrollment.findMany({ where: { courseId: dii340.id }, orderBy: { id: "asc" } });
    const historyBefore = await prisma.gradeHistory.count();
    const res = await post([
      { studentId: alice.id, courseId: dii340.id, letterGrade: "C" },
      { studentId: bob.id, courseId: dii340.id, letterGrade: "Q" },
    ]);
    expect(res.status).toBe(400);
    expect(JSON.stringify(res.body)).toMatch(/Q|letterGrade/);
    const after = await prisma.enrollment.findMany({ where: { courseId: dii340.id }, orderBy: { id: "asc" } });
    expect(after.map((e) => e.letterGrade)).toEqual(before.map((e) => e.letterGrade));
    expect(await prisma.gradeHistory.count()).toBe(historyBefore);
  });

  it("an enrollment that does not exist rejects the whole batch", async () => {
    const res = await post([
      { studentId: alice.id, courseId: dii340.id, letterGrade: "B" },
      { studentId: "no-such-student", courseId: dii340.id, letterGrade: "B" },
    ]);
    expect([400, 404]).toContain(res.status);
    expect((await prisma.enrollment.findFirstOrThrow({ where: { studentId: alice.id, courseId: dii340.id } })).letterGrade).not.toBe("B");
  });
});

describe("partial score entry", () => {
  it("total is recomputed from every stored criterion score, not only the ones sent", async () => {
    const criteria = await prisma.courseGradingCriteria.findMany({ where: { courseId: dii340.id }, orderBy: { orderIndex: "asc" } });
    expect(criteria.length).toBeGreaterThanOrEqual(2);
    const [c1, c2] = criteria;
    await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: c1.id, score: c1.maxScore }, { criteriaId: c2.id, score: c2.maxScore }] }]);
    const full = (await prisma.enrollment.findFirstOrThrow({ where: { studentId: bob.id, courseId: dii340.id } })).total!;
    await post([{ studentId: bob.id, courseId: dii340.id, scores: [{ criteriaId: c1.id, score: c1.maxScore }] }]);
    const afterPartial = (await prisma.enrollment.findFirstOrThrow({ where: { studentId: bob.id, courseId: dii340.id } })).total!;
    expect(afterPartial).toBe(full);
  });
});
