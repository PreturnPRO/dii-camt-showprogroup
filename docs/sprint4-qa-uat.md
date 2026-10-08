# Sprint 4 QA and UAT worksheet

This is a working checklist, not a claim that UAT has occurred. Record date, tester, browser/device, result, and bug ID for every run. Do not use real student data in a public demo environment.

## Automated gate

1. `npm ci` and `npm ci --prefix backend`.
2. Start PostgreSQL, apply migrations with `cd backend && npx prisma migrate deploy`, and seed a **disposable** QA database only.
3. Run `npm run check`, `npm test --prefix backend`, and `npm run test:e2e` with frontend on port 8080 and API on port 4000.
4. Record the exact commit, migration version, browser versions, and counts of passed/failed/skipped tests. A build passing is not a substitute for E2E/UAT.

Local verification on 2026-10-08 (uncommitted working tree): `npm run check` passed; 307 backend tests and 93 frontend unit tests passed; the targeted internship-review E2E passed; the backend Docker image built with 0 production-dependency audit findings. Full browser/multi-device E2E and human UAT remain pending.

## Manual scenarios (repeat in Chrome and Safari, desktop and 390px mobile)

| ID | Role | Task | Expected result | Result / bug ID |
| --- | --- | --- | --- | --- |
| S4-01 | Student | Sign in; view dashboard, grades, timetable | Real data loads; no horizontal overflow | Pending |
| S4-02 | Student | Add internship diary with date, hours, work, skills, challenges | Entry persists after reload; save button shows pending state | Pending |
| S4-03 | Lecturer | Review only an advisee's diary; approve or request changes with comment | Status and comment persist; unrelated student is denied | Pending |
| S4-04 | Company | Search/filter talent, bookmark, send message | Correct results and recipient; no private grade detail | Pending |
| S4-05 | Staff | Issue transcript and internship PDF; scan QR | Unique reference and verification page agree; no student data is exposed publicly | Pending |
| S4-06 | Admin | Manage users and inspect reports | Role restrictions work; loading/empty/error states are clear | Pending |
| S4-07 | All | Cancel/retry a failed API action; use keyboard and narrow screen | No double submission, dead button, clipped dialog, or critical crash | Pending |

## Bug and feedback log

| ID | Date | Role / device / browser | Steps to reproduce | Expected / actual | Severity | Owner | Status | Retest evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| — | — | — | — | — | — | — | — | — |

Severity: Critical = data loss/security/login unavailable; High = core task blocked; Medium = workaround exists; Low = visual/copy. Do not sign off with open Critical/High issues.

## UAT session script

1. Give each tester a disposable account for their real role. Do not tell them the click path.
2. Ask them to complete the matching scenarios above while an observer records time, errors, and assistance needed.
3. Ask: "What was confusing? What was missing? Would you use this for the same task next week?"
4. Log every issue, fix it, and have the same role retest.
5. Record sign-off only after the tester confirms the core task worked without help.

| Role | Tester / date | Core task without help? | Open issues | Accepted? / signature |
| --- | --- | --- | --- | --- |
| Student | Pending | Pending | Pending | Pending |
| Lecturer | Pending | Pending | Pending | Pending |
| Staff | Pending | Pending | Pending | Pending |
| Company | Pending | Pending | Pending | Pending |
| Admin | Pending | Pending | Pending | Pending |
