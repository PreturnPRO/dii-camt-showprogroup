import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import {
  mapStudent,
  mapStudentStatsToStudent,
  mapCourse,
  mapActivity,
  mapGrade,
} from '@/lib/live-mappers';
import { asRecord, asArray } from '@/lib/live-data';
import { EMPTY_STUDENT } from '@/lib/constants/defaults';
import type { Student, Course, Activity, Grade } from '@/types';

export interface StudentDashboardResult {
  student: Student;
  timeline: Student['timeline'];
  courses: Course[];
  grades: Grade[];
  activities: Activity[];
  stats: unknown;
  targets: unknown[];
}

/**
 * Shared Student Dashboard Query Hook.
 * Both StudentDashboard.tsx (Desktop) and MobileDashboard.tsx consume this hook,
 * sharing the 3-minute query cache to prevent redundant API waterfalls.
 */
export function useStudentDashboard(studentId?: string) {
  return useQuery<StudentDashboardResult>({
    queryKey: queryKeys.dashboard.student(studentId),
    queryFn: async () => {
      const [
        profileResult,
        statsResult,
        transcriptResult,
        enrollmentsResult,
        activitiesResult,
        targetsResult,
      ] = await Promise.allSettled([
        api.students.profile(studentId),
        api.students.stats(studentId),
        api.grades.transcript(studentId),
        api.enrollments.list(),
        api.activities.list(),
        api.careerTargets.list(),
      ]);

      let nextStudent: Student = { ...EMPTY_STUDENT };
      let timeline: Student['timeline'] = [];

      if (profileResult.status === 'fulfilled') {
        nextStudent = mapStudent(profileResult.value.profile);
        timeline = asArray(asRecord(profileResult.value.profile).timeline) as typeof timeline;
      }

      let rawStats: unknown = null;
      if (statsResult.status === 'fulfilled') {
        rawStats = statsResult.value.stats;
        nextStudent = mapStudentStatsToStudent(nextStudent, rawStats);
      }

      const grades: Grade[] = transcriptResult.status === 'fulfilled'
        ? transcriptResult.value.transcript.map(mapGrade)
        : [];

      const courses: Course[] = enrollmentsResult.status === 'fulfilled'
        ? enrollmentsResult.value.enrollments.map((item, index) => {
            const enrollment = asRecord(item);
            const course = mapCourse(enrollment.course, index);
            return {
              ...course,
              enrolledStudents: [String(enrollment.studentId ?? nextStudent.id)],
            };
          })
        : [];

      const activities: Activity[] = activitiesResult.status === 'fulfilled'
        ? activitiesResult.value.activities.map(mapActivity)
        : [];

      const targets: unknown[] = targetsResult.status === 'fulfilled'
        ? targetsResult.value.targets
        : [];

      return {
        student: nextStudent,
        timeline,
        courses,
        grades,
        activities,
        stats: rawStats,
        targets,
      };
    },
    staleTime: 1000 * 60 * 3, // 3 minutes stale time
  });
}
