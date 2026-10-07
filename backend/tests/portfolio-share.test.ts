import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const freshStudent = async () => {
  const email = uniqueEmail("share");
  const code = `S${Math.random().toString(36).slice(2, 9).toUpperCase()}`;
  await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: `Share ${code}`, nameThai: `แชร์ ${code}`, role: "STUDENT",
      studentProfile: { create: { studentId: code, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569" } } },
  });
  const auth = `Bearer ${await loginAs(email)}`;
  return { code, name: `Share ${code}`, patch: (body: unknown) => request(app).patch("/api/students/profile").set("Authorization", auth).send(body) };
};

const portfolio = (over: Record<string, unknown> = {}) => ({ summary: "s", summaryThai: "", projects: [], sharedWith: ["company-x"], isPublic: true, ...over });
const anonymous = (code: string) => request(app).get(`/api/students/profile/${code}`);

describe("sharing a portfolio by link", () => {
  it("anyone with the link sees a public portfolio, without the companies it is shared with", async () => {
    const s = await freshStudent();
    expect((await s.patch({ portfolio: portfolio(), consent: { allowPortfolioSharing: true } })).status).toBe(200);
    const res = await anonymous(s.code);
    expect(res.status).toBe(200);
    expect(res.body.profile.name).toBe(s.name);
    expect(res.body.profile.portfolio.summary).toBe("s");
    expect(res.body.profile.portfolio.sharedWith).toBeUndefined();
    expect(res.body.profile.consent).toBeUndefined();
    expect(res.body.profile.gpa).toBeUndefined();
  });

  it("turning it off closes the link, and editing the portfolio does not open it again", async () => {
    const s = await freshStudent();
    await s.patch({ portfolio: portfolio(), consent: { allowPortfolioSharing: true } });
    expect((await s.patch({ portfolio: portfolio({ isPublic: false }), consent: { allowPortfolioSharing: false } })).status).toBe(200);
    expect((await anonymous(s.code)).status).toBe(403);
    // the other portfolio forms send isPublic ?? true; that alone is not consent
    expect((await s.patch({ portfolio: portfolio({ summary: "edit" }) })).status).toBe(200);
    expect((await anonymous(s.code)).status).toBe(403);
  });
});
