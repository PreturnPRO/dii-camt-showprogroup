# Pending rulings from agent 1/2 (2026-10-08)

Por's rulings 8/10/69 on the items left open by the requirements/QA and security agents.
Each group: red test first → code → full suite → opus review → commit (Por allowed commits, no push).

## A. Company sees applicants (L1 + M10) and forgot password (M11)
- `career.controller.ts` `forViewer` (COMPANY): drop `student.user.email`; keep `student.cvUrl` only when the student's consent allows this company (`allowDataSharing` or `sharedWithCompanies` has the company id), else null. Same for `updateApplicationHandler`.
- `Applicants.tsx`: "เปิด Resume" uses `resumeUrl ?? student.cvUrl`; otherwise says the student has not shared a CV.
- `ForgotPasswordPage.tsx` + `auth.controller`: when no reset webhook is configured the page says to contact staff (staff reset passwords) instead of "link sent". Backend exposes whether delivery is configured (`GET /auth/password-reset-available`).
- Tests: backend `applications-company-view.test.ts`; e2e for applicants CV + forgot page.

## B. Advisor (H2)
- `PATCH /users/:id` roleData `advisorId` (lecturer profile id, or null to clear) for students, staff/admin.
- Student import: optional `advisorEmail` column → lecturer by email; unknown email fails that row.
- `StudentUserDialog`: advisor select (lecturers list); `UserRow` carries advisorId.
- Tests: backend `student-advisor.test.ts`; e2e staff sets advisor → lecturer sees advisee.

## C. Activity attendance (M8)
- Staff/admin activity details dialog: per registrant "เข้าร่วม" / "ไม่มา" (+ select several) → `PATCH /activities/enrollments/:id/status` completed|absent. Completed grants hours/points once (existing `grantActivityReward`).
- Tests: backend reward granted once, absent grants nothing; e2e staff marks → student hours go up.

## D. Lecturer dashboard (M12)
- Upcoming = confirmed/pending appointments from today (Bangkok) on; courses = current term only.
- Per course: students enrolled, waiting for a grade (enrollments without letterGrade, not dropped), buttons เช็คชื่อ (`/attendance?courseId=`) and ให้เกรด (`/grades?courseId=`); both pages honour `?courseId`.
- Tests: unit for the pure filters; e2e dashboard numbers come from the API.

## E. Appointments (M1)
- Students: sidebar "นัดหมาย", `/appointments` open to student; book = lecturer → date → a free office-hour slot of that weekday; see own appointments.
- Backend `createAppointment` validates: lecturer exists, date today or later (Bangkok), weekday has that exact available office-hour slot, slot not already pending/confirmed; location from the slot.
- Lecturers: edit office hours (day, start, end, location) on `/appointments` → `PUT /office-hours`.
- Admin keeps the list view only (no booking button).
- Tests: backend booking rules; e2e lecturer sets hours → student books → lecturer confirms.
