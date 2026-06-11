Act as a Senior Full-Stack Architect. I am working on a large-scale project that includes a Backend, Frontend, and Database. 

CRITICAL INSTRUCTION: Do NOT generate, modify, or delete any source code files yet. Your ONLY task right now is to analyze the requirements and output a comprehensive `plan.md` file. We will execute the code implementation only after I review and approve this plan.

### Project Context & Requirements
- **Frontend:** React 18.3, TypeScript 5.8, Vite 5.4, Tailwind CSS 3.4, shadcn/ui, TanStack React Query 5.83, Socket.IO Client 4.8, Framer Motion, Recharts, React Router, Zod.
- **Backend:** Node.js 18+, Express 4.21, TypeScript, Prisma ORM 6.7, Socket.IO 4.8, JWT + Passport.js, Multer, PDFKit, node-cron, Zod.
- **Database:** PostgreSQL 16.
- **Core Feature/Goal:** Develop a full-stack, role-based academic management platform (DII CAMT ShowPro Group) covering the complete student lifecycle. The system provides 5 role-based dashboards (Student, Lecturer, Staff, Company, Admin) and features including real-time updates via Socket.IO, bilingual support (TH/EN), gamification (XP, badges, quests), managed file uploads, automation engine, PDF generation (transcripts/certificates), and rich analytics.
- **Existing Codebase (If any):** A mature full-stack application exists. The frontend (`src/`) includes 36 live backend-connected pages, shared components, routing, and contexts (Auth, Socket, i18n). The backend (`backend/`) contains 14 route files (~100 endpoints), 15 business logic services, middleware, and a Prisma schema with over 40 models.

---

### 1. System Architecture Overview
The system follows a client-server architecture with real-time capabilities.
- **Frontend Layer:** Built with React, Vite, and Tailwind CSS. It communicates with the backend via RESTful APIs using Axios and TanStack React Query for data fetching, caching, and state synchronization. Real-time updates (notifications, chat messages) are handled via Socket.IO Client.
- **Backend Layer:** Node.js with Express.js handles incoming HTTP requests. Business logic is organized into isolated services. Authentication uses JWT and Passport.js.
- **Database Layer:** PostgreSQL is used as the primary relational database, interfaced via Prisma ORM for type-safe queries. 
- **Auxiliary Services:**
  - **Real-time Server:** Socket.IO integrated with the Express server.
  - **File Storage:** Managed locally via Multer (or adaptable to cloud storage) with signed URLs for access control.
  - **Automation Engine:** Powered by `node-cron` to run scheduled tasks like evaluating badges, updating statuses, or triggering reports.
  - **PDF Generation:** PDFKit generates transcripts and certificates dynamically.

### 2. Database Schema Design
The schema uses Prisma and is highly relational. Key tables include:
- **Users & Profiles:**
  - `User`: Core authentication (email, hash, role: STUDENT, LECTURER, STAFF, COMPANY, ADMIN).
  - `StudentProfile`, `LecturerProfile`, `StaffProfile`, `CompanyProfile`, `AdminProfile`: Specialized fields mapped 1-to-1 with `User`.
- **Academics:**
  - `Course`: Details of courses offered.
  - `Section`: Specific class sections linked to courses.
  - `Enrollment`: Many-to-many relationship mapping students to sections, storing grades.
  - `Assignment` & `Submission`: Tasks created by lecturers and files submitted by students.
- **Gamification & Activities:**
  - `Quest` & `QuestEnrollment`: Tasks students can complete for XP and coins.
  - `Activity` & `ActivityEnrollment`: Extracurricular events.
  - `Badge`: Achievements unlocked by students.
- **Career & Network:**
  - `JobPosting` & `Application`: Internship pipeline.
  - `InternshipRecord`: Log of student internships, linked to companies.
