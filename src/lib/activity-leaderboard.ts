import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';

export type LeaderboardEntry = { rank: number; studentId: string; name: string; points: number; isViewer: boolean };

/** Points a student actually received (rewarded enrollments only); opted-out students are shown only to themselves. */
export const buildLeaderboard = (rawActivities: unknown[], viewerStudentId: string): LeaderboardEntry[] => {
  const totals = new Map<string, { name: string; points: number }>();
  for (const item of rawActivities) {
    const activity = asRecord(item);
    const points = asNumber(activity.gamificationPoints, 0);
    for (const enrollmentItem of asArray(activity.enrollments)) {
      const enrollment = asRecord(enrollmentItem);
      if (enrollment.rewardGranted !== true) continue;
      const student = asRecord(enrollment.student);
      const studentId = asString(enrollment.studentId, asString(student.id));
      if (!studentId) continue;
      const isViewer = studentId === viewerStudentId;
      if (student.user === null && !isViewer) continue;
      const user = asRecord(student.user);
      const name = asString(user.nameThai, asString(user.name, isViewer ? 'คุณ' : '-'));
      const current = totals.get(studentId) ?? { name, points: 0 };
      totals.set(studentId, { name: current.name, points: current.points + points });
    }
  }
  return Array.from(totals.entries())
    .filter(([, value]) => value.points > 0)
    .sort((a, b) => b[1].points - a[1].points)
    .slice(0, 5)
    .map(([studentId, value], index) => ({
      rank: index + 1,
      studentId,
      name: value.name,
      points: value.points,
      isViewer: studentId === viewerStudentId,
    }));
};
