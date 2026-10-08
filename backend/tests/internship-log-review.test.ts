import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf, freshIntern } from "./helpers/internship";

const newLog = async (recordId: string) =>
  prisma.internshipLog.create({ data: { recordId, date: new Date("2026-10-01"), activities: "Built a form", hours: 8 } });

// a reviewer always sends the version of the entry they were looking at
const review = async (id: string, auth: string, body: Record<string, unknown> = { status: "approved" }) => {
  const seen = await prisma.internshipLog.findUnique({ where: { id } });
  return request(app).patch(`/api/internship/logs/${id}/review`).set("Authorization", auth)
    .send({ updatedAt: seen?.updatedAt.toISOString() ?? new Date().toISOString(), ...body });
};

describe("who may review a diary entry", () => {
  it("the student's advisor and their internship company may; other lecturers and companies may not", async () => {
    const intern = await freshIntern({ withRecord: true });
    const log = await newLog(intern.record!.id);

    expect((await review(log.id, await authOf("mali@showpro.local"))).status).toBe(403);
    expect((await review(log.id, await authOf("careers@creativelabs.local"))).status).toBe(403);
    expect((await review(log.id, await authOf("narin@showpro.local"))).status).toBe(200);
    expect((await review(log.id, await authOf("talent@northernsoft.local"), { status: "changes_requested", comment: "Add detail" })).status).toBe(200);
    expect((await prisma.internshipLog.findUniqueOrThrow({ where: { id: log.id } })).reviewStatus).toBe("changes_requested");
  });

  it("an unknown entry is a 404", async () => {
    expect((await review("missing-log", await authOf("staff@showpro.local"))).status).toBe(404);
  });
});

describe("student edits a diary entry", () => {
  const edit = (id: string, auth: string, body: Record<string, unknown>) =>
    request(app).patch(`/api/internship/logs/${id}`).set("Authorization", auth).send(body);

  it("after changes were requested: saves, goes back to pending review, and tells the reviewer", async () => {
    const intern = await freshIntern({ withRecord: true });
    const log = await newLog(intern.record!.id);
    const narin = await prisma.user.findUniqueOrThrow({ where: { email: "narin@showpro.local" } });
    expect((await review(log.id, await authOf("narin@showpro.local"), { status: "changes_requested", comment: "Which form?" })).status).toBe(200);
    const before = await prisma.notification.count({ where: { userId: narin.id, type: "internship" } });

    const res = await edit(log.id, intern.auth, { date: "2026-10-01", hours: 7, activities: "Built the leave-request form", learnings: "Zod" });
    expect(res.status).toBe(200);
    const saved = await prisma.internshipLog.findUniqueOrThrow({ where: { id: log.id } });
    expect(saved).toMatchObject({ activities: "Built the leave-request form", hours: 7, learnings: "Zod", reviewStatus: "pending", reviewComment: null, reviewedById: null });
    expect(await prisma.notification.count({ where: { userId: narin.id, type: "internship" } })).toBe(before + 1);
  });

  it("another student cannot edit it, an approved entry is locked, staff cannot use the student edit", async () => {
    const intern = await freshIntern({ withRecord: true });
    const other = await freshIntern();
    const log = await newLog(intern.record!.id);
    const body = { date: "2026-10-01", hours: 8, activities: "Changed" };

    expect((await edit(log.id, other.auth, body)).status).toBe(403);
    expect((await edit(log.id, await authOf("staff@showpro.local"), body)).status).toBe(403);
    expect((await edit(log.id, intern.auth, { ...body, hours: 30 })).status).toBe(400);

    expect((await review(log.id, await authOf("narin@showpro.local"))).status).toBe(200);
    expect((await edit(log.id, intern.auth, body)).status).toBe(409);
    expect((await prisma.internshipLog.findUniqueOrThrow({ where: { id: log.id } })).activities).toBe("Built a form");
  });
});

describe("review and edit never cross", () => {
  it("a reviewer looking at an older version cannot approve it once the student has edited", async () => {
    const intern = await freshIntern({ withRecord: true });
    const log = await newLog(intern.record!.id);
    const seenByReviewer = log.updatedAt.toISOString();
    await new Promise((r) => setTimeout(r, 5));
    await request(app).patch(`/api/internship/logs/${log.id}`).set("Authorization", intern.auth)
      .send({ date: "2026-10-01", hours: 8, activities: "Rewritten" }).expect(200);

    const stale = await request(app).patch(`/api/internship/logs/${log.id}/review`).set("Authorization", await authOf("narin@showpro.local"))
      .send({ status: "approved", updatedAt: seenByReviewer });
    expect(stale.status).toBe(409);
    expect((await prisma.internshipLog.findUniqueOrThrow({ where: { id: log.id } })).reviewStatus).toBe("pending");
    const missing = await request(app).patch(`/api/internship/logs/${log.id}/review`).set("Authorization", await authOf("narin@showpro.local"))
      .send({ status: "approved" });
    expect(missing.status).toBe(400);
  });

  it("a student edit does not overwrite an approval that landed first", async () => {
    const intern = await freshIntern({ withRecord: true });
    const log = await newLog(intern.record!.id);
    // the approval lands between the student's read and write: simulate by approving straight in the DB
    await prisma.internshipLog.update({ where: { id: log.id }, data: { reviewStatus: "approved" } });
    const res = await request(app).patch(`/api/internship/logs/${log.id}`).set("Authorization", intern.auth)
      .send({ date: "2026-10-01", hours: 8, activities: "Too late" });
    expect(res.status).toBe(409);
    expect((await prisma.internshipLog.findUniqueOrThrow({ where: { id: log.id } })).activities).toBe("Built a form");
  });
});

describe("a finished internship's diary is closed", () => {
  it("no new or edited entries once the internship is completed or cancelled", async () => {
    for (const status of ["completed", "cancelled"]) {
      const intern = await freshIntern({ withRecord: true });
      const log = await newLog(intern.record!.id);
      await prisma.internshipRecord.update({ where: { id: intern.record!.id }, data: { status } });
      const body = { date: "2026-10-03", hours: 8, activities: "After the end" };
      expect((await request(app).post("/api/internship/logs").set("Authorization", intern.auth).send(body)).status).toBe(409);
      expect((await request(app).patch(`/api/internship/logs/${log.id}`).set("Authorization", intern.auth).send(body)).status).toBe(409);
      expect(await prisma.internshipLog.count({ where: { recordId: intern.record!.id } })).toBe(1);
    }
  });
});

describe("a finished internship is not reviewed any more", () => {
  it("refuses a review once the internship is completed or cancelled, so a student is never asked to fix a closed diary", async () => {
    for (const status of ["completed", "cancelled"]) {
      const intern = await freshIntern({ withRecord: true });
      const log = await newLog(intern.record!.id);
      await prisma.internshipRecord.update({ where: { id: intern.record!.id }, data: { status } });
      const res = await review(log.id, await authOf("narin@showpro.local"), { status: "changes_requested", comment: "Fix it" });
      expect(res.status).toBe(409);
      expect((await prisma.internshipLog.findUniqueOrThrow({ where: { id: log.id } })).reviewStatus).toBe("pending");
    }
  });
});
