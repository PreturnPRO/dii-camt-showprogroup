import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { authOf, freshIntern } from "./helpers/internship";

// owner decisions 9/10/69: a company is tied to an internship when it accepts the student's internship
// application, or when staff pick it; the diary needs that company first; a certificate counts only
// approved hours, dated from the internship's start month to today, at most 8 a day

const northern = () => prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
const creative = () => prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "careers@creativelabs.local" } } });

async function applyTo(studentId: string, companyId: string, type: string) {
  const job = await prisma.jobPosting.create({
    data: { companyId, title: `${type} ${Date.now()}`, type, description: "x", location: "CNX", workType: "onsite", deadline: new Date(Date.now() + 30 * 86400000) },
  });
  return prisma.application.create({ data: { jobPostingId: job.id, studentId } });
}

const accept = async (applicationId: string, companyEmail: string) =>
  request(app).patch(`/api/applications/${applicationId}`).set("Authorization", await authOf(companyEmail)).send({ status: "accepted" });

const bindCompany = async (studentId: string, companyId: string, as = "staff@showpro.local") =>
  request(app).put(`/api/internship/students/${studentId}/company`).set("Authorization", await authOf(as)).send({ companyId, position: "Intern" });

const thaiToday = () => new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const daysAgo = (n: number) => new Date(Date.now() + 7 * 3600 * 1000 - n * 86400000).toISOString().slice(0, 10);

const writeLog = (auth: string, body: Record<string, unknown>) =>
  request(app).post("/api/internship/logs").set("Authorization", auth).send({ activities: "Built a form", ...body });

describe("tying a company to an internship", () => {
  it("accepting an internship application ties the company, and the company then sees its intern", async () => {
    const intern = await freshIntern();
    const company = await northern();
    const application = await applyTo(intern.profile.id, company.id, "internship");

    expect((await accept(application.id, "talent@northernsoft.local")).status).toBe(200);

    const record = await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } });
    expect(record.companyId).toBe(company.id);
    expect(record.companyName).toBe(company.companyName);
    const seen = await request(app).get("/api/internships").set("Authorization", await authOf("talent@northernsoft.local"));
    expect(seen.body.internships.some((r: { studentId: string }) => r.studentId === intern.profile.id)).toBe(true);
  });

  it("accepting a full-time job does not make an internship", async () => {
    const intern = await freshIntern();
    const application = await applyTo(intern.profile.id, (await northern()).id, "full-time");
    await accept(application.id, "talent@northernsoft.local");
    expect(await prisma.internshipRecord.findUnique({ where: { studentId: intern.profile.id } })).toBeNull();
  });

  it("a second company accepting later does not take over an internship already tied to another", async () => {
    const intern = await freshIntern();
    const first = await northern();
    await accept((await applyTo(intern.profile.id, first.id, "internship")).id, "talent@northernsoft.local");
    await accept((await applyTo(intern.profile.id, (await creative()).id, "internship")).id, "careers@creativelabs.local");
    expect((await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } })).companyId).toBe(first.id);
  });

  it("two companies accepting at the same moment: one wins, neither request fails", async () => {
    for (let i = 0; i < 3; i++) {
      const intern = await freshIntern();
      const a = await applyTo(intern.profile.id, (await northern()).id, "internship");
      const b = await applyTo(intern.profile.id, (await creative()).id, "internship");
      const [ra, rb] = await Promise.all([accept(a.id, "talent@northernsoft.local"), accept(b.id, "careers@creativelabs.local")]);
      expect([ra.status, rb.status]).toEqual([200, 200]);
      expect((await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } })).companyId).not.toBeNull();
    }
  });

  it("changing the company without a position clears the old company's position", async () => {
    const intern = await freshIntern();
    await bindCompany(intern.profile.id, (await northern()).id);
    await request(app).put(`/api/internship/students/${intern.profile.id}/company`).set("Authorization", await authOf("staff@showpro.local")).send({ companyId: (await creative()).id });
    expect((await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } })).position).toBeNull();
  });

  it("staff can tie or change the company; a student or lecturer cannot", async () => {
    const intern = await freshIntern();
    const company = await creative();
    expect((await bindCompany(intern.profile.id, company.id, "narin@showpro.local")).status).toBe(403);
    expect((await request(app).put(`/api/internship/students/${intern.profile.id}/company`).set("Authorization", intern.auth).send({ companyId: company.id })).status).toBe(403);
    expect((await bindCompany(intern.profile.id, company.id)).status).toBe(200);
    const record = await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } });
    expect(record.companyId).toBe(company.id);
    expect(record.position).toBe("Intern");
  });

  it("an unknown company is a 404", async () => {
    const intern = await freshIntern();
    expect((await bindCompany(intern.profile.id, "no-such-company")).status).toBe(404);
  });
});

