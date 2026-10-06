import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const get = async (path: string, email: string) =>
  request(app).get(path).set("Authorization", `Bearer ${await loginAs(email)}`);

// seed: mali teaches DII420 (alice, chompoo) and advises chompoo; she has no link to bob (65010002)
describe("student profile for a lecturer", () => {
  it("a lecturer with no link to the student is refused the full profile", async () => {
    expect((await get("/api/students/profile?studentId=65010002", "mali@showpro.local")).status).toBe(403);
  });
  it("a lecturer with no link gets at most the public subset from /students/profile/:id", async () => {
    const res = await get("/api/students/profile/65010002", "mali@showpro.local");
    if (res.status === 200) {
      expect(res.body.profile.gpax).toBeUndefined();
      expect(res.body.profile.internship).toBeUndefined();
    } else {
      expect(res.status).toBe(403);
    }
  });
  it("the advisor still gets the full profile", async () => {
    const res = await get("/api/students/profile?studentId=65010002", "narin@showpro.local");
    expect(res.status).toBe(200);
    expect(res.body.profile.gpax).toBeDefined();
  });
});

describe("GET /api/internships for a lecturer", () => {
  it("only lists records of the lecturer's advisees", async () => {
    const mali = await get("/api/internships", "mali@showpro.local");
    expect(mali.status).toBe(200);
    expect(JSON.stringify(mali.body)).not.toContain("65010001");
    const narin = await get("/api/internships", "narin@showpro.local");
    expect(JSON.stringify(narin.body)).toContain("65010001");
  });
});

describe("GET /api/student-profiles for a lecturer", () => {
  it("only lists students the lecturer advises or teaches", async () => {
    const res = await get("/api/student-profiles", "mali@showpro.local");
    expect(res.status).toBe(200);
    const ids = res.body.profiles.map((p: { studentId: string }) => p.studentId);
    expect(ids).not.toContain("65010002");
    expect(ids).toEqual(expect.arrayContaining(["65010001", "65010003"]));
  });
});

describe("talent search for a company", () => {
  it("returns a GPA band, never the exact GPAX or the student email", async () => {
    const res = await get("/api/talent/search", "talent@northernsoft.local");
    expect(res.status).toBe(200);
    expect(res.body.talents.length).toBeGreaterThan(0);
    for (const t of res.body.talents) {
      expect(t.gpax).toBeUndefined();
      expect(t.email).toBeUndefined();
      expect(typeof t.gpaBand).toBe("string");
    }
  });
});
