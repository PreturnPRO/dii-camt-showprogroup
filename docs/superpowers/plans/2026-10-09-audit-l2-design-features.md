# Audit L2 — design.md features (Por rulings 9/10/69)

Branch `Por` (from `94d9dbd`). No push. Commit as pordeediew001, no attribution trailer.
Rule carried from M1: never show a number the backend cannot back.

## Task 1 — design.md §3.1 matches the real layout (docs only)
- File: `design.md` §3.1.
- Replace the "sacred padding" rule with what `src/components/layout/DashboardLayout.tsx` actually does:
  desktop (`!useIsMobile()`): fixed `pl-[72px]` rail, sidebar expands as an overlay (content never reflows), inner `px-4 md:px-6 lg:px-8`, `pt-24 sm:pt-28`;
  mobile: `MobileHeader` + `MobileBottomNav` + drawer, `pt-16 pb-20 px-3 sm:px-4`; exactly one `<Outlet/>` rendered.
- Also note in §4.9 that locked badges come from the server catalogue (Task 4).
- Done when: `grep -n "lg:pr-52" design.md` finds nothing; text names the 72px rail + one Outlet.

## Task 2 — Schedule week/month switch, `?view=` (§4.7)
- Files: `src/lib/timetable.ts` (+ `src/lib/timetable.test.ts`), `src/components/schedule/MonthCalendar.tsx` (rewrite on section model), `src/pages/Schedule.tsx`, `e2e/timetable.spec.ts`.
- RED first:
  - unit `monthOccurrences(entries, '2026-10', moves)` → every date of Oct 2026 keyed `YYYY-MM-DD`; a Monday section appears on each Monday of the month only; an approved move takes it off its original date and puts it on `newDate`; dates outside the month absent.
  - E2E (student alice, lecturer narin): segmented `[สัปดาห์ | เดือน]` visible; clicking เดือน sets `?view=month`; reload keeps month view; a day with a class shows its code; clicking the day opens a dialog listing it; prev/next month changes `?month=`.
- Implementation: `monthOccurrences` = `weekOccurrences` for each week overlapping the month, filtered to the month, `moved-out` dropped. Moves fetched for the visible range (week or month). MonthCalendar takes `Record<date, Occurrence[]>`; no `course.schedule` use.
- Done when: unit + E2E green and the old `course.schedule`-based code is gone from MonthCalendar.

## Task 3 — Course links + CTA + Courses `?tab=` (§4.10)
- Files: `src/pages/Courses.tsx`, `src/pages/dashboards/StudentDashboard.tsx`, `src/pages/Schedule.tsx`, `src/components/schedule/MonthCalendar.tsx`, new `e2e/course-links.spec.ts`.
- RED first (E2E, student):
  - `/courses?tab=registration` opens the registration tab; switching tabs updates `?tab=`.
  - Dashboard "รายวิชาเทอมนี้": title and a course card navigate to `/courses`.
  - Schedule: stat card "วิชาที่ลงทะเบียน" and a "คาบเรียนวันนี้" item navigate to `/courses`; month dialog item navigates to `/courses`.
  - Student with no enrolment: Schedule + Dashboard show the CTA text "ยังไม่มีรายวิชาที่ลงทะเบียนในระบบ คลิกเพื่อไปหน้าลงทะเบียน" → lands on `/courses?tab=registration`.
- Implementation: clickable elements are real `button`/`role="link"` with keyboard (Enter) support, `cursor-pointer` + hover. Existing "เพิ่มวิชา" path that sets activeTab now sets the param.
- Done when: E2E green.

## Task 4 — Badges: locked + real progress (§4.9)
- Files: `backend/src/services/badge.service.ts`, students controller (profile response), `backend/tests/badge-progress.test.ts`, `src/pages/Activities.tsx`, `e2e/student-activities.spec.ts`.
- Backend: badge definitions get `{ metric, target, unit }` instead of opaque `isEligible`; `badgeProgress(student)` returns each catalogue badge `{ name, nameThai, criteria, icon, metric, current, target, unlocked }`. `quest-finisher` is left out of the catalogue shown (quests were removed, `completedQuests` is always 0 → it can never unlock; ruling). Automation-awarded badges (not in catalogue) show as unlocked only.
- RED first: backend test — student with 30 XP gets `xp-explorer` `{current:30,target:100,unlocked:false}`; after award it is `unlocked:true`; `quest-finisher` absent. E2E: Activities shows locked badges with Lock icon (dashed, 60%) and text `30 / 100 XP (30%)` + criteria; no grey dots; clicking a badge selects it (one at a time, `border-2 border-purple-500` + dot) and shows its rule.
- Done when: backend + E2E green; eligibility still awards the same badges as before (existing tests green).

## Close
- Full: backend `npm test`, `npx tsc`, `npm run build`, unit, full E2E (restart backend dev first).
- Opus final review → fix → commit 2 (backend / frontend+docs) → start the review-agent team (inspect only).
