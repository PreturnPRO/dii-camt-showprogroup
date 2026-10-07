export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "DII-CAMT ShowPro API",
    version: "1.0.0",
    description:
      "Operational backend for ShowPro covering academic, student, company, staff, and admin workflows.",
  },
  servers: [
    {
      url: "http://localhost:4000/api",
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },
  security: [{ bearerAuth: [] }],
  paths: {
    "/auth/login": {
      post: {
        summary: "Login and receive a JWT",
      },
    },
    "/automation-rules": {
      get: {
        summary: "List automation rules",
      },
      post: {
        summary: "Create an automation rule",
      },
    },
    "/files/upload": {
      post: {
        summary: "Upload a managed file asset",
      },
    },
    "/documents/transcript": {
      get: {
        summary: "Generate transcript PDF",
      },
    },
    "/documents/internship-certificate": {
      get: {
        summary: "Generate internship completion certificate PDF",
      },
    },
    "/facilities": {
      get: {
        summary: "List facilities and linked sections",
      },
      post: {
        summary: "Create a facility",
      },
    },
    "/jobs": {
      get: {
        summary: "List job postings",
      },
      post: {
        summary: "Create a job posting",
      },
    },
    "/career-targets": {
      get: {
        summary: "Get student career target matches and skill gaps",
      },
    },
    "/students/stats": {
      get: {
        summary: "Get student academic, curriculum, and skill dashboard stats",
      },
    },
    "/student-profiles": {
      get: {
        summary: "Search student profiles for talent discovery",
      },
    },
  },
} as const;
