# DII-CAMT ShowPro — Backend Architecture Guide

> คู่มือสำหรับนักพัฒนาที่จะมาทำงานต่อในส่วน Backend

## สารบัญ

- [Tech Stack](#tech-stack)
- [โครงสร้างไฟล์](#โครงสร้างไฟล์)
- [การเริ่มต้นพัฒนา](#การเริ่มต้นพัฒนา)
- [สถาปัตยกรรมระบบ](#สถาปัตยกรรมระบบ)
- [ไฟล์หลักใน backend/src ที่ใช้ติดต่อกับ Frontend](#ไฟล์หลักใน-backendsrc-ที่ใช้ติดต่อกับ-frontend)
- [ฐานข้อมูล (Prisma Schema)](#ฐานข้อมูล-prisma-schema)
- [ระบบ Authentication](#ระบบ-authentication)
- [Route Files & API Endpoints](#route-files--api-endpoints)
- [Services Layer](#services-layer)
- [ระบบ Real-time (Socket.IO)](#ระบบ-real-time-socketio)
- [ระบบ File Storage](#ระบบ-file-storage)
- [Role-Based Access Control](#role-based-access-control)
- [Error Handling](#error-handling)
- [Environment Variables](#environment-variables)
- [การไหลของข้อมูลในระบบหลังบ้าน (Backend Data Flow Example)](#การไหลของข้อมูลในระบบหลังบ้าน-backend-data-flow-example)
- [แนวทางการเพิ่ม Feature ใหม่](#แนวทางการเพิ่ม-feature-ใหม่)

---

## Tech Stack

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.21.2 | HTTP framework |
| TypeScript | 5.7.3 | Type safety |
| Prisma | 6.7.0 | ORM + schema management |
| PostgreSQL | 16 | Database |
| Socket.IO | 4.8.3 | Real-time WebSocket |
| Zod | 3.25.76 | Request validation |
| JWT (jsonwebtoken) | 9.0.2 | Authentication tokens |
| Passport.js | 0.7.0 | Auth middleware |
| Multer | 2.1.1 | File upload |
| PDFKit | 0.18.0 | PDF generation |
| node-cron | 4.2.1 | Cron scheduling |
| cron-parser | 5.5.0 | Cron expression parsing |
| Swagger UI | 5.0.1 | API documentation |

---

## โครงสร้างไฟล์

```
backend/
├── prisma/
│   ├── schema.prisma          # Database schema (859 lines, 50+ models)
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
│   ├── routes/                # API route handlers
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
│   ├── services/              # Business logic layer (17 files)
│   │   ├── academic-core.service.ts # core functions for academic query/GPA calculations
│   │   ├── activity.service.ts     # Activity reward & check-in processing
│   │   ├── appointment.service.ts  # Appointment conflict checks
│   │   ├── audit.service.ts        # Audit log creation
│   │   ├── automation.service.ts   # Automation rule engine
│   │   ├── badge.service.ts        # Badge evaluation (6 definitions)
│   │   ├── course.service.ts       # Course details and logic
│   │   ├── enrollment.service.ts   # Enrollment drop and checks
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
JWT_SECRET="your-secret-key-at-least-32-characters"
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
npm run prisma:seed       # ใส่ข้อมูลตัวอย่าง
```

### 4. เปิด Dev Server

```bash
npm run dev               # tsx watch — hot reload
```

Server จะเปิดที่ `http://localhost:4000`
- API: `http://localhost:4000/api`
- Swagger: `http://localhost:4000/api/docs`
- Health: `http://localhost:4000/health`

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
│  │            Services Layer (17 files)             │ │
│  │  academic-core → activity → appointment → audit │ │
│  │  automation → badge → course → enrollment       │ │
│  │  facility → file-storage → grade → notification│ │
│  │  pdf → profile → quest → subscription → talent  │ │
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

### 📁 ไฟล์หลักใน backend/src ที่ใช้ติดต่อกับ Frontend

การเชื่อมต่อและสื่อสารทั้งหมดระหว่าง Backend และ Frontend จะทำงานผ่านไฟล์หลักๆ ดังต่อไปนี้:

1. **[app.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/app.ts)**
   * **บทบาท**: กำหนดสิทธิ์การเข้าถึงด้วย CORS (Cross-Origin Resource Sharing) เพื่อระบุว่า URL ของ Frontend ใดบ้าง (เช่น `http://localhost:5173` ในโหมด Dev) ที่มีสิทธิ์รับส่งข้อมูลกับเซิร์ฟเวอร์
2. **[server.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/server.ts)**
   * **บทบาท**: เริ่มต้นเปิดใช้งานพอร์ตสำหรับ HTTP Server และเชื่อมโยง Socket.IO เพื่อให้ Frontend สามารถเปิด Connection เชื่อมต่อเข้ามาได้
3. **[routes/index.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/routes/index.ts)**
   * **บทบาท**: ไฟล์หลักที่รวมและกำหนดทิศทางเส้นทาง (Router) ของ API ทั้งหมดที่จะเปิดออกไปให้ Frontend เรียกใช้ (ผ่าน Prefix `/api`)
4. **โฟลเดอร์ [routes/](file:///D:/Project/dii-camt-showprogroup/backend/src/routes)** (เช่น `auth.routes.ts`, `activities.routes.ts`, `students.routes.ts`)
   * **บทบาท**: ไฟล์กำหนด HTTP Endpoints ย่อย (GET, POST, PUT, DELETE) ที่รับ Request ข้อมูลจากตัวแทน API ของ Frontend โดยตรง
5. **[lib/realtime.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/lib/realtime.ts)**
   * **บทบาท**: จัดการการส่งข้อมูลข้ามเครือข่ายผ่าน WebSocket (Socket.IO) ในการอัปเดตข้อมูลแจ้งเตือน (Notifications) หรือแชทแบบ Real-time ไปยังเว็บฝั่งผู้ใช้

---

## ฐานข้อมูล (Prisma Schema)

### Models ทั้งหมด (50 models)

| กลุ่ม | Models ใน schema.prisma |
|---|---|
| **Identity** | User, StudentProfile, LecturerProfile, StaffProfile, CompanyProfile, AdminProfile |
| **Academic** | Course, Section, Enrollment, CourseGradingCriteria, CourseGradeCutoff, EnrollmentScore, AttendanceRecord, AttendanceSession, Assignment, Submission, CourseMaterial, GradeHistory |
| **Skills** | Skill, StudentSkill, Portfolio, Project, SkillRubric, DataConsent |
| **Gamification** | Quest, QuestTask, QuestEnrollment, Activity, ActivityEnrollment, Badge, TimelineEvent |
| **Career** | InternshipRecord, InternshipLog, InternshipDocument, InternshipEvaluation, JobPosting, Application, CooperationRecord |
| **Support** | Request, RequestComment, Appointment, Message, OfficeHour |
| **Operations** | BudgetRecord, WorkloadRecord, PaymentHistory |
| **Admin** | Notification, AuditLog, AutomationRule, FileAsset, Facility |

---

## ระบบ Authentication

**ไฟล์:** `auth.routes.ts`, `lib/passport.ts`

| Endpoint | Method | Auth | คำอธิบาย |
|---|---|---|---|
| `/api/auth/register` | POST | ❌ | สมัครสมาชิกผู้ใช้ใหม่ |
| `/api/auth/login` | POST | ❌ | เข้าสู่ระบบผู้ใช้งานทั่วไป → รับ JWT token |
| `/api/auth/company-login` | POST | ❌ | เข้าสู่ระบบสำหรับบริษัทผ่านเบอร์โทรศัพท์ |
| `/api/auth/forgot-password` | POST | ❌ | ส่งรหัสผ่านขอรีเซ็ต |
| `/api/auth/reset-password` | POST | ❌ | ยืนยันรีเซ็ตเปลี่ยนรหัสผ่าน |
| `/api/auth/me` | GET | ✅ | ดึงโปรไฟล์ผู้ใช้ปัจจุบันคืน (Session restore) |
| `/api/auth/logout` | POST | ✅ | ออกจากระบบ (Invalidate client token) |
| `/api/users/profile` | PATCH | ✅ | อัปเดตข้อมูลโปรไฟล์ตนเอง |
| `/api/users/bootstrap` | GET | ✅ Staff/Admin | สร้างข้อมูลผู้ใช้ตั้งตั้งเข้าระบบ |

**JWT Flow:**
1. Login → bcrypt verify password → sign JWT with `{ sub: userId, role, email }`
2. Client stores token in `localStorage`
3. Every request sends `Authorization: Bearer <token>`
4. `passport-jwt` strategy extracts user from token
5. `checkRole` middleware verifies role permission

---

## Route Files & API Endpoints

### 1. auth.routes.ts — Authentication & Users
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/auth/register` | Public | Register |
| POST | `/auth/login` | Public | Login |
| POST | `/auth/company-login` | Public | Company Login |
| POST | `/auth/forgot-password` | Public | Forgot Password |
| POST | `/auth/reset-password` | Public | Reset Password |
| GET | `/auth/me` | All | Session restore |
| POST | `/auth/logout` | All | Logout |
| PATCH | `/users/profile` | All | Update profile |
| GET | `/users/bootstrap` | Staff, Admin | Bootstrap system users |

### 2. academic.routes.ts — Courses, Grades, Assignments
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/courses` | All | List courses |
| GET | `/courses/:id` | All | Get course details |
| POST | `/courses` | Staff, Admin, Lecturer | Create course |
| PATCH | `/courses/:id` | Lecturer, Staff, Admin | Update course |
| DELETE | `/courses/:id` | Staff, Admin, Lecturer | Delete course |
| GET | `/lecturer/schedule` | Lecturer | Get teaching schedule |
| GET | `/courses/lecturer/schedule` | Lecturer | Get schedule (alias) |
| GET | `/enrollments` | All | List enrollments |
| POST | `/enrollments` | Student, Staff, Admin, Lecturer | Create enrollment |
| DELETE | `/enrollments/course/:courseId` | Student | Drop course |
| PATCH | `/grades/bulk` | Lecturer, Admin | Bulk update grades |
| POST | `/grades` | Lecturer, Admin | Create/Update grades |
| GET | `/grades/history/:studentId` | All | Get student grades history |
| GET | `/student/transcript` | All | Get academic transcript |
| GET | `/courses/:courseId/grades/export` | Lecturer, Admin | Export grades CSV |
| GET | `/attendance/report` | Lecturer, Staff, Admin | Get attendance report |
| POST | `/attendance/check-in` | Lecturer, Staff, Admin | Manual attendance check-in |
| POST | `/attendance/sessions` | Lecturer, Staff, Admin | Start attendance session |
| POST | `/attendance/sessions/check-in` | Student | Student QR check-in |
| GET | `/attendance/summary/:courseId` | Lecturer, Staff, Admin | Get attendance summary |
| GET | `/attendance/history/:courseId/:studentId` | Lecturer, Staff, Admin, Student | Get attendance history |
| PATCH | `/attendance/sessions/:id/close` | Lecturer, Staff, Admin | Close attendance session |
| GET | `/assignments` | Student, Lecturer, Staff, Admin | List assignments |
| GET | `/assignments/:id` | Student, Lecturer, Staff, Admin | Get assignment details |
| POST | `/assignments` | Lecturer, Admin | Create assignment |
| PATCH | `/assignments/:id` | Lecturer, Admin | Update assignment |
| DELETE | `/assignments/:id` | Lecturer, Admin | Delete assignment |
| POST | `/assignments/:id/submissions` | Student | Submit assignment |
| PATCH | `/submissions/:id` | Lecturer, Admin | Grade/Update submission |

### 3. students.routes.ts — Student Profiles & Stats
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/students` | Lecturer, Staff, Admin | List students |
| GET | `/students/profile` | All | Own student profile |
| GET | `/students/profile/:id` | All (access controlled) | View profile by ID |
| GET | `/student-profiles` | Company, Staff, Admin, Lecturer | Talent search / profiles list |
| PATCH | `/students/profile` | Student, Admin | Update profile / skills / portfolio |
| GET | `/students/stats` | All | Academic statistics |

### 4. career.routes.ts — Jobs, Internships, Cooperation
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/jobs` | All | List job postings |
| GET | `/career-targets` | Student | Own career target suggestions |
| POST | `/jobs` | Company, Admin | Create job |
| PATCH | `/jobs/:id` | Company, Admin | Update job |
| DELETE | `/jobs/:id` | Company, Admin | Delete job |
| POST | `/apply/:jobId` | Student | Apply for job |
| POST | `/applications` | Student | Create application (alternate) |
| GET | `/applications` | Company, Admin | List applications |
| PATCH | `/applications/:id` | Company, Admin | Update application status |
| GET | `/internships` | Student, Company, Lecturer, Staff, Admin | Get internship data |
| GET | `/internship/logs` | All | Get internship daily logs |
| POST | `/internship/logs` | Student, Staff, Admin | Add daily log |
| POST | `/internship/documents` | Student, Staff, Admin | Add document |
| PATCH | `/internship/documents/:id/status` | Staff, Admin | Approve/Reject document |
| GET | `/talent/search` | Company, Admin, Staff, Lecturer | Talent search |
| GET | `/cooperation` | Staff, Admin, Company | List cooperations |
| POST | `/cooperation` | Staff, Admin | Create cooperation |

### 5. support.routes.ts — Requests, Appointments, Messages
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/requests` | All | List requests |
| POST | `/requests` | Student | Create request |
| POST | `/requests/:id/comment` | All | Add comment |
| PATCH | `/requests/:id/status` | Staff, Admin | Update status |
| GET | `/appointments` | All | List appointments |
| POST | `/appointments` | Student | Book appointment |
| PATCH | `/appointments/:id/status` | Lecturer, Staff, Admin | Update status |
| GET | `/messages` | All | List messages |
| POST | `/messages` | All | Send message |
| PATCH | `/messages/:id/read` | All | Mark as read |
| GET | `/office-hours/:lecturerId` | All | Get lecturer office hours |
| PUT | `/office-hours` | Lecturer | Set office hours |

### 6. system.routes.ts — Users, Notifications, Audit, Reports
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/users` | Staff, Admin | List all users |
| POST | `/users` | Staff, Admin | Create user |
| POST | `/users/import/companies` | Staff, Admin | CSV Import Companies |
| POST | `/users/import/students` | Staff, Admin | CSV Import Students |
| PATCH | `/users/:id` | Staff, Admin | Update user |
| DELETE | `/users/:id` | Staff, Admin | Delete user |
| GET | `/directory/users` | All | List directory users |
| GET | `/lecturers` | All | List lecturers |
| GET | `/companies` | All | List companies |
| GET | `/notifications` | All | List notifications |
| PATCH | `/notifications/read-all` | All | Mark all notifications read |
| PATCH | `/notifications/:id/read` | All | Mark notification read |
| DELETE | `/notifications/:id` | All | Delete notification |
| POST | `/notifications/broadcast` | Staff, Admin | Broadcast notification |
| GET | `/audit` | Staff, Admin | Audit log feed |
| GET | `/audit-logs` | Staff, Admin | Audit log feed (alias) |
| GET | `/reports/system-usage` | Staff, Admin | System usage report |

### 7. operations.routes.ts — Budget, Workload, Subscriptions
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/budget` | Staff, Admin | List budget items |
| POST | `/budget` | Staff, Admin | Create budget item |
| PATCH | `/budget/:id` | Staff, Admin | Update budget item |
| DELETE | `/budget/:id` | Staff, Admin | Delete budget item |
| GET | `/personnel` | Staff, Admin | List personnel |
| GET | `/cooperation` | Staff, Admin, Company | List cooperation records |
| POST | `/cooperation` | Staff, Admin | Create cooperation record |
| GET | `/workload` | Lecturer, Staff, Admin | List workload records |
| POST | `/workload` | Lecturer, Staff, Admin | Create workload record |
| GET | `/subscription/plans` | All | List subscription plans |
| GET | `/subscription/payments` | Company, Admin | Payment history |
| POST | `/subscription/payment` | Company, Admin | Create payment |

### 8. automation.routes.ts — Automation Rules
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/automation-rules` | Admin | List rules |
| POST | `/automation-rules` | Admin | Create rule |
| PATCH | `/automation-rules/:id` | Admin | Update rule |
| POST | `/automation-rules/:id/run` | Admin | Manual execute |
| DELETE | `/automation-rules/:id` | Admin | Delete rule |

### 9. files.routes.ts — File Management
| Method | Path | Role | Description |
|---|---|---|---|
| POST | `/files/upload` | All | Upload file |
| GET | `/files/assets/:id` | All (access controlled) | Download file |
| GET | `/files/public/:id` | Public | Public file access |
| GET | `/files/assets/:id/sign` | All | Get signed download URL |
| GET | `/files/download` | Public | Signed URL download |
| GET | `/files/assets` | Staff, Admin | List all assets |

### 10. documents.routes.ts — PDF Generation
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/documents/transcript` | Student, Lecturer, Staff, Admin | Generate transcript PDF |
| GET | `/documents/internship-certificate` | Student, Lecturer, Staff, Admin | Generate internship cert |
| GET | `/documents/cooperation-summary/:id` | Staff, Admin, Company | Generate cooperation PDF |

### 11. facilities.routes.ts — Room/Facility Management
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/facilities` | All | List facilities |
| POST | `/facilities` | Staff, Admin | Create facility |
| PATCH | `/facilities/:id` | Staff, Admin | Update facility |
| DELETE | `/facilities/:id` | Staff, Admin | Delete facility |

### 12. activities.routes.ts — Activities & Gamification
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/activities` | All | List activities |
| GET | `/activities/upcoming` | Public | List upcoming activities |
| POST | `/activities` | Lecturer, Staff, Admin | Create activity |
| POST | `/activities/enroll/:activityId` | Student | Enroll in activity |
| POST | `/activities/check-in/:activityId` | Student | Check-in to activity |
| PATCH | `/activities/enrollments/:id/status` | Lecturer, Staff, Admin | Update enrollment status |
| PATCH | `/activities/:id` | Lecturer, Staff, Admin | Update activity |
| DELETE | `/activities/:id` | Lecturer, Staff, Admin | Delete activity |

### 13. quests.routes.ts — Quests System
| Method | Path | Role | Description |
|---|---|---|---|
| GET | `/quests` | All | List quests |
| POST | `/quests` | Lecturer, Company, Admin | Create quest |
| GET | `/quests/:id` | All | Get quest details |
| POST | `/quests/accept` | Student | Accept/Start quest |
| PATCH | `/quests/task/complete` | Student | Complete quest task |
| GET | `/player/stats` | Student | Gamification stats |

---

## Services Layer

ในโปรเจคมี Services ทั้งหมด 17 ไฟล์ แยกหน้าที่ตามขอบเขตงานดังนี้:

1. **academic-core.service.ts**: แกนกลางสำหรับดึงข้อมูล Section และช่วยคำนวณเกรด/ผลการเรียน
2. **activity.service.ts**: จัดการระบบเช็คอินกิจกรรม บันทึกความต้องการการเช็คอิน และแจกคะแนน/ชั่วโมงกิจกรรมแก่ผู้ใช้เมื่อจบกิจกรรมสำเร็จ
3. **appointment.service.ts**: ตรวจสอบคิวว่างชนกัน (Conflict Detection) ระหว่างอาจารย์และนักศึกษาเมื่อมีการนัดหมาย
4. **audit.service.ts**: บันทึกกิจกรรมระบบที่สำคัญลงใน `AuditLog`
5. **automation.service.ts**: รัน Automation Rules ประมวลผลจาก Schedule หรือ Metric ของนักศึกษาเพื่อทริกเกอร์สร้าง Notification หรือ Badge
6. **badge.service.ts**: ตรวจสอบเกณฑ์การรับ Badge อัตโนมัติ ( First-Step, Quest-Finisher, XP-Explorer, Community-Builder, Showcase-Ready, Campus-Contributor)
7. **course.service.ts**: จัดการข้อมูลวิชา รายละเอียด และเงื่อนไขการเรียน
8. **enrollment.service.ts**: ควบคุมระบบสมัครเรียนวิชาและสิทธิ์ในการยกเลิก/ถอน (Drop Course)
9. **facility.service.ts**: จัดการจองห้องเรียน ตารางการจอง และเช็คคิวจองทับซ้อนกันของสถานที่
10. **file-storage.service.ts**: บริการจัดการไฟล์ อัปโหลดไฟล์ด้วย Multer ตรวจสอบ Checksum ตรวจ visibility และสร้าง Signed URL ที่มีความปลอดภัยสูง
11. **grade.service.ts**: คำนวณ GPA/GPAX, ทำประวัติเกรด `GradeHistory` และจัดการการตัดเกรดเป็นช่วงคะแนน
12. **notification.service.ts**: สร้าง บันทึก และถ่ายทอดสัญญาณเตือนภัย (Real-time emit ผ่าน Socket.IO) ไปยังกลุ่มเป้าหมายหรือเป็นรายบุคคล
13. **pdf.service.ts**: จัดทำระบบเอกสาร PDF อัตโนมัติผ่าน PDFKit เช่น ใบคำร้องทรานสคริปต์, ใบเกียรติบัตรการฝึกงาน หรือสรุปบันทึกข้อตวความร่วมมือ (Cooperation)
14. **profile.service.ts**: ฟังก์ชันคิวรี่ข้อมูลโปรไฟล์ของ User แยกตาม Role (Student, Lecturer, Staff, Company, Admin)
15. **quest.service.ts**: ตรวจสอบเควสต์ ความก้าวหน้าเควสต์ และการเคลียร์เควสต์เพื่อแจกของรางวัล
16. **subscription.service.ts**: เช็คข้อมูลแพ็คเกจค่าใช้จ่าย สิทธิ์ของบริษัทในการมองเห็นประวัตินักศึกษา และสร้าง Payment
17. **talent.service.ts**: ประมวลผลการจัดอันดับและค้นหานักศึกษาที่มีทักษะตรงกับความต้องการของบริษัท (Talent Matching Algorithm)

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
| `STUDENT` | ดูข้อมูลตัวเอง, ส่งงาน, สมัครฝึกงาน, ยื่นคำร้อง, ทำกิจกรรมและเควสต์ |
| `LECTURER` | จัดการวิชาที่สอน, ตัดเกรด, เช็คชื่อนักศึกษาเข้าเรียน, ตรวจสอบการนัดหมาย |
| `STAFF` | จัดการข้อมูลระบบ, จัดการข้อมูลห้องเรียนและงบประมาณ, อนุมัติเอกสารและคำร้อง, ดู audit |
| `COMPANY` | จัดการรับสมัครงาน/ฝึกงาน, จ่ายค่าสมัครสมาชิก, ค้นหาประวัตินักศึกษาตามความต้องการ |
| `ADMIN` | ทำได้ทุกอย่าง + ควบคุมกฏ Automation + ลบข้อมูลผู้ใช้ |

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

## การไหลของข้อมูลในระบบหลังบ้าน (Backend Data Flow Example)

เพื่อความเข้าใจในการเดินทางของข้อมูลในฝั่ง Backend ให้ดูตัวอย่าง **"ระบบการเช็คอินเข้าร่วมกิจกรรม (Activity Check-in)"** ซึ่งใช้งานส่วนประกอบต่างๆ ครบถ้วนดังนี้:

### 1. แผนภาพแสดงการไหลของข้อมูล (Backend Data Flow Diagram)

```mermaid
graph TD
    A[Client Request: POST /api/activities/check-in/:activityId] --> B[1. Route Definition]
    B --> C[2. Middleware: requireAuth]
    C -- Valid Token --> D[3. Middleware: checkRole]
    D -- Is STUDENT --> E[4. Controller: checkInActivity]
    E --> F[5. Service: checkInToActivity & grantActivityReward]
    F --> G[(6. Database: PostgreSQL via Prisma)]
    G --> F
    F --> E
    E --> H[JSON Response: HTTP 200 success]
```

### 2. เลเยอร์ Route & Validation (เส้นทาง API)
* **ไฟล์**: [activities.routes.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/routes/activities.routes.ts#L52-L57)
* **หน้าที่**: กำหนด Endpoint และเรียกใช้งาน Middleware ในการตรวจสอบสิทธิ์และข้อมูล
* **ตัวอย่างโค้ด**:
  ```typescript
  router.post(
    "/activities/check-in/:activityId",
    requireAuth,                // Middleware 1: ตรวจสอบการล็อกอิน (JWT)
    checkRole([Role.STUDENT]),  // Middleware 2: ตรวจสอบบทบาทผู้ใช้
    checkInActivity             // Controller: ประมวลผลหลัก
  );
  ```

### 3. เลเยอร์ Middleware (การกรองข้อมูลและความปลอดภัย)
* **Passport JWT Authentication (`requireAuth`)**: ทำหน้าที่แกะ Token จาก Request Header (`Authorization: Bearer <token>`) ตรวจสอบความถูกต้อง แล้วค้นหาข้อมูลผู้ใช้ในระบบ เพื่อแนบผู้ใช้คนนั้นเข้ากับตัวแปร `req.user`
* **Role Check Middleware (`checkRole`)**: [check-role.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/middleware/check-role.ts) ตรวจสอบสิทธิ์ของ `req.user.role` ว่าได้รับสิทธิ์ใช้งานระบบนี้หรือไม่
  ```typescript
  export const checkRole = (roles: Role[]) => (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new AppError(401, "Authentication required"));
    if (!roles.includes(req.user.role)) return next(new AppError(403, "Access denied"));
    next();
  };
  ```

### 4. เลเยอร์ Controller (ส่วนควบคุมการส่งรับข้อมูล)
* **ไฟล์**: [activities.controller.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/controllers/activities.controller.ts#L148-L157)
* **หน้าที่**: ดึงพารามิเตอร์ต่างๆ จาก Request และเรียกใช้ Service เลเยอร์ที่ทำหน้าที่เป็น Business Logic แล้วนำผลลัพธ์ที่ได้ส่งกลับให้ Client ในรูปแบบ JSON
* **ตัวอย่างโค้ด**:
  ```typescript
  export const checkInActivity = asyncHandler(async (req, res) => {
    const currentUser = requireUser(req);
    const student = await getStudentProfileByUserId(currentUser.id);
    
    // เรียกใช้ Service ประมวลผล Logic ของระบบเช็คอิน
    const enrollment = await checkInToActivity(String(req.params.activityId), student.id);

    res.json({
      success: true,
      enrollment,
    });
  });
  ```

### 5. เลเยอร์ Service (Business Logic)
* **ไฟล์**: [activity.service.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/services/activity.service.ts#L69-L100)
* **หน้าที่**: บรรจุ Logic การทำงานของระบบทั้งหมด ดึง/อัปเดตข้อมูลผ่าน Prisma client โดยแยกเป็นอิสระจาก HTTP Request/Response
* **ตัวอย่างโค้ด**:
  ```typescript
  export const checkInToActivity = async (activityId: string, studentId: string) => {
    const activity = await prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new AppError(404, "Activity not found");
    if (!activity.checkInEnabled) throw new AppError(400, "Check-in not enabled");

    const enrollment = await prisma.activityEnrollment.findUnique({
      where: { activityId_studentId: { activityId, studentId } }
    }) ?? await prisma.activityEnrollment.create({
      data: { activityId, studentId, status: "registered" }
    });

    // มอบคะแนนและบันทึกข้อมูล
    return grantActivityReward(enrollment.id);
  };
  ```

### 6. เลเยอร์ Database & ORM (การทำงานของข้อมูลแบบ Transaction)
ภายใน `grantActivityReward` จะเรียกใช้งาน Prisma transaction ในการเขียนข้อมูลลง PostgreSQL แบบเป็นกลุ่ม (Atomic):
* อัปเดตสถานะของตาราง `ActivityEnrollment` เป็น `completed`
* เพิ่มคะแนน `gamificationPoints` และสะสมชั่วโมง `totalActivityHours` ให้แก่ `StudentProfile`
* บันทึกเหตุการณ์ในตาราง `TimelineEvent`
* เรียกฟังก์ชันตรวจรับเหรียญรางวัลใน [badge.service.ts](file:///D:/Project/dii-camt-showprogroup/backend/src/services/badge.service.ts)

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

**Last Updated:** 2026-07-02
