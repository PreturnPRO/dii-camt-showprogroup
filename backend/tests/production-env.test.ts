import { describe, expect, it } from "vitest";
import { assertProductionEnv } from "../src/config/env";

describe("production settings", () => {
  it("refuses to start production without FRONTEND_URL, since it is printed into document QR codes", () => {
    expect(() => assertProductionEnv({ NODE_ENV: "production", EXPOSE_RESET_TOKEN: false })).toThrow(/FRONTEND_URL/);
    expect(() => assertProductionEnv({ NODE_ENV: "production", FRONTEND_URL: "https://showpro.example", EXPOSE_RESET_TOKEN: false })).not.toThrow();
    expect(() => assertProductionEnv({ NODE_ENV: "development", EXPOSE_RESET_TOKEN: false })).not.toThrow();
  });

  it("still refuses an exposed reset token in production", () => {
    expect(() => assertProductionEnv({ NODE_ENV: "production", FRONTEND_URL: "https://showpro.example", EXPOSE_RESET_TOKEN: true })).toThrow(/EXPOSE_RESET_TOKEN/);
  });
});
