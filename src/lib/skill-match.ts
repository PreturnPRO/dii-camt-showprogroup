export type TalentMatch = { matchedSkills: string[]; missingSkills: string[] };

/** Match numbers come from talent search (skills students actually listed), never from applicant counts. */
export const summarizeMatches = (talents: TalentMatch[], requiredCount: number) => {
  if (requiredCount <= 0) return { matchedStudents: 0, avgMatch: 0 };
  const matching = talents.filter((item) => item.matchedSkills.length > 0);
  if (matching.length === 0) return { matchedStudents: 0, avgMatch: 0 };
  const total = matching.reduce((sum, item) => sum + item.matchedSkills.length / requiredCount, 0);
  return { matchedStudents: matching.length, avgMatch: Math.round((total / matching.length) * 100) };
};
