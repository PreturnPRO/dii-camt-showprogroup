import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

// owner decision 9/10/69: grades stay a draft until the lecturer publishes the whole course,
// which is allowed only once every non-dropped student has a grade; edits after that apply at once

let narinToken: string;
let bobToken: string;
let bobId: string;
let aliceId: string;

/** throw-away students: grading a seed student would move the GPAX other test files check */
async function freshStudent() {
  const email = uniqueEmail("pub");
  const user = await prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `P${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`, major: "DII", program: "bachelor", year: 3, semester: 1, academicYear: "2569" } },
    },
    include: { studentProfile: true },
  });
  return { id: user.studentProfile!.id, email };
}

beforeAll(async () => {
  narinToken = await loginAs("narin@showpro.local");
  const bob = await freshStudent();
  bobId = bob.id;
  bobToken = await loginAs(bob.email);
  aliceId = (await freshStudent()).id;
});

/** a past-term course of narin's with two 50/50 criteria and A/B/C/D cutoffs, bob (and optionally alice) enrolled */
async function makeCourse(opts: { withAlice?: boolean } = {}) {
  const bob = await prisma.studentProfile.findUniqueOrThrow({ where: { id: bobId } });
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const course = await prisma.course.create({
    data: {
      code: `P${Math.random().toString(36).slice(2, 8).toUpperCase()}`, name: "Publish", nameThai: "ประกาศ", credits: 3,
      semester: 2, academicYear: String(Number(bob.academicYear) - 2), year: 1, lecturerId: narin.id, status: "active",
      gradingCriteria: { create: [{ name: "Midterm", weightPercentage: 50, maxScore: 100, orderIndex: 0 }, { name: "Final", weightPercentage: 50, maxScore: 100, orderIndex: 1 }] },
      gradeCutoffs: { create: [{ grade: "A", minScore: 80 }, { grade: "B", minScore: 70 }, { grade: "C", minScore: 60 }, { grade: "D", minScore: 50 }] },
    },
    include: { gradingCriteria: { orderBy: { orderIndex: "asc" } } },
  });
  await prisma.enrollment.create({ data: { studentId: bobId, courseId: course.id } });
  if (opts.withAlice) await prisma.enrollment.create({ data: { studentId: aliceId, courseId: course.id } });
  const [mid, fin] = course.gradingCriteria;
  return { course, mid, fin };
}

const saveScores = (courseId: string, studentId: string, scores: { criteriaId: string; score: number }[]) =>
  request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${narinToken}`).send({ grades: [{ studentId, courseId, scores }] });

const publish = (courseId: string, token = narinToken) =>
  request(app).post(`/api/grades/courses/${courseId}/publish`).set("Authorization", `Bearer ${token}`);

const bobsEnrollment = async (courseId: string) => {
  const res = await request(app).get("/api/enrollments").set("Authorization", `Bearer ${bobToken}`);
  expect(res.status).toBe(200);
  return res.body.enrollments.find((e: { courseId: string }) => e.courseId === courseId);
};

const gradeNotifications = (studentId: string, code: string) =>
  prisma.notification.count({ where: { user: { studentProfile: { id: studentId } }, type: "grade", messageThai: { contains: code } } });

describe("grades before the course is published", () => {
  it("the student sees no grade, total or scores, and GPAX does not move", async () => {
    const { course, mid, fin } = await makeCourse();
    const gpaxBefore = (await prisma.studentProfile.findUniqueOrThrow({ where: { id: bobId } })).gpax;

    const res = await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
    expect(res.status).toBe(200);

    const mine = await bobsEnrollment(course.id);
    expect(mine.letterGrade).toBeNull();
    expect(mine.total).toBeNull();
    expect(mine.scores).toEqual([]);
    expect(mine).not.toHaveProperty("workingLetterGrade");
    expect(mine).not.toHaveProperty("workingTotal");
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: bobId } })).gpax).toBe(gpaxBefore);
    expect(await gradeNotifications(bobId, course.code)).toBe(0);
  });

  it("the lecturer sees the working grade computed from the scores", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);

    const res = await request(app).get(`/api/enrollments?courseId=${course.id}`).set("Authorization", `Bearer ${narinToken}`);
    const row = res.body.enrollments.find((e: { studentId: string }) => e.studentId === bobId);
    expect(row.workingTotal).toBe(90);
    expect(row.workingLetterGrade).toBe("A");
    expect(row.scores).toHaveLength(2);
  });

  it("lowering a score lowers the working grade", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
    await saveScores(course.id, bobId, [{ criteriaId: fin.id, score: 48 }]); // (90 + 48) / 2 = 69

    const row = await prisma.enrollment.findFirstOrThrow({ where: { courseId: course.id, studentId: bobId }, omit: { workingTotal: false, workingLetterGrade: false } });
    expect(row.workingTotal).toBe(69);
    expect(row.workingLetterGrade).toBe("C");
  });

  it("a remark on a draft is not shown to the student until the grades are published", async () => {
    const { course, mid, fin } = await makeCourse();
    await request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${narinToken}`)
      .send({ grades: [{ studentId: bobId, courseId: course.id, scores: [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }], remarks: "ตกปลายภาค" }] });

    const draft = await bobsEnrollment(course.id);
    expect(draft.remarks).toBeNull();
    expect(draft.gradedAt).toBeNull();
    const tr = await request(app).get("/api/student/transcript").set("Authorization", `Bearer ${bobToken}`);
    expect(JSON.stringify(tr.body)).not.toContain("ตกปลายภาค");

    await publish(course.id);
    expect((await bobsEnrollment(course.id)).remarks).toBe("ตกปลายภาค");
  });

  it("the CSV export of a draft course has the working total and grade", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
    const res = await request(app).get(`/api/courses/${course.id}/grades/export`).set("Authorization", `Bearer ${narinToken}`);
    expect(res.status).toBe(200);
    expect(res.text).toContain(`,90,"A",`);
  });

  it("dropping and enrolling again starts with an empty grade sheet", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
    // the row is reused on re-enroll; mark it dropped as the drop endpoint would
    await prisma.enrollment.updateMany({ where: { courseId: course.id, studentId: bobId }, data: { status: "dropped" } });
    const section = await prisma.section.create({ data: { courseId: course.id, number: "01", schedule: [] } });
    const staff = await loginAs("staff@showpro.local");
    const res = await request(app).post("/api/enrollments").set("Authorization", `Bearer ${staff}`).send({ studentId: bobId, courseId: course.id, sectionId: section.id });
    expect(res.status).toBeLessThan(300);

    const row = await prisma.enrollment.findFirstOrThrow({ where: { courseId: course.id, studentId: bobId }, omit: { workingTotal: false, workingLetterGrade: false } });
    expect(row.workingLetterGrade).toBeNull();
    expect(row.workingTotal).toBeNull();
  });

  it("re-saving the sheet keeps a grade the lecturer gave by hand (I/W)", async () => {
    const { course, mid, fin } = await makeCourse();
    const scores = [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }];
    await request(app).patch("/api/grades/bulk").set("Authorization", `Bearer ${narinToken}`)
      .send({ grades: [{ studentId: bobId, courseId: course.id, scores, letterGrade: "I" }] });
    // the sheet sends every row again, without a letter for rows whose letter box was not touched
    await saveScores(course.id, bobId, scores);

    const row = await prisma.enrollment.findFirstOrThrow({ where: { courseId: course.id, studentId: bobId }, omit: { workingLetterGrade: false } });
    expect(row.workingLetterGrade).toBe("I");
  });

  it("the transcript endpoint shows the student no draft scores", async () => {
    const { course, mid } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }]);

    const res = await request(app).get("/api/student/transcript").set("Authorization", `Bearer ${bobToken}`);
    expect(res.status).toBe(200);
    const row = res.body.transcript.find((e: { courseId: string }) => e.courseId === course.id);
    expect(row.scores).toEqual([]);
    expect(row).not.toHaveProperty("workingLetterGrade");
  });
});

