import { prisma } from "../lib/prisma";
import { hideDraftScores } from "./enrollment.service";

export const getStudentTranscript = async (studentId: string) => {
  const rows = await prisma.enrollment.findMany({
    where: { studentId, status: { not: "dropped" } },
    include: {
      course: true,
      section: true,
      scores: { include: { criteria: true } },
    },
    orderBy: [{ course: { academicYear: "desc" } }, { course: { semester: "desc" } }],
  });
  return rows.map(hideDraftScores);
};
