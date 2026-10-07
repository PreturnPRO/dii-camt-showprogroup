/**
 * Query Key Factory for TanStack Query.
 * Centralized key management ensures type safety and predictable cache invalidation.
 */
export const queryKeys = {
  // 1. Dashboard Domain
  dashboard: {
    all: () => ['dashboard'] as const,
    student: (studentId?: string) => ['dashboard', 'student', studentId] as const,
    staff: () => ['dashboard', 'staff'] as const,
    lecturer: (lecturerId?: string) => ['dashboard', 'lecturer', lecturerId] as const,
    company: (companyId?: string) => ['dashboard', 'company', companyId] as const,
    admin: () => ['dashboard', 'admin'] as const,
  },

  // 2. Courses Domain
  courses: {
    all: () => ['courses'] as const,
    list: (role?: string) => ['courses', 'list', role] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
    lecturers: () => ['courses', 'lecturers'] as const,
    lecturerSchedule: () => ['courses', 'lecturer-schedule'] as const,
  },

  // 3. Requests Domain
  requests: {
    all: () => ['requests'] as const,
    list: () => ['requests', 'list'] as const,
    detail: (id: string) => ['requests', 'detail', id] as const,
  },

  // 4. Internship Domain
  internships: {
    all: () => ['internships'] as const,
    list: () => ['internships', 'list'] as const,
    detail: (id: string) => ['internships', 'detail', id] as const,
    myDiary: () => ['internships', 'my-diary'] as const,
  },

  // 5. User / Profile Domain
  users: {
    all: () => ['users'] as const,
    list: (role?: string) => ['users', 'list', role] as const,
    profile: (id: string) => ['users', 'profile', id] as const,
    students: () => ['users', 'students'] as const,
    lecturers: () => ['users', 'lecturers'] as const,
  },

  // 6. Activities Domain
  activities: {
    all: () => ['activities'] as const,
    list: () => ['activities', 'list'] as const,
    my: () => ['activities', 'my'] as const,
  },

  // 7. Grades Domain
  grades: {
    all: () => ['grades'] as const,
    my: () => ['grades', 'my'] as const,
    course: (courseId: string) => ['grades', 'course', courseId] as const,
  },
} as const;
