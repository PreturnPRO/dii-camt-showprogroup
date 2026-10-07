/** credits against the whole curriculum (owner decision 7/10/69: no categories — courses carry none) */
export const creditProgress = ({ requiredCredits, completedCredits, inProgressCredits }: {
  requiredCredits: number | null; completedCredits: number; inProgressCredits: number;
}) => {
  const total = requiredCredits && requiredCredits > 0 ? requiredCredits : null;
  return {
    completed: completedCredits,
    inProgress: inProgressCredits,
    remaining: total === null ? null : Math.max(0, total - completedCredits - inProgressCredits),
    percent: total === null ? null : Math.min(100, Math.round((completedCredits / total) * 100)),
  };
};
