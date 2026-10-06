import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { loginAs } from "./helpers/auth";

const getCourse = (token?: string) => {
  const r = request(app).get("/api/courses/DII340");
  return token ? r.set("Authorization", `Bearer ${token}`) : r;
};
const text = (body: unknown) => JSON.stringify(body);

describe("GET /api/courses/:id", () => {
  it("anonymous sees the course but no enrolled students, emails, phones or grades", async () => {
    const res = await getCourse();
    expect(res.status).toBe(200);
    expect(res.body.course.code).toBe("DII340");
    expect(res.body.course.enrollments).toEqual([]);
    expect(res.body.course.enrollmentCount).toBe(2);
    expect(text(res.body)).not.toMatch(/@student\.showpro\.local|"phone"|letterGrade/);
  });

  it("a student sees only their own enrollment", async () => {
    const res = await getCourse(await loginAs("bob@student.showpro.local"));
    expect(res.body.course.enrollments).toHaveLength(1);
    expect(res.body.course.enrollmentCount).toBe(2);
    expect(text(res.body)).not.toContain("alice@student.showpro.local");
  });

  it("company and a lecturer who does not teach the course see no enrollments", async () => {
    for (const email of ["talent@northernsoft.local", "mali@showpro.local"]) {
      const res = await getCourse(await loginAs(email));
      expect(res.body.course.enrollments).toEqual([]);
    }
  });

  it("the owning lecturer and staff still see the full class list", async () => {
    for (const email of ["narin@showpro.local", "staff@showpro.local"]) {
      const res = await getCourse(await loginAs(email));
      expect(res.body.course.enrollments).toHaveLength(2);
    }
  });
});

describe("GET /api/courses", () => {
  it("anonymous list carries no enrollment rows", async () => {
    const res = await request(app).get("/api/courses");
    expect(res.status).toBe(200);
    for (const c of res.body.courses) expect(c.enrollments).toEqual([]);
    expect(text(res.body)).not.toMatch(/letterGrade|"phone"/);
  });
});

describe("GET /api/courses/lecturer/schedule?lecturerId=", () => {
  it("a student gets the timetable without other students' enrollments or lecturer phone", async () => {
    const token = await loginAs("alice@student.showpro.local");
    const res = await request(app).get("/api/courses/lecturer/schedule?lecturerId=LCT-001").set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(text(res.body)).not.toMatch(/"phone"|bob@student/);
    // only alice's own enrollment rows may remain (her own grade is hers to see)
    for (const c of res.body.schedule) {
      expect(c.enrollments.length).toBeLessThanOrEqual(1);
      expect(c.enrollmentCount).toBeGreaterThanOrEqual(c.enrollments.length);
    }
  });
});

describe("lecturer course creation", () => {
  it("a lecturer cannot create a course for another lecturer or activate it", async () => {
    const token = await loginAs("narin@showpro.local");
    const mali = await request(app).get("/api/courses/DII420");
    const res = await request(app)
      .post("/api/courses")
      .set("Authorization", `Bearer ${token}`)
      .send({ code: `T${Date.now()}`.slice(0, 10), name: "T", nameThai: "ที", credits: 3, semester: 1, academicYear: "2569", year: 3, lecturerId: mali.body.course.lecturerId, status: "active" });
    expect(res.status).toBe(201);
    expect(res.body.course.lecturerId).not.toBe(mali.body.course.lecturerId);
    expect(res.body.course.status).toBe("pending");
  });
});
