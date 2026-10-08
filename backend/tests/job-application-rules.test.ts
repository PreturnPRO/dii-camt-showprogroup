import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;

const newJob = async (overrides: Record<string, unknown> = {}) => {
  const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
  return prisma.jobPosting.create({
    data: {
      companyId: company.id, title: `Job ${Date.now()}-${Math.random()}`, type: "internship", description: "d",
      location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 7 * 86400000), status: "open", ...overrides,
    },
  });
};
const apply = async (jobId: string, email = "alice@student.showpro.local") =>
  request(app).post(`/api/apply/${jobId}`).set("Authorization", await as(email)).send({});

describe("applying for a job", () => {
  it("works for an open job before its deadline", async () => {
    expect((await apply((await newJob()).id)).status).toBe(201);
  });
  it("refuses closed, draft, inactive and past-deadline jobs", async () => {
    for (const o of [{ status: "closed" }, { status: "draft" }, { isActive: false }, { deadline: new Date(Date.now() - 86400000) }]) {
      expect((await apply((await newJob(o)).id)).status).toBe(409);
    }
  });
  it("refuses when the applicant limit is reached", async () => {
    const job = await newJob({ maxApplicants: 1 });
    expect((await apply(job.id, "alice@student.showpro.local")).status).toBe(201);
    expect((await apply(job.id, "bob@student.showpro.local")).status).toBe(409);
  });
  it("applying twice gives 409, not 500", async () => {
    const job = await newJob();
    await apply(job.id);
    expect((await apply(job.id)).status).toBe(409);
  });
  it("an unknown job gives 404", async () => {
    expect((await apply("no-such-job")).status).toBe(404);
  });
});

describe("deleting a job", () => {
  it("is refused once someone applied; the application survives", async () => {
    const job = await newJob();
    await apply(job.id);
    const res = await request(app).delete(`/api/jobs/${job.id}`).set("Authorization", await as("talent@northernsoft.local"));
    expect(res.status).toBe(409);
    expect(await prisma.application.count({ where: { jobPostingId: job.id } })).toBe(1);
  });
  it("still works when nobody applied", async () => {
    const job = await newJob();
    expect((await request(app).delete(`/api/jobs/${job.id}`).set("Authorization", await as("talent@northernsoft.local"))).status).toBe(200);
  });
});

describe("company skill requirements are not job postings for students", () => {
  it("a student's job board leaves them out", async () => {
    const job = await newJob({ type: "skill_requirement" });
    const res = await request(app).get("/api/jobs").set("Authorization", await as("alice@student.showpro.local"));
    expect(res.status).toBe(200);
    expect(res.body.jobs.map((j: { id: string }) => j.id)).not.toContain(job.id);
  });
  it("applying to one is refused", async () => {
    const job = await newJob({ type: "skill_requirement" });
    expect((await apply(job.id)).status).toBe(400);
  });
  it("the company still sees its own", async () => {
    const job = await newJob({ type: "skill_requirement" });
    const res = await request(app).get("/api/jobs").set("Authorization", await as("talent@northernsoft.local"));
    expect(res.body.jobs.map((j: { id: string }) => j.id)).toContain(job.id);
  });
});
