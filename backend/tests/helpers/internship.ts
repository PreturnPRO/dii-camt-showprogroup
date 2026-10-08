import bcrypt from "bcryptjs";
import { prisma } from "../../src/lib/prisma";
import { loginAs, SEED_PASSWORD, uniqueEmail } from "./auth";

const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();

/** A student no other test touches, advised by narin, optionally interning at Northern Soft. */
export async function freshIntern({ withRecord = false } = {}) {
  const email = uniqueEmail("intern");
  const advisor = await prisma.lecturerProfile.findFirstOrThrow({ where: { user: { email: "narin@showpro.local" } } });
  const company = await prisma.companyProfile.findFirstOrThrow({ where: { user: { email: "talent@northernsoft.local" } } });
  const user = await prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: email, role: "STUDENT",
      studentProfile: { create: { studentId: `I${uid()}`, major: "DII", program: "bachelor", year: 3, semester: 1, academicYear: "2569", advisorId: advisor.id } },
    },
    include: { studentProfile: true },
  });
  const profile = user.studentProfile!;
  const record = withRecord
    ? await prisma.internshipRecord.create({ data: { studentId: profile.id, companyId: company.id, companyName: company.companyName, status: "in_progress" } })
    : null;
  return { userId: user.id, profile, record, auth: `Bearer ${await loginAs(email)}` };
}

export const authOf = async (email: string) => `Bearer ${await loginAs(email)}`;

/** A lecturer no other test touches, with the given weekly office hours. */
export async function freshLecturer(officeHours: Array<{ day: string; startTime: string; endTime: string; location: string }> = []) {
  const email = uniqueEmail("lecturer");
  const user = await prisma.user.create({
    data: {
      email, passwordHash: await bcrypt.hash(SEED_PASSWORD, 4), name: email, nameThai: `อาจารย์ ${email}`, role: "LECTURER",
      lecturerProfile: { create: { lecturerId: `L${uid()}`, department: "DII", position: "Lecturer", specialization: [], researchInterests: [] } },
    },
    include: { lecturerProfile: true },
  });
  const profile = user.lecturerProfile!;
  if (officeHours.length) await prisma.officeHour.createMany({ data: officeHours.map((slot) => ({ ...slot, lecturerId: profile.id })) });
  return { userId: user.id, profile, auth: `Bearer ${await loginAs(email)}` };
}
