import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("talent search against a job", () => {
  it("counts a skill once even when it is listed as both requirement and preferred skill", async () => {
    const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const alice = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010001" }, include: { skills: { include: { skill: true } } } });
    const skill = alice.skills[0].skill.name;
    const job = await prisma.jobPosting.create({
      data: { companyId: company.id, title: `Dup ${Date.now()}`, type: "skill_requirement", description: "d", location: "CNX", workType: "hybrid", deadline: new Date(Date.now() + 86400000), requirements: [skill, "Nonexistent Skill"], preferredSkills: [skill, "Nonexistent Skill"] },
    });
    const res = await request(app).get(`/api/talent/search?jobId=${job.id}`).set("Authorization", `Bearer ${await loginAs("talent@northernsoft.local")}`);
    expect(res.status).toBe(200);
    for (const t of res.body.talents) {
      expect(new Set(t.matchedSkills).size).toBe(t.matchedSkills.length);
      expect(t.matchedSkills.length + t.missingSkills.length).toBe(2);
    }
  });
});
