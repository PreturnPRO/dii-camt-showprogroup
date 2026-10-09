import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { loginAs } from "./helpers/auth";

const as = async (email: string) => `Bearer ${await loginAs(email)}`;
const uid = () => Math.random().toString(36).slice(2, 9).toUpperCase();

// sections of an open course are staff's to change (owner decision 9/10/69), so staff edit here
/** a narin course (in a term of its own) with sections 01 and 02, and bob enrolled in 01 */
const courseWithEnrollment = async () => {
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
  const code = `U${uid()}`;
  const course = await prisma.course.create({
    data: {
      code, name: code, nameThai: code, credits: 3, semester: 1, academicYear: String(3000 + Math.floor(Math.random() * 60000)), year: 2, lecturerId: narin.id, status: "active",
      sections: { create: [
        { number: "01", maxStudents: 40, schedule: [{ day: "saturday", startTime: "09:00", endTime: "12:00" }] },
        { number: "02", maxStudents: 40, schedule: [] },
      ] },
    },
    include: { sections: { orderBy: { number: "asc" } } },
  });
  const enrollment = await prisma.enrollment.create({ data: { studentId: bob.id, courseId: course.id, sectionId: course.sections[0].id } });
  return { course, enrollment };
};

describe("editing a course keeps its sections and enrollments", () => {
  it("an edit that resends section 01 updates it in place and keeps the enrollment on it", async () => {
    const { course, enrollment } = await courseWithEnrollment();
    const res = await request(app).patch(`/api/courses/${course.id}`).set("Authorization", await as("staff@showpro.local")).send({
      description: "new text",
      sections: [
        { number: "01", maxStudents: 45, schedule: [{ day: "saturday", startTime: "10:00", endTime: "12:00" }] },
        { number: "02", maxStudents: 40, schedule: [] },
      ],
    });
    expect(res.status).toBe(200);
    const after = await prisma.section.findUniqueOrThrow({ where: { id: course.sections[0].id } });
    expect(after.maxStudents).toBe(45);
    expect((await prisma.enrollment.findUniqueOrThrow({ where: { id: enrollment.id } })).sectionId).toBe(course.sections[0].id);
  });

  it("drops an empty section that is left out, but refuses to drop one with students", async () => {
    const { course } = await courseWithEnrollment();
    const auth = await as("staff@showpro.local");
    const onlyOne = await request(app).patch(`/api/courses/${course.id}`).set("Authorization", auth).send({ sections: [{ number: "01", maxStudents: 40, schedule: [] }] });
    expect(onlyOne.status).toBe(200);
    expect(await prisma.section.count({ where: { courseId: course.id } })).toBe(1);

    const withoutStudents = await request(app).patch(`/api/courses/${course.id}`).set("Authorization", auth).send({ sections: [{ number: "03", maxStudents: 40, schedule: [] }] });
    expect(withoutStudents.status).toBe(409);
    expect(withoutStudents.body.message).toMatch(/01/);
    expect(await prisma.section.count({ where: { courseId: course.id, number: "01" } })).toBe(1);
  });

  it("staff can let go of a booked room by sending facilityId null", async () => {
    const { course } = await courseWithEnrollment();
    const room = await prisma.facility.create({ data: { code: `R${uid()}`, name: "Room", building: "TEST", room: uid(), type: "classroom", capacity: 40 } });
    await prisma.section.update({ where: { id: course.sections[0].id }, data: { facilityId: room.id } });
    const res = await request(app).patch(`/api/courses/${course.id}`).set("Authorization", await as("staff@showpro.local")).send({
      sections: [
        { number: "01", room: "CAMT 113", facilityId: null, maxStudents: 40, schedule: [{ day: "saturday", startTime: "09:00", endTime: "12:00" }] },
        { number: "02", maxStudents: 40, schedule: [] },
      ],
    });
    expect(res.status).toBe(200);
    const after = await prisma.section.findUniqueOrThrow({ where: { id: course.sections[0].id } });
    expect(after.facilityId).toBeNull();
    expect(after.room).toBe("CAMT 113");
  });
});
