import { describe, expect, it } from "vitest";
import { attendanceRate, thaiDateTime, thaiDay } from "../src/services/attendance";

describe("thaiDay", () => {
  it("uses the Thai calendar day", () => {
    expect(thaiDay(new Date("2026-10-06T23:30:00.000Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z"); // 06:30 Thai, 7 Oct
    expect(thaiDay(new Date("2026-10-07T16:59:00.000Z")).toISOString()).toBe("2026-10-07T00:00:00.000Z"); // 23:59 Thai
    expect(thaiDay(new Date("2026-10-07T17:00:00.000Z")).toISOString()).toBe("2026-10-08T00:00:00.000Z"); // 00:00 Thai next day
    expect(thaiDay(new Date("2026-01-12")).toISOString()).toBe("2026-01-12T00:00:00.000Z"); // seed-style dates stay put
  });
});

describe("thaiDateTime", () => {
  it("turns a stored day and a Thai HH:MM into the real instant", () => {
    expect(thaiDateTime(new Date("2026-10-07T00:00:00.000Z"), "10:00").toISOString()).toBe("2026-10-07T03:00:00.000Z");
    expect(thaiDateTime(new Date("2026-10-07T00:00:00.000Z"), "06:30").toISOString()).toBe("2026-10-06T23:30:00.000Z");
  });
});

describe("attendanceRate", () => {
  it("late counts as attended, leave leaves the denominator", () => {
    expect(attendanceRate(["present", "late", "absent", "leave"])).toEqual({ present: 1, late: 1, leave: 1, absent: 1, percentage: 66.7 });
  });
  it("has no value when nothing counts", () => {
    expect(attendanceRate([]).percentage).toBeNull();
    expect(attendanceRate(["leave", "leave"]).percentage).toBeNull();
  });
  it("ignores unknown statuses", () => {
    expect(attendanceRate(["present", "here"]).percentage).toBe(100);
  });
});
