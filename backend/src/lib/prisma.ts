import { PrismaClient } from "@prisma/client";

const createPrismaClient = () =>
  new PrismaClient({
    log: ["warn", "error"],
    // passwordHash must never leave this process by accident. Dozens of
    // handlers across the codebase do `include: { user: true }` on nested
    // relations (student.user, lecturer.user, company.user, etc.) with no
    // select to strip it — this omit applies globally so every one of those
    // is safe by default, not just the ones we've already found and fixed
    // one at a time. The handful of call sites that legitimately need the
    // hash (login, password reset, change-password) override it explicitly
    // with `omit: { passwordHash: false }`.
    omit: {
      user: {
        passwordHash: true,
      },
    },
  });

declare global {
  // eslint-disable-next-line no-var
  var __showproPrisma__: ReturnType<typeof createPrismaClient> | undefined;
}

export const prisma = global.__showproPrisma__ ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.__showproPrisma__ = prisma;
}
