import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const activityBody = (title: string) => ({
  title, titleThai: title, description: "d", type: "workshop",
  startDate: "2026-12-01T09:00:00.000Z", endDate: "2026-12-01T12:00:00.000Z",
  location: "CAMT", organizer: "DII", activityHours: 3, gamificationPoints: 10,
});

describe("an unapproved activity does nothing yet", () => {
  it("students cannot enroll and the creator cannot hand out rewards until staff approve", async () => {
    const created = await request(app).post("/api/activities").set("Authorization", await as("narin@showpro.local")).send(activityBody("Pending one"));
    const id = created.body.activity.id;
    expect((await request(app).post(`/api/activities/enroll/${id}`).set("Authorization", await as("alice@student.showpro.local"))).status).toBe(409);

    // even if an enrollment exists, completing it on a pending activity grants nothing
    const alice = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "alice@student.showpro.local" } } });
    const enrollment = await prisma.activityEnrollment.create({ data: { activityId: id, studentId: alice.id } });
    const before = alice.gamificationPoints;
    const res = await request(app).patch(`/api/activities/enrollments/${enrollment.id}/status`).set("Authorization", await as("narin@showpro.local")).send({ status: "completed" });
    expect(res.status).toBe(409);
    expect((await prisma.studentProfile.findUniqueOrThrow({ where: { id: alice.id } })).gamificationPoints).toBe(before);
  });

  it("a lecturer changing points or hours on an approved activity sends it back for approval", async () => {
    const created = await request(app).post("/api/activities").set("Authorization", await as("narin@showpro.local")).send(activityBody("Approved one"));
    const id = created.body.activity.id;
    await request(app).patch(`/api/activities/${id}`).set("Authorization", await as("staff@showpro.local")).send({ status: "upcoming" });
    const res = await request(app).patch(`/api/activities/${id}`).set("Authorization", await as("narin@showpro.local")).send({ gamificationPoints: 100000 });
    expect(res.status).toBe(200);
    expect((await prisma.activity.findUniqueOrThrow({ where: { id } })).status).toBe("pending");
  });
});

describe("double-clicking apply", () => {
  it("parallel applications give exactly one 201 and the rest 409, never 500", async () => {
    const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const job = await prisma.jobPosting.create({ data: { companyId: company.id, title: `Par ${Date.now()}`, type: "internship", description: "d", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 86400000), status: "open" } });
    const auth = await as("bob@student.showpro.local");
    const results = await Promise.all([1, 2, 3, 4, 5, 6].map(() => request(app).post(`/api/apply/${job.id}`).set("Authorization", auth).send({})));
    expect(results.map((r) => r.status).sort()).toEqual([201, 409, 409, 409, 409, 409]);
  });
});
