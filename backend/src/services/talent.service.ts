import { prisma } from "../lib/prisma";
import { AppError } from "../utils/errors";

export const searchTalent = async (
  companyId: string,
  {
    jobId,
    skills,
    careerTrackId,
    q,
    major,
    minGpax,
    year,
  }: {
    jobId?: string;
    skills?: string[];
    careerTrackId?: string;
    q?: string;
    major?: string;
    minGpax?: number;
    year?: number;
  },
) => {
  const company = await prisma.companyProfile.findUnique({
    where: { id: companyId },
  });

  if (!company) {
    throw new AppError(404, "Company profile not found");
  }

  const job = jobId
    ? await prisma.jobPosting.findUnique({
        where: { id: jobId },
      })
    : null;

  // Explicit skills param wins; otherwise fall back to the linked job's
  // requirements — either way this becomes the honest "X/Y skills matched"
  // set, never a fabricated score.
  const desiredSkills = skills && skills.length ? skills : job ? [...job.requirements, ...job.preferredSkills] : [];

  const students = await prisma.studentProfile.findMany({
    where: {
      AND: [
        major ? { major: { contains: major, mode: "insensitive" } } : {},
        typeof minGpax === "number" ? { gpax: { gte: minGpax } } : {},
        typeof year === "number" ? { year } : {},
        careerTrackId ? { careerGoal: { careerTrackId } } : {},
        q
          ? {
              OR: [
                { user: { name: { contains: q, mode: "insensitive" } } },
                { user: { nameThai: { contains: q, mode: "insensitive" } } },
                { major: { contains: q, mode: "insensitive" } },
                {
                  skills: {
                    some: {
                      skill: { name: { contains: q, mode: "insensitive" } },
                    },
                  },
                },
              ],
            }
          : {},
        {
          OR: [
            { consent: { allowDataSharing: true } },
            {
              consent: {
                sharedWithCompanies: {
                  has: company.id,
                },
              },
            },
          ],
        },
      ],
    },
    include: {
      user: { select: { id: true, name: true, nameThai: true, email: true } },
      skills: { include: { skill: true } },
      portfolio: { include: { projects: true } },
      consent: true,
      badges: true,
      careerGoal: { include: { careerTrack: true } },
    },
  });

  const results = students.map((student) => {
    const skillNames = student.skills.map((item) => item.skill.name);
    const skillSet = new Set(skillNames.map((item) => item.toLowerCase()));
    const matchedSkills = desiredSkills.filter((skill) => skillSet.has(skill.toLowerCase()));
    const missingSkills = desiredSkills.filter((skill) => !skillSet.has(skill.toLowerCase()));

    return {
      id: student.id,
      userId: student.user.id,
      studentId: student.studentId,
      name: student.user.name,
      nameThai: student.user.nameThai,
      email: student.user.email,
      major: student.major,
      year: student.year,
      gpax: student.gpax,
      skills: skillNames,
      matchedSkills,
      missingSkills,
      careerGoal: student.careerGoal
        ? {
            id: student.careerGoal.careerTrack.id,
            name: student.careerGoal.careerTrack.name,
            nameThai: student.careerGoal.careerTrack.nameThai,
          }
        : null,
      badges: student.badges,
      portfolio: student.portfolio
        ? {
            summary: student.portfolio.summary,
            githubUrl: student.portfolio.githubUrl,
            linkedinUrl: student.portfolio.linkedinUrl,
            projectCount: student.portfolio.projects.length,
          }
        : null,
    };
  });

  return results.sort((a, b) => b.matchedSkills.length - a.matchedSkills.length || b.gpax - a.gpax);
};
