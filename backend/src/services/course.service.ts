import { Prisma, Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { prepareCourseSections } from "./facility.service";
import { HOLDS_TIME, assertLecturerFree, lockLecturerTerm } from "./course-review";
import { getLecturerProfileByUserId } from "./profile.service";
import { thaiDay } from "./attendance";
import { formatDay, weekdayOf } from "./class-move-rules";
import { parseSlots } from "./enrollment-rules";

export const getCourses = async (query: { q?: string; semester?: number; academicYear?: string; lecturerId?: string; status?: string }) => {
  const { q, semester, academicYear, lecturerId, status } = query;
  return await prisma.course.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { code: { contains: String(q), mode: "insensitive" } },
                { name: { contains: String(q), mode: "insensitive" } },
                { nameThai: { contains: String(q), mode: "insensitive" } },
              ],
            }
          : {},
        semester ? { semester: Number(semester) } : {},
        academicYear ? { academicYear: String(academicYear) } : {},
        lecturerId ? { lecturerId: String(lecturerId) } : {},
        status ? { status: String(status) } : {},
      ],
    },
    include: {
      lecturer: { include: { user: true } },
      sections: { include: { facility: true } },
      materials: true,
      enrollments: true,
      gradingCriteria: { orderBy: { orderIndex: "asc" } },
      gradeCutoffs: true,
    },
    orderBy: [{ academicYear: "desc" }, { semester: "desc" }, { code: "asc" }],
  });
};

export const getCourseById = async (courseIdentifier: string) => {
  // a code names a course in every term it ran; the latest term is the one meant
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseIdentifier }, { code: courseIdentifier }],
    },
    orderBy: [{ academicYear: "desc" }, { semester: "desc" }],
    include: {
      lecturer: { include: { user: true } },
      sections: { include: { facility: true } },
      materials: true,
      gradingCriteria: { orderBy: { orderIndex: "asc" } },
      gradeCutoffs: true,
      enrollments: {
        include: {
          student: { include: { user: true } },
        },
      },
    },
  });

  if (!course) {
    throw new AppError(404, "Course not found");
  }

  return course;
};

export const createCourse = async (data: any) => {
  const { sections, materials, gradingCriteria: inputGradingCriteria, gradeCutoffs, ...courseData } = data;

  let gradingCriteria = inputGradingCriteria;
  if (!gradingCriteria || gradingCriteria.length === 0) {
    gradingCriteria = [
      { name: 'Midterm', weightPercentage: 30, maxScore: 100, orderIndex: 0 },
      { name: 'Final', weightPercentage: 40, maxScore: 100, orderIndex: 1 },
      { name: 'Assignments', weightPercentage: 10, maxScore: 100, orderIndex: 2 },
      { name: 'Participation', weightPercentage: 10, maxScore: 100, orderIndex: 3 },
      { name: 'Project', weightPercentage: 10, maxScore: 100, orderIndex: 4 },
    ];
  }

  let finalGradeCutoffs = gradeCutoffs;
  if (!finalGradeCutoffs || finalGradeCutoffs.length === 0) {
    finalGradeCutoffs = [
      { grade: 'A', minScore: 80 },
      { grade: 'B+', minScore: 75 },
      { grade: 'B', minScore: 70 },
      { grade: 'C+', minScore: 65 },
      { grade: 'C', minScore: 60 },
      { grade: 'D+', minScore: 55 },
      { grade: 'D', minScore: 50 },
      { grade: 'F', minScore: 0 },
    ];
  }

  if (gradingCriteria) {
    const totalWeight = gradingCriteria.reduce((sum: number, c: any) => sum + (Number(c.weightPercentage) || 0), 0);
    if (totalWeight > 100) {
      throw new AppError(400, "Total grading criteria weight cannot exceed 100%");
    }
  }

  if (courseData.lecturerId && !(await prisma.lecturerProfile.findUnique({ where: { id: courseData.lecturerId } }))) {
    throw new AppError(400, "The chosen instructor does not exist");
  }

  const existing = await prisma.course.findFirst({
    where: {
      code: courseData.code,
      semester: courseData.semester,
      academicYear: courseData.academicYear,
    },
  });

  if (existing) {
    throw new AppError(409, `Course ${courseData.code} already exists for ${courseData.semester}/${courseData.academicYear}`);
  }

  const processedSections = await prepareCourseSections(sections, undefined, courseData);

  return await prisma.$transaction(async (tx) => {
  if (HOLDS_TIME.includes(courseData.status ?? "active")) {
    await lockLecturerTerm(tx, courseData.lecturerId, Number(courseData.semester), String(courseData.academicYear));
    await assertLecturerFree(tx, { ...courseData, semester: Number(courseData.semester), sections: processedSections });
  }
  return await tx.course.create({
    data: {
      ...courseData,
      sections: { create: processedSections },
      materials: { create: materials },
      gradingCriteria: { create: gradingCriteria },
      gradeCutoffs: { create: finalGradeCutoffs },
    },
    include: {
      lecturer: { include: { user: true } },
      sections: { include: { facility: true } },
      materials: true,
      gradingCriteria: true,
      gradeCutoffs: true,
    },
  });
  });
};

