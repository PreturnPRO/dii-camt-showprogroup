# ShowPro IQ Backend

The IQ backend uses the Biw Express API, PostgreSQL schema, and Prisma migration history. Configure and start PostgreSQL before running migrations or seed data.

## Setup from the IQ folder

1. Create the backend environment file. Its database URL must match the PostgreSQL server you start:

   ```sh
   cp backend/.env.example backend/.env
   ```

   The included Docker Compose service uses user `postgres`, password `postgres`, database `showpro`, and host port `5433` (container port `5432`). The example `DATABASE_URL` is set for those values. Port `5433` avoids conflicts with a local PostgreSQL server already using `5432`. If you use another PostgreSQL instance, update the URL to its credentials.

2. Start Docker Desktop, then confirm its daemon is available and start PostgreSQL:

   ```sh
   docker info
   docker compose -f backend/docker-compose.yml up -d
   docker compose -f backend/docker-compose.yml ps
   ```

3. Install, generate the Prisma client, migrate, and seed:

   ```sh
   npm ci
   npm ci --prefix backend
   npm run backend:generate
   npm run backend:migrate
   npm run backend:seed
   ```

   **Seeding clears existing application tables. Run it only against a fresh development database.**

4. Start the API:

   ```sh
   npm run backend:dev
   ```

   API base URL: `http://localhost:4000/api`. Health check: `http://localhost:4000/health`.

## Troubleshooting

- `DATABASE_URL is missing`: make sure `backend/.env` exists and contains a non-empty `DATABASE_URL`. This file is separate from the root `.env`.
- `P1000` authentication failed: the PostgreSQL server responded, but its user/password do not match `DATABASE_URL`. Match the URL to the server credentials. The included Compose service uses `postgres:postgres`. Changing Compose credentials does not update an already initialized data volume; preserve the volume and use the actual database password, or explicitly select a new empty volume if you intend to start fresh.
- `P1001` or connection refused: PostgreSQL is not reachable at the host and port in `DATABASE_URL`. Start Docker Desktop and the Compose service, or correct the URL for your database.
- `docker info` cannot connect: Docker Desktop is not installed or its daemon is not running.

## Included Modules

- Authentication and role-based access control
- Students, staff, lecturers, and company profiles
- Courses, sections, enrollments, attendance, and grading
- Activities, jobs, applications, internships, and files
- Requests, appointments, office hours, messages, notifications, audit logs, and reports

Quest/training, subscription/payment, and assignment/submission modules are not part of the IQ backend.
