import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

describe("workload rows", () => {
  it("carry the lecturer's real number of advisees", async () => {
    const res = await request(app).get("/api/workload").set("Authorization", `Bearer ${await loginAs("staff@showpro.local")}`);
    expect(res.status).toBe(200);
    expect(res.body.workload.length).toBeGreaterThan(0);
    for (const row of res.body.workload) {
      const advisees = await prisma.studentProfile.count({ where: { advisorId: row.lecturerId } });
      expect(row.lecturer._count.advisees).toBe(advisees);
    }
  });
});