describe("the internship diary", () => {
  it("cannot start before a company is tied, and makes no record", async () => {
    const intern = await freshIntern();
    const res = await writeLog(intern.auth, { date: thaiToday(), hours: 6 });
    expect(res.status).toBe(409);
    expect(await prisma.internshipRecord.findUnique({ where: { studentId: intern.profile.id } })).toBeNull();
  });

  it("takes an entry once the company is tied, and the internship starts", async () => {
    const intern = await freshIntern();
    await bindCompany(intern.profile.id, (await northern()).id);
    expect((await writeLog(intern.auth, { date: thaiToday(), hours: 6 })).status).toBe(201);
    expect((await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } })).status).toBe("in_progress");
  });

  it("refuses a day in the future, more than 8 hours, and a day whose entries would pass 8 hours", async () => {
    const intern = await freshIntern();
    await bindCompany(intern.profile.id, (await northern()).id);
    expect((await writeLog(intern.auth, { date: daysAgo(-2), hours: 4 })).status).toBe(400);
    expect((await writeLog(intern.auth, { date: thaiToday(), hours: 9 })).status).toBe(400);
    expect((await writeLog(intern.auth, { date: daysAgo(1), hours: 5 })).status).toBe(201);
    expect((await writeLog(intern.auth, { date: daysAgo(1), hours: 4 })).status).toBe(400);
    expect((await writeLog(intern.auth, { date: daysAgo(1), hours: 3 })).status).toBe(201);
  });

  it("two entries sent together cannot push a day past 8 hours", async () => {
    const intern = await freshIntern();
    await bindCompany(intern.profile.id, (await northern()).id);
    const day = daysAgo(2);
    const results = await Promise.all([writeLog(intern.auth, { date: day, hours: 8 }), writeLog(intern.auth, { date: day, hours: 8 })]);
    expect(results.map((r) => r.status).sort()).toEqual([201, 400]);
  });

  it("refuses a day before the internship's start month", async () => {
    const intern = await freshIntern();
    await bindCompany(intern.profile.id, (await northern()).id);
    await prisma.internshipRecord.update({ where: { studentId: intern.profile.id }, data: { startMonth: thaiToday().slice(0, 7) } });
    expect((await writeLog(intern.auth, { date: "2020-01-15", hours: 4 })).status).toBe(400);
  });
});

describe("completing an internship and its certificate", () => {
  const setStatus = async (recordId: string, status: string) =>
    request(app).patch(`/api/internship/records/${recordId}/status`).set("Authorization", await authOf("staff@showpro.local")).send({ status });

  it("cannot be completed without a company", async () => {
    const intern = await freshIntern();
    const record = await prisma.internshipRecord.create({ data: { studentId: intern.profile.id, status: "in_progress" } });
    expect((await setStatus(record.id, "completed")).status).toBe(409);
  });

  it("a cancelled internship must be reopened before it can be completed", async () => {
    const intern = await freshIntern();
    await bindCompany(intern.profile.id, (await northern()).id);
    const record = await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } });
    expect((await setStatus(record.id, "cancelled")).status).toBe(200);
    expect((await setStatus(record.id, "completed")).status).toBe(409);
    expect((await setStatus(record.id, "in_progress")).status).toBe(200);
    expect((await setStatus(record.id, "completed")).status).toBe(200);
  });

  it("the certificate counts approved hours only", async () => {
    const intern = await freshIntern();
    await bindCompany(intern.profile.id, (await northern()).id);
    const record = await prisma.internshipRecord.findUniqueOrThrow({ where: { studentId: intern.profile.id } });
    await prisma.internshipLog.createMany({
      data: [
        { recordId: record.id, date: new Date(`${daysAgo(3)}T00:00:00Z`), activities: "a", hours: 8, reviewStatus: "approved" },
        { recordId: record.id, date: new Date(`${daysAgo(2)}T00:00:00Z`), activities: "b", hours: 7, reviewStatus: "pending" },
        { recordId: record.id, date: new Date(`${daysAgo(1)}T00:00:00Z`), activities: "c", hours: 6, reviewStatus: "changes_requested" },
      ],
    });
    await setStatus(record.id, "completed");

    const { certificateHours } = await import("../src/services/internship-hours");
    const logs = await prisma.internshipLog.findMany({ where: { recordId: record.id } });
    expect(certificateHours(logs, { startMonth: null, today: new Date() })).toBe(8);
    const pdf = await request(app).get("/api/documents/internship-certificate").set("Authorization", intern.auth);
    expect(pdf.status).toBe(200);
  });
});

describe("what a company sees of an applicant", () => {
  it("never the academic status", async () => {
    const intern = await freshIntern();
    await prisma.studentProfile.update({ where: { id: intern.profile.id }, data: { academicStatus: "probation" } });
    await applyTo(intern.profile.id, (await northern()).id, "internship");
    const res = await request(app).get("/api/applications").set("Authorization", await authOf("talent@northernsoft.local"));
    const mine = res.body.applications.find((a: { studentId: string }) => a.studentId === intern.profile.id);
    expect(mine).toBeTruthy();
    expect(JSON.stringify(mine)).not.toContain("probation");
    expect(mine.student).not.toHaveProperty("academicStatus");
  });
});
