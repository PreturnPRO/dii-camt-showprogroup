import { Role } from "@prisma/client";
import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";
import { prepareCourseSections } from "./facility.service";
import { getLecturerProfileByUserId } from "./profile.service";

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
      assignments: true,
      enrollments: true,
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
      assignments: { include: { submissions: true } },
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
  const { sections, materials, ...courseData } = data;
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
    },
    include: {
      lecturer: { include: { user: true } },
      sections: { include: { facility: true } },
      materials: true,
    },
  });
};

export const updateCourse = async (currentUser: any, id: string, data: any) => {
  const { sections, materials, ...courseData } = data;
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

  return await prisma.$transaction(async (tx) => {
    if (sections) {
      await tx.section.deleteMany({
        where: { courseId: existing.id },
      });
    }

    if (materials) {
      await tx.courseMaterial.deleteMany({
        where: { courseId: existing.id },
      });
    }

    return tx.course.update({
      where: { id: existing.id },
      data: {
        ...courseData,
        ...(sections && {
          sections: {
            create: await prepareCourseSections(sections, existing.id),
          },
        }),
        ...(materials && {
          materials: {
            create: materials,
          },
        }),
      },
      include: {
        lecturer: { include: { user: true } },
        sections: { include: { facility: true } },
        materials: true,
      },
    });
  });
};

export const deleteCourse = async (currentUser: any, id: string) => {
  const existing = await prisma.course.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new AppError(404, "Course not found");
  }

  if (currentUser.role === Role.LECTURER) {
    const lecturer = await getLecturerProfileByUserId(currentUser.id);
    if (existing.lecturerId !== lecturer.id) {
      throw new AppError(403, "You can only delete your own courses");
    }
  }

  await prisma.course.delete({
    where: { id },
  });
};

export const importCourses = async (coursesData: any[]) => {
  let successCount = 0;
  let skipCount = 0;
  const errors: string[] = [];

  for (const courseData of coursesData) {
    try {
      const existing = await prisma.course.findFirst({
        where: {
          code: courseData.code,
          semester: courseData.semester,
          academicYear: courseData.academicYear,
        },
      });

      if (existing) {
        skipCount++;
        continue;
      }

      await prisma.course.create({
        data: {
          code: courseData.code,
          name: courseData.name,
          nameThai: courseData.nameThai || courseData.name,
          credits: courseData.credits,
          semester: courseData.semester,
          academicYear: courseData.academicYear,
          year: courseData.year,
          lecturerId: courseData.lecturerId,
          description: courseData.description || "",
          prerequisites: courseData.prerequisites || [],
          status: "active",
          room: courseData.room || "",
          schedule: courseData.schedule || [],
          maxStudents: courseData.maxStudents || 60,
          sections: {
            create: [
              {
                number: "01",
                maxStudents: courseData.maxStudents || 60,
                room: courseData.room || "",
                schedule: courseData.schedule || [],
              },
            ],
          },
        },
      });

      successCount++;
    } catch (error) {
      errors.push(`Failed to import ${courseData.code}: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  return { successCount, skipCount, errors };
};

export const getLecturerSchedule = async (lecturerId: string) => {
  return await prisma.course.findMany({
    where: {
      lecturerId,
      status: "active",
    },
    include: {
      sections: true,
      enrollments: true,
    },
    orderBy: {
      code: "asc",
    },
  });
};
