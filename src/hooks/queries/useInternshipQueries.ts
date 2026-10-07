import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';

export function useInternshipsList() {
  return useQuery({
    queryKey: queryKeys.internships.list(),
    queryFn: async () => {
      const response = await api.internship.list();
      return response.internships || [];
    },
    staleTime: 1000 * 60 * 3, // 3 minutes cache
  });
}

export function useCreateInternshipLog() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      return api.internship.createLog(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all() });
    },
  });
}

export function useUpdateInternshipDocumentStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, payload }: { id: string; payload: Record<string, unknown> }) => {
      return api.internship.updateDocumentStatus(id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all() });
    },
  });
}
