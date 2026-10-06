import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("career targets", () => {
  it("only reports requirements the company actually wrote", async () => {
    const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const stamp = Date.now();
    // use a skill bob really has now (other test files rewrite alice's skill list)
    const bob = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010002" }, include: { skills: { include: { skill: true } } } });
    const skill = bob.skills[0].skill.name;
    await prisma.jobPosting.create({ data: { companyId: company.id, title: `NoGpa ${stamp}`, type: "internship", description: "d", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 86400000), requirements: ["Teamwork"], preferredSkills: [skill], postedAt: new Date(Date.now() + 60000) } });
    await prisma.jobPosting.create({ data: { companyId: company.id, title: `Gpa ${stamp}`, type: "internship", description: "d", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 86400000), requirements: ["GPA 3.25 ขึ้นไป"], preferredSkills: [skill], postedAt: new Date(Date.now() + 60000) } });

    const res = await request(app).get("/api/career-targets").set("Authorization", `Bearer ${await loginAs("bob@student.showpro.local")}`);
    expect(res.status).toBe(200);
    const byRole = Object.fromEntries(res.body.targets.map((t: { role: string }) => [t.role, t]));
    expect(byRole[`NoGpa ${stamp}`].requirements).toEqual({ gpa: null, skills: [skill] });
    expect(byRole[`NoGpa ${stamp}`].readiness.gpaMet).toBeNull();
    expect(byRole[`Gpa ${stamp}`].requirements.gpa).toBe(3.25);
    expect(JSON.stringify(res.body)).not.toMatch(/technicalSkills|softSkills|skillScore/);
  });
});
