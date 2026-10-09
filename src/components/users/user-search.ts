type Searchable = { name?: string; nameThai?: string; nameEn?: string; email?: string; identifier?: string };

/** the Users page search: names in both languages, email, student/staff ID and the role (G6, staff ST-M3) */
export const userMatches = (user: Searchable, query: string, roleText: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [user.name, user.nameThai, user.nameEn, user.email, user.identifier, roleText].some((field) => (field ?? '').toLowerCase().includes(q));
};
