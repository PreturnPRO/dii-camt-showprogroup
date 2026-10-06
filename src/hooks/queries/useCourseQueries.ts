import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { mapCourse } from '@/lib/live-mappers';
import { asRecord, asString } from '@/lib/live-data';
import type { Course } from '@/types';

export type LecturerOption = {
  id: string;
  lecturerId: string;
  name: string;
};

export function useCoursesList(role?: string) {
  return useQuery<Course[]>({
    queryKey: queryKeys.courses.list(role),
    queryFn: async () => {
      if (role === 'lecturer') {
        const response = await api.courses.lecturerSchedule();
        return (response.schedule || []).map(mapCourse);
      }
      const response = await api.courses.list();
      return (response.courses || []).map(mapCourse);
    },
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  });
}

export function useLecturersList(enabled = true) {
  return useQuery<LecturerOption[]>({
    queryKey: queryKeys.courses.lecturers(),
    queryFn: async () => {
      const response = await api.lecturers.list();
      return response.lecturers
        .map((item) => {
          const source = asRecord(item);
          const lecturerUser = asRecord(source.user);
          return {
            id: asString(source.id),
            lecturerId: asString(source.lecturerId),
            name: asString(lecturerUser.nameThai, asString(lecturerUser.name, asString(source.lecturerId))),
          };
        })
        .filter((lecturer) => lecturer.id);
    },
    enabled,
    staleTime: 1000 * 60 * 10, // 10 minutes cache
  });
}

export function useSaveCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id?: string; payload: Record<string, unknown> }) => {
      if (id) {
        return api.courses.update(id, payload);
      }
      return api.courses.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
    },
  });
}

export function useEnrollCourse() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ courseId, sectionId }: { courseId: string; sectionId?: string }) => {
      return api.enrollments.create({
        courseId,
        ...(sectionId ? { sectionId } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all() });
    },
  });
}

export function useBulkImportCourses() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (courses: Array<Record<string, unknown>>) => {
      const results = [];
      for (const payload of courses) {
        const response = await api.courses.create(payload);
        results.push(response);
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.courses.all() });
    },
  });
}

