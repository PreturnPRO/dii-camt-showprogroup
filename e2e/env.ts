// The E2E stack runs on its own ports against its own database (see playwright.config.ts),
// so tests never read or write the dev server on :4000 / :8080.
export const E2E_API_PORT = 4100;
export const E2E_WEB_PORT = 8180;
export const API = `http://localhost:${E2E_API_PORT}/api`;
export const WEB = `http://localhost:${E2E_WEB_PORT}`;