- **Communication & System:**
  - `Message` & `Notification`: Inbox system and real-time alerts.
  - `AutomationRule`: Configurable rules for the cron engine.
  - `FileAsset`: Centralized file metadata table for uploads.

### 3. API Contracts
The backend exposes ~100 endpoints across 14 routes. Key categories include:
- **Auth API (`/api/auth`)**
  - `POST /login`: Receives `{ email, password }`, returns `{ token, user: { id, role, ... } }`.
- **Users API (`/api/users`)**
  - `GET /profile`: Fetch current user's profile based on role.
  - `PUT /profile`: Update specific fields.
- **Academic API (`/api/courses`)**
  - `GET /courses`: List courses (supports filtering/pagination).
  - `POST /courses/:id/enroll`: Student enrolls in a course.
- **Assignments API (`/api/assignments`)**
  - `POST /assignments`: Lecturer creates assignment.
  - `POST /assignments/:id/submit`: Student submits work (Multipart/form-data for files).
- **Gamification API (`/api/quests`)**
  - `GET /quests`: List available quests.
  - `POST /quests/:id/claim`: Student claims reward for completed quest.
- **Real-time (Socket.IO Events)**
  - `subscribe`: Client subscribes to personal room (`user:ID`).
  - `notification`: Server emits new alerts.
  - `new_message`: Server pushes new inbox message.

### 4. Frontend Architecture
- **Component Tree:** 
  - Uses `shadcn/ui` components for building blocks.
  - Shared UI (`src/components/common`, `src/components/ui`) vs. Feature-specific components (`src/pages/live`).
- **State Management:**
  - Server state: `TanStack React Query` for fetching, caching, and optimistic updates.
  - Global client state: React Context API (`AuthContext`, `SocketContext`, `LanguageContext` for i18n).
- **Routing:**
  - `React Router` is used with route guards. Users are redirected based on their role (e.g., `/student/dashboard`, `/admin/dashboard`).
- **Styling:** Tailwind CSS with CSS Variables for dynamic Dark/Light modes. Framer Motion for micro-interactions and transitions.

### 5. Step-by-Step Implementation Plan
Since the project is already mature, this plan focuses on adding new features or scaling (e.g., Testing, Pagination, Mobile, CI/CD):
- **Phase 1: Stabilization & Testing**
  - Set up `Vitest` for backend services unit testing.
  - Implement `Playwright` for E2E critical flows (Login, Enroll, Submit Assignment).
- **Phase 2: Performance Optimization**
  - Implement server-side pagination for endpoints returning large datasets (e.g., Audit logs, Course lists).
  - Optimize Prisma queries (e.g., selecting specific fields rather than full relations).
- **Phase 3: External Integrations**
  - Integrate real email delivery (SendGrid/AWS SES) replacing console logs.
  - Add SMS notifications integration if required by `DataConsent`.
- **Phase 4: CI/CD Pipeline Setup**
  - Create GitHub Actions workflows for automated linting, testing, and building.
  - Setup Docker-based deployment scripts for staging and production servers.
- **Phase 5: Accessibility & Mobile Prep**
  - Audit frontend against WCAG 2.1 AA standards.
  - Export API schemas via Swagger to prepare for React Native mobile app consumption.

### 6. Edge Cases & Technical Considerations
- **Concurrency in Gamification:** When multiple quests complete simultaneously, database transaction locks are needed to prevent XP/Coin race conditions.
- **File Storage Limits:** As a full-lifecycle platform, storage can grow rapidly. Need a migration plan from local `Multer` storage to an S3-compatible cloud bucket.
- **Real-time Disconnects:** Socket.IO clients need robust fallback logic. If a client reconnects, it must fetch missed notifications via standard REST API polling.
- **Role Permissions overlap:** Some Staff might also be Lecturers. The system currently uses distinct `Role` enums, which might require handling multi-role users in the future.
- **Timezone Handling:** All dates (deadlines, schedules) must be stored in UTC in PostgreSQL and formatted on the frontend according to local time.