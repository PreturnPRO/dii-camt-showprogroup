import { z } from "zod";
import { AppError } from "../utils/errors";

const HTTP_SCHEME = /^https?:\/\//i;

export const isHttpUrl = (value: unknown): boolean => {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return HTTP_SCHEME.test(trimmed) && z.string().url().safeParse(trimmed).success;
};

export const httpUrl = z
  .string()
  .trim()
  .refine(isHttpUrl, { message: "Must be an http(s) URL" });

export const optionalHttpUrl = httpUrl.optional().or(z.literal(""));

export const internalPath = z
  .string()
  .refine((value) => value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/\\"), {
    message: "Must be an in-app path starting with /",
  });

/** `stored` holds the current values: a link saved before http(s) was enforced may be echoed back unchanged. */
export const assertHttpUrls = (
  record: Record<string, unknown>,
  keys: string[],
  stored: Record<string, unknown> = {},
) => {
  for (const key of keys) {
    const value = record[key];
    if (value === undefined || value === null || value === "") continue;
    if (stored[key] !== undefined && stored[key] !== null && value === stored[key]) continue;
    if (!isHttpUrl(value)) throw new AppError(400, `${key} must be an http(s) URL`);
  }
};
