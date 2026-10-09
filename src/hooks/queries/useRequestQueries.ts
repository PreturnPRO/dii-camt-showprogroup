import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { asArray, asDate, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

export type RequestComment = {
  id: string;
  authorId: string;
  text: string;
  createdAt: string;
};

export type RequestRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  step: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  description: string;
  documents: string[];
  studentName?: string;
  studentId?: string;
  /** the requesting student's user id, to tell their comments from staff ones */
  studentUserId?: string;
  comments: RequestComment[];
};

export function mapRawRequest(item: unknown, index = 0): RequestRow {
  const request = asRecord(item);
  const student = asRecord(request.student);
  const studentUser = asRecord(student.user);
  const status = asString(request.status, 'pending');
  const totalSteps = status === 'pending' ? 4 : 3;

  return {
    id: asString(request.id, String(index + 1)),
    type: asString(request.type, '-'),
    title: asString(request.title, '-'),
    status,
    step: status === 'pending' ? 2 : status === 'rejected' ? 1 : totalSteps,
    totalSteps,
    createdAt: asDate(request.submittedAt, asDate(request.createdAt)).toISOString().split('T')[0],
    updatedAt: asDate(request.reviewedAt, asDate(request.updatedAt, asDate(request.submittedAt))).toISOString().split('T')[0],
    description: asString(request.description, asString(studentUser.nameThai, '')),
    documents: asArray<string>(request.documents),
    studentName: asString(studentUser.nameThai, asString(studentUser.name, '-')),
    studentId: asString(student.studentId),
    studentUserId: asString(studentUser.id, asString(student.userId)) || undefined,
    comments: asArray(request.comments).map((commentValue) => {
      const comment = asRecord(commentValue);
      return {
        id: asString(comment.id),
        authorId: asString(comment.authorId),
        text: asString(comment.text),
        createdAt: asDate(comment.createdAt).toISOString(),
      };
    }),
  };
}

export function useRequestsList() {
  return useQuery({
    queryKey: queryKeys.requests.list(),
    queryFn: async () => {
      const response = await api.requests.list();
      return response.requests.map(mapRawRequest);
    },
    staleTime: 1000 * 60 * 2, // 2 minutes cache
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { type: string; title: string; description: string; documents: string[] }) => {
      return api.requests.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
    },
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'approved' | 'rejected' | 'completed' }) => {
      return api.requests.updateStatus(id, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
    },
  });
}

export function useAddRequestComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ requestId, message }: { requestId: string; message: string }) => {
      return api.requests.addComment(requestId, message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
    },
  });
}
