// Company-side "favorite student" list — a private, per-company bookmark list.
// Mirrors the approved wireframe's own reference implementation: stored purely in
// localStorage (no backend model), never notifies the student, scoped per company
// so multiple company accounts on the same browser don't share a list.

export type FavoriteStudent = {
  id: string;
  nameThai: string;
  meta: string; // e.g. "GPA 3.6 · ปี 2 · วิศวคอมพิวเตอร์"
  addedAt: string;
};

const STORAGE_PREFIX = 'showpro:company-favorites:';

const keyFor = (companyId: string) => `${STORAGE_PREFIX}${companyId}`;

export function getFavorites(companyId: string): FavoriteStudent[] {
  if (!companyId) return [];
  try {
    const raw = window.localStorage.getItem(keyFor(companyId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function isFavorite(companyId: string, studentId: string): boolean {
  return getFavorites(companyId).some((item) => item.id === studentId);
}

export function toggleFavorite(companyId: string, student: FavoriteStudent): FavoriteStudent[] {
  const current = getFavorites(companyId);
  const exists = current.some((item) => item.id === student.id);
  const next = exists
    ? current.filter((item) => item.id !== student.id)
    : [{ ...student, addedAt: new Date().toISOString() }, ...current];
  try {
    window.localStorage.setItem(keyFor(companyId), JSON.stringify(next));
  } catch {
    // localStorage unavailable — favorites just won't persist this session.
  }
  return next;
}
