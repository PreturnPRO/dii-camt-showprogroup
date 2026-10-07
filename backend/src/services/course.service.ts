import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { prepareCourseSections } from "./facility.service";
import { getLecturerProfileByUserId } from "./profile.service";
import { thaiDay } from "./attendance";
import { formatDay, weekdayOf } from "./class-move-rules";
import { parseSlots } from "./enrollment-rules";

export const getCourses = async (query: { q?: string; semester?: number; academicYear?: string; lecturerId?: string }) => {
  const { q, semester, academicYear, lecturerId } = query;
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
  const course = await prisma.course.findFirst({
    where: {
      OR: [{ id: courseIdentifier }, { code: courseIdentifier }],
    },
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

  const processedSections = await prepareCourseSections(sections);

  return await prisma.course.create({
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
};

export const updateCourse = async (currentUser: any, id: string, data: any) => {
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
  }

  const preparedSections = sections ? await prepareCourseSections(sections, existing.id) : null;

  return await prisma.$transaction(async (tx) => {
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
