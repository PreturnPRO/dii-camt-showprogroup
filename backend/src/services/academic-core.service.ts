import { prisma } from "../lib/prisma";

export const getStudentTranscript = async (studentId: string) => {
  return await prisma.enrollment.findMany({
    where: { studentId, status: { not: "dropped" } },
    include: {
      course: true,
      section: true,
      scores: { include: { criteria: true } },
    },
    orderBy: [{ course: { academicYear: "desc" } }, { course: { semester: "desc" } }],
  });
};
