import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

// company policy (S-b1): a GPA band only, never the exact GPA/GPAX
describe("applicants seen by a company", () => {
  it("carry a GPA band, never exact gpa/gpax, on the list and after a status change", async () => {
    const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const job = await prisma.jobPosting.create({ data: { companyId: company.id, title: `GPA ${Date.now()}`, type: "internship", description: "d", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 86400000), status: "open" } });
    const applied = await request(app).post(`/api/apply/${job.id}`).set("Authorization", `Bearer ${await loginAs("alice@student.showpro.local")}`).send({});
    expect(applied.status).toBe(201);
    const auth = `Bearer ${await loginAs("talent@northernsoft.local")}`;

    const list = await request(app).get(`/api/applications?jobId=${job.id}`).set("Authorization", auth);
    expect(list.status).toBe(200);
    const student = list.body.applications[0].student;
    expect(student.gpa).toBeUndefined();
    expect(student.gpax).toBeUndefined();
    expect(typeof student.gpaBand).toBe("string");

    const updated = await request(app).patch(`/api/applications/${applied.body.application.id}`).set("Authorization", auth).send({ status: "reviewing" });
    expect(updated.status).toBe(200);
    expect(updated.body.application.student.gpa).toBeUndefined();
    expect(updated.body.application.student.gpax).toBeUndefined();
  });
});
