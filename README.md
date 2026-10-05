# 🎓 DII CAMT ShowPro IQ

**Digital Industry Integration academic and career platform**
College of Arts, Media and Technology (CAMT) — Chiang Mai University

ShowPro IQ combines PangPond's frontend and visual design with Biw's backend API, PostgreSQL schema, and Prisma migration history. The Biw backend is the source of truth for data, validation, authorization, and API behavior.

![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-6-2D3748?logo=prisma&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?logo=postgresql&logoColor=white)

---

## 📋 Contents

- [Overview](#-overview)
- [Architecture](#-architecture)
- [Technology stack](#-technology-stack)
- [Supported features](#-supported-features)
- [Setup and development](#-setup-and-development)
- [Environment variables](#-environment-variables)
- [Scripts](#-scripts)
- [Database notes](#-database-notes)

---

## 🎯 Overview

ShowPro IQ supports academic, student services, and career workflows for students, lecturers, staff, companies, and administrators. The frontend uses the `xchange_auth_token` browser storage key and sends bearer tokens to the API.

### ✨ Project principles

| Area | IQ implementation |
|---|---|
| Frontend | PangPond views, design assets, and responsive components adapted to the IQ API |
| Backend | Biw Express routes, controllers, validation, and authorization |
| Database | Biw PostgreSQL schema, Prisma models, and full migration history |
| API integration | Frontend requests follow Biw endpoints and response contracts |
| Unsupported legacy screens | Removed when the Biw backend has no matching route or data model |

---

## 🏗 Architecture

```text
┌─────────────────────────────────────────────┐
│ Frontend: React + Vite                      │
│ PangPond interface → API client → REST API  │
│ Browser token key: xchange_auth_token        │
└──────────────────────┬──────────────────────┘
                       │ HTTP / WebSocket
┌──────────────────────▼──────────────────────┐
│ Backend: Express + TypeScript                │
│ Biw routes, authorization, and validation    │
│ Prisma ORM → PostgreSQL                      │
└─────────────────────────────────────────────┘
```

---

## 🛠 Technology stack

| Layer | Technologies |
|---|---|
| Frontend | React 18, TypeScript, Vite 6, Tailwind CSS, Radix UI, React Query, React Router |
| Backend | Node.js, Express, TypeScript, Zod, JWT, Socket.IO |
| Database | PostgreSQL 16, Prisma 6 |
| Development | npm, Docker Compose |

---

## 🧩 Supported features

The frontend retains screens backed by the Biw API, including authentication and profiles, courses and sections, enrollments, grades, attendance, activities, jobs and applications, internships, requests, appointments, messages, notifications, documents, and administrative workflows.

Course schedules, rooms, and capacity are section-based. Grade data uses configurable criteria and enrollment scores.

### Removed from this version

Assignment and submission, quest and training, subscription and payment-history, and player-stat screens are omitted because the Biw backend does not provide their supporting API and data models.

---

## 🚀 Setup and development

### Requirements

- Node.js and npm
- Docker Desktop with its engine running, or a compatible PostgreSQL 16 server

### Quick start

Run commands from the `dii-camt-showprogroup-IQ` project root.

```sh
# Create frontend configuration
cp .env.example .env

# Create backend configuration
cp backend/.env.example backend/.env

# Install dependencies
npm ci
npm ci --prefix backend

# Start the development PostgreSQL database
docker compose -f backend/docker-compose.yml up -d

# Generate Prisma Client, apply Biw migrations, and add development seed data
npm run backend:generate
npm run backend:migrate
npm run backend:seed

# Start both the frontend and API
npm run dev:all
```

The included Compose service publishes PostgreSQL on host port `5433` to avoid a conflict with a local service on `5432`. The example backend `DATABASE_URL` matches that port. The database uses a dedicated Docker volume named `backend_iq-showpro-postgres`.

> **Seeding clears existing application tables.** Run `npm run backend:seed` only against a development database whose contents may be reset.

If either dev server is already running, stop it before using `npm run dev:all`. Alternatively, run the services in separate terminals: `npm run backend:dev` for the API and `npm run dev` for Vite. If the API is already running, start only the frontend with `npm run dev`.

### Local URLs

| Service | URL |
|---|---|
| Frontend | [http://localhost:5173](http://localhost:5173) |
| API | [http://localhost:4000/api](http://localhost:4000/api) |
| API health | [http://localhost:4000/health](http://localhost:4000/health) |

---

## ⚙️ Environment variables

| File | Main settings |
|---|---|
| `.env` | `VITE_API_BASE_URL` and frontend options |
| `backend/.env` | `DATABASE_URL`, `JWT_SECRET`, CORS origins, API port, uploads, and backend integrations |

Keep these files local; use the corresponding `.env.example` templates as a starting point. The frontend and backend load separate environment files.

---

## 📜 Scripts

| Command | Description |
|---|---|
| `npm run dev:all` | Start frontend and backend development servers together |
| `npm run dev` | Start the Vite frontend only |
| `npm run backend:dev` | Start the Express API only |
| `npm run build` | Build the frontend for production |
| `npm run backend:build` | Compile the backend TypeScript |
| `npm run backend:generate` | Generate Prisma Client |
| `npm run backend:migrate` | Apply the Biw Prisma migration history to the development database |
| `npm run backend:seed` | Clear and seed development application data |
| `npm run check` | Typecheck, lint, build, and validate backend schema and TypeScript |

---

## 🗄 Database notes

IQ starts with the Biw schema and migration history. It does not migrate legacy application records or uploaded files. Use a clean database for first-time migration. Compose uses a dedicated IQ volume so existing local PostgreSQL data remains separate.

For database connection troubleshooting and backend-specific setup, see [backend/README.md](backend/README.md).
