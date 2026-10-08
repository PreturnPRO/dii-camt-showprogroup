# Deployment preparation (no cloud deployment performed)

## Proposed topology

- Frontend: Vercel builds the repository root with `npm ci && npm run build`, publishes `dist`, and uses the existing SPA rewrite in `vercel.json`.
- Backend: a container host builds `backend/Dockerfile`, exposes port 4000, and runs `prisma migrate deploy` before the server starts. Use a managed PostgreSQL instance with backups and TLS.
- Files: the current `UPLOAD_DIR` stores files on local disk. **Do not deploy as a production multi-instance/ephemeral service until file storage is migrated to durable shared storage** (or a persistent volume with backup is explicitly chosen). A container image alone does not solve this.

## Required environment

Frontend: `VITE_API_BASE_URL=https://<api-host>/api`, `VITE_ENABLE_DEMO_ACCOUNTS=false`.

Backend: `NODE_ENV=production`, `DATABASE_URL` (managed Postgres), `JWT_SECRET` (random 32+ characters), `CORS_ORIGIN=https://<frontend-host>`, `FRONTEND_URL=https://<frontend-host>` (used by document QR links), `PDF_FONT_PATH` (Thai-capable font in the image if Thai text is required), `UPLOAD_DIR` (durable storage only), and `EXPOSE_RESET_TOKEN=false`. Configure the password-reset webhook if password recovery must work. Never commit production values.

## Release checklist

1. Provision staging Postgres and storage; confirm backup/restore and access controls.
2. Set host environment variables; verify `FRONTEND_URL` matches the public frontend domain before issuing any PDFs (QR URLs are embedded permanently).
3. Apply migrations, then build/deploy backend and frontend. Run `GET /health` and verify CORS from the frontend.
4. On staging, run the [QA/UAT worksheet](sprint4-qa-uat.md), including all role permissions, PDF QR scans, file upload/download, and Chrome/Safari mobile layouts.
5. Get explicit UAT sign-off and resolve Critical/High bugs. Only then deploy production, with rollback image and database backup ready.

## Known release blockers

- No cloud account, domain, managed database, or storage destination has been supplied; no live URL or real UAT sign-off exists.
- The new `InternshipLog` review fields and `IssuedDocument` table require their migrations on the target database.
- QR verification confirms an issued reference and revocation status, not whether every byte of a presented PDF has been altered. If content-level authenticity is required, add a signed/downloadable canonical copy before treating it as a legal certificate.
- Existing local test data and `.env` files are not production credentials or production-ready data.
