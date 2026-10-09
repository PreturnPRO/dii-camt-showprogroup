import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { freshIntern } from "./helpers/internship";

describe("a student's own CV link", () => {
  it("is saved and read back on their own profile, so the Settings card can show it", async () => {
    const me = await freshIntern();
    expect((await request(app).patch("/api/students/profile").set("Authorization", me.auth).send({ cvUrl: "https://cv.example.com/a.pdf" })).status).toBe(200);
    const res = await request(app).get("/api/students/profile").set("Authorization", me.auth);
    expect(res.body.profile.cvUrl).toBe("https://cv.example.com/a.pdf");
  });
});

describe("a company reading a student's shared profile", () => {
  it("never gets the academic status (owner decision 9/10/69)", async () => {
    const { prisma } = await import("../src/lib/prisma");
    const { authOf } = await import("./helpers/internship");
    const me = await freshIntern();
    await prisma.studentProfile.update({ where: { id: me.profile.id }, data: { academicStatus: "probation", consent: { upsert: { create: { allowDataSharing: true }, update: { allowDataSharing: true } } } } });
    const res = await request(app).get(`/api/students/profile?studentId=${me.profile.id}`).set("Authorization", await authOf("talent@northernsoft.local"));
    expect(res.status).toBe(200);
    expect(res.body.profile).not.toHaveProperty("academicStatus");
    expect(JSON.stringify(res.body)).not.toContain("probation");
  });
});

describe("the student list a company may browse", () => {
  it("never carries the academic status either", async () => {
    const { prisma } = await import("../src/lib/prisma");
    const { authOf } = await import("./helpers/internship");
    const me = await freshIntern();
    await prisma.studentProfile.update({ where: { id: me.profile.id }, data: { academicStatus: "probation", consent: { upsert: { create: { allowDataSharing: true }, update: { allowDataSharing: true } } } } });
    const res = await request(app).get("/api/student-profiles").set("Authorization", await authOf("talent@northernsoft.local"));
    const row = res.body.profiles.find((p: { id: string }) => p.id === me.profile.id);
    expect(row).toBeTruthy();
    expect(row).not.toHaveProperty("academicStatus");
  });
});
