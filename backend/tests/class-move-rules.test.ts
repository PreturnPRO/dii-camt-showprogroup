import { describe, expect, it } from "vitest";
import { busyOn, clashesWith, editable, formatDay, parseDay, weekdayOf } from "../src/services/class-move-rules";

const d = (s: string) => parseDay(s)!;

describe("days", () => {
  it("parses only real YYYY-MM-DD dates", () => {
    expect(formatDay(d("2030-09-16"))).toBe("2030-09-16");
    expect(parseDay("2030-02-30")).toBeNull();
    expect(parseDay("16/09/2030")).toBeNull();
  });
  it("knows the Thai weekday", () => {
    expect(weekdayOf(d("2030-09-16"))).toBe("monday");
    expect(weekdayOf(d("2030-09-22"))).toBe("sunday");
  });
});

describe("editable", () => {
  const today = d("2030-09-16");
  it("needs both days strictly after today", () => {
    expect(editable({ originalDate: d("2030-09-17"), newDate: d("2030-09-20") }, today)).toBe(true);
    expect(editable({ originalDate: d("2030-09-16"), newDate: d("2030-09-20") }, today)).toBe(false);
    expect(editable({ originalDate: d("2030-09-20"), newDate: d("2030-09-16") }, today)).toBe(false);
  });
});

describe("busyOn", () => {
  const regular = [
    { sectionId: "A", label: "AAA", slots: [{ day: "monday", startTime: "09:00", endTime: "12:00" }] },
    { sectionId: "B", label: "BBB", slots: [{ day: "wednesday", startTime: "13:00", endTime: "15:00" }] },
  ];
  const moveA = { id: "m1", sectionId: "A", label: "AAA", originalDate: d("2030-09-16"), originalStart: "09:00", originalEnd: "12:00", newDate: d("2030-09-18"), newStart: "09:00", newEnd: "12:00" };

  it("weekly classes minus moved out plus moved in", () => {
    expect(busyOn(d("2030-09-16"), regular, [moveA])).toEqual([]);
    expect(busyOn(d("2030-09-23"), regular, [moveA]).map((b) => b.label)).toEqual(["AAA"]);
    expect(busyOn(d("2030-09-18"), regular, [moveA]).map((b) => [b.label, b.start])).toEqual([["BBB", 780], ["AAA", 540]]);
  });

  it("can ignore the move being edited", () => {
    expect(busyOn(d("2030-09-16"), regular, [moveA], "m1").map((b) => b.label)).toEqual(["AAA"]);
  });

  it("touching edges are not a clash", () => {
    const busy = busyOn(d("2030-09-23"), regular, []);
    expect(clashesWith(busy, 12 * 60, 13 * 60)).toEqual([]);
    expect(clashesWith(busy, 11 * 60, 13 * 60).map((b) => b.label)).toEqual(["AAA"]);
  });
});
