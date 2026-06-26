import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { createNotification } from "./notification.service";

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
    const bookedSlots = new Set(
      lecturer.appointments.map((appointment) => `${appointment.startTime}-${appointment.endTime}`),
    );

    return {
      lecturer: {
        id: lecturer.id,
        lecturerId: lecturer.lecturerId,
        name: lecturer.user.name,
      },
      date,
      slots: officeHours.map((slot) => ({
        ...slot,
        isBooked: bookedSlots.has(`${slot.startTime}-${slot.endTime}`),
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
    appointments: lecturer.appointments,
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

export const startAppointmentReminders = () => {
  if (reminderInterval) return reminderInterval;
  
  reminderInterval = setInterval(async () => {
    try {
      const now = new Date();
      const in30Mins = new Date(now.getTime() + 30 * 60000);
      
      const todayStart = new Date(in30Mins);
      todayStart.setUTCHours(0, 0, 0, 0);
      const todayEnd = new Date(in30Mins);
      todayEnd.setUTCHours(23, 59, 59, 999);

      const appointments = await prisma.appointment.findMany({
        where: {
          status: "confirmed",
          date: {
            gte: todayStart,
            lte: todayEnd,
          },
        },
        include: {
          student: { include: { user: true } },
          lecturer: { include: { user: true } },
        }
      });

      for (const appt of appointments) {
        const [hours, mins] = appt.startTime.split(":").map(Number);
        
        const apptTime = new Date(appt.date);
        apptTime.setUTCHours(hours, mins, 0, 0);

        const diffMs = apptTime.getTime() - now.getTime();
        const diffMinutes = Math.floor(diffMs / 60000);

        if (diffMinutes === 30) {
          await createNotification({
            userId: appt.student.userId,
            title: "Upcoming Appointment",
            titleThai: "การนัดหมายกำลังจะเริ่ม",
            message: `You have an appointment with ${appt.lecturer.user.name} in 30 minutes at ${appt.location}.`,
            messageThai: `คุณมีการนัดหมายกับ ${appt.lecturer.user.nameThai} ในอีก 30 นาที ที่ ${appt.location}`,
            type: "appointment",
            priority: "high",
            channels: ["in-app"],
            actionUrl: "/appointments",
          });

          await createNotification({
            userId: appt.lecturer.userId,
            title: "Upcoming Appointment",
            titleThai: "การนัดหมายกำลังจะเริ่ม",
            message: `You have an appointment with ${appt.student.user.name} in 30 minutes at ${appt.location}.`,
            messageThai: `คุณมีการนัดหมายกับ ${appt.student.user.nameThai} ในอีก 30 นาที ที่ ${appt.location}`,
            type: "appointment",
            priority: "high",
            channels: ["in-app"],
            actionUrl: "/appointments",
          });
        }
      }
    } catch (err) {
      console.error("Failed to process appointment reminders", err);
    }
  }, 60 * 1000);

  return reminderInterval;
};

export const stopAppointmentReminders = () => {
  if (reminderInterval) {
    clearInterval(reminderInterval);
    reminderInterval = null;
  }
};
