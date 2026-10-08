# Sprint 3–4 review fixes (2026-10-08)

Source: opus review of the GPT-written Sprint 3–4 working tree. Por's rulings 8/10/69.

## Rulings
- Internship status: `not_started` → `in_progress` automatically on the student's first diary entry. Staff/admin set `completed` / `cancelled` (or back to `in_progress`) from the intern detail page.
- Internship completion certificate: 409 unless status is `completed`.
- Student may edit their own diary entry; editing resets review to `pending`, clears the old review, notifies the last reviewer. Approved entries are locked (Claude default — tell Por).
- Verify page shows a masked student ID (last 3 digits) + staff/admin can revoke by reference from the Documents page.
- `FRONTEND_URL` required when `NODE_ENV=production`.

## Tasks (TDD: red test first, then code)
1. **Backend status + certificate** — `career.controller.ts` createInternshipLog sets `in_progress` when `not_started`; new `PATCH /api/internship/records/:id/status` (staff/admin, enum in_progress|completed|cancelled); `documents.controller.ts` certificate 409 unless completed. Tests: `backend/tests/internship-status.test.ts` (first log flips status via API; reminder then fires for that student with no hand-made record; certificate 409/200; non-staff 403).
2. **Review authz tests + student edit** — `backend/tests/internship-log-review.test.ts`: advisor 200, non-advisor lecturer 403, own company 200, other company 403, unknown log 404; new `PATCH /api/internship/logs/:id` (student own, not approved) resets review + notifies reviewer; other student 403; approved 409.
3. **Verify + revoke** — `verifyDocument` returns `studentIdMasked`; `POST /api/documents/revoke` `{reference}` staff/admin; reference uses Bangkok year consistently. Tests in `document-verification.test.ts`.
4. **Env** — `assertProductionEnv` in `env.ts`, unit test.
5. **Frontend** — VerifyDocument: 404 vs error+retry, kind labels, masked ID; InternDetailView staff status control; InternshipDiary edit dialog for own non-approved entries; Documents revoke form; Courses minStudents read/send via `sections[0]`; e2e spec no dev default.
6. Full suite (check, backend, unit, E2E after backend restart) → opus re-review → ask Por to commit.
