type DirectoryLecturer = { id: string; name: string; nameThai: string; department?: string };

/** the lecturers a student can book, narrowed by a search, with the student's own advisor first (S-M3) */
export const lecturerDirectory = <T extends DirectoryLecturer>(lecturers: T[], query: string, advisorId: string | null): T[] => {
  const q = query.trim().toLowerCase();
  const matches = q
    ? lecturers.filter((l) => [l.name, l.nameThai, l.department ?? ''].some((field) => field.toLowerCase().includes(q)))
    : lecturers;
  const advisor = advisorId ? matches.filter((l) => l.id === advisorId) : [];
  return [...advisor, ...matches.filter((l) => l.id !== advisorId)];
};
