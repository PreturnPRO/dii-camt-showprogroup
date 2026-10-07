import { describe, expect, it } from "vitest";
import { findEnrollmentViolation, MAX_TERM_CREDITS, parseSlots, type RuleInput } from "../src/services/enrollment-rules";

const base = (over: Partial<RuleInput> = {}): RuleInput => ({
  student: { semester: 1, academicYear: "2569" },
  course: { code: "NEW100", credits: 3, semester: 1, academicYear: "2569", status: "active", prerequisites: [] },
  section: { maxStudents: 30, slots: [{ day: "tuesday", startTime: "09:00", endTime: "12:00" }] },
  sectionSeatsTaken: 0,
  knownCourseCodes: new Set<string>(),
  history: [],
  termEnrollments: [],
  ...over,
});

describe("parseSlots", () => {
  it("keeps valid slots, lowercases the day and drops broken ones", () => {
    expect(parseSlots([{ day: " Monday ", startTime: "09:00", endTime: "12:00", room: "x" }, { day: "friday" }, "junk"])).toEqual([
      { day: "monday", startTime: "09:00", endTime: "12:00" },
    ]);
    expect(parseSlots(null)).toEqual([]);
  });
});

describe("findEnrollmentViolation", () => {
  it("accepts an open course in the student's term", () => {
    expect(findEnrollmentViolation(base())).toBeNull();
  });

  it("rejects another term and a non-active course", () => {
    expect(findEnrollmentViolation(base({ course: { ...base().course, academicYear: "2568" } }))?.message).toMatch(/current term/);
    expect(findEnrollmentViolation(base({ course: { ...base().course, semester: 2 } }))?.message).toMatch(/current term/);
    expect(findEnrollmentViolation(base({ course: { ...base().course, status: "pending" } }))?.message).toMatch(/not open/);
  });

  it("rejects a full section and allows a course without sections", () => {
    expect(findEnrollmentViolation(base({ sectionSeatsTaken: 30 }))?.message).toMatch(/full/);
    expect(findEnrollmentViolation(base({ section: null, sectionSeatsTaken: 0 }))).toBeNull();
  });

  it("prerequisites: taken or in progress passes, W/dropped/missing fails, unknown codes are skipped", () => {
    const course = { ...base().course, prerequisites: ["PRE100", "GHOST999"] };
    const known = new Set(["PRE100"]);
    const run = (history: RuleInput["history"]) => findEnrollmentViolation(base({ course, knownCourseCodes: known, history }));
    expect(run([])?.message).toMatch(/PRE100/);
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: null }])).toBeNull();
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: "F" }])).toBeNull();
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: "I" }])).toBeNull();
    expect(run([{ courseCode: "PRE100", status: "enrolled", letterGrade: "W" }])?.message).toMatch(/PRE100/);
    expect(run([{ courseCode: "PRE100", status: "dropped", letterGrade: null }])?.message).toMatch(/PRE100/);
  });

  it("enforces the term credit limit and ignores W courses", () => {
    const at = (credits: number, letterGrade: string | null = null) => ({ courseCode: `C${credits}${letterGrade}`, credits, letterGrade, slots: [] });
    expect(findEnrollmentViolation(base({ termEnrollments: [at(MAX_TERM_CREDITS - 3)] }))).toBeNull();
    expect(findEnrollmentViolation(base({ termEnrollments: [at(MAX_TERM_CREDITS - 2)] }))?.message).toMatch(/22/);
    expect(findEnrollmentViolation(base({ termEnrollments: [at(MAX_TERM_CREDITS - 3), at(6, "W")] }))).toBeNull();
  });

  it("detects overlapping slots on the same day, case-insensitively, and allows touching edges", () => {
    const taken = (day: string, startTime: string, endTime: string) => ({ courseCode: "OLD200", credits: 3, letterGrade: null, slots: [{ day, startTime, endTime }] });
    expect(findEnrollmentViolation(base({ termEnrollments: [taken("tuesday", "11:00", "13:00")] }))?.message).toMatch(/OLD200/);
    expect(findEnrollmentViolation(base({ section: { maxStudents: 30, slots: parseSlots([{ day: "Tuesday", startTime: "10:00", endTime: "11:00" }]) }, termEnrollments: [taken("tuesday", "09:30", "10:30")] }))?.message).toMatch(/OLD200/);
    expect(findEnrollmentViolation(base({ termEnrollments: [taken("tuesday", "12:00", "15:00")] }))).toBeNull();
    expect(findEnrollmentViolation(base({ termEnrollments: [taken("wednesday", "09:00", "12:00")] }))).toBeNull();
  });
});
