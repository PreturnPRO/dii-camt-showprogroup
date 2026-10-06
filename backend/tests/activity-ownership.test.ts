import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const body = (title: string) => ({
  title, titleThai: title, description: "d", type: "workshop",
  startDate: "2026-12-01T09:00:00.000Z", endDate: "2026-12-01T12:00:00.000Z",
  location: "CAMT", organizer: "DII", activityHours: 3, gamificationPoints: 10, status: "upcoming",
});

let narinActivity: string;
let legacyActivity: string;

beforeAll(async () => {
  const res = await request(app).post("/api/activities").set("Authorization", await as("narin@showpro.local")).send(body("Narin workshop"));
  narinActivity = res.body.activity.id;
  legacyActivity = (await prisma.activity.findFirstOrThrow({ where: { createdById: null } })).id;
});

describe("activity ownership", () => {
  it("a lecturer's new activity records the creator and waits for approval", async () => {
    const a = await prisma.activity.findUniqueOrThrow({ where: { id: narinActivity } });
    const narin = await prisma.user.findUniqueOrThrow({ where: { email: "narin@showpro.local" } });
    expect(a.createdById).toBe(narin.id);
    expect(a.status).toBe("pending");
  });

  it("another lecturer cannot edit or delete it", async () => {
    const auth = await as("mali@showpro.local");
    expect((await request(app).patch(`/api/activities/${narinActivity}`).set("Authorization", auth).send({ title: "x" })).status).toBe(403);
    expect((await request(app).delete(`/api/activities/${narinActivity}`).set("Authorization", auth)).status).toBe(403);
  });

  it("the creator can edit it but cannot approve it", async () => {
    const auth = await as("narin@showpro.local");
    const res = await request(app).patch(`/api/activities/${narinActivity}`).set("Authorization", auth).send({ title: "Renamed", status: "upcoming" });
    expect(res.status).toBe(200);
    const a = await prisma.activity.findUniqueOrThrow({ where: { id: narinActivity } });
    expect(a.title).toBe("Renamed");
    expect(a.status).toBe("pending");
  });

  it("no lecturer can touch an activity whose creator is unknown; staff can", async () => {
    expect((await request(app).patch(`/api/activities/${legacyActivity}`).set("Authorization", await as("narin@showpro.local")).send({ title: "x" })).status).toBe(403);
    expect((await request(app).patch(`/api/activities/${legacyActivity}`).set("Authorization", await as("staff@showpro.local")).send({ status: "upcoming" })).status).toBe(200);
  });

  it("a lecturer cannot mark enrollments on someone else's activity", async () => {
    const enrollment = await prisma.activityEnrollment.findFirstOrThrow({ where: { activityId: legacyActivity } });
    const res = await request(app).patch(`/api/activities/enrollments/${enrollment.id}/status`).set("Authorization", await as("mali@showpro.local")).send({ status: "registered" });
    expect(res.status).toBe(403);
  });

  it("staff can approve and delete the lecturer's activity", async () => {
    const auth = await as("staff@showpro.local");
    expect((await request(app).patch(`/api/activities/${narinActivity}`).set("Authorization", auth).send({ status: "upcoming" })).status).toBe(200);
    expect((await prisma.activity.findUniqueOrThrow({ where: { id: narinActivity } })).status).toBe("upcoming");
    expect((await request(app).delete(`/api/activities/${narinActivity}`).set("Authorization", auth)).status).toBe(200);
  });
});
