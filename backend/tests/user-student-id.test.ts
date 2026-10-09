import bcrypt from "bcryptjs";
import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { SEED_PASSWORD, uniqueEmail } from "./helpers/auth";
import { authOf } from "./helpers/internship";

// G6 (staff ST-M1, ST-M2, security L5): the student ID really changes when staff edit it, an old odd ID
// does not block other edits, the import uses the same 8–9 digit rule, and advisor emails match exactly
const nineDigits = () => String(600000000 + Math.floor(Math.random() * 99999999)).slice(0, 9);

const student = async (studentId = nineDigits()) => {
  const email = uniqueEmail("sid");
  return prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId, major: "DII", program: "bachelor", year: 2, semester: 1, academicYear: "2569" } },
    },
  });
};
const edit = async (userId: string, roleData: Record<string, unknown>, extra: Record<string, unknown> = {}) =>
  request(app).patch(`/api/users/${userId}`).set("Authorization", await authOf("staff@showpro.local")).send({ roleData, ...extra });

describe("editing a student ID", () => {
  it("a new valid ID is saved", async () => {
    const user = await student();
    const next = nineDigits();
    expect((await edit(user.id, { studentId: next })).status).toBe(200);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id } })).studentId).toBe(next);
  });

  it("a malformed new ID is a 400; another student's ID is a 409", async () => {
    const user = await student();
    const other = await student();
    expect((await edit(user.id, { studentId: "AB12" })).status).toBe(400);
    const taken = await edit(user.id, { studentId: (await prisma.studentProfile.findUniqueOrThrow({ where: { userId: other.id } })).studentId });
    expect(taken.status).toBe(409);
    expect(taken.body.details).toMatchObject({ code: "STUDENT_ID_TAKEN" });
  });

  it("an old ID in another format does not block other edits (it is sent back unchanged)", async () => {
    const user = await student(`OLD${Date.now()}`);
    const profile = await prisma.studentProfile.findUniqueOrThrow({ where: { userId: user.id } });
    expect((await edit(user.id, { studentId: profile.studentId, year: 3 }, { isActive: false })).status).toBe(200);
    expect((await edit(user.id, { studentId: profile.studentId }, { isActive: true })).status).toBe(200);
  });
});

describe("importing students", () => {
  const row = (extra: Record<string, unknown>) => ({
    studentId: nineDigits(), name: "Import", email: uniqueEmail("imp"), major: "DII", program: "DII", year: 1, semester: 1, academicYear: "2569", ...extra,
  });
  const run = async (rows: unknown[]) =>
    (await request(app).post("/api/users/import/students").set("Authorization", await authOf("staff@showpro.local")).send({ rows })).body;

  it("a row whose ID is not 8–9 digits fails with its own reason, the others go in", async () => {
    const body = await run([row({ studentId: "AGT7S94" }), row({})]);
    expect(body.createdCount).toBe(1);
    expect(body.results.find((r: { status: string }) => r.status === "failed")).toMatchObject({ code: "BAD_STUDENT_ID" });
  });

  it("an advisor email with % or _ is not a pattern", async () => {
    const body = await run([row({ advisorEmail: "%@showpro.local" }), row({ advisorEmail: "mal_@showpro.local" })]);
    expect(body.createdCount).toBe(0);
    expect(body.results.every((r: { code?: string }) => r.code === "ADVISOR_NOT_FOUND")).toBe(true);
  });

  it("an advisor email with _ in mixed case still matches its lecturer", async () => {
    const email = `ad_${Date.now()}@Example.com`;
    await prisma.user.create({ data: {
      email: email.toLowerCase(), passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: "Under Score", nameThai: "อาจารย์ ขีดล่าง", role: "LECTURER",
      lecturerProfile: { create: { lecturerId: `L${Date.now()}`, department: "DII", position: "Lecturer" } },
    } });
    const body = await run([row({ advisorEmail: email.toUpperCase() })]);
    expect(body.createdCount).toBe(1);
  });

  it("a duplicate says so with a code", async () => {
    const first = row({});
    await run([first]);
    const body = await run([{ ...first, email: uniqueEmail("imp") }]);
    expect(body.results[0]).toMatchObject({ status: "failed", code: "DUPLICATE" });
  });
});
