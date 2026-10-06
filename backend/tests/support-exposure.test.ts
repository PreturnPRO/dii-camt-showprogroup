import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

describe("requests", () => {
  it.each(["talent@northernsoft.local", "narin@showpro.local"])("%s cannot list student requests", async (email) => {
    expect((await request(app).get("/api/requests").set("Authorization", await as(email))).status).toBe(403);
  });
  it("a student who does not own the request cannot comment on it", async () => {
    const r = await prisma.request.findFirstOrThrow();
    const owner = await prisma.studentProfile.findUniqueOrThrow({ where: { id: r.studentId }, include: { user: true } });
    const other = owner.user.email === "bob@student.showpro.local" ? "alice@student.showpro.local" : "bob@student.showpro.local";
    const res = await request(app).post(`/api/requests/${r.id}/comment`).set("Authorization", await as(other)).send({ text: "hi" });
    expect(res.status).toBe(403);
  });
  it("staff still list all requests", async () => {
    expect((await request(app).get("/api/requests").set("Authorization", await as("staff@showpro.local"))).status).toBe(200);
  });
});

describe("appointments", () => {
  it("a company cannot list appointments", async () => {
    expect((await request(app).get("/api/appointments").set("Authorization", await as("talent@northernsoft.local"))).status).toBe(403);
  });
  it("a lecturer cannot update another lecturer's appointment", async () => {
    const appt = await prisma.appointment.findFirstOrThrow({ include: { lecturer: { include: { user: true } } } });
    const other = appt.lecturer.user.email === "mali@showpro.local" ? "narin@showpro.local" : "mali@showpro.local";
    const res = await request(app).patch(`/api/appointments/${appt.id}/status`).set("Authorization", await as(other)).send({ status: "cancelled" });
    expect(res.status).toBe(403);
  });
});

describe("internship logs", () => {
  // seed: alice (65010001) has the only record, linked to talent@northernsoft.local; advisor narin
  it("a company not linked to the record and an unrelated lecturer are refused", async () => {
    expect((await request(app).get("/api/internship/logs?studentId=65010001").set("Authorization", await as("mali@showpro.local"))).status).toBe(403);
    expect((await request(app).get("/api/internship/logs?studentId=65010001").set("Authorization", await as("careers@creativelabs.local"))).status).toBe(403);
  });
  it("the linked company and the advisor can still read it", async () => {
    for (const email of ["talent@northernsoft.local", "narin@showpro.local"]) {
      expect((await request(app).get("/api/internship/logs?studentId=65010001").set("Authorization", await as(email))).status).toBe(200);
    }
  });
  it("reading a student with no record returns 404 and creates nothing", async () => {
    const before = await prisma.internshipRecord.count();
    const res = await request(app).get("/api/internship/logs?studentId=65010002").set("Authorization", await as("staff@showpro.local"));
    expect(res.status).toBe(404);
    expect(await prisma.internshipRecord.count()).toBe(before);
  });
  it("a student without a record gets internship: null and nothing is created", async () => {
    const before = await prisma.internshipRecord.count();
    const res = await request(app).get("/api/internship/logs").set("Authorization", await as("bob@student.showpro.local"));
    expect(res.status).toBe(200);
    expect(res.body.internship).toBeNull();
    expect(await prisma.internshipRecord.count()).toBe(before);
  });
});
