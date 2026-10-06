import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const get = async (path: string, email: string) =>
  request(app).get(path).set("Authorization", `Bearer ${await loginAs(email)}`);

describe("grade history / transcript / stats", () => {
  const paths = ["/api/grades/history/65010002", "/api/student/transcript?studentId=65010002", "/api/students/stats?studentId=65010002", "/api/documents/transcript?studentId=65010002"];

  it.each(paths)("company is refused %s", async (p) => {
    expect((await get(p, "talent@northernsoft.local")).status).toBe(403);
  });

  it.each(paths)("a lecturer who neither advises nor teaches bob is refused %s", async (p) => {
    expect((await get(p, "mali@showpro.local")).status).toBe(403);
  });

  it.each(paths)("bob's advisor (who also teaches him) is allowed %s", async (p) => {
    expect((await get(p, "narin@showpro.local")).status).toBe(200);
  });

  it("another student is refused", async () => {
    expect((await get("/api/grades/history/65010002", "alice@student.showpro.local")).status).toBe(403);
  });
});

describe("GET /api/enrollments", () => {
  it("company gets 403", async () => {
    expect((await get("/api/enrollments", "talent@northernsoft.local")).status).toBe(403);
  });
  it("staff still gets everything", async () => {
    const res = await get("/api/enrollments", "staff@showpro.local");
    expect(res.status).toBe(200);
    expect(res.body.enrollments.length).toBeGreaterThanOrEqual(4);
  });
});

describe("student profile seen by a company", () => {
  it("never includes exact GPA, consent or internship details", async () => {
    const res = await get("/api/students/profile?studentId=65010001", "talent@northernsoft.local");
    if (res.status === 200) {
      expect(res.body.profile.gpax).toBeUndefined();
      expect(res.body.profile.gpa).toBeUndefined();
      expect(res.body.profile.consent).toBeUndefined();
      expect(res.body.profile.internship).toBeUndefined();
      expect(res.body.profile.gpaBand).toBeTruthy();
    } else {
      expect(res.status).toBe(403);
    }
  });

  it("/students/profile/:id now recognises the logged-in owner", async () => {
    const res = await get("/api/students/profile/65010001", "alice@student.showpro.local");
    expect(res.status).toBe(200);
    expect(res.body.profile.gpax).toBeDefined();
  });
});
