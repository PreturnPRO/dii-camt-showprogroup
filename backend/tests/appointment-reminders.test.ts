import { describe, expect, it } from "vitest";
import { prisma } from "../src/lib/prisma";
import { sendDueAppointmentReminders } from "../src/services/appointment.service";

/** a confirmed bob↔narin appointment on 7 Oct 2026 (Thai) starting at the given Thai time */
const appointmentAt = async (startTime: string) => {
  const bob = await prisma.studentProfile.findFirstOrThrow({ where: { user: { email: "bob@student.showpro.local" } } });
  const narin = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  return prisma.appointment.create({
    data: { studentId: bob.id, lecturerId: narin.id, date: new Date("2026-10-07"), startTime, endTime: "23:59", location: `room-${Math.random()}`, purpose: "test", status: "confirmed" },
    include: { student: true },
  });
};
const remindersFor = (userId: string, location: string) =>
  prisma.notification.count({ where: { userId, type: "appointment", message: { contains: location } } });

describe("appointment reminders", () => {
  it("fires 30 minutes before the Thai start time, once, however often the timer runs", async () => {
    const appt = await appointmentAt("10:00"); // 03:00 UTC
    await sendDueAppointmentReminders(new Date("2026-10-07T02:00:00.000Z")); // 09:00 Thai: too early
    expect(await remindersFor(appt.student.userId, appt.location)).toBe(0);
    await sendDueAppointmentReminders(new Date("2026-10-07T02:31:00.000Z")); // 09:31 Thai
    await sendDueAppointmentReminders(new Date("2026-10-07T02:32:00.000Z"));
    await Promise.all([sendDueAppointmentReminders(new Date("2026-10-07T02:33:00.000Z")), sendDueAppointmentReminders(new Date("2026-10-07T02:33:00.000Z"))]);
    expect(await remindersFor(appt.student.userId, appt.location)).toBe(1);
    expect((await prisma.appointment.findUniqueOrThrow({ where: { id: appt.id } })).reminderSentAt).not.toBeNull();
  });

  it("an early-morning Thai appointment is found although its UTC time is the previous day", async () => {
    const appt = await appointmentAt("06:30"); // 2026-10-06T23:30Z
    await sendDueAppointmentReminders(new Date("2026-10-06T23:05:00.000Z"));
    expect(await remindersFor(appt.student.userId, appt.location)).toBe(1);
  });

  it("does not remind after the start or for unconfirmed appointments", async () => {
    const late = await appointmentAt("08:00"); // 01:00Z
    await sendDueAppointmentReminders(new Date("2026-10-07T01:10:00.000Z"));
    expect(await remindersFor(late.student.userId, late.location)).toBe(0);
    const pending = await appointmentAt("12:00");
    await prisma.appointment.update({ where: { id: pending.id }, data: { status: "pending" } });
    await sendDueAppointmentReminders(new Date("2026-10-07T04:40:00.000Z"));
    expect(await remindersFor(pending.student.userId, pending.location)).toBe(0);
  });
});
