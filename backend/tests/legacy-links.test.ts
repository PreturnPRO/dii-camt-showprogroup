import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const patchSelf = async (email: string, body: Record<string, unknown>) =>
  request(app).patch("/api/users/profile").set("Authorization", `Bearer ${await loginAs(email)}`).send(body);

// links stored before http(s) was enforced (e.g. a bare domain) must not block unrelated saves
describe("legacy non-http links echoed back by Settings/Portfolio", () => {
  it("a student can still save when the stored cvUrl is a bare path", async () => {
    await prisma.studentProfile.updateMany({ where: { studentId: "65010001" }, data: { cvUrl: "drive.google.com/file/x" } });
    const res = await patchSelf("alice@student.showpro.local", { name: "Alice A", roleData: { cvUrl: "drive.google.com/file/x" } });
    expect(res.status).toBe(200);
    expect((await patchSelf("alice@student.showpro.local", { roleData: { cvUrl: "javascript:alert(1)" } })).status).toBe(400);
  });

  it("a company can still save when the stored website is a bare domain", async () => {
    await prisma.companyProfile.updateMany({ where: { user: { email: "talent@northernsoft.local" } }, data: { website: "www.northernsoft.co.th" } });
    const res = await patchSelf("talent@northernsoft.local", { roleData: { website: "www.northernsoft.co.th", companyName: "Northern Soft" } });
    expect(res.status).toBe(200);
  });
});

describe("company import with one bad website row", () => {
  it("fails only that row instead of the whole file", async () => {
    const stamp = Date.now();
    const res = await request(app)
      .post("/api/users/import/companies")
      .set("Authorization", `Bearer ${await loginAs("staff@showpro.local")}`)
      .send({
        rows: [
          { rowNumber: 2, companyId: `IMPA${stamp}`, companyName: "Good Co", phone: `081${String(stamp).slice(-7)}`, industry: "IT", size: "small", website: "https://good.example" },
          { rowNumber: 3, companyId: `IMPB${stamp}`, companyName: "Bad Co", phone: `082${String(stamp).slice(-7)}`, industry: "IT", size: "small", website: "javascript:alert(1)" },
        ],
      });
    expect(res.status).toBeLessThan(300);
    const rows = JSON.stringify(res.body);
    expect(await prisma.companyProfile.count({ where: { companyId: `IMPA${stamp}` } })).toBe(1);
    expect(await prisma.companyProfile.count({ where: { companyId: `IMPB${stamp}` } })).toBe(0);
    expect(rows).toMatch(/website must be an http\(s\) URL/);
  });
});
