import { describe, expect, it } from "vitest";
import { certificateHours } from "../src/services/internship-hours";

const log = (date: string, hours: number, reviewStatus = "approved") => ({ date: new Date(`${date}T00:00:00Z`), hours, reviewStatus });
const today = new Date("2026-10-09T05:00:00Z"); // 12:00 in Thailand

describe("certificateHours", () => {
  it("counts approved entries only", () => {
    expect(certificateHours([log("2026-10-01", 8), log("2026-10-02", 6, "pending"), log("2026-10-03", 5, "changes_requested")], { startMonth: null, today })).toBe(8);
  });
  it("caps a day at 8 hours, also over several entries", () => {
    expect(certificateHours([log("2026-10-01", 6), log("2026-10-01", 6)], { startMonth: null, today })).toBe(8);
  });
  it("leaves out days after today (Thai) and before the start month", () => {
    expect(certificateHours([log("2026-10-10", 8), log("2026-08-31", 8), log("2026-09-01", 4)], { startMonth: "2026-09", today })).toBe(4);
  });
  it("reads a Buddhist-era start month too (2569-09 = 2026-09)", () => {
    expect(certificateHours([log("2026-08-31", 8), log("2026-09-01", 4)], { startMonth: "2569-09", today })).toBe(4);
  });
});
