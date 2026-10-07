import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const freshStudent = async () => {
  const email = uniqueEmail("stats");
  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `T${uid()}`, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569", requiredCredits: 120 } } },
    include: { studentProfile: true },
  });
  const profileId = user.studentProfile!.id;
  const auth = `Bearer ${await loginAs(email)}`;
  return { profileId, stats: async () => (await request(app).get("/api/students/stats").set("Authorization", auth)).body.stats };
};

const addSkill = async (studentId: string, category: string, level: string) => {
  const skill = await prisma.skill.create({ data: { name: `SK${uid()}`, category } });
  await prisma.studentSkill.create({ data: { studentId, skillId: skill.id, level } });
};

const course = async (credits: number) => {
  const code = `ST${uid()}`;
  const lecturer = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  return prisma.course.create({ data: { code, name: code, nameThai: code, credits, semester: 1, academicYear: "2500", year: 2, status: "active", lecturerId: lecturer.id } });
};

describe("student stats show only real numbers", () => {
  it("send no skill scores: neither lecturer rubrics nor self-assessed averages (owner decision 7/10/69)", async () => {
    const s = await freshStudent();
    await addSkill(s.profileId, "frontend", "advanced");
    await prisma.skillRubric.create({ data: { studentId: s.profileId, category: "technical", skillName: "React web", professorScore: 4, peerScore: 3, totalScore: 3.6 } });
    const stats = await s.stats();
    expect(stats.skillSummary).toBeUndefined();
    const text = JSON.stringify(stats);
    for (const key of ["skillRubrics", "professorScore", "peerScore", "totalScore", "selfAssessed"]) expect(text).not.toContain(key);
  });

  it("credits are counted from real course credits, without categories or dropped courses", async () => {
    const s = await freshStudent();
    const graded = await course(6);
    const ongoing = await course(3);
    const dropped = await course(3);
    const failed = await course(3);
    const withdrawn = await course(3);
    const incomplete = await course(3);
    await prisma.enrollment.create({ data: { studentId: s.profileId, courseId: graded.id, status: "completed", letterGrade: "B" } });
    await prisma.enrollment.create({ data: { studentId: s.profileId, courseId: ongoing.id, status: "enrolled" } });
    await prisma.enrollment.create({ data: { studentId: s.profileId, courseId: dropped.id, status: "dropped" } });
    await prisma.enrollment.create({ data: { studentId: s.profileId, courseId: failed.id, status: "completed", letterGrade: "F" } });
    await prisma.enrollment.create({ data: { studentId: s.profileId, courseId: withdrawn.id, status: "completed", letterGrade: "W" } });
    await prisma.enrollment.create({ data: { studentId: s.profileId, courseId: incomplete.id, status: "completed", letterGrade: "I" } });
    const { curriculumProgress } = await s.stats();
    // F, W and I are not passed credits; dropped courses are not listed
    expect(curriculumProgress).toMatchObject({ requiredCredits: 120, completedCredits: 6, inProgressCredits: 3 });
    expect(curriculumProgress.courses).toHaveLength(5);
    const statusOf = (id: string) => curriculumProgress.courses.find((c: { id: string }) => c.id === id).status;
    expect([statusOf(graded.id), statusOf(failed.id), statusOf(withdrawn.id), statusOf(incomplete.id), statusOf(ongoing.id)])
      .toEqual(["completed", "failed", "withdrawn", "incomplete", "inProgress"]);
    expect(curriculumProgress.categoryTotals).toBeUndefined();
    expect(curriculumProgress.courses[0].category).toBeUndefined();
  });
});
