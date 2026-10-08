import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { createNotification } from "./notification.service";
import { thaiDateTime, thaiDay } from "./attendance";

let reminderInterval: NodeJS.Timeout | null = null;

const dayMap = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

export const getAvailableOfficeHourSlots = async (lecturerId: string, date?: string) => {
  const lecturer = await prisma.lecturerProfile.findFirst({
    where: {
      OR: [{ id: lecturerId }, { lecturerId }, { userId: lecturerId }],
    },
    include: {
      user: true,
      officeHours: { where: { isAvailable: true }, orderBy: [{ day: "asc" }, { startTime: "asc" }] },
      appointments: {
        where: {
          status: { in: ["pending", "confirmed"] },
          ...(date
            ? {
                date: {
                  gte: new Date(`${date}T00:00:00.000Z`),
                  lte: new Date(`${date}T23:59:59.999Z`),
                },
              }
            : {}),
        },
      },
    },
  });

  if (!lecturer) {
    throw new AppError(404, "Lecturer profile not found");
  }

  if (date) {
    const requestedDate = new Date(date);
    const day = dayMap[requestedDate.getUTCDay()];
    const officeHours = lecturer.officeHours.filter((slot) => slot.day === day);
    // booked = any active appointment overlapping the slot (the same rule createAppointment enforces)
    const overlapsBooking = (slot: { startTime: string; endTime: string }) =>
      lecturer.appointments.some((appointment) => appointment.startTime < slot.endTime && appointment.endTime > slot.startTime);
    // a slot earlier today can no longer be booked either
    const now = new Date();

    return {
      lecturer: {
        id: lecturer.id,
        lecturerId: lecturer.lecturerId,
        name: lecturer.user.name,
      },
      date,
      slots: officeHours.map((slot) => ({
        ...slot,
        isBooked: overlapsBooking(slot),
        isPast: thaiDateTime(requestedDate, slot.startTime) <= now,
      })),
    };
  }

  return {
    lecturer: {
      id: lecturer.id,
      lecturerId: lecturer.lecturerId,
      name: lecturer.user.name,
    },
    officeHours: lecturer.officeHours,
  };
};

export const replaceOfficeHours = async (
  lecturerProfileId: string,
  officeHours: Array<{
    day: string;
    startTime: string;
    endTime: string;
    location: string;
    isAvailable?: boolean;
  }>,
) => {
  await prisma.$transaction(async (tx) => {
    await tx.officeHour.deleteMany({
      where: { lecturerId: lecturerProfileId },
    });

    if (officeHours.length > 0) {
      await tx.officeHour.createMany({
        data: officeHours.map((slot) => ({
          lecturerId: lecturerProfileId,
          day: slot.day,
          startTime: slot.startTime,
          endTime: slot.endTime,
          location: slot.location,
          isAvailable: slot.isAvailable ?? true,
        })),
      });
    }
  });

  return prisma.officeHour.findMany({
    where: { lecturerId: lecturerProfileId },
    orderBy: [{ day: "asc" }, { startTime: "asc" }],
  });
};

const REMINDER_LEAD_MS = 30 * 60 * 1000;

/** Sends the 30-minute reminder once per confirmed appointment. Dates are Thai days, start times Thai HH:MM. */
export const sendDueAppointmentReminders = async (now: Date = new Date()) => {
  const today = thaiDay(now);
  const appointments = await prisma.appointment.findMany({
    where: {
      status: "confirmed",
      reminderSentAt: null,
      // the Thai day of "now" or the next one covers every start within 30 minutes
      date: { gte: today, lte: new Date(today.getTime() + 24 * 60 * 60 * 1000) },
    },
    include: { student: { include: { user: true } }, lecturer: { include: { user: true } } },
  });

  let sent = 0;
  for (const appt of appointments) {
    const untilStart = thaiDateTime(appt.date, appt.startTime).getTime() - now.getTime();
    if (untilStart <= 0 || untilStart > REMINDER_LEAD_MS) continue;

    // claim the reminder first so two overlapping runs cannot both send it
    const claimed = await prisma.appointment.updateMany({ where: { id: appt.id, reminderSentAt: null }, data: { reminderSentAt: now } });
    if (claimed.count !== 1) continue;
    const minutes = Math.ceil(untilStart / 60000);

    await createNotification({
      userId: appt.student.userId,
      title: "Upcoming Appointment",
      titleThai: "การนัดหมายกำลังจะเริ่ม",
      message: `You have an appointment with ${appt.lecturer.user.name} in ${minutes} minutes at ${appt.location}.`,
      messageThai: `คุณมีการนัดหมายกับ ${appt.lecturer.user.nameThai} ในอีก ${minutes} นาที ที่ ${appt.location}`,
      type: "appointment",
      priority: "high",
      channels: ["in-app"],
      actionUrl: "/appointments",
    });
    await createNotification({
      userId: appt.lecturer.userId,
      title: "Upcoming Appointment",
      titleThai: "การนัดหมายกำลังจะเริ่ม",
      message: `You have an appointment with ${appt.student.user.name} in ${minutes} minutes at ${appt.location}.`,
      messageThai: `คุณมีการนัดหมายกับ ${appt.student.user.nameThai} ในอีก ${minutes} นาที ที่ ${appt.location}`,
      type: "appointment",
      priority: "high",
      channels: ["in-app"],
      actionUrl: "/appointments",
    });
    sent += 1;
  }
  return sent;
};

export const startAppointmentReminders = () => {
  if (reminderInterval) return reminderInterval;
  reminderInterval = setInterval(() => {
    sendDueAppointmentReminders().catch((err) => console.error("Failed to process appointment reminders", err));
  }, 60 * 1000);
  return reminderInterval;
};

export const stopAppointmentReminders = () => {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
};
