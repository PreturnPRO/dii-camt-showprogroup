import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf, freshIntern } from "./helpers/internship";

// Por 8/10/69: a company never sees an applicant's email (they talk through in-app messages),
// and sees the CV on the student's profile only when the student shares data with that company
const applyWithCv = async (consent: { allowDataSharing?: boolean; sharedWithCompanies?: string[] } | null) => {
  const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
  const job = await prisma.jobPosting.create({ data: { companyId: company.id, title: `CV ${Date.now()}`, type: "internship", description: "d", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 86400000), status: "open" } });
  const student = await freshIntern();
  await prisma.studentProfile.update({ where: { id: student.profile.id }, data: { cvUrl: "https://cv.example.com/me.pdf" } });
  if (consent) {
    await prisma.dataConsent.create({ data: { studentId: student.profile.id, allowDataSharing: consent.allowDataSharing ?? false, allowPortfolioSharing: false, sharedWithCompanies: consent.sharedWithCompanies ?? [] } });
  }
  const applied = await request(app).post(`/api/apply/${job.id}`).set("Authorization", student.auth).send({});
  expect(applied.status).toBe(201);
  const auth = await authOf("talent@northernsoft.local");
  const list = await request(app).get(`/api/applications?jobId=${job.id}`).set("Authorization", auth);
  expect(list.status).toBe(200);
  const updated = await request(app).patch(`/api/applications/${applied.body.application.id}`).set("Authorization", auth).send({ status: "reviewing" });
  expect(updated.status).toBe(200);
  return { company, listed: list.body.applications[0], updated: updated.body.application };
};

describe("an applicant as the company sees them", () => {
  it("never carries the student's email", async () => {
    const { listed, updated } = await applyWithCv({ allowDataSharing: true });
    for (const application of [listed, updated]) {
      expect(application.student.user.email).toBeUndefined();
      expect(application.student.user.name).toBeTruthy();
    }
  });

  it("carries the profile CV when the student shares data generally", async () => {
    const { listed, updated } = await applyWithCv({ allowDataSharing: true });
    expect(listed.student.cvUrl).toBe("https://cv.example.com/me.pdf");
    expect(updated.student.cvUrl).toBe("https://cv.example.com/me.pdf");
  });

  it("carries the profile CV when the student shares with this company only", async () => {
    const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
    const { listed } = await applyWithCv({ sharedWithCompanies: [company.id] });
    expect(listed.student.cvUrl).toBe("https://cv.example.com/me.pdf");
  });

  it("hides the profile CV when the student has not shared it", async () => {
    for (const consent of [null, { allowDataSharing: false }, { sharedWithCompanies: ["another-company"] }]) {
      const { listed, updated } = await applyWithCv(consent);
      expect(listed.student.cvUrl).toBeNull();
      expect(updated.student.cvUrl).toBeNull();
    }
  });
});

describe("applicants reached through the job endpoints", () => {
  it("GET /jobs and PATCH /jobs/:id give a company the same view as /applications: no email, no exact GPA, no unshared CV", async () => {
    const { listed } = await applyWithCv(null);
    const auth = await authOf("talent@northernsoft.local");
    const jobs = await request(app).get("/api/jobs").set("Authorization", auth);
    expect(jobs.status).toBe(200);
    const job = jobs.body.jobs.find((j: { id: string }) => j.id === listed.jobPostingId);
    const patched = await request(app).patch(`/api/jobs/${listed.jobPostingId}`).set("Authorization", auth).send({ location: "Chiang Mai" });
    expect(patched.status).toBe(200);
    for (const applications of [job.applications, patched.body.job.applications]) {
      expect(applications.length).toBe(1);
      const student = applications[0].student;
      expect(student.user.email).toBeUndefined();
      expect(student.gpa).toBeUndefined();
      expect(student.gpax).toBeUndefined();
      expect(student.cvUrl).toBeNull();
      expect(student.consent).toBeUndefined();
      expect(typeof student.gpaBand).toBe("string");
    }
  });
});

describe("messages show who, not how to reach them", () => {
  it("never carry the other person's email or phone", async () => {
    const { listed } = await applyWithCv(null);
    const auth = await authOf("talent@northernsoft.local");
    const sent = await request(app).post("/api/messages").set("Authorization", auth).send({ toId: listed.student.user.id, subject: "Interview", body: "Hello" });
    expect(sent.status).toBe(201);
    const inbox = await request(app).get("/api/messages").set("Authorization", auth);
    for (const message of [sent.body.message, inbox.body.messages[0]]) {
      for (const person of [message.from, message.to]) {
        expect(person.email).toBeUndefined();
        expect(person.phone).toBeUndefined();
        expect(person.name).toBeTruthy();
      }
    }
  });
});

describe("a company's own interns", () => {
  it("come with contact details but only a GPA band (Por 8/10/69)", async () => {
    const intern = await freshIntern({ withRecord: true });
    await prisma.studentProfile.update({ where: { id: intern.profile.id }, data: { gpax: 3.67, gpa: 3.5, cvUrl: "https://cv.example.com/intern.pdf" } });
    const res = await request(app).get("/api/internships").set("Authorization", await authOf("talent@northernsoft.local"));
    expect(res.status).toBe(200);
    const record = res.body.internships.find((r: { studentId: string }) => r.studentId === intern.profile.id);
    expect(record.student.user.email).toContain("@");
    expect(record.student.gpax).toBeUndefined();
    expect(record.student.gpa).toBeUndefined();
    expect(record.student.gpaBand).toBe("3.50+");
    // contact details and the basics only: no academic standing, credits, XP or unshared CV
    for (const hidden of ["academicStatus", "earnedCredits", "xp", "coins", "advisorId"]) expect(record.student[hidden]).toBeUndefined();
    expect(record.student.cvUrl ?? null).toBeNull();
  });

  it("staff still see the exact GPAX", async () => {
    const intern = await freshIntern({ withRecord: true });
    await prisma.studentProfile.update({ where: { id: intern.profile.id }, data: { gpax: 3.67 } });
    const res = await request(app).get("/api/internships").set("Authorization", await authOf("staff@showpro.local"));
    expect(res.body.internships.find((r: { studentId: string }) => r.studentId === intern.profile.id).student.gpax).toBe(3.67);
  });
});
