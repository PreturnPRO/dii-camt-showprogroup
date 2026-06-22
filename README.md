# 🎓 DII CAMT ShowPro Group (biw)

**ระบบบริหารจัดการสาขาบูรณาการอุตสาหกรรมดิจิทัล (Digital Industry Integration)**  
College of Arts, Media and Technology (CAMT) — Chiang Mai University

> Full-stack, role-based academic management platform covering the complete student lifecycle — from enrollment to career placement.

![React](https://img.shields.io/badge/React-18.3-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4.21-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6.7-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.8-010101?logo=socketdotio&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-3.4-06B6D4?logo=tailwindcss&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## 📋 สารบัญ

- [ภาพรวมโปรเจค](#-ภาพรวมโปรเจค)
- [สถาปัตยกรรมระบบ](#-สถาปัตยกรรมระบบ)
- [Tech Stack](#-tech-stack)
- [5 บทบาทผู้ใช้งาน](#-5-บทบาทผู้ใช้งาน)
- [ระบบทั้งหมด](#-ระบบทั้งหมด)
- [การติดตั้งและรัน](#-การติดตั้งและรัน)
- [โครงสร้างโปรเจค](#-โครงสร้างโปรเจค)
- [สำหรับนักพัฒนา Backend](#-สำหรับนักพัฒนา-backend)
- [แผนพัฒนาในอนาคต](#-แผนพัฒนาในอนาคต)

---

## 🎯 ภาพรวมโปรเจค

**DII CAMT ShowPro Group** คือ Full-stack Web Application ที่ให้บริการ **5 กลุ่มผู้ใช้** ในสาขา DII ได้แก่ นักศึกษา, อาจารย์, เจ้าหน้าที่, บริษัท, และผู้ดูแลระบบ

ระบบครอบคลุมทุกมิติของวงจรการศึกษา ตั้งแต่ลงทะเบียนเรียน → การวัดผล → กิจกรรม → ฝึกงาน → หางาน

### ✨ จุดเด่น

| จุดเด่น | รายละเอียด |
|---------|-----------|
| 🔌 **Full-stack Connected** | Frontend เชื่อมต่อ Backend ครบทุกหน้า ไม่มี mock data |
| 🏫 **5 Role-Based Dashboards** | แต่ละ Role มี Dashboard และ Navigation เฉพาะตัว |
| ⚡ **Real-time Updates** | Socket.IO สำหรับ notifications, messages, automation |
| 🌐 **Bilingual (TH/EN)** | i18n ครบ 1,600+ translation keys |
| 🎮 **Gamification** | XP, Badges, Coins, Level, Leaderboard, Quest system |
| 📁 **Managed File Uploads** | อัปโหลด + signed download + access control |
| 🤖 **Automation Engine** | Cron-based rules + visual builder + manual execution |
| 📄 **PDF Generation** | Transcript, Certificate, Cooperation summary |
| 📊 **Rich Analytics** | Recharts: Line, Radar, Pie, Bar charts |
| 🎨 **Glassmorphism UI** | Framer Motion + gradient animations |
| 🌙 **Dark/Light Mode** | Class-based dark mode + next-themes |
| 📱 **Mobile Responsive** | Collapsible sidebar, stacked cards |

---

## 🏗 สถาปัตยกรรมระบบ

```
┌────────────────────────────────────────────┐
│   Frontend (React + Vite + TailwindCSS)    │
│   TanStack Query ←→ api.ts ←→ Backend     │
│   Socket.IO Client (SocketContext)          │
└─────────────┬───────────────┬──────────────┘
              │ REST API      │ WebSocket
┌─────────────▼───────────────▼──────────────┐
│   Backend (Express + TypeScript)            │
│   14 Route Files → 15 Service Files         │
│   Prisma ORM → PostgreSQL                  │
│   Socket.IO Server → Real-time Events      │
│   Automation Engine → Cron + Metric Rules   │
│   PDF Service → Transcript / Certificates   │
└─────────────────────────────────────────────┘
```

---

## 🛠 Tech Stack

### Frontend

| Technology | Version | Purpose |
|---|---|---|
| React | 18.3 | UI Library |
| TypeScript | 5.8 | Type safety |
| Vite | 5.4 | Build tool + dev server (SWC) |
| Tailwind CSS | 3.4 | Utility-first CSS |
| shadcn/ui + Radix UI | — | 49 accessible components |
| TanStack React Query | 5.83 | Server state management |
| Socket.IO Client | 4.8 | Real-time WebSocket |
| Framer Motion | 12.24 | Animations |
| Recharts | 2.15 | Charts |
| React Router | 6.30 | Client-side routing |
| Zod | 3.25 | Form validation |

### Backend

| Technology | Version | Purpose |
|---|---|---|
| Node.js | 18+ | Runtime |
| Express | 4.21 | HTTP framework |
| Prisma | 6.7 | ORM (40+ models) |
| PostgreSQL | 16 | Database |
| Socket.IO | 4.8 | Real-time WebSocket |
| JWT + Passport.js | — | Authentication |
| Multer | 2.1 | File uploads |
| PDFKit | 0.18 | PDF generation |
| node-cron | 4.2 | Cron automation |
| Zod | 3.25 | Request validation |

---

## 👥 5 บทบาทผู้ใช้งาน

### 🎓 นักศึกษา (Student)
Dashboard, Courses, Schedule, Grades, Assignments, Activities, Portfolio, Internships, Requests, Training Quests, Messages, Notifications, Settings

### 👨‍🏫 อาจารย์ (Lecturer)
Dashboard, Teaching Schedule, Students, Courses, Attendance, Grades, Assignments, Appointments, Workload, Messages, Settings

### 👔 เจ้าหน้าที่ (Staff)
Dashboard, Users, Budget, Cooperation, Documents, Personnel, Schedule Management, Activity Management, Workload Tracking, Reports, Audit, Notifications, Settings

### 🏢 บริษัท (Company)
Dashboard, Job Postings, Skills Requirement, Student Profiles, Applicants, Intern Tracking, Cooperation, Subscription, Settings

### ⚙️ ผู้ดูแลระบบ (Admin)
เข้าถึงได้ทุก route ของ Staff + Automation Management + User Management แบบเต็มรูปแบบ

---

## 🗂 ระบบทั้งหมด

| # | ระบบ | หน้า | กลุ่มผู้ใช้ | สถานะ |
|---|------|------|-----------|-------|
| 1 | Authentication | Login, Register | ทุกคน | ✅ |
| 2 | Dashboard (5 roles) | Dashboard, Personal | ทุกคน | ✅ |
| 3 | Courses | Courses, Course CRUD | ทุกคน | ✅ |
| 4 | Schedule | Schedule, Schedule Mgmt | ทุกคน | ✅ |
| 5 | Grades | Transcript, Bulk grading | Student, Lecturer | ✅ |
| 6 | Assignments | CRUD + Submissions + File Upload | Student, Lecturer | ✅ |
| 7 | Attendance | Check-in, Reports | Lecturer, Staff | ✅ |
| 8 | Activities + Gamification | Activities, XP, Badges | Student, Staff | ✅ |
| 9 | Portfolio | Profile, Skills, Projects | Student | ✅ |
| 10 | Training / Quests | Quest MMORPG System | Student | ✅ |
| 11 | Internships | Jobs, Applications, Logs | Student, Company | ✅ |
| 12 | Requests | Create + Comment + File Attach | Student, Staff | ✅ |
| 13 | Appointments | Booking + Office Hours | Student, Lecturer | ✅ |
| 14 | Messages | Inbox + Compose | ทุกคน | ✅ |
| 15 | Notifications | Personal + Broadcast + Real-time | ทุกคน | ✅ |
| 16 | Users | CRUD + Role management | Staff, Admin | ✅ |
| 17 | Documents | PDF Transcript + Certificates | Staff, Admin | ✅ |
| 18 | Budget | Budget items + Procurement | Staff, Admin | ✅ |
| 19 | Personnel | Personnel directory | Staff, Admin | ✅ |
| 20 | Network & Cooperation | MOU + Partners | Staff, Company | ✅ |
| 21 | Job Postings + Applicants | Recruitment pipeline | Company | ✅ |
| 22 | Subscription | Plans + Payments | Company | ✅ |
| 23 | Reports | System usage analytics | Staff, Admin | ✅ |
| 24 | Audit | Filterable audit log | Staff, Admin | ✅ |
| 25 | Workload | Teaching workload tracking | Lecturer, Staff | ✅ |
| 26 | Schedule Conflict Detection | Auto-detect room conflicts | Staff, Admin | ✅ |
| 27 | Automation | Visual rule builder + Cron | Admin | ✅ |
| 28 | File Management | Upload + Signed URL + ACL | ทุกคน | ✅ |
| 29 | Real-time Events | Socket.IO auto-refresh | ทุกคน | ✅ |
| 30 | i18n (TH/EN) | 1,600+ keys | ทุกคน | ✅ |
| 31 | Dark/Light Theme | HSL-based CSS variables | ทุกคน | ✅ |

---

## 🚀 การติดตั้งและรัน

### Requirements
- **Node.js** 18+ 
- **Docker** (สำหรับ PostgreSQL) หรือ PostgreSQL ที่ติดตั้งแล้ว

### Quick Start

```bash
# 1. Clone
git clone https://github.com/your-org/dii-camt-showprogroup.git
cd dii-camt-showprogroup

# 2. Install frontend dependencies
npm install

# 3. Install backend dependencies
npm run backend:install

# 4. เปิด PostgreSQL (ใช้ Docker)
cd backend
docker compose up -d
cd ..

# 5. Setup database
npm run backend:generate    # สร้าง Prisma client
npm run backend:push        # สร้างตารางฐานข้อมูล
npm run backend:seed        # ใส่ข้อมูลตัวอย่าง

# 6. เปิด dev servers (2 terminals)
# Terminal 1 - Frontend
npm run dev

# Terminal 2 - Backend
npm run backend:dev
```

### URLs

| Service | URL |
|---|---|
| Frontend | `http://localhost:5173` |
| Backend API | `http://localhost:4000/api` |
| API Docs (Swagger) | `http://localhost:4000/api/docs` |

### Demo Accounts (หลัง seed)

| Role | Email | Password |
|---|---|---|
| Student | `alice@student.showpro.local` | `Password123!` |
| Lecturer | `narin@showpro.local` | `Password123!` |
| Staff | `staff@showpro.local` | `Password123!` |
| Company | `talent@northernsoft.local` | `Password123!` |
| Admin | `admin@showpro.local` | `Password123!` |

### Scripts ทั้งหมด

| Script | คำอธิบาย |
|---|---|
| `npm run dev` | Frontend dev server (Vite HMR) |
| `npm run build` | Frontend production build |
| `npm run lint` | ESLint check |
| `npm run backend:dev` | Backend dev server (tsx watch) |
| `npm run backend:build` | Backend TypeScript compile |
| `npm run backend:generate` | Prisma client generation |
| `npm run backend:push` | Push schema to database |
| `npm run backend:seed` | Seed demo data |

---

## 📁 โครงสร้างโปรเจค

```
dii-camt-showprogroup/
├── src/                           # Frontend (React)
│   ├── components/
│   │   ├── common/                # Shared components (GlassCard, FileUploader, etc.)
│   │   ├── dashboard/             # Dashboard widgets (GPA chart, skills radar)
│   │   ├── layout/                # DashboardLayout, Header, Sidebar
│   │   ├── schedule/              # DraggableSchedule, RescheduleDialog
│   │   └── ui/                    # 49 shadcn/ui components
│   ├── contexts/
│   │   ├── AuthContext.tsx        # JWT authentication state
│   │   ├── SocketContext.tsx      # Socket.IO real-time client
│   │   └── LanguageContext.tsx    # i18n (TH/EN)
│   ├── i18n/translations/        # TH + EN translation files
│   ├── lib/
│   │   ├── api.ts                # API client (centralized HTTP + endpoints)
│   │   └── live-utils.ts         # Formatting helpers
│   ├── pages/
│   │   ├── live/                  # 36 live backend-connected pages
│   │   │   ├── shared.tsx         # Shared UI wrappers (LivePage, MetricCard, etc.)
│   │   │   ├── CoursesLive.tsx
│   │   │   ├── AssignmentsLive.tsx
│   │   │   ├── AutomationLive.tsx
│   │   │   └── ... (36 files)
│   │   ├── dashboards/            # Role-specific dashboard views
│   │   ├── Dashboard.tsx          # Dashboard router
│   │   ├── LandingPage.tsx        # Public landing
│   │   ├── LoginPage.tsx          # Login + role select
│   │   └── RegisterPage.tsx       # Registration
│   ├── App.tsx                    # Root component + routing
│   └── main.tsx                   # Entry point
│
├── backend/                       # Backend (Express)
│   ├── prisma/
│   │   ├── schema.prisma          # 40+ models, 794 lines
│   │   └── seed.ts                # Demo data
│   ├── src/
│   │   ├── routes/                # 14 route files (~100 endpoints)
│   │   ├── services/              # 15 business logic services
│   │   ├── middleware/            # Auth, validation, error handling
│   │   ├── lib/                   # Prisma, Passport, Socket.IO
│   │   ├── config/                # Environment config
│   │   ├── server.ts              # Entry point
│   │   └── app.ts                 # Express configuration
│   ├── docker-compose.yml         # PostgreSQL container
│   └── package.json
│
├── BACKEND_ARCHITECTURE.md        # 🆕 คู่มือโครงสร้างหลังบ้านแบบละเอียด
├── BACKEND_ROADMAP.md             # สถานะการพัฒนาและ roadmap
├── package.json
└── vite.config.ts
```

---

## 🔧 สำหรับนักพัฒนา Backend

อ่านเอกสารโครงสร้างหลังบ้านแบบละเอียดที่ [`BACKEND_ARCHITECTURE.md`](./BACKEND_ARCHITECTURE.md) ซึ่งครอบคลุม:

- โครงสร้างไฟล์ทั้งหมด
- API Endpoints ทุก route (พร้อม Method, Path, Role, Description)
- Services layer (grade calculation, badge evaluation, automation engine)
- ระบบ Authentication (JWT + Passport flow)
- ระบบ Real-time (Socket.IO events)
- ระบบ File Storage (upload, signed URL, access control)
- Role-Based Access Control
- Error handling patterns
- แนวทางการเพิ่ม feature ใหม่

---

## 🔮 แผนพัฒนาในอนาคต

- [x] ~~Backend API~~ — Express + Prisma connected
- [x] ~~Real Authentication~~ — JWT + Passport
- [x] ~~Real-time Events~~ — Socket.IO
- [x] ~~PDF Export~~ — Transcript + Certificates
- [x] ~~File Management~~ — Upload + Signed URLs
- [x] ~~Automation~~ — Visual rule builder + Cron
- [ ] 🧪 **Testing** — Vitest (unit) + Playwright (E2E)
- [ ] 📄 **Pagination** — Server-side pagination for large datasets
- [ ] 📧 **Email/SMS** — Real notification delivery (SendGrid, Twilio)
- [ ] 📲 **Mobile App** — React Native
- [ ] 🚀 **CI/CD** — GitHub Actions
- [ ] ♿ **Accessibility** — WCAG 2.1 AA

---

## 👥 ทีมพัฒนา

**DII ShowPro Group**  
สาขาบูรณาการอุตสาหกรรมดิจิทัล (Digital Industry Integration)  
วิทยาลัยศิลปะ สื่อ และเทคโนโลยี (CAMT)  
มหาวิทยาลัยเชียงใหม่ 🏔️

---

## 📄 License

MIT License — นำไปใช้และพัฒนาต่อได้อย่างอิสระ

---

<div align="center">

Built with ❤️ by DII CAMT ShowPro Group · [Getting Started](#-การติดตั้งและรัน) · [Systems](#-ระบบทั้งหมด) · [Backend Guide](./BACKEND_ARCHITECTURE.md)

</div>
