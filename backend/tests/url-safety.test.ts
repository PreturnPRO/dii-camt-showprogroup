import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { assertHttpUrls, httpUrl, internalPath, optionalHttpUrl } from "../src/schemas/url";
import { loginAs } from "./helpers/auth";

const bad = ["javascript:alert(1)", "  JavaScript:alert(1)", "data:text/html,<script>alert(1)</script>", "vbscript:msgbox(1)", "ftp://x.y/z"];

describe("httpUrl", () => {
  it("accepts http and https", () => {
    expect(httpUrl.safeParse("https://github.com/alice").success).toBe(true);
    expect(httpUrl.safeParse("http://example.com").success).toBe(true);
  });
  it.each(bad)("rejects %s", (value) => {
    expect(httpUrl.safeParse(value).success).toBe(false);
  });
  it("optionalHttpUrl still accepts an empty string to clear a link", () => {
    expect(optionalHttpUrl.safeParse("").success).toBe(true);
    expect(optionalHttpUrl.safeParse(undefined).success).toBe(true);
  });
});

describe("internalPath", () => {
  it("accepts app paths", () => {
    expect(internalPath.safeParse("/appointments").success).toBe(true);
    expect(internalPath.safeParse("/requests?id=1").success).toBe(true);
  });
  it.each(["//evil.com", "/\\evil.com", "https://evil.com", "javascript:alert(1)", "appointments"])("rejects %s", (value) => {
    expect(internalPath.safeParse(value).success).toBe(false);
  });
});

describe("assertHttpUrls", () => {
  it("lets empty values through and rejects unsafe ones with 400", () => {
    expect(() => assertHttpUrls({ website: "", locationMapUrl: undefined }, ["website", "locationMapUrl"])).not.toThrow();
    expect(() => assertHttpUrls({ website: "javascript:alert(1)" }, ["website"])).toThrow(expect.objectContaining({ statusCode: 400 }));
  });
});

describe("endpoints refuse javascript: links", () => {
  const as = async (email: string) => `Bearer ${await loginAs(email)}`;

  it("student portfolio and CV links", async () => {
    const auth = await as("alice@student.showpro.local");
    for (const body of [{ cvUrl: "javascript:alert(1)" }, { portfolio: { githubUrl: "javascript:alert(1)" } }, { portfolio: { projects: [{ title: "x", description: "x", role: "x", startDate: "2026-01-01", url: "javascript:alert(1)" }] } }]) {
      expect((await request(app).patch("/api/students/profile").set("Authorization", auth).send(body)).status).toBe(400);
    }
    expect((await request(app).patch("/api/students/profile").set("Authorization", auth).send({ portfolio: { githubUrl: "https://github.com/alice" } })).status).toBe(200);
  });

  it("job application resume, internship document, message attachment", async () => {
    const auth = await as("alice@student.showpro.local");
    expect((await request(app).post("/api/apply/any-job").set("Authorization", auth).send({ resumeUrl: "javascript:alert(1)" })).status).toBe(400);
    expect((await request(app).post("/api/internship/documents").set("Authorization", auth).send({ type: "report", title: "x", url: "javascript:alert(1)" })).status).toBe(400);
    expect((await request(app).post("/api/messages").set("Authorization", auth).send({ toId: "x", subject: "x", body: "x", attachments: [{ name: "a", url: "javascript:alert(1)", size: "1" }] })).status).toBe(400);
  });

  it("staff notification broadcast only takes in-app paths", async () => {
    const auth = await as("staff@showpro.local");
    const send = (actionUrl: string) =>
      request(app).post("/api/notifications/broadcast").set("Authorization", auth).send({ title: "t", message: "m", targetRoles: ["STUDENT"], actionUrl });
    expect((await send("javascript:alert(1)")).status).toBe(400);
    expect((await send("https://evil.example")).status).toBe(400);
    expect((await send("/activities")).status).toBeLessThan(300);
  });

  it("staff creating a company cannot store a javascript: website", async () => {
    const auth = await as("staff@showpro.local");
    const res = await request(app).post("/api/users").set("Authorization", auth).send({
      email: `co-${Date.now()}@example.com`, name: "Co", role: "COMPANY",
      profile: { companyName: "Co", industry: "IT", size: "small", website: "javascript:alert(1)" },
    });
    expect(res.status).toBe(400);
  });
});
