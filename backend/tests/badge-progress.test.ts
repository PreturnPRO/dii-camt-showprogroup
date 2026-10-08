import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { evaluateStudentBadges } from "../src/services/badge.service";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./helpers/auth";

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

const freshStudent = async (data: { xp?: number; totalActivityHours?: number } = {}) => {
  const email = uniqueEmail("badge");
  const user = await prisma.user.create({
    data: { email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `B${uid()}`, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569", ...data } } },
    include: { studentProfile: true },
  });
  const auth = `Bearer ${await loginAs(email)}`;
  const progress = async () => {
    const res = await request(app).get("/api/students/badges").set("Authorization", auth);
    expect(res.status).toBe(200);
    return res.body.badges as Array<{ name: string; current: number; target: number; unit: string; unlocked: boolean; criteria: string }>;
  };
  return { profileId: user.studentProfile!.id, progress };
};

describe("badge progress", () => {
  it("shows each catalogue badge with the student's real number against its target", async () => {
    const s = await freshStudent({ xp: 30, totalActivityHours: 5 });
    const badges = await s.progress();
    const xp = badges.find((b) => b.name === "xp-explorer")!;
    expect(xp).toMatchObject({ current: 30, target: 100, unit: "XP", unlocked: false });
    expect(xp.criteria).toMatch(/100/);
    expect(badges.find((b) => b.name === "community-builder")).toMatchObject({ current: 5, target: 20, unlocked: false });
  });

  it("leaves out the quest badge nobody can earn any more", async () => {
    const s = await freshStudent();
    expect((await s.progress()).map((b) => b.name)).not.toContain("quest-finisher");
  });

  it("flips to unlocked once the badge is awarded, and keeps awarding the same badges as before", async () => {
    const s = await freshStudent({ xp: 150 });
    const awarded = await evaluateStudentBadges(s.profileId);
    expect(awarded.map((b) => b.name).sort()).toEqual(["xp-explorer"]);
    expect((await s.progress()).find((b) => b.name === "xp-explorer")).toMatchObject({ current: 150, unlocked: true });
  });

  it("a target reached without anyone evaluating badges still shows as unlocked, not locked at 100%", async () => {
    const s = await freshStudent({ xp: 120 });
    expect((await s.progress()).find((b) => b.name === "xp-explorer")).toMatchObject({ current: 120, unlocked: true });
  });

  it("an automation-awarded badge outside the catalogue shows as unlocked", async () => {
    const s = await freshStudent();
    await prisma.badge.create({ data: { studentId: s.profileId, name: "custom-x", nameThai: "พิเศษ", description: "d", icon: "star", criteria: "ให้โดยเจ้าหน้าที่" } });
    expect((await s.progress()).find((b) => b.name === "custom-x")).toMatchObject({ unlocked: true, target: null, current: null });
  });

  it("only students have badge progress", async () => {
    const res = await request(app).get("/api/students/badges").set("Authorization", `Bearer ${await loginAs("staff@showpro.local")}`);
    expect(res.status).toBe(403);
  });
});
