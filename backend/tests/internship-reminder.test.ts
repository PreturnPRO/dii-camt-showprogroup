import { describe, expect, it } from 'vitest';
import { prisma } from '../src/lib/prisma';
import { sendDueInternshipLogReminders } from '../src/services/internship-reminder.service';

describe('internship diary inactivity reminders', () => {
  it('sends once after 48 hours, then only after another 48-hour gap following a new log', async () => {
    const student = await prisma.studentProfile.findUniqueOrThrow({ where: { studentId: '65010002' } });
    const base = new Date('2026-10-08T12:00:00Z');
    const record = await prisma.internshipRecord.create({
      data: { studentId: student.id, status: 'in_progress', createdAt: new Date(base.getTime() - 72 * 60 * 60 * 1000) },
    });
    expect(await sendDueInternshipLogReminders(base)).toBeGreaterThanOrEqual(1);
    expect(await sendDueInternshipLogReminders(base)).toBe(0);
    expect(await prisma.notification.count({ where: { userId: student.userId, type: 'internship' } })).toBe(1);

    await prisma.internshipLog.create({
      data: { recordId: record.id, date: base, activities: 'New entry', hours: 8, createdAt: new Date(base.getTime() + 60 * 60 * 1000) },
    });
    expect(await sendDueInternshipLogReminders(new Date(base.getTime() + 2 * 60 * 60 * 1000))).toBe(0);
    expect(await sendDueInternshipLogReminders(new Date(base.getTime() + 51 * 60 * 60 * 1000))).toBeGreaterThanOrEqual(1);
    expect(await prisma.notification.count({ where: { userId: student.userId, type: 'internship' } })).toBe(2);
  });
});
