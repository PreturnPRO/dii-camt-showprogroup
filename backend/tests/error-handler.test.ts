import express from "express";
import request from "supertest";
import multer from "multer";
import { Prisma } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { errorHandler } from "../src/middleware/error-handler";
import { AppError } from "../src/utils/errors";

const appThrowing = (err: unknown) => {
  const app = express();
  app.use(express.json());
  app.post("/x", () => {
    throw err;
  });
  app.use(errorHandler);
  return app;
};
const known = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("Invalid `prisma.user.create()` invocation: secret internals", {
    code,
    clientVersion: "x",
  });

describe("errorHandler", () => {
  it("keeps AppError messages", async () => {
    const res = await request(appThrowing(new AppError(403, "nope"))).post("/x");
    expect(res.status).toBe(403);
    expect(res.body.message).toBe("nope");
  });

  it("hides a raw Error behind a generic 500 and logs it", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(appThrowing(new Error("connect ECONNREFUSED 10.0.0.5:5432"))).post("/x");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("ECONNREFUSED");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("maps Prisma P2002 to 409 and P2025 to 404 without internals", async () => {
    const a = await request(appThrowing(known("P2002"))).post("/x");
    expect(a.status).toBe(409);
    expect(JSON.stringify(a.body)).not.toContain("prisma");
    const b = await request(appThrowing(known("P2025"))).post("/x");
    expect(b.status).toBe(404);
  });

  it("other Prisma errors are a generic 500", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const res = await request(appThrowing(known("P2003"))).post("/x");
    expect(res.status).toBe(500);
    expect(JSON.stringify(res.body)).not.toContain("invocation");
    spy.mockRestore();
  });

  it("malformed JSON is a 400, not a 500", async () => {
    const res = await request(appThrowing(new Error("unused")))
      .post("/x")
      .set("Content-Type", "application/json")
      .send("{bad");
    expect(res.status).toBe(400);
  });

  it("multer file-size errors are a 413", async () => {
    const res = await request(appThrowing(new multer.MulterError("LIMIT_FILE_SIZE"))).post("/x");
    expect(res.status).toBe(413);
  });
});
