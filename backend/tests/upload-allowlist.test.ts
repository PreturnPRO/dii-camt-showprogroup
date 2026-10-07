import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { isAllowedUpload } from "../src/services/file-storage.service";
import { loginAs } from "./helpers/auth";

const PNG = Buffer.from("89504e470d0a1a0a0000000d49484452", "hex");
const upload = (token: string, name: string, type: string, body = PNG) =>
  request(app)
    .post("/api/files/upload")
    .set("Authorization", `Bearer ${token}`)
    .attach("file", body, { filename: name, contentType: type });

describe("upload allowlist", () => {
  it("accepts the types the UI uploads", async () => {
    const token = await loginAs("alice@student.showpro.local");
    const ok: Array<[string, string]> = [
      ["a.pdf", "application/pdf"],
      ["a.png", "image/png"],
      ["a.jpg", "image/jpeg"],
      ["a.webp", "image/webp"],
      ["a.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
      ["a.zip", "application/zip"],
    ];
    for (const [name, type] of ok) {
      expect((await upload(token, name, type)).status, name).toBe(201);
    }
  });

  it.each([
    ["evil.html", "text/html"],
    ["evil.svg", "image/svg+xml"],
    ["evil.exe", "application/x-msdownload"],
    ["evil.js", "text/javascript"],
    ["evil.png", "text/html"],
    ["evil.html", "image/png"],
    ["noext", "application/pdf"],
  ])("rejects %s (%s) with 400", async (name, type) => {
    const token = await loginAs("alice@student.showpro.local");
    const res = await upload(token, name, type);
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not allowed/i);
  });

  it("extension check ignores case", () => {
    expect(isAllowedUpload("CV.PDF", "application/pdf")).toBe(true);
  });
});