/** sections compared by what students see of them: number, seats, room and weekly times */
const sectionShape = (sections: Array<{ number: string; maxStudents?: number | null; facilityId?: string | null; schedule?: unknown }>) =>
  JSON.stringify(
    [...sections]
      .map((s) => ({
        number: s.number,
        maxStudents: s.maxStudents ?? null,
        facilityId: s.facilityId ?? null,
        schedule: (Array.isArray(s.schedule) ? s.schedule : [])
          .map((slot: any) => `${String(slot.day).toLowerCase()}|${slot.startTime}|${slot.endTime}`)
          .sort(),
      }))
      .sort((a, b) => a.number.localeCompare(b.number)),
  );

const updateCourseUnchecked = async (currentUser: any, id: string, data: any) => {
  const { sections, materials, gradingCriteria, gradeCutoffs, ...courseData } = data;

  if (gradingCriteria) {
    const totalWeight = gradingCriteria.reduce((sum: number, c: any) => sum + (Number(c.weightPercentage) || 0), 0);
    if (totalWeight > 100) {
      throw new AppError(400, "Total grading criteria weight cannot exceed 100%");
    }
  }

  const existing = await prisma.course.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Course not found");
  }

  if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    if (existing.lecturerId !== lecturer.id) {
      throw new AppError(403, "You can only update your own courses");
    }
    if (courseData.lecturerId && courseData.lecturerId !== lecturer.id) {
      throw new AppError(403, "Lecturers cannot reassign courses");
    }
    // owner decision 9/10/69: once a course is open, its shape (credits, term, code, sections, times,
    // rooms) is changed by staff; the lecturer keeps the description, materials and grading
    if (existing.status === "active") {
      const changed = (["code", "credits", "semester", "academicYear"] as const).filter(
        (field) => courseData[field] !== undefined && String(courseData[field]) !== String(existing[field]),
      );
      if (sections) {
        const current = await prisma.section.findMany({ where: { courseId: existing.id } });
        if (sectionShape(current) !== sectionShape(sections)) changed.push("sections" as never);
        // the room text students see is part of the shape too (only when the request sends one)
        const roomMoved = sections.some((s: { number: string; room?: string | null }) =>
          s.room !== undefined && (s.room ?? "").trim() !== (current.find((c) => c.number === s.number)?.room ?? "").trim());
        if (roomMoved && !changed.includes("sections" as never)) changed.push("rooms" as never);
      }
      if (changed.length > 0) {
        throw new AppError(403, `An open course's ${changed.join(", ")} can only be changed by staff`);
      }
    }
  }

  // the queue is moved only by review and submit (they notify and keep the note right): review M2
  if (courseData.status !== undefined && courseData.status !== existing.status &&
      (existing.status === "pending" || courseData.status === "pending" || (existing.status === "rejected" && courseData.status === "active"))) {
    throw new AppError(409, "Use approve / send back / send again to move a course in the approval queue", { code: "USE_REVIEW" });
  }

  // the course as it will be after this save: its term, lecturer, status and sections
  const next = {
    lecturerId: String(courseData.lecturerId ?? existing.lecturerId),
    semester: Number(courseData.semester ?? existing.semester),
    academicYear: String(courseData.academicYear ?? existing.academicYear),
    status: String(courseData.status ?? existing.status),
  };
  const preparedSections = sections ? await prepareCourseSections(sections, existing.id, next) : null;

  return await prisma.$transaction(async (tx) => {
    // only a save that moves the course in time or to someone is checked: editing the grading of a
    // course that already overlaps something must not be blocked by it
    const sectionsChange = Boolean(sections) &&
      sectionShape(await tx.section.findMany({ where: { courseId: existing.id } })) !== sectionShape(sections);
    const movesInTime = sectionsChange || next.lecturerId !== existing.lecturerId || next.semester !== existing.semester ||
      next.academicYear !== existing.academicYear || (next.status !== existing.status && !HOLDS_TIME.includes(existing.status));
    if (HOLDS_TIME.includes(next.status) && movesInTime) {
      await lockLecturerTerm(tx, next.lecturerId, next.semester, next.academicYear);
      const nextSections = preparedSections ?? (await tx.section.findMany({ where: { courseId: existing.id } }));
      await assertLecturerFree(tx, { ...next, courseId: existing.id, sections: nextSections });
    }
    // owner decision 7/10/69: a weekly change may not drop a class that has a one-time move waiting or in effect
    if (preparedSections) {
      const today = thaiDay(new Date());
      const pendingMoves = await tx.classMove.findMany({
        where: { section: { courseId: existing.id }, status: { in: ["pending", "approved"] }, originalDate: { gt: today }, newDate: { gt: today } },
        include: { section: true },
      });
      const nextByNumber = new Map(preparedSections.map((s: { number: string; schedule: unknown }) => [s.number, parseSlots(s.schedule)]));
      const broken = pendingMoves.filter((m) => {
        const slots = nextByNumber.get(m.section.number);
        return !slots?.some((s) => s.day === weekdayOf(m.originalDate) && s.startTime === m.originalStart);
      });
      if (broken.length > 0) {
        throw new AppError(409, "Cancel the pending class moves first", broken.map((m) => ({
          moveId: m.id, sectionNumber: m.section.number, originalDate: formatDay(m.originalDate), originalStart: m.originalStart,
          newDate: formatDay(m.newDate), newStart: m.newStart,
        })));
      }
    }

    // sections are matched by number and updated in place, so enrollments keep their sectionId (seats, clashes)
    if (preparedSections) {
      const current = await tx.section.findMany({
        where: { courseId: existing.id },
        include: { enrollments: { where: { status: { not: "dropped" } }, select: { id: true } } },
      });
      const incoming = new Set(preparedSections.map((s: { number: string }) => s.number));
      const removed = current.filter((s) => !incoming.has(s.number));
      const occupied = removed.filter((s) => s.enrollments.length > 0);
      if (occupied.length > 0) {
        throw new AppError(409, `Section ${occupied.map((s) => s.number).join(", ")} still has enrolled students`);
      }
      // dropped enrollments may still point at an empty section; detach them before it goes
      const removedIds = removed.map((s) => s.id);
      await tx.enrollment.updateMany({ where: { sectionId: { in: removedIds } }, data: { sectionId: null } });
      await tx.section.deleteMany({ where: { id: { in: removedIds } } });
      for (const section of preparedSections) {
        const match = current.find((s) => s.number === section.number);
        if (match) {
          await tx.section.update({ where: { id: match.id }, data: section });
        } else {
          await tx.section.create({ data: { ...section, courseId: existing.id } });
        }
      }
    }

    if (materials) {
      await tx.courseMaterial.deleteMany({
        where: { courseId: existing.id },
      });
    }

    if (gradingCriteria) {
      const incomingIds = gradingCriteria.filter((c: any) => c.id).map((c: any) => c.id);

      await tx.courseGradingCriteria.deleteMany({
        where: {
          courseId: existing.id,
          id: { notIn: incomingIds }
        },
      });

      for (let i = 0; i < gradingCriteria.length; i++) {
        const item = gradingCriteria[i];
        if (item.id) {
          await tx.courseGradingCriteria.update({
            where: { id: item.id },
            data: {
              name: item.name,
              weightPercentage: item.weightPercentage,
              maxScore: item.maxScore,
              orderIndex: i
            }
          });
        } else {
          await tx.courseGradingCriteria.create({
            data: {
              courseId: existing.id,
              name: item.name,
              weightPercentage: item.weightPercentage,
              maxScore: item.maxScore,
              orderIndex: i
            }
          });
        }
      }
    }

    if (gradeCutoffs) {
      await tx.courseGradeCutoff.deleteMany({
        where: { courseId: existing.id },
      });
    }

    return tx.course.update({
      where: { id: existing.id },
      data: {
        ...courseData,
        ...(materials && {
          materials: {
            create: materials,
          },
        }),

        ...(gradeCutoffs && {
          gradeCutoffs: {
            create: gradeCutoffs,
          },
        }),
      },
      include: {
        lecturer: { include: { user: true } },
        sections: { include: { facility: true } },
        materials: true,
        gradingCriteria: { orderBy: { orderIndex: 'asc' } },
        gradeCutoffs: true,
      },
    });
  });
};

export const updateCourse = async (currentUser: any, id: string, data: any) => {
  try {
    return await updateCourseUnchecked(currentUser, id, data);
  } catch (error) {
    // a new code or term that another course already has: name the term, not "record exists"
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const current = await prisma.course.findUnique({ where: { id } });
      const code = data.code ?? current?.code;
      const term = `${data.semester ?? current?.semester}/${data.academicYear ?? current?.academicYear}`;
      throw new AppError(409, `Course ${code} already exists for ${term}`);
    }
    throw error;
  }
};
