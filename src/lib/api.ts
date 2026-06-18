import type { UserRole } from "@/types";

const DEFAULT_API_BASE_URL = "http://localhost:4000/api";
const TOKEN_STORAGE_KEY = "showpro_auth_token";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const API_BASE_URL = trimTrailingSlash(
  import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
);

export type BackendRole = "STUDENT" | "LECTURER" | "STAFF" | "COMPANY" | "ADMIN";

export type BackendUser = {
  id: string;
  email: string;
  name: string;
  nameThai: string;
  role: BackendRole;
  avatar?: string | null;
  phone?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLogin?: string | null;
  studentProfile?: Record<string, unknown> | null;
  lecturerProfile?: Record<string, unknown> | null;
  staffProfile?: Record<string, unknown> | null;
  companyProfile?: Record<string, unknown> | null;
  adminProfile?: Record<string, unknown> | null;
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: BodyInit | Record<string, unknown> | null;
  headers?: HeadersInit;
  token?: string | null;
};

type ApiEnvelope<T> = {
  success: boolean;
  message?: string;
} & T;

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const isFormData = (value: unknown): value is FormData => typeof FormData !== "undefined" && value instanceof FormData;

const parseJsonSafely = async (response: Response) => {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const parseErrorPayload = async (response: Response) => {
  const contentType = response.headers.get("Content-Type") || "";
  if (contentType.includes("application/json") || contentType.startsWith("text/")) {
    return parseJsonSafely(response);
  }

  try {
    return await response.text();
  } catch {
    return null;
  }
};

export const getStoredToken = () => localStorage.getItem(TOKEN_STORAGE_KEY);

export const setStoredToken = (token: string) => {
  localStorage.setItem(TOKEN_STORAGE_KEY, token);
};

export const clearStoredToken = () => {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
};

export const normalizeRole = (role: BackendRole): UserRole => role.toLowerCase() as UserRole;

export const normalizeUser = (user: BackendUser) => ({
  id: user.id,
  email: user.email,
  name: user.name,
  nameThai: user.nameThai,
  role: normalizeRole(user.role),
  avatar: user.avatar || undefined,
  phone: user.phone || undefined,
  raw: user,
});

export const request = async <T>(path: string, options: RequestOptions = {}) => {
  const token = options.token ?? getStoredToken();
  const headers = new Headers(options.headers);
  const hasBody = typeof options.body !== "undefined" && options.body !== null;
  const body =
    hasBody && !isFormData(options.body) && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : (options.body as BodyInit | undefined);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (hasBody && !isFormData(options.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  const payload = await parseJsonSafely(response);

  if (!response.ok) {
    if (response.status === 401) {
      clearStoredToken();
    }

    throw new ApiError(
      response.status,
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : response.statusText || "Request failed",
      typeof payload === "object" ? payload : undefined,
    );
  }

  return payload as T;
};

export const requestBlob = async (path: string, options: RequestOptions = {}) => {
  const token = options.token ?? getStoredToken();
  const headers = new Headers(options.headers);
  const hasBody = typeof options.body !== "undefined" && options.body !== null;
  const body =
    hasBody && !isFormData(options.body) && typeof options.body !== "string"
      ? JSON.stringify(options.body)
      : (options.body as BodyInit | undefined);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (hasBody && !isFormData(options.body) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? "GET",
    headers,
    body,
  });

  if (!response.ok) {
    const payload = await parseErrorPayload(response);
    if (response.status === 401) {
      clearStoredToken();
    }

    throw new ApiError(
      response.status,
      typeof payload === "object" && payload && "message" in payload
        ? String(payload.message)
        : response.statusText || "Request failed",
      typeof payload === "object" ? payload : undefined,
    );
  }

  return response.blob();
};

export const api = {
  auth: {
    login: (email: string, password: string) =>
      request<ApiEnvelope<{ token: string; expiresIn: string; user: BackendUser }>>("/auth/login", {
        method: "POST",
        body: { email, password },
      }),
    register: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ token: string; expiresIn: string; user: BackendUser }>>(
        "/auth/register",
        {
          method: "POST",
          body: payload,
        },
      ),
    forgotPassword: (email: string) =>
      request<ApiEnvelope<{ resetToken?: string; resetUrl?: string }>>("/auth/forgot-password", {
        method: "POST",
        body: { email },
      }),
    resetPassword: (token: string, password: string) =>
      request<ApiEnvelope<{ message: string }>>("/auth/reset-password", {
        method: "POST",
        body: { token, password },
      }),
    me: () => request<ApiEnvelope<{ user: BackendUser }>>("/auth/me"),
    logout: () => request<ApiEnvelope<{ message: string }>>("/auth/logout", { method: "POST" }),
    updateProfile: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ user: BackendUser }>>("/users/profile", {
        method: "PATCH",
        body: payload,
      }),
  },
  notifications: {
    list: () => request<ApiEnvelope<{ notifications: unknown[] }>>("/notifications"),
    markAllRead: () =>
      request<ApiEnvelope<{ updatedCount: number }>>("/notifications/read-all", {
        method: "PATCH",
      }),
    markRead: (id: string) =>
      request<ApiEnvelope<{ notification: unknown }>>(`/notifications/${id}/read`, {
        method: "PATCH",
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ notification: unknown }>>(`/notifications/${id}`, {
        method: "DELETE",
      }),
    broadcast: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ notifications: unknown[] }>>("/notifications/broadcast", {
        method: "POST",
        body: payload,
      }),
  },
  messages: {
    list: () => request<ApiEnvelope<{ messages: unknown[] }>>("/messages"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ message: unknown }>>("/messages", {
        method: "POST",
        body: payload,
      }),
    markRead: (id: string) =>
      request<ApiEnvelope<{ message: unknown }>>(`/messages/${id}/read`, {
        method: "PATCH",
      }),
  },
  requests: {
    list: () => request<ApiEnvelope<{ requests: unknown[] }>>("/requests"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ request: unknown }>>("/requests", {
        method: "POST",
        body: payload,
      }),
    addComment: (id: string, text: string) =>
      request<ApiEnvelope<{ comment: unknown }>>(`/requests/${id}/comment`, {
        method: "POST",
        body: { text },
      }),
    updateStatus: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ request: unknown }>>(`/requests/${id}/status`, {
        method: "PATCH",
        body: payload,
      }),
  },
  appointments: {
    list: () => request<ApiEnvelope<{ appointments: unknown[] }>>("/appointments"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ appointment: unknown }>>("/appointments", {
        method: "POST",
        body: payload,
      }),
    updateStatus: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ appointment: unknown }>>(`/appointments/${id}/status`, {
        method: "PATCH",
        body: payload,
      }),
  },
  jobs: {
    list: (query = "") => request<ApiEnvelope<{ jobs: unknown[] }>>(`/jobs${query}`),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ job: unknown }>>("/jobs", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ job: unknown }>>(`/jobs/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ job: unknown }>>(`/jobs/${id}`, {
        method: "DELETE",
      }),
  },
  careerTargets: {
    list: () => request<ApiEnvelope<{ targets: unknown[] }>>("/career-targets"),
  },
  applications: {
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ application: unknown }>>(`/applications/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    list: (query = "") => request<ApiEnvelope<{ applications: unknown[] }>>(`/applications${query}`),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ application: unknown }>>("/applications", {
        method: "POST",
        body: payload,
      }),
  },
  students: {
    list: (query = "") => request<ApiEnvelope<{ students: unknown[] }>>(`/students${query}`),
    profiles: () => request<ApiEnvelope<{ profiles: unknown[] }>>("/student-profiles"),
    profile: (studentId?: string) =>
      request<ApiEnvelope<{ profile: unknown }>>(
        `/students/profile${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`,
      ),
    stats: (studentId?: string) =>
      request<ApiEnvelope<{ stats: unknown }>>(
        `/students/stats${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`,
      ),
    updateProfile: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ profile: unknown }>>("/students/profile", {
        method: "PATCH",
        body: payload,
      }),
  },
  users: {
    list: (query = "") => request<ApiEnvelope<{ users: unknown[] }>>(`/users${query}`),
    directory: (query = "") => request<ApiEnvelope<{ users: unknown[] }>>(`/directory/users${query}`),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ user: unknown; temporaryPassword?: string }>>("/users", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ user: unknown }>>(`/users/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ user: unknown }>>(`/users/${id}`, {
        method: "DELETE",
      }),
  },
  lecturers: {
    list: (query = "") => request<ApiEnvelope<{ lecturers: unknown[] }>>(`/lecturers${query}`),
  },
  companies: {
    list: (query = "") => request<ApiEnvelope<{ companies: unknown[] }>>(`/companies${query}`),
  },
  reports: {
    systemUsage: () => request<ApiEnvelope<{ report: unknown }>>("/reports/system-usage"),
  },
  budget: {
    list: () => request<ApiEnvelope<{ budget: unknown[] }>>("/budget"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ budget: unknown }>>("/budget", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ budget: unknown }>>(`/budget/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ budget: unknown }>>(`/budget/${id}`, {
        method: "DELETE",
      }),
  },
  cooperation: {
    list: () => request<ApiEnvelope<{ cooperation: unknown[] }>>("/cooperation"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ cooperation: unknown }>>("/cooperation", {
        method: "POST",
        body: payload,
      }),
  },
  workload: {
    list: () => request<ApiEnvelope<{ workload: unknown[] }>>("/workload"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ workload: unknown }>>("/workload", {
        method: "POST",
        body: payload,
      }),
  },
  personnel: {
    list: () => request<ApiEnvelope<{ personnel: unknown[] }>>("/personnel"),
  },
  enrollments: {
    list: (query = "") => request<ApiEnvelope<{ enrollments: unknown[] }>>(`/enrollments${query}`),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ enrollment: unknown }>>("/enrollments", {
        method: "POST",
        body: payload,
      }),
    remove: (courseId: string) =>
      request<ApiEnvelope<{ message: string }>>(`/enrollments/course/${courseId}`, {
        method: "DELETE",
      }),
  },
  assignments: {
    list: (query = "") => request<ApiEnvelope<{ assignments: unknown[] }>>(`/assignments${query}`),
    get: (id: string) => request<ApiEnvelope<{ assignment: unknown }>>(`/assignments/${encodeURIComponent(id)}`),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ assignment: unknown }>>("/assignments", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ assignment: unknown }>>(`/assignments/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ assignment: unknown }>>(`/assignments/${id}`, {
        method: "DELETE",
      }),
    submit: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ submission: unknown }>>(`/assignments/${id}/submissions`, {
        method: "POST",
        body: payload,
      }),
    gradeSubmission: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ submission: unknown }>>(`/submissions/${id}`, {
        method: "PATCH",
        body: payload,
      }),
  },
  courses: {
    list: (query = "") => request<ApiEnvelope<{ courses: unknown[] }>>(`/courses${query}`),
    get: (id: string) => request<ApiEnvelope<{ course: unknown }>>(`/courses/${id}`),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ course: unknown }>>("/courses", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ course: unknown }>>(`/courses/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    delete: (id: string) =>
      request<ApiEnvelope<{ message: string }>>(`/courses/${id}`, {
        method: "DELETE",
      }),
    lecturerSchedule: (lecturerId?: string) =>
      request<ApiEnvelope<{ lecturer: unknown; schedule: unknown[] }>>(
        `/courses/lecturer/schedule${lecturerId ? `?lecturerId=${encodeURIComponent(lecturerId)}` : ""}`,
      ),
  },
  grades: {
    bulkUpdate: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ grades: unknown[]; updatedCount: number }>>("/grades/bulk", {
        method: "PATCH",
        body: payload,
      }),
    history: (studentId: string) =>
      request<ApiEnvelope<{ student: unknown; history: unknown[] }>>(
        `/grades/history/${encodeURIComponent(studentId)}`,
      ),
    transcript: (studentId?: string) =>
      request<ApiEnvelope<{ student: unknown; transcript: unknown[] }>>(
        `/student/transcript${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`,
      ),
    exportCsv: (courseId: string) =>
      requestBlob(`/courses/${encodeURIComponent(courseId)}/grades/export`),
  },
  attendance: {
    report: (query = "") => request<ApiEnvelope<{ attendance: unknown[] }>>(`/attendance/report${query}`),
    checkIn: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ attendance: unknown }>>("/attendance/check-in", {
        method: "POST",
        body: payload,
      }),
    startSession: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ session: unknown }>>("/attendance/sessions", {
        method: "POST",
        body: payload,
      }),
    checkInSession: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ attendance: unknown }>>("/attendance/sessions/check-in", {
        method: "POST",
        body: payload,
      }),
    closeSession: (id: string) =>
      request<ApiEnvelope<{ session: unknown }>>(`/attendance/sessions/${id}/close`, {
        method: "PATCH",
      }),
    summary: (courseId: string) =>
      request<ApiEnvelope<{ totalSessions: number; summary: unknown[] }>>(`/attendance/summary/${courseId}`),
    history: (courseId: string, studentId: string) =>
      request<ApiEnvelope<{ history: unknown[] }>>(`/attendance/history/${courseId}/${studentId}`),
  },
  activities: {
    list: (query = "") => request<ApiEnvelope<{ activities: unknown[] }>>(`/activities${query}`),
    upcoming: () => request<ApiEnvelope<{ activities: unknown[] }>>("/activities/upcoming"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ activity: unknown }>>("/activities", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ activity: unknown }>>(`/activities/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ activity: unknown }>>(`/activities/${id}`, {
        method: "DELETE",
      }),
    enroll: (activityId: string) =>
      request<ApiEnvelope<{ enrollment: unknown }>>(`/activities/enroll/${activityId}`, {
        method: "POST",
      }),
    checkIn: (activityId: string) =>
      request<ApiEnvelope<{ enrollment: unknown }>>(`/activities/check-in/${activityId}`, {
        method: "POST",
      }),
    updateEnrollmentStatus: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ enrollment: unknown }>>(`/activities/enrollments/${id}/status`, {
        method: "PATCH",
        body: payload,
      }),
  },
  player: {
    stats: () => request<ApiEnvelope<{ stats: unknown }>>("/player/stats"),
  },
  internship: {
    list: () => request<ApiEnvelope<{ internships: unknown[] }>>("/internships"),
    get: (studentId?: string) =>
      request<ApiEnvelope<{ internship: unknown }>>(
        `/internship/logs${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`,
      ),
    createLog: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ log: unknown }>>("/internship/logs", {
        method: "POST",
        body: payload,
      }),
    createDocument: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ document: unknown }>>("/internship/documents", {
        method: "POST",
        body: payload,
      }),
    updateDocumentStatus: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ document: unknown }>>(`/internship/documents/${id}/status`, {
        method: "PATCH",
        body: payload,
      }),
  },
  talent: {
    search: (query = "") => request<ApiEnvelope<{ talents: unknown[] }>>(`/talent/search${query}`),
  },
  quests: {
    list: (query = "") => request<ApiEnvelope<{ quests: unknown[] }>>(`/quests${query}`),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ quest: unknown }>>("/quests", {
        method: "POST",
        body: payload,
      }),
    accept: (questId: string) =>
      request<ApiEnvelope<{ enrollment: unknown }>>("/quests/accept", {
        method: "POST",
        body: { questId },
      }),
    completeTask: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ enrollment: unknown }>>("/quests/task/complete", {
        method: "PATCH",
        body: payload,
      }),
  },
  facilities: {
    list: () => request<ApiEnvelope<{ facilities: unknown[] }>>("/facilities"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ facility: unknown }>>("/facilities", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ facility: unknown }>>(`/facilities/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ facility: unknown; message?: string }>>(`/facilities/${id}`, {
        method: "DELETE",
      }),
  },
  automation: {
    list: () => request<ApiEnvelope<{ rules: unknown[] }>>("/automation-rules"),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ rule: unknown }>>("/automation-rules", {
        method: "POST",
        body: payload,
      }),
    update: (id: string, payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ rule: unknown }>>(`/automation-rules/${id}`, {
        method: "PATCH",
        body: payload,
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ rule: unknown }>>(`/automation-rules/${id}`, {
        method: "DELETE",
      }),
    run: (id: string) =>
      request<ApiEnvelope<{ result: unknown }>>(`/automation-rules/${id}/run`, {
        method: "POST",
      }),
  },
  audit: {
    list: () => request<ApiEnvelope<{ logs: unknown[] }>>("/audit"),
  },
  subscription: {
    plans: () => request<ApiEnvelope<{ plans: unknown[] }>>("/subscription/plans"),
    payments: (companyId?: string) =>
      request<ApiEnvelope<{ payments: unknown[] }>>(
        `/subscription/payments${companyId ? `?companyId=${encodeURIComponent(companyId)}` : ""}`,
      ),
    createPayment: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ payment: unknown }>>("/subscription/payment", {
        method: "POST",
        body: payload,
      }),
  },
  documents: {
    transcript: (studentId?: string) =>
      requestBlob(
        `/documents/transcript${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`,
      ),
    internshipCertificate: (studentId?: string) =>
      requestBlob(
        `/documents/internship-certificate${studentId ? `?studentId=${encodeURIComponent(studentId)}` : ""}`,
      ),
    cooperationSummary: (id: string) =>
      requestBlob(`/documents/cooperation-summary/${encodeURIComponent(id)}`),
  },
  files: {
    list: () => request<ApiEnvelope<{ assets: unknown[] }>>("/files/assets"),
    upload: (file: File, options?: { category?: string; visibility?: "public" | "private" }) => {
      const formData = new FormData();
      formData.append("file", file);

      const params = new URLSearchParams();
      if (options?.category) {
        params.set("category", options.category);
      }
      if (options?.visibility) {
        params.set("visibility", options.visibility);
      }

      const query = params.toString();
      return request<ApiEnvelope<{ asset: unknown }>>(
        `/files/upload${query ? `?${query}` : ""}`,
        {
          method: "POST",
          body: formData,
        },
      );
    },
    sign: (id: string) =>
      request<ApiEnvelope<{ asset: unknown; signedUrl: string }>>(`/files/assets/${id}/sign`),
  },
  offices: {
    slots: (lecturerId: string, date?: string) =>
      request<ApiEnvelope<{ officeHours: unknown[]; availableSlots: unknown[] }>>(
        `/office-hours/${encodeURIComponent(lecturerId)}${date ? `?date=${encodeURIComponent(date)}` : ""}`,
      ),
    replace: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ officeHours: unknown[] }>>("/office-hours", {
        method: "PUT",
        body: payload,
      }),
  },
};
