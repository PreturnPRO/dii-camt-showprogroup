import type { BackendUser } from "@/lib/api";

// Legacy compatibility hook retained for AuthContext.
// Production screens fetch live data directly and must not mutate mock datasets.
export const hydrateFrontendData = async (_user: BackendUser) => undefined;
