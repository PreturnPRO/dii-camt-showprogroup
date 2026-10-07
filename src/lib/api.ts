import type { UserRole } from "@/types";
import { createTokenStore, type KeyValueStorage } from "@/lib/token-store";

const DEFAULT_API_BASE_URL = "http://localhost:4000/api";
const TOKEN_STORAGE_KEY = "xchange_auth_token";

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

/** one class moved to another day (GET /class-moves); dates are Thai days "YYYY-MM-DD" */
export type ClassMoveView = {
  id: string; sectionId: string; sectionNumber: string; courseId: string; courseCode: string; courseName: string;
  originalDate: string; originalStart: string; originalEnd: string;
  newDate: string; newStart: string; newEnd: string;
  facilityId: string | null; room: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'withdrawn' | 'cancelled';
  reason: string; requestedById: string; decisionNote: string | null;
};
export type MoveClash = { start: number; end: number; label: string };
export type MoveCheck = { roomClashes: MoveClash[]; lecturerClashes: MoveClash[]; studentClashes: Array<{ courseCode: string; count: number }>; newEnd: string; room: string };

/** the student's registration load in their current term; maxCredits is the backend's limit */
export type RegistrationSummary = { semester: number; academicYear: string; termCredits: number; inProgressCredits: number; maxCredits: number };

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

// resolved on every call: touching window.*Storage can throw (blocked site data), and this module also loads where window is absent
const lazyStorage = (pick: () => Storage): KeyValueStorage => ({
  getItem: (key) => pick().getItem(key),
  setItem: (key, value) => pick().setItem(key, value),
  removeItem: (key) => pick().removeItem(key),
});
const tokenStore = createTokenStore(lazyStorage(() => window.localStorage), lazyStorage(() => window.sessionStorage), TOKEN_STORAGE_KEY);

export const getStoredToken = () => tokenStore.get();

export const setStoredToken = (token: string, remember = true) => {
  tokenStore.set(token, remember);
};

export const clearStoredToken = () => {
  tokenStore.clear();
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
  mustChangePassword: Boolean((user as { mustChangePassword?: boolean }).mustChangePassword),
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
  careerTracks: {
    list: () => request<ApiEnvelope<{ tracks: unknown[] }>>("/career-tracks"),
  },
  careerGoal: {
    get: () => request<ApiEnvelope<{ goal: unknown }>>("/students/career-goal"),
    set: (careerTrackId: string | null) =>
      request<ApiEnvelope<{ goal: unknown }>>("/students/career-goal", {
        method: "PUT",
        body: { careerTrackId },
      }),
  },
  trackWatches: {
    list: () => request<ApiEnvelope<{ watches: unknown[] }>>("/company/track-watches"),
    create: (careerTrackId: string, desiredSkills: string[]) =>
      request<ApiEnvelope<{ watch: unknown }>>("/company/track-watches", {
        method: "POST",
        body: { careerTrackId, desiredSkills },
      }),
    remove: (id: string) =>
      request<ApiEnvelope<{ success: boolean }>>(`/company/track-watches/${id}`, {
        method: "DELETE",
      }),
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
    profileById: (id: string) =>
      request<ApiEnvelope<{ profile: unknown }>>(`/students/profile/${encodeURIComponent(id)}`),
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
    importCompanies: (rows: Record<string, unknown>[]) =>
      request<ApiEnvelope<{ createdCount: number; updatedCount: number; failedCount: number; results: unknown[] }>>(
        "/users/import/companies",
        {
          method: "POST",
          body: { rows },
        },
      ),
    importStudents: (rows: Record<string, unknown>[]) =>
      request<ApiEnvelope<{ createdCount: number; updatedCount: number; failedCount: number; results: unknown[] }>>(
        "/users/import/students",
        {
          method: "POST",
          body: { rows },
        },
      ),
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
    summary: () => request<ApiEnvelope<{ summary: RegistrationSummary }>>("/enrollments/summary"),
    remove: (courseId: string) =>
      request<ApiEnvelope<{ message: string }>>(`/enrollments/course/${courseId}`, {
        method: "DELETE",
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
  classMoves: {
    list: (from: string, to: string) => request<ApiEnvelope<{ moves: ClassMoveView[] }>>(`/class-moves?from=${from}&to=${to}`),
    check: (payload: Record<string, unknown>) => request<ApiEnvelope<MoveCheck>>("/class-moves/check", { method: "POST", body: payload }),
    create: (payload: Record<string, unknown>) =>
      request<ApiEnvelope<{ move: ClassMoveView; studentClashes: MoveCheck["studentClashes"] }>>("/class-moves", { method: "POST", body: payload }),
    pending: () => request<ApiEnvelope<{ moves: ClassMoveView[] }>>("/class-moves/pending"),
    approve: (id: string) => request<ApiEnvelope<{ move: ClassMoveView }>>(`/class-moves/${id}/approve`, { method: "POST", body: {} }),
    reject: (id: string, note: string) => request<ApiEnvelope<{ move: ClassMoveView }>>(`/class-moves/${id}/reject`, { method: "POST", body: { note } }),
    withdraw: (id: string) => request<ApiEnvelope<{ move: ClassMoveView }>>(`/class-moves/${id}/withdraw`, { method: "POST", body: {} }),
    cancel: (id: string) => request<ApiEnvelope<{ move: ClassMoveView }>>(`/class-moves/${id}/cancel`, { method: "POST", body: {} }),
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
    download: (id: string) =>
      requestBlob(`/files/assets/${encodeURIComponent(id)}`),
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
