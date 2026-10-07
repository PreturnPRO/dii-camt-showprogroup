import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

type Viewer = { id: string; role: Role };
type StudentRef = { id: string; userId: string; advisorId: string | null };

export const PUBLIC_USER_SELECT = { id: true, name: true, nameThai: true, avatar: true } as const;

export const isStaffOrAdmin = (role: Role) => role === Role.STAFF || role === Role.ADMIN;

export const lecturerProfileIdOf = async (userId: string) =>
  (await prisma.lecturerProfile.findUnique({ where: { userId }, select: { id: true } }))?.id ?? null;

export const canViewStudentRecord = async (user: Viewer, student: StudentRef): Promise<boolean> => {
  if (isStaffOrAdmin(user.role)) return true;
  if (user.role === Role.STUDENT) return student.userId === user.id;
  if (user.role !== Role.LECTURER) return false;
  const lecturerId = await lecturerProfileIdOf(user.id);
  if (!lecturerId) return false;
  if (student.advisorId === lecturerId) return true;
  const teaches = await prisma.enrollment.count({
    where: { studentId: student.id, status: { not: "dropped" }, course: { lecturerId } },
  });
  return teaches > 0;
};

/** Prisma filter: students a lecturer advises or teaches (non-dropped enrollment). */
export const lecturerStudentsWhere = (lecturerId: string) => ({
  OR: [
    { advisorId: lecturerId },
    { enrollments: { some: { status: { not: "dropped" }, course: { lecturerId } } } },
  ],
});

export const assertCanViewStudentRecord = async (user: Viewer, student: StudentRef) => {
  if (!(await canViewStudentRecord(user, student))) {
    throw new AppError(403, "You do not have access to this student's records");
  }
};

export const assertCourseManager = async (user: Viewer, courseId: string) => {
  const course = await prisma.course.findUnique({ where: { id: courseId } });
  if (!course) throw new AppError(404, "Course not found");
  if (isStaffOrAdmin(user.role)) return course;
  if (user.role === Role.LECTURER && course.lecturerId === (await lecturerProfileIdOf(user.id))) return course;
  throw new AppError(403, "You can only manage your own courses");
};

export const gpaBand = (value: number | null | undefined) => {
  const gpax = Number(value ?? 0);
  if (gpax >= 3.5) return "3.50+";
  if (gpax >= 3) return "3.00-3.49";
  if (gpax >= 2.5) return "2.50-2.99";
  if (gpax > 0) return "below 2.50";
  return "not_disclosed";
};

export type ViewerContext = Viewer & { studentProfileId: string | null; lecturerProfileId: string | null };

export const viewerContext = async (req: { user?: unknown }): Promise<ViewerContext | null> => {
  const user = req.user as Viewer | undefined;
  if (!user) return null;
  const [student, lecturer] = await Promise.all([
    user.role === Role.STUDENT
      ? prisma.studentProfile.findUnique({ where: { userId: user.id }, select: { id: true } })
      : null,
    user.role === Role.LECTURER ? lecturerProfileIdOf(user.id) : null,
  ]);
  return { id: user.id, role: user.role, studentProfileId: student?.id ?? null, lecturerProfileId: lecturer };
};

type UserLike = Record<string, unknown> & { id?: unknown };

const publicUser = (user: unknown, withEmail: boolean) => {
  if (!user || typeof user !== "object") return user;
  const u = user as UserLike;
  return {
    id: u.id,
    name: u.name,
    nameThai: u.nameThai,
    avatar: u.avatar,
    ...(withEmail ? { email: u.email } : {}),
  };
};

type ScopableCourse = {
  lecturerId: string;
  enrollments?: Array<{ studentId: string; status?: string; sectionId?: string | null; student?: { user?: unknown } }>;
  sections?: Array<{ id: string } & object>;
  lecturer?: ({ user?: unknown } & object) | null;
};

/** Cuts a course down to what the viewer may see: full for staff/admin and the owning lecturer,
 *  own enrollment only for a student, no enrollment rows for anyone else. */
export const scopeCourseForViewer = <T extends ScopableCourse>(course: T, viewer: ViewerContext | null): T => {
  const all = course.enrollments ?? [];
  const active = all.filter((e) => e.status !== "dropped");
  // seat counts are numbers, not names, so every viewer gets them
  const withSeats = {
    ...course,
    ...(course.sections && course.enrollments
      ? { sections: course.sections.map((s) => ({ ...s, enrolledCount: active.filter((e) => e.sectionId === s.id).length })) }
      : {}),
  };
  if (viewer && isStaffOrAdmin(viewer.role)) return withSeats;
  if (viewer?.role === Role.LECTURER && viewer.lecturerProfileId === course.lecturerId) return withSeats;

  const visible =
    viewer?.role === Role.STUDENT && viewer.studentProfileId
      ? all.filter((e) => e.studentId === viewer.studentProfileId)
      : [];

  return {
    ...withSeats,
    ...(course.enrollments
      ? {
          enrollmentCount: active.length,
          enrollments: visible.map((e) =>
            e.student ? { ...e, student: { ...e.student, user: publicUser(e.student.user, true) } } : e,
          ),
        }
      : {}),
    ...(course.lecturer ? { lecturer: { ...course.lecturer, user: publicUser(course.lecturer.user, true) } } : {}),
  };
};

type ScopableActivity = {
  enrollments?: Array<{
    studentId?: string;
    student?: ({ id?: string; user?: unknown; consent?: { showInLeaderboard?: boolean } | null } & object) | null;
  }>;
};

/** Staff/lecturers see participants in full; students see names only (leaderboard) and not those who opted out
 *  of the leaderboard (except themselves); companies see none. */
export const scopeActivityForViewer = <T extends ScopableActivity>(
  activity: T,
  viewer: Viewer & { studentProfileId?: string | null },
): T => {
  if (viewer.role === Role.LECTURER || isStaffOrAdmin(viewer.role)) return activity;
  const all = activity.enrollments ?? [];
  if (viewer.role === Role.STUDENT) {
    return {
      ...activity,
      enrollments: all.map((e, index) => {
        if (!e.student) return e;
        const hidden = e.student.consent?.showInLeaderboard === false && e.studentId !== viewer.studentProfileId;
        if (hidden) {
          // an anonymous row keeps the participant count but carries no id that a public profile lookup could use
          const anonymousId = `hidden-${index}`;
          return { studentId: anonymousId, student: { id: anonymousId, user: null } };
        }
        return { ...e, student: { id: e.student.id, user: publicUser(e.student.user, false) } };
      }),
    };
  }
  return { ...activity, enrollments: [], enrollmentCount: all.length };
};
