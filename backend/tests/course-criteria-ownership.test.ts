import request from "supertest";
import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

// review round 3 C1: a lecturer saving their own course must not be able to rewrite
// a grading criterion that belongs to another lecturer's course by sending its id.
// Each test works on courses it creates, so the seeded DII340/DII420 criteria other files rely on stay as they are.
const courses: string[] = [];

const courseOf = async (lecturerEmail: string, criteria: { name: string; weightPercentage: number; maxScore: number }[]) => {
  const lecturer = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: lecturerEmail } } });
  const code = `C${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  const course = await prisma.course.create({
    data: {
      code, name: code, nameThai: code, credits: 3, semester: 1, academicYear: "2500", year: 2, lecturerId: lecturer.id, status: "archived",
      gradingCriteria: { create: criteria.map((c, orderIndex) => ({ ...c, orderIndex })) },
    },
    include: { gradingCriteria: { orderBy: { orderIndex: "asc" } } },
  });
  courses.push(course.id);
  return course;
};

const criteriaOf = (courseId: string) => prisma.courseGradingCriteria.findMany({ where: { courseId }, orderBy: { orderIndex: "asc" } });

afterAll(async () => {
  await prisma.courseGradingCriteria.deleteMany({ where: { courseId: { in: courses } } });
  await prisma.course.deleteMany({ where: { id: { in: courses } } });
});

describe("grading criteria belong to their course", () => {
  it("refuses a criterion id from another course and leaves both courses' criteria untouched", async () => {
    const mine = await courseOf("narin@showpro.local", [{ name: "Narin Midterm", weightPercentage: 40, maxScore: 100 }]);
    const theirs = await courseOf("mali@showpro.local", [{ name: "Mali Project", weightPercentage: 30, maxScore: 100 }]);
    const foreign = theirs.gradingCriteria[0];

    const res = await request(app).patch(`/api/courses/${mine.id}`).set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`).send({
      gradingCriteria: [{ id: foreign.id, name: "Hijacked", weightPercentage: 70, maxScore: 5 }],
    });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/does not belong to this course/);
    expect(await criteriaOf(theirs.id)).toEqual(theirs.gradingCriteria);
    // the whole save is refused: the lecturer's own criterion was not deleted along the way
    expect(await criteriaOf(mine.id)).toEqual(mine.gradingCriteria);
  });

  it("still lets the owner rename their own criterion by id", async () => {
    const mine = await courseOf("narin@showpro.local", [{ name: "Quiz", weightPercentage: 20, maxScore: 10 }]);

    const res = await request(app).patch(`/api/courses/${mine.id}`).set("Authorization", `Bearer ${await loginAs("narin@showpro.local")}`).send({
      gradingCriteria: [{ id: mine.gradingCriteria[0].id, name: "Quiz 1", weightPercentage: 25, maxScore: 10 }],
    });

    expect(res.status).toBe(200);
    expect(await criteriaOf(mine.id)).toMatchObject([{ id: mine.gradingCriteria[0].id, name: "Quiz 1", weightPercentage: 25 }]);
  });
});
