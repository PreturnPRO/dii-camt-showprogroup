import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { sendDueInternshipLogReminders } from "../src/services/internship-reminder.service";
import { authOf, freshIntern } from "./helpers/internship";

const HOUR = 60 * 60 * 1000;

describe("internship status", () => {
  it("starts when the student submits their first diary entry, and the 48h reminder then reaches them", async () => {
    const intern = await freshIntern();
    // the diary needs a company first (owner decision 9/10/69); staff tie one, which does not start the internship
    const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    await request(app).put(`/api/internship/students/${intern.profile.id}/company`).set("Authorization", await authOf("staff@showpro.local"))
      .send({ companyId: company.id }).expect(200);
    expect((await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } })).status).toBe("not_started");
    const res = await request(app).post("/api/internship/logs").set("Authorization", intern.auth)
      .send({ date: "2026-10-01", hours: 8, activities: "First day" });
    expect(res.status).toBe(201);
    const record = await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } });
    expect(record.status).toBe("in_progress");

    await sendDueInternshipLogReminders(new Date(Date.now() + 49 * HOUR));
    expect(await prisma.notification.count({ where: { userId: intern.userId, type: "internship" } })).toBe(1);
  });

  it("a later entry does not undo a status staff already set", async () => {
    const intern = await freshIntern({ withRecord: true });
    await prisma.internshipRecord.update({ where: { id: intern.record!.id }, data: { status: "not_started" } });
    await request(app).post("/api/internship/logs").set("Authorization", intern.auth)
      .send({ date: "2026-10-02", hours: 4, activities: "First" }).expect(201);
    await prisma.internshipRecord.update({ where: { id: intern.record!.id }, data: { status: "in_progress" } });
    await request(app).post("/api/internship/logs").set("Authorization", intern.auth)
      .send({ date: "2026-10-03", hours: 4, activities: "Second" }).expect(201);
    expect((await prisma.internshipRecord.findUniqueOrThrow({ where: { id: intern.record!.id } })).status).toBe("in_progress");
  });

  it("taking 'completed' back revokes every completion certificate already issued for that student", async () => {
    const intern = await freshIntern({ withRecord: true });
    const staff = await authOf("staff@showpro.local");
    const url = `/api/internship/records/${intern.record!.id}/status`;
    await request(app).patch(url).set("Authorization", staff).send({ status: "completed" }).expect(200);
    await request(app).get("/api/documents/internship-certificate").set("Authorization", intern.auth).expect(200);
    await request(app).get(`/api/documents/internship-certificate?studentId=${intern.profile.studentId}`).set("Authorization", staff).expect(200);
    await request(app).get("/api/documents/transcript").set("Authorization", intern.auth).expect(200);

    const res = await request(app).patch(url).set("Authorization", staff).send({ status: "in_progress" });
    expect(res.status).toBe(200);
    expect(res.body.revokedCertificates).toBe(2);
    const docs = await prisma.issuedDocument.findMany({ where: { subjectId: intern.profile.id } });
    expect(docs.filter((d) => d.kind === "internship-certificate").every((d) => d.revokedAt !== null)).toBe(true);
    expect(docs.find((d) => d.kind === "transcript")!.revokedAt).toBeNull();
  });

  it("only staff/admin can mark an internship completed or cancelled", async () => {
    const intern = await freshIntern({ withRecord: true });
    const url = `/api/internship/records/${intern.record!.id}/status`;
    for (const email of ["narin@showpro.local", "talent@northernsoft.local"]) {
      expect((await request(app).patch(url).set("Authorization", await authOf(email)).send({ status: "completed" })).status).toBe(403);
    }
    expect((await request(app).patch(url).set("Authorization", intern.auth).send({ status: "completed" })).status).toBe(403);
    expect((await request(app).patch(url).set("Authorization", await authOf("staff@showpro.local")).send({ status: "done" })).status).toBe(400);

    const ok = await request(app).patch(url).set("Authorization", await authOf("staff@showpro.local")).send({ status: "completed" });
    expect(ok.status).toBe(200);
    expect(ok.body.internship.status).toBe("completed");
    expect((await request(app).patch("/api/internship/records/nope/status").set("Authorization", await authOf("admin@showpro.local")).send({ status: "cancelled" })).status).toBe(404);
  });

  it("issues the completion certificate only once the internship is completed", async () => {
    const intern = await freshIntern({ withRecord: true });
    const staff = await authOf("staff@showpro.local");
    const url = `/api/documents/internship-certificate?studentId=${intern.profile.studentId}`;
    const before = await prisma.issuedDocument.count({ where: { subjectId: intern.profile.id } });

    const early = await request(app).get(url).set("Authorization", staff);
    expect(early.status).toBe(409);
    expect(await prisma.issuedDocument.count({ where: { subjectId: intern.profile.id } })).toBe(before);
    expect((await request(app).get("/api/documents/internship-certificate").set("Authorization", intern.auth)).status).toBe(409);

    await prisma.internshipRecord.update({ where: { id: intern.record!.id }, data: { status: "completed" } });
    const done = await request(app).get(url).set("Authorization", staff);
    expect(done.status).toBe(200);
    expect(done.headers["content-type"]).toMatch(/application\/pdf/);
  });
});
