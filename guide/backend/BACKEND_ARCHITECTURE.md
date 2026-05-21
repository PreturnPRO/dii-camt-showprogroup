# DII-CAMT ShowPro — Backend Architecture Guide

> คู่มือสำหรับนักพัฒนาที่จะมาทำงานต่อในส่วน Backend

## สารบัญ

- [Tech Stack](#tech-stack)
- [โครงสร้างไฟล์](#โครงสร้างไฟล์)
- [การเริ่มต้นพัฒนา](#การเริ่มต้นพัฒนา)
- [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
- [ฐานข้อมูล (Prisma Schema)](#ฐานข้อมูล-prisma-schema)
- [ระบบ Authentication](#ระบบ-authentication)
- [Route Files & API Endpoints](#route-files--api-endpoints)
- [Services Layer](#services-layer)
- [Middleware](#middleware)
- [ระบบ Real-time (Socket.IO)](#ระบบ-real-time-socketio)
- [ระบบ File Storage](#ระบบ-file-storage)
- [ระบบ Automation](#ระบบ-automation)
- [ระบบ PDF Generation](#ระบบ-pdf-generation)
- [Role-Based Access Control](#role-based-access-control)
- [Error Handling](#error-handling)
- [Environment Variables](#environment-variables)

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.21 | HTTP framework |
| TypeScript | 5.7 | Type safety |
| Prisma | 6.7 | ORM + schema management |
| PostgreSQL | 16 | Database |
| Socket.IO | 4.8 | Real-time WebSocket |
| Zod | 3.25 | Request validation |
| JWT (jsonwebtoken) | 9.0 | Authentication tokens |
| Passport.js | 0.7 | Auth middleware |
| Multer | 2.1 | File upload |
| PDFKit | 0.18 | PDF generation |
| node-cron | 4.2 | Cron scheduling |
| Swagger UI | 5.0 | API documentation |

---

## โครงสร้างไฟล์

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema (794 lines, 40+ models)
│   └── seed.ts                # Seed data for development
│
├── src/
│   ├── server.ts              # Entry point — HTTP server + Socket.IO + Automation
│   ├── app.ts                 # Express app config (CORS, Helmet, Morgan, Routes)
│   ├── openapi.ts             # Swagger/OpenAPI spec
│   │
│   ├── config/
│   │   └── env.ts             # Environment variables (Zod validated)
│   │
│   ├── lib/
│   │   ├── passport.ts        # JWT strategy for Passport.js
│   │   ├── prisma.ts          # Prisma client singleton
│   │   └── realtime.ts        # Socket.IO setup + emit helpers
│   │
│   ├── middleware/
│   │   ├── check-role.ts      # Role-based authorization
│   │   ├── error-handler.ts   # Global error handler
│   │   ├── not-found.ts       # 404 handler
│   │   └── validate.ts        # Zod request validation
│   │
│   ├── routes/                # API route handlers (controller logic included)
│   │   ├── index.ts           # Route aggregator
│   │   ├── auth.routes.ts     # Login, Register, Profile, Session
│   │   ├── academic.routes.ts # Courses, Enrollments, Grades, Assignments, Attendance
│   │   ├── students.routes.ts # Student profiles, Stats, Skills, Portfolio
│   │   ├── career.routes.ts   # Jobs, Applications, Internships, Cooperation
│   │   ├── activities.routes.ts    # Activities, Enrollments, Check-in
│   │   ├── quests.routes.ts        # Quests, Quest enrollments
│   │   ├── support.routes.ts       # Requests, Appointments, Messages, Office Hours
│   │   ├── operations.routes.ts    # Budget, Personnel, Workload, Subscriptions
│   │   ├── system.routes.ts        # Users, Notifications, Audit, Reports
│   │   ├── automation.routes.ts    # Automation rules CRUD + execution
│   │   ├── files.routes.ts         # File upload, download, signed URLs
│   │   ├── documents.routes.ts     # PDF generation (transcript, certificates)
│   │   └── facilities.routes.ts    # Facility/room management
│   │
│   ├── services/              # Business logic layer
│   │   ├── activity.service.ts     # Activity reward processing
│   │   ├── appointment.service.ts  # Appointment conflict checks
│   │   ├── audit.service.ts        # Audit log creation
│   │   ├── automation.service.ts   # Automation rule engine
│   │   ├── badge.service.ts        # Badge evaluation (6 definitions)
│   │   ├── facility.service.ts     # Room scheduling + conflict detection
│   │   ├── file-storage.service.ts # Multer + signed download + checksums
│   │   ├── grade.service.ts        # GPAX calculation + bulk grading
│   │   ├── notification.service.ts # Create + broadcast + real-time emit
│   │   ├── pdf.service.ts          # PDF generation (PDFKit)
│   │   ├── profile.service.ts      # Profile lookup helpers
│   │   ├── quest.service.ts        # Quest progress + rewards
│   │   ├── subscription.service.ts # Subscription plan logic
│   │   └── talent.service.ts       # Talent search/matching
│   │
│   ├── types/
│   │   └── express.d.ts       # Express request type augmentation
│   │
│   └── utils/
│       ├── async-handler.ts   # Express async wrapper
│       ├── auth.ts            # Auth utility helpers
│       ├── errors.ts          # AppError class
│       └── user.ts            # Request user extraction
│
├── docker-compose.yml         # PostgreSQL 16 container
├── package.json
└── tsconfig.json
```

---

## การเริ่มต้นพัฒนา

### 1. เปิดฐานข้อมูล PostgreSQL

```bash
cd backend
docker compose up -d    # เปิด PostgreSQL container
```

### 2. ตั้งค่า Environment

สร้างไฟล์ `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/showpro"
JWT_SECRET="your-secret-key-at-least-16-chars"
JWT_EXPIRES_IN="7d"
CORS_ORIGIN="http://localhost:5173"
UPLOAD_DIR="storage/uploads"
AUTOMATION_POLL_SECONDS=60
```

### 3. สร้างตาราง + Seed

```bash
npm install
npx prisma generate       # สร้าง Prisma client
npx prisma db push        # สร้างตารางในฐานข้อมูล
npm run prisma:seed        # ใส่ข้อมูลตัวอย่าง
```

### 4. เปิด Dev Server

```bash
npm run dev               # tsx watch — hot reload
```

Server จะเปิดที่ `http://localhost:4000`
- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/health`

### Scripts ที่มี

| Script | คำอธิบาย |
|---|---|
| `npm run dev` | Dev server with hot reload (tsx watch) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled JS from `dist/` |
| `npm run validate` | Prisma validate + TypeScript check |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:push` | Push schema to database |
| `npm run prisma:migrate` | Create migration |
| `npm run prisma:seed` | Seed demo data |

---

## สถาปัตยกรรมระบบ

```
┌─────────────────────────────────────────────────────┐
│                    Frontend (React)                  │
│   React Query ←→ api.ts ←→ HTTP + Socket.IO Client  │
└──────────────┬────────────────────┬──────────────────┘
               │ HTTP (REST)        │ WebSocket
┌──────────────▼────────────────────▼──────────────────┐
│              Express App (app.ts)                     │
│  ┌────────┐ ┌──────────┐ ┌───────────┐ ┌──────────┐ │
│  │ Helmet │ │  CORS    │ │  Morgan   │ │ Passport │ │
│  └────────┘ └──────────┘ └───────────┘ └──────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │              Route Layer (14 files)              │ │
│  │  auth → academic → students → career → support  │ │
│  │  activities → quests → operations → system      │ │
│  │  automation → files → documents → facilities    │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                 │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │            Services Layer (15 files)             │ │
│  │  grade → badge → automation → notification      │ │
│  │  file-storage → pdf → profile → quest → audit   │ │
│  └──────────────────┬──────────────────────────────┘ │
│                     │                                 │
│  ┌──────────────────▼──────────────────────────────┐ │
│  │         Prisma ORM → PostgreSQL                  │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  Socket.IO Server (realtime.ts)                  │ │
│  │  Events: notification, message, automation, etc. │ │
│  └─────────────────────────────────────────────────┘ │
└───────────────────────────────────────────────────────┘
```

**Request Flow:**
1. Client → Express middleware (CORS, Helmet, Passport)
2. → Route handler (validate request with Zod)
3. → Business logic (service layer / inline)
4. → Prisma query → PostgreSQL
5. → JSON response + optional Socket.IO emit

---

## ฐานข้อมูล (Prisma Schema)

### Models หลัก (40+ models)

| กลุ่ม | Models |
|---|---|
| **Identity** | User, StudentProfile, LecturerProfile, StaffProfile, CompanyProfile, AdminProfile |
| **Academic** | Course, Section, Enrollment, GradeHistory, Attendance, Assignment, Submission |
| **Skills** | Skill, StudentSkill, Portfolio, Project, DataConsent |
| **Gamification** | Badge, TimelineEvent, Activity, ActivityEnrollment, Quest, QuestEnrollment, QuestTask |
| **Career** | JobPosting, JobApplication, Internship, InternshipLog, InternshipDocument, Cooperation |
| **Support** | Request, RequestComment, Appointment, OfficeHour, Message |
| **Operations** | BudgetItem, Workload, SubscriptionPlan, Payment |
| **Admin** | Notification, AuditLog, AutomationRule, Facility, FileAsset |

### ER Relationships ที่สำคัญ

```
User (1) ──→ (0..1) StudentProfile
User (1) ──→ (0..1) LecturerProfile
User (1) ──→ (0..1) CompanyProfile

StudentProfile (1) ──→ (N) Enrollment ──→ (1) Course
StudentProfile (1) ──→ (N) Badge
StudentProfile (1) ──→ (0..1) Portfolio ──→ (N) Project
StudentProfile (1) ──→ (0..1) Internship ──→ (N) InternshipLog

Course (1) ──→ (N) Assignment ──→ (N) Submission
Course (1) ──→ (1) LecturerProfile

Enrollment (1) ──→ (N) GradeHistory
```

---

## ระบบ Authentication

**ไฟล์:** `auth.routes.ts`, `lib/passport.ts`

| Endpoint | Method | Auth | คำอธิบาย |
|---|---|---|---|
| `/api/auth/login` | POST | ❌ | Login → JWT token |
| `/api/auth/register` | POST | ❌ | Register + create role profile |
| `/api/auth/me` | GET | ✅ | Get current user (session restore) |
| `/api/auth/logout` | POST | ✅ | Logout (invalidate client token) |
| `/api/users/profile` | PATCH | ✅ | Update own profile |
| `/api/users` | GET | ✅ Staff/Admin | List all users |

**JWT Flow:**
1. Login → bcrypt verify password → sign JWT with `{ sub: userId, role, email }`
2. Client stores token in `localStorage`
3. Every request sends `Authorization: Bearer <token>`
4. `passport-jwt` strategy extracts user from token
5. `checkRole` middleware verifies role permission

---

## Route Files & API Endpoints

### auth.routes.ts — Authentication & Users
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/login` | Public | Login |
| POST | `/auth/register` | Public | Register |
| GET | `/auth/me` | All | Session restore |
| POST | `/auth/logout` | All | Logout |
| PATCH | `/users/profile` | All | Update own profile |
| GET | `/users` | Staff, Admin | List users |

### academic.routes.ts — Courses, Grades, Assignments
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/courses` | All | List courses |
| POST | `/courses` | Staff, Admin | Create course |
| PATCH | `/courses/:id` | Lecturer, Staff, Admin | Update course |
| GET | `/enrollments` | All | List enrollments |
| POST | `/enrollments` | Staff, Admin | Create enrollment |
| PATCH | `/enrollments/:id/grade` | Lecturer, Admin | Update grade |
| POST | `/grades/bulk` | Lecturer, Admin | Bulk grade update |
| GET | `/assignments` | All | List assignments |
| POST | `/assignments` | Lecturer, Admin | Create assignment |
| PATCH | `/assignments/:id` | Lecturer, Admin | Update assignment |
| DELETE | `/assignments/:id` | Lecturer, Admin | Delete assignment |
| POST | `/assignments/:id/submissions` | Student | Submit work |
| PATCH | `/submissions/:id` | Lecturer, Admin | Grade submission |
| GET | `/attendance` | Lecturer, Staff, Admin | List attendance |
| POST | `/attendance` | Lecturer, Staff | Record attendance |
| GET | `/lecturer/schedule` | Lecturer | Get teaching schedule |

### students.routes.ts — Student Profiles & Stats
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/students` | Lecturer, Staff, Admin | List students |
| GET | `/students/profile` | All | Own student profile |
| GET | `/students/profile/:id` | All (access controlled) | View profile by ID |
| GET | `/student-profiles` | Company, Staff, Admin | Talent search |
| PATCH | `/students/profile` | Student, Admin | Update profile/skills/portfolio |
| GET | `/students/stats` | All | Academic statistics |

### career.routes.ts — Jobs, Internships, Cooperation
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/jobs` | All | List job postings |
| POST | `/jobs` | Company, Admin | Create job |
| PATCH | `/jobs/:id` | Company, Admin | Update job |
| DELETE | `/jobs/:id` | Company, Admin | Delete job |
| POST | `/jobs/:id/apply` | Student | Apply for job |
| GET | `/applications` | Company, Admin | List applications |
| PATCH | `/applications/:id` | Company, Admin | Update application status |
| GET | `/internships` | All | Get internship data |
| POST | `/internships/logs` | Student | Add internship log |
| POST | `/internships/documents` | Student | Add internship document |
| GET | `/cooperation` | All | List cooperations |
| POST | `/cooperation` | Staff, Admin | Create cooperation |
| PATCH | `/cooperation/:id` | Staff, Admin | Update cooperation |

### support.routes.ts — Requests, Appointments, Messages
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/requests` | All | List requests |
| POST | `/requests` | Student | Create request |
| POST | `/requests/:id/comments` | All | Add comment |
| PATCH | `/requests/:id/status` | Staff, Admin | Update status |
| GET | `/appointments` | All | List appointments |
| POST | `/appointments` | Student | Book appointment |
| PATCH | `/appointments/:id` | Lecturer, Staff | Update status |
| GET | `/messages` | All | List messages |
| POST | `/messages` | All | Send message |
| PATCH | `/messages/:id/read` | All | Mark as read |
| GET | `/office-hours/:lecturerId` | All | Get lecturer office hours |
| PUT | `/office-hours` | Lecturer | Set office hours |

### system.routes.ts — Users, Notifications, Audit, Reports
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/notifications` | All | List notifications |
| PATCH | `/notifications/:id/read` | All | Mark notification read |
| POST | `/notifications/broadcast` | Staff, Admin | Broadcast notification |
| GET | `/audit-logs` | Staff, Admin | Audit log feed |
| GET | `/reports/system-usage` | Staff, Admin | System usage report |
| PATCH | `/users/:id` | Admin | Update user |
| DELETE | `/users/:id` | Admin | Delete user |

### operations.routes.ts — Budget, Personnel, Workload
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/budget` | Staff, Admin | List budget items |
| POST | `/budget` | Staff, Admin | Create budget item |
| GET | `/personnel` | Staff, Admin | List personnel |
| GET | `/workload` | Lecturer, Staff, Admin | List workload records |
| POST | `/workload` | Staff, Admin | Create workload record |
| GET | `/subscriptions/plans` | All | List subscription plans |
| POST | `/subscriptions/payment` | Company | Create payment |
| GET | `/subscriptions/payments` | Company, Admin | Payment history |

### automation.routes.ts — Automation Rules
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/automation-rules` | Admin | List rules |
| POST | `/automation-rules` | Admin | Create rule |
| PATCH | `/automation-rules/:id` | Admin | Update rule |
| POST | `/automation-rules/:id/run` | Admin | Manual execute |
| DELETE | `/automation-rules/:id` | Admin | Delete rule |

### files.routes.ts — File Management
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/files/upload` | All | Upload file |
| GET | `/files/assets/:id` | All (access controlled) | Download file |
| GET | `/files/public/:id` | Public | Public file access |
| GET | `/files/assets/:id/sign` | All | Get signed download URL |
| GET | `/files/download?token=` | Public | Signed URL download |
| GET | `/files/assets` | Staff, Admin | List all assets |

### documents.routes.ts — PDF Generation
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/documents/transcript` | Student, Staff, Admin | Generate transcript PDF |
| GET | `/documents/internship-certificate` | Student, Staff, Admin | Generate internship cert |
| GET | `/documents/cooperation-summary/:id` | Staff, Admin | Generate cooperation PDF |

### facilities.routes.ts — Room/Facility Management
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/facilities` | All | List facilities |
| POST | `/facilities` | Staff, Admin | Create facility |
| PATCH | `/facilities/:id` | Staff, Admin | Update facility |
| DELETE | `/facilities/:id` | Admin | Delete facility |

### activities.routes.ts & quests.routes.ts — Gamification
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/activities` | All | List activities |
| POST | `/activities` | Staff, Admin | Create activity |
| POST | `/activities/:id/enroll` | Student | Enroll in activity |
| POST | `/activities/:id/checkin` | Staff, Admin | Check-in student |
| GET | `/quests` | All | List quests |
| POST | `/quests` | Lecturer, Admin | Create quest |
| POST | `/quests/:id/enroll` | Student | Accept quest |
| PATCH | `/quests/enrollment/:id` | Student | Update progress |
| GET | `/player/stats` | Student | Gamification stats |

---

## Services Layer

### grade.service.ts — การคำนวณ GPAX
```
bulkUpdateGrades() →
  1. ค้นหา Enrollment
  2. คำนวณคะแนนรวม (midterm + final + assignments + participation + project)
  3. บันทึก letterGrade
  4. สร้าง GradeHistory record
  5. สร้าง AuditLog
  6. สร้าง TimelineEvent
  7. ส่ง Notification ให้นักศึกษา
  8. recalculateAcademicStats() → คำนวณ GPAX ใหม่จากทุก enrollment
```

### badge.service.ts — ระบบ Badge อัตโนมัติ
6 Badge definitions ที่ตรวจสอบอัตโนมัติ:
- `first-step` — เริ่มทำกิจกรรมหรือ quest แรก
- `quest-finisher` — ทำ quest สำเร็จ 1 เควสต์
- `xp-explorer` — XP ≥ 100
- `community-builder` — ชั่วโมงกิจกรรม ≥ 20
- `showcase-ready` — มี project ใน portfolio ≥ 1
- `campus-contributor` — gamification points ≥ 50

### automation.service.ts — Automation Engine
- รองรับ Cron schedule triggers (ใช้ `cron-parser`)
- รองรับ Student metric triggers (xp, coins, activityHours, etc.)
- Action types: notification, badge_evaluation, award_badge
- Polling processor ทำงานทุก N วินาที (ค่า default: 60s)

### notification.service.ts — ระบบแจ้งเตือน
- `createNotification()` → บันทึก + emit real-time event ถึง user
- `createNotificationsForRole()` → broadcast ถึงทุก user ใน role

---

## ระบบ Real-time (Socket.IO)

**ไฟล์:** `lib/realtime.ts`

### Connection
- Client เชื่อมต่อด้วย JWT token
- Server จัดกลุ่ม socket เป็น rooms: `user:{userId}`, `role:{ROLE}`

### Events ที่ emit
| Event | เมื่อ | Data |
|---|---|---|
| `notification:created` | สร้าง notification ใหม่ | notification object |
| `notification:role-broadcast` | broadcast ถึง role | notifications array |
| `automation:executed` | automation rule ถูก execute | ruleId, name, affected |

### Emit Helpers
```typescript
emitToUser(userId, event, payload)    // ส่งถึง user เฉพาะคน
emitToRole(role, event, payload)      // ส่งถึงทุกคนใน role
emitSystemEvent(event, payload)       // ส่งถึงทุกคน
```

---

## ระบบ File Storage

**ไฟล์:** `services/file-storage.service.ts`, `routes/files.routes.ts`

### Upload Flow
1. Client POST `/api/files/upload` with `multipart/form-data`
2. Multer saves to `storage/uploads/{category}/`
3. Service creates `FileAsset` record + SHA-256 checksum
4. Returns managed asset URL: `/api/files/assets/{id}`

### Access Control
- `PUBLIC` files: ใครก็เข้าถึงได้ผ่าน `/api/files/public/{id}`
- `PRIVATE` files: เจ้าของ, Admin, Staff เท่านั้น
- Signed URL: JWT token ที่หมดอายุตามเวลาที่กำหนด (default: 30 นาที)

---

## Role-Based Access Control

| Role | ระดับสิทธิ์ |
|---|---|
| `STUDENT` | ดูข้อมูลตัวเอง, ส่งงาน, สมัครฝึกงาน, ยื่นคำร้อง |
| `LECTURER` | จัดการวิชาที่สอน, ให้เกรด, ดูนักศึกษาที่ปรึกษา |
| `STAFF` | จัดการข้อมูลระบบ, อนุมัติคำร้อง, ดู audit |
| `COMPANY` | จัดการงาน/ฝึกงาน, ค้นหานักศึกษา |
| `ADMIN` | ทำได้ทุกอย่าง + automation + ลบ user |

### วิธีใช้ใน Route
```typescript
router.get("/students",
  requireAuth,                              // ต้อง login
  checkRole([Role.LECTURER, Role.STAFF]),    // เฉพาะ role ที่ระบุ
  validate(querySchema, "query"),            // validate query params
  asyncHandler(async (req, res) => { ... })  // handler
);
```

---

## Error Handling

### AppError Class
```typescript
throw new AppError(404, "Student not found");
throw new AppError(403, "Access denied");
throw new AppError(400, "Invalid input");
```

### Global Error Handler (`middleware/error-handler.ts`)
- ดัก AppError → ส่ง status code + message ที่กำหนด
- ดัก ZodError → ส่ง 400 + validation details
- ดัก Error อื่นๆ → ส่ง 500 + generic message

### Response Format
```json
{
  "success": true,
  "data": { ... }
}

{
  "success": false,
  "message": "Error description",
  "details": { ... }
}
```

---

## Environment Variables

| Variable | Required | Default | คำอธิบาย |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | PostgreSQL connection string |
| `JWT_SECRET` | ✅ | — | Secret key (≥16 chars) |
| `JWT_EXPIRES_IN` | ❌ | `7d` | Token expiration |
| `PORT` | ❌ | `4000` | Server port |
| `CORS_ORIGIN` | ❌ | `http://localhost:5173` | Allowed origins (comma-separated) |
| `UPLOAD_DIR` | ❌ | `storage/uploads` | File upload directory |
| `PRIVATE_FILE_TTL_MINUTES` | ❌ | `30` | Signed URL expiration |
| `AUTOMATION_POLL_SECONDS` | ❌ | `60` | Automation check interval |
| `PDF_FONT_PATH` | ❌ | auto-detect | Custom font for PDFs |

---

## แนวทางการเพิ่ม Feature ใหม่

### 1. เพิ่ม Endpoint ใหม่ใน Route ที่มีอยู่
```typescript
// ใน routes/xxx.routes.ts
router.post(
  "/your-endpoint",
  requireAuth,
  checkRole([Role.ADMIN]),
  validate(yourSchema),
  asyncHandler(async (req, res) => {
    const result = await prisma.yourModel.create({ ... });
    res.json({ success: true, result });
  }),
);
```

### 2. เพิ่ม Service ใหม่
สร้างไฟล์ `services/your.service.ts` แล้ว import ใน route file

### 3. เพิ่ม Model ใหม่
1. แก้ `prisma/schema.prisma`
2. รัน `npx prisma generate`
3. รัน `npx prisma db push` (dev) หรือ `npx prisma migrate dev` (production)

### 4. เพิ่ม Real-time Event
```typescript
import { emitToUser } from "../lib/realtime";
emitToUser(userId, "your-event", { data });
```

---

**Last Updated:** 2026-04-28
