import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const text = (b: unknown) => JSON.stringify(b);

describe("activities exposure", () => {
  it("upcoming activities need a login", async () => {
    expect((await request(app).get("/api/activities/upcoming")).status).toBe(401);
  });

  it("a student sees other participants' names but no email, phone or academic data", async () => {
    const res = await request(app).get("/api/activities").set("Authorization", `Bearer ${await loginAs("alice@student.showpro.local")}`);
    expect(res.status).toBe(200);
    expect(text(res.body)).not.toMatch(/"email"|"phone"|"gpax"|"gpa"/);
    // leaderboard still needs other participants' names
    const names = res.body.activities.flatMap((x: { enrollments: Array<{ student: { user: { name?: string } } }> }) =>
      x.enrollments.map((e) => e.student.user.name),
    );
    expect(names.filter(Boolean).length).toBeGreaterThan(0);
  });

  it("a company sees no participants", async () => {
    const res = await request(app).get("/api/activities").set("Authorization", `Bearer ${await loginAs("talent@northernsoft.local")}`);
    for (const a of res.body.activities) expect(a.enrollments).toEqual([]);
  });

  it("staff still see the full participant list", async () => {
    const res = await request(app).get("/api/activities").set("Authorization", `Bearer ${await loginAs("staff@showpro.local")}`);
    expect(text(res.body)).toMatch(/@student\.showpro\.local/);
  });
});
