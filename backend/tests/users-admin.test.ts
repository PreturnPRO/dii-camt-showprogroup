import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs, uniqueEmail } from "./helpers/auth";

let staff: string;
let admin: string;

beforeAll(async () => {
  staff = await loginAs("staff@showpro.local");
  admin = await loginAs("admin@showpro.local");
});

const newUser = (role: string, extra: Record<string, unknown> = {}) => ({
  email: uniqueEmail(role.toLowerCase()),
  name: "Created",
  nameThai: "สร้างใหม่",
  role,
  profile: { staffId: `ST${Date.now()}`, lecturerId: `LE${Date.now()}`, companyId: `CO${Date.now()}`, department: "DII", position: "x", companyName: "Co" },
  ...extra,
});

const idOf = async (email: string) => (await prisma.user.findUniqueOrThrow({ where: { email } })).id;

describe("POST /api/users", () => {
  it.each(["ADMIN", "STAFF"])("STAFF cannot create %s", async (role) => {
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${staff}`).send(newUser(role));
    expect(res.status).toBe(403);
  });

  it("STAFF can create a LECTURER with a random temporary password that must be changed", async () => {
    const body = newUser("LECTURER");
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${staff}`).send(body);
    expect(res.status).toBe(201);
    expect(res.body.temporaryPassword).toMatch(/^[A-Za-z0-9_-]{12}$/);
    expect(res.body.temporaryPassword).not.toBe("Password123!");
    const created = await prisma.user.findUniqueOrThrow({ where: { email: body.email } });
    expect(created.mustChangePassword).toBe(true);
  });

  it("ADMIN can create a STAFF account", async () => {
    const res = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("STAFF"));
    expect(res.status).toBe(201);
  });
});

describe("PATCH /api/users/:id", () => {
  it("STAFF cannot change anyone's role, including their own", async () => {
    const selfId = await idOf("staff@showpro.local");
    const res = await request(app).patch(`/api/users/${selfId}`).set("Authorization", `Bearer ${staff}`).send({ role: "ADMIN" });
    expect(res.status).toBe(403);
    expect((await prisma.user.findUniqueOrThrow({ where: { id: selfId } })).role).toBe("STAFF");
  });

  it("STAFF cannot reset an ADMIN password or deactivate an ADMIN", async () => {
    const adminId = await idOf("admin@showpro.local");
    const pw = await request(app).patch(`/api/users/${adminId}`).set("Authorization", `Bearer ${staff}`).send({ password: "Hijacked123!" });
    expect(pw.status).toBe(403);
    const off = await request(app).patch(`/api/users/${adminId}`).set("Authorization", `Bearer ${staff}`).send({ isActive: false });
    expect(off.status).toBe(403);
    expect(await loginAs("admin@showpro.local")).toBeTruthy();
  });

  it("STAFF can reset a student's password, and the student must change it", async () => {
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("STUDENT", { profile: { studentId: `SR${Date.now()}` } }));
    const id = created.body.user.id as string;
    const res = await request(app).patch(`/api/users/${id}`).set("Authorization", `Bearer ${staff}`).send({ password: "Reset12345!" });
    expect(res.status).toBe(200);
    expect((await prisma.user.findUniqueOrThrow({ where: { id } })).mustChangePassword).toBe(true);
  });

  it("ADMIN cannot demote themselves", async () => {
    const adminId = await idOf("admin@showpro.local");
    const res = await request(app).patch(`/api/users/${adminId}`).set("Authorization", `Bearer ${admin}`).send({ role: "STAFF" });
    expect(res.status).toBe(400);
  });

  it("ADMIN can change another user's role", async () => {
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("LECTURER"));
    const res = await request(app).patch(`/api/users/${created.body.user.id}`).set("Authorization", `Bearer ${admin}`).send({ role: "STAFF" });
    expect(res.status).toBe(200);
  });
});

describe("DELETE /api/users/:id", () => {
  it("STAFF cannot deactivate another STAFF", async () => {
    const other = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(newUser("STAFF"));
    const res = await request(app).delete(`/api/users/${other.body.user.id}`).set("Authorization", `Bearer ${staff}`);
    expect(res.status).toBe(403);
  });
});

describe("imports", () => {
  it("company import gives each row a different random password and forces a change", async () => {
    const stamp = Date.now();
    const rows = [1, 2].map((n) => ({
      rowNumber: n + 1,
      companyId: `IMP${stamp}${n}`,
      companyName: `Imported ${n}`,
      phone: `08${String(stamp).slice(-7)}${n}`,
      email: uniqueEmail(`imp${n}`),
      industry: "Software",
      size: "small",
    }));
    const res = await request(app).post("/api/users/import/companies").set("Authorization", `Bearer ${staff}`).send({ rows });
    expect(res.status).toBe(201);
    const passwords = res.body.results.map((r: { temporaryPassword?: string }) => r.temporaryPassword);
    expect(new Set(passwords).size).toBe(2);
    for (const p of passwords) expect(p).not.toBe("Password123!");
    expect(res.body.results.map((r: { email?: string }) => r.email).sort()).toEqual(rows.map((r) => r.email).sort());
    for (const row of rows) {
      expect((await prisma.user.findUniqueOrThrow({ where: { email: row.email } })).mustChangePassword).toBe(true);
    }
  });
});

describe("PATCH /api/users/profile", () => {
  it("cannot change admin super-admin or staff permissions through the profile", async () => {
    // seed sets the admin's isSuperAdmin = true; sending false must be ignored
    await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${admin}`).send({ roleData: { isSuperAdmin: false } });
    const profile = await prisma.adminProfile.findFirstOrThrow({ where: { user: { email: "admin@showpro.local" } } });
    expect(profile.isSuperAdmin).toBe(true);
    const before = await prisma.staffProfile.findFirstOrThrow({ where: { user: { email: "staff@showpro.local" } } });
    await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${staff}`).send({ roleData: { permissions: ["everything"] } });
    const after = await prisma.staffProfile.findFirstOrThrow({ where: { user: { email: "staff@showpro.local" } } });
    expect(after.permissions).toEqual(before.permissions);
  });

  it("changing the email needs the current password", async () => {
    const body = newUser("LECTURER");
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(body);
    const token = await loginAs(body.email, created.body.temporaryPassword);
    const res = await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${token}`).send({ email: uniqueEmail("moved") });
    expect(res.status).toBe(400);
  });

  it("changing the password clears mustChangePassword and needs the current password", async () => {
    const body = newUser("LECTURER");
    const created = await request(app).post("/api/users").set("Authorization", `Bearer ${admin}`).send(body);
    const temp = created.body.temporaryPassword as string;
    const token = await loginAs(body.email, temp);
    const noCurrent = await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${token}`).send({ newPassword: "Mine12345!" });
    expect(noCurrent.status).toBe(400);
    const ok = await request(app).patch("/api/users/profile").set("Authorization", `Bearer ${token}`).send({ currentPassword: temp, newPassword: "Mine12345!" });
    expect(ok.status).toBe(200);
    expect(ok.body.user.mustChangePassword).toBe(false);
  });
});
