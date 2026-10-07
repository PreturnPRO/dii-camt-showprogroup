import type { BackendUser } from "@/lib/api";
import type { UserRole } from "@/types";
import { asArray, asNumber, asString } from "./live-data";

export type AuthLikeUser = {
  id: string;
  email: string;
  name: string;
  nameThai: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  raw?: unknown;
};

export type BackendProfile = Record<string, unknown>;

const profileKeyByRole: Record<UserRole, keyof BackendUser> = {
  student: "studentProfile",
  lecturer: "lecturerProfile",
  staff: "staffProfile",
  company: "companyProfile",
  admin: "adminProfile",
};

export const asRecord = (value: unknown): BackendProfile =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as BackendProfile) : {};

// same behaviour as live-data's helpers — one implementation (asRecord above differs: arrays → {})
export { asArray, asNumber, asString };

export const getBackendUser = (user: AuthLikeUser | null | undefined) => asRecord(user?.raw) as BackendUser;

export const getRoleProfile = (user: AuthLikeUser | null | undefined) => {
  if (!user) return {};
  const backendUser = getBackendUser(user);
  return asRecord(backendUser[profileKeyByRole[user.role]]);
};

export const getProfileId = (user: AuthLikeUser | null | undefined) => asString(getRoleProfile(user).id, user?.id ?? "");

export const getDisplayName = (user: AuthLikeUser | null | undefined, language: "th" | "en" = "th") => {
  if (!user) return "";
  if (language === "th") return user.nameThai || user.name || user.email;
  return user.name || user.nameThai || user.email;
};

export const formatDate = (value: unknown, locale: string) => {
  if (!value) return "-";
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale, { day: "numeric", month: "short", year: "numeric" });
};

