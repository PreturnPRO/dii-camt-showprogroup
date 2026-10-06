import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

let mali: string;
let narin: string;
let dii340: string;
let bobEnrollment: string;
let bobProfile: string;

beforeAll(async () => {
  mali = await loginAs("mali@showpro.local");
  narin = await loginAs("narin@showpro.local");
  dii340 = (await prisma.course.findFirstOrThrow({ where: { code: "DII340" } })).id;
  const e = await prisma.enrollment.findFirstOrThrow({ where: { courseId: dii340, student: { user: { email: "bob@student.showpro.local" } } } });
  bobEnrollment = e.id;
  bobProfile = e.studentId;
});

describe("attendance ownership", () => {
  it("another lecturer cannot read the summary of DII340", async () => {
    const res = await request(app).get(`/api/attendance/summary/${dii340}`).set("Authorization", `Bearer ${mali}`);
    expect(res.status).toBe(403);
  });

  it("another lecturer cannot mark attendance on a DII340 enrollment", async () => {
    const res = await request(app).post("/api/attendance/check-in").set("Authorization", `Bearer ${mali}`).send({ enrollmentId: bobEnrollment, date: "2026-10-01T00:00:00.000Z", status: "absent" });
    expect(res.status).toBe(403);
  });

  it("another lecturer cannot read a DII340 student's history", async () => {
    const res = await request(app).get(`/api/attendance/history/${dii340}/${bobProfile}`).set("Authorization", `Bearer ${mali}`);
    expect(res.status).toBe(403);
  });

  it("the report without courseId only contains the lecturer's own courses", async () => {
    await request(app).post("/api/attendance/check-in").set("Authorization", `Bearer ${narin}`).send({ enrollmentId: bobEnrollment, date: "2026-10-02T00:00:00.000Z", status: "present" });
    const res = await request(app).get("/api/attendance/report").set("Authorization", `Bearer ${mali}`);
    expect(res.status).toBe(200);
    for (const row of res.body.attendance) expect(row.enrollment.courseId).not.toBe(dii340);
  });

  it("the owning lecturer can still do all of it", async () => {
    expect((await request(app).get(`/api/attendance/summary/${dii340}`).set("Authorization", `Bearer ${narin}`)).status).toBe(200);
    expect((await request(app).get(`/api/attendance/history/${dii340}/${bobProfile}`).set("Authorization", `Bearer ${narin}`)).status).toBe(200);
  });
});