describe("publishing a course's grades", () => {
  it("is refused while a student has no grade, and says who", async () => {
    const { course, mid, fin } = await makeCourse({ withAlice: true });
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);

    const res = await publish(course.id);
    expect(res.status).toBe(409);
    expect(JSON.stringify(res.body)).toContain(aliceId);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).gradesPublishedAt).toBeNull();
  });

  it("is refused while a student has only some of the criteria scored", async () => {
    const { course, mid } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }]);

    expect((await publish(course.id)).status).toBe(409);
  });

  it("shows the grades to students, recalculates GPAX and notifies once", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);

    const res = await publish(course.id);
    expect(res.status).toBe(200);

    const mine = await bobsEnrollment(course.id);
    expect(mine.letterGrade).toBe("A");
    expect(mine.total).toBe(90);
    expect(mine.scores).toHaveLength(2);
    expect((await prisma.course.findUniqueOrThrow({ where: { id: course.id } })).gradesPublishedAt).not.toBeNull();
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: bobId } })).gpax).toBeGreaterThan(0);
    expect(await gradeNotifications(bobId, course.code)).toBe(1);
    expect(await prisma.gradeHistory.count({ where: { enrollment: { courseId: course.id }, newGrade: "A" } })).toBe(1);
  });

  it("cannot be done twice", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
    expect((await publish(course.id)).status).toBe(200);
    expect((await publish(course.id)).status).toBe(409);
  });

  it("is not allowed for a student or for another lecturer", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
    expect((await publish(course.id, bobToken)).status).toBe(403);
    expect((await publish(course.id, await loginAs("mali@showpro.local"))).status).toBe(403);
  });

  it("a save racing a publish never leaves the student with a stale grade", async () => {
    for (let i = 0; i < 5; i++) {
      const { course, mid, fin } = await makeCourse();
      await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
      await Promise.all([publish(course.id), saveScores(course.id, bobId, [{ criteriaId: fin.id, score: 48 }])]);
      const row = await prisma.enrollment.findFirstOrThrow({ where: { courseId: course.id, studentId: bobId }, omit: { workingLetterGrade: false, workingTotal: false } });
      expect(row.workingLetterGrade).toBe("C");
      expect(row.letterGrade).toBe(row.workingLetterGrade);
      expect(row.total).toBe(row.workingTotal);
    }
  });

  it("a change after publishing reaches the student at once and notifies them", async () => {
    const { course, mid, fin } = await makeCourse();
    await saveScores(course.id, bobId, [{ criteriaId: mid.id, score: 90 }, { criteriaId: fin.id, score: 90 }]);
    await publish(course.id);

    await saveScores(course.id, bobId, [{ criteriaId: fin.id, score: 48 }]);

    const mine = await bobsEnrollment(course.id);
    expect(mine.letterGrade).toBe("C");
    expect(mine.total).toBe(69);
    expect(await gradeNotifications(bobId, course.code)).toBe(2);
  });
});
