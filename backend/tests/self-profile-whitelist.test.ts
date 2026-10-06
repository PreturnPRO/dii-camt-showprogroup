import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const patchSelf = async (email: string, body: Record<string, unknown>) =>
  request(app).patch("/api/users/profile").set("Authorization", `Bearer ${await loginAs(email)}`).send(body);

describe("student self-update via /users/profile", () => {
  it("echoed academic fields are accepted but never change; cvUrl does", async () => {
    const before = await prisma.studentProfile.findFirstOrThrow({ where: { studentId: "65010001" } });
    const res = await patchSelf("alice@student.showpro.local", {
      name: "Alice",
      roleData: { major: "Hacked", program: "phd", year: 9, semester: 3, academicYear: "1999", cvUrl: "https://cv.example.com/alice.pdf" },
    });
    expect(res.status).toBe(200);
    const after = await prisma.studentProfile.findUniqueOrThrow({ where: { id: before.id } });
    expect({ major: after.major, program: after.program, year: after.year, semester: after.semester, academicYear: after.academicYear })
      .toEqual({ major: before.major, program: before.program, year: before.year, semester: before.semester, academicYear: before.academicYear });
    expect(after.cvUrl).toBe("https://cv.example.com/alice.pdf");
  });

  it("a javascript: cvUrl is refused", async () => {
    expect((await patchSelf("alice@student.showpro.local", { roleData: { cvUrl: "javascript:alert(1)" } })).status).toBe(400);
  });
});

describe("company self-update via /users/profile", () => {
  // start from a non-final status so "unchanged" proves the company could not set it
  beforeAll(async () => {
    await prisma.companyProfile.updateMany({ where: { user: { email: "talent@northernsoft.local" } }, data: { onboardingStatus: "pending_review" } });
  });

  it("onboarding dialog save succeeds but the company cannot set its own onboarding status", async () => {
    const before = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const res = await patchSelf("talent@northernsoft.local", { roleData: { onboardingStatus: "completed", companyName: before.companyName } });
    expect(res.status).toBe(200);
    const after = await prisma.companyProfile.findUniqueOrThrow({ where: { id: before.id } });
    expect(after.onboardingStatus).toBe(before.onboardingStatus);
  });

  it("javascript: website or map link is refused", async () => {
    for (const roleData of [{ website: "javascript:alert(1)" }, { locationMapUrl: "javascript:alert(1)" }]) {
      expect((await patchSelf("talent@northernsoft.local", { roleData })).status).toBe(400);
    }
  });
});

describe("staff editing a company", () => {
  it("can set the onboarding status but not a javascript: website", async () => {
    const auth = `Bearer ${await loginAs("staff@showpro.local")}`;
    const company = await prisma.user.findUniqueOrThrow({ where: { email: "talent@northernsoft.local" } });
    expect((await request(app).patch(`/api/users/${company.id}`).set("Authorization", auth).send({ roleData: { website: "javascript:alert(1)" } })).status).toBe(400);
    const ok = await request(app).patch(`/api/users/${company.id}`).set("Authorization", auth).send({ roleData: { onboardingStatus: "completed" } });
    expect(ok.status).toBe(200);
    expect((await prisma.companyProfile.findUniqueOrThrow({ where: { userId: company.id } })).onboardingStatus).toBe("completed");
  });
});
