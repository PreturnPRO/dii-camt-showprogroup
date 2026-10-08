import { prisma } from '../lib/prisma';
import { createNotification } from './notification.service';

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;
let reminderInterval: NodeJS.Timeout | null = null;

/** One reminder per inactivity period; a new submitted log makes the record eligible again after 48 hours. */
export async function sendDueInternshipLogReminders(now = new Date()) {
  const records = await prisma.internshipRecord.findMany({
    where: { status: 'in_progress' },
    include: { student: { select: { userId: true } }, logs: { orderBy: { createdAt: 'desc' }, take: 1 } },
  });
  let sent = 0;
  for (const record of records) {
    const lastActivity = record.logs[0]?.createdAt ?? record.createdAt;
    if (now.getTime() - lastActivity.getTime() < FORTY_EIGHT_HOURS) continue;
    if (record.lastLogReminderAt && record.lastLogReminderAt >= lastActivity) continue;

    // Claim before sending so simultaneous workers do not duplicate the notification.
    const claimed = await prisma.internshipRecord.updateMany({
      where: { id: record.id, lastLogReminderAt: record.lastLogReminderAt },
      data: { lastLogReminderAt: now },
    });
    if (!claimed.count) continue;
    await createNotification({
      userId: record.student.userId,
      title: 'Internship diary reminder',
      titleThai: 'อย่าลืมบันทึกฝึกงาน',
      message: 'It has been over 48 hours since your last internship diary entry.',
      messageThai: 'ผ่านไปกว่า 48 ชั่วโมงแล้วตั้งแต่บันทึกฝึกงานครั้งล่าสุด',
      type: 'internship', priority: 'medium', channels: ['in-app'], actionUrl: '/internships',
    });
    sent += 1;
  }
  return sent;
}

export function startInternshipLogReminders() {
  if (reminderInterval) return reminderInterval;
  reminderInterval = setInterval(() => {
    sendDueInternshipLogReminders().catch((error) => console.error('Failed to process internship diary reminders', error));
  }, 60 * 60 * 1000);
  return reminderInterval;
}

export function stopInternshipLogReminders() {
  if (reminderInterval) clearInterval(reminderInterval);
  reminderInterval = null;
}
