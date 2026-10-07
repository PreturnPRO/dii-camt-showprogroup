# Audit L1 — Code Quality & design.md Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the L1 findings. That means deleting dead code, giving the header the right page title on every route, making the Automation page bilingual and honest, and bringing every page in line with the team's `design.md` visual rules (no gratuitous gradients, glassmorphism or glows, plus compact titles, flat stat cards and segmented tabs).

**Architecture:** This is mechanical frontend work, plus a little backend dead-code removal. The style sweep is guarded by a static unit test (`src/lib/design-rules.test.ts`). The test scans `src/**/*.tsx` for patterns that design.md forbids. It goes RED first, and then each page is fixed until it is GREEN. Behaviour changes (header titles, Automation) get Playwright tests.

**Tech Stack:** React + Tailwind, vitest, Playwright.

**Spec:**
- `design.md` (repo root).
- Audit findings in `~/Documents/dii-audit-2026-10/6-frontend-admin-company-shell.md` §design.md violations, `5-frontend-lecturer-staff.md` (TeacherDashboard), `4-frontend-student.md` (duplicate helpers), `2-backend-academic.md` and `3-backend-career-ops.md` (dead code).
- Por's rulings of 8/10/69 night:
  - Follow design.md on **all pages**, including Biw's.
  - Delete dead code, but **keep the Biw files nothing imports** (CourseStatusRingCard, MonthCalendar, ProjectImage, CourseFormDialog, useCourseQueries, useStudentDashboard, use-media-query).
  - Translate Automation into Thai/English.

## Global Constraints

- **Thai typography (Por's standing rule, beats design.md):**
  - No `tracking-*` letter-spacing on text that can be Thai.
  - Line-height must be ≥1.35 for headings and ≥1.6 for body.
  - Thai fonts come first in the font stack.
  - design.md's `tracking-tight` and `tracking-wider` therefore apply only to Latin-only text: monospace numbers, course codes and English-only chips.
- **Real data only (M1/F6 rulings beat design.md §4.9):**
  - Do not add progress counters such as "6/10 ครั้ง (60%)" or badge progress the backend does not provide.
- **Allowed gradients (design.md itself):**
  - The subtle gradient text on the second word of a page title (§4.1).
  - The image-fallback placeholder (§4.8).
  - Small avatar/logo chips no bigger than `w-12 h-12`.
- **Forbidden:**
  - Gradient fills on cards, banners, hero sections or stat tiles.
  - `backdrop-blur-*` anywhere except a modal/drawer overlay.
  - Decorative blurred blobs (`blur-2xl`/`blur-3xl` absolutely-positioned divs).
  - Glow shadows (`shadow-[0_0_…]`, coloured `shadow-*-500/…`).
  - Decorative `animate-ping`/`animate-pulse` that is not a loading skeleton.
- **Page `h1`:** `text-2xl sm:text-3xl lg:text-4xl font-bold`, with no tracking because titles are Thai.
- **Stat cards:** flat surface (`bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800`), metric in `font-mono`.
- **Tabs:** design.md §4.3 segmented `TabsList` (inline-flex, not full width).
- **Do not touch** the DashboardLayout container padding in this plan. design.md §3.1 conflicts with Biw's collapsible/mobile layout, so it is held for Por (see "Questions for Por").
- **Commits:** two commits after the final review passes (backend dead code / frontend), with email `pordeediew001@gmail.com` and no Co-Authored-By. No push.

## Review Focus

1. **Contrast after removing gradients.** White text that sat on a gradient must not end up white-on-white or slate-on-slate. Check both light and dark mode. Owned by Task 5, which has a screenshot pass at 1280 and 390 in both themes for one page per role.
2. **Clickable vs not clickable.** Cards that navigate keep `cursor-pointer` and a hover state. Static cards lose hover lift so they don't look clickable. Owned by Task 5.
3. **Header title on routes with params** (`/courses/:id/grading`, `/portfolio/:id`) and on unknown routes. Owned by Task 2.
4. **Automation:** a staff user typing `/automation` is redirected (the backend is admin-only), and a bad JSON condition shows a readable message. Owned by Task 3.
5. **Removing `backdrop-blur` from the fixed Header** must not make content behind it unreadable when scrolled. It needs a solid surface instead. Owned by Task 5.

---

### Task 1: Dead code

**Files:**
- Delete:
  - `src/pages/dashboards/TeacherDashboard.tsx`
  - `src/contexts/ThemeContext.tsx` (0 bytes)
  - `src/components/common/ThemedStatCard.tsx` (0 bytes)
  - `backend/src/schemas/quests.schema.ts`
- Modify:
  - `backend/src/services/academic-core.service.ts`: remove exports nobody imports. Check each with `grep -rn "<name>" backend/src backend/tests` first.
  - `backend/src/services/course.service.ts`: remove `importCourses` and `deleteCourse` if unused (grep).
  - `src/lib/api.ts`: remove `assignments.*` and any endpoint whose backend route does not exist (grep `backend/src/routes`).
- Duplicate helpers:
  - `src/lib/user-profile.ts` re-exports `asRecord`/`asArray`/`asString`/`asNumber` from `live-data.ts`, but only where the semantics are identical (read both). Otherwise rename the user-profile ones to make the difference explicit.
  - `transformGradesForCard` goes into one shared module used by StudentDashboard and PersonalDashboard. Drop the hard-coded `'1/2568'` fallback in favour of `'-'`.

- [ ] Before each deletion, `grep -rn` proves it has zero importers. Keep the Biw-only unused files listed in the Spec.
- [ ] Verification: `npx tsc --noEmit -p tsconfig.app.json` (2 baseline errors), `npm run build`, `npx vitest run src`, `cd backend && npx tsc --noEmit && npm test`. All must be unchanged or green.

### Task 2: Header shows the real page title

**Files:**
- Modify: `src/components/layout/Header.tsx` (`getPageTitle`) and `src/components/layout/mobile/MobileHeader.tsx` if it shows a title
- Create: `src/lib/page-titles.ts`, mapping route prefix to `{ th, en }`. Reuse the Sidebar labels so names match the menu.
- Test: `src/lib/page-titles.test.ts`, `e2e/page-titles.spec.ts`

**Interfaces:** `pageTitleFor(pathname: string, language: 'th' | 'en'): string`. The longest matching prefix wins. Unknown routes fall back to the app name, never "Dashboard".

- [ ] **RED, unit:**
  - `/users` gives "ผู้ใช้งาน".
  - `/courses/abc/grading` gives the grading title.
  - `/audit` gives the audit title.
  - `/nope` does not give "Dashboard".
- [ ] **RED, E2E:** staff on `/users` sees the header title "ผู้ใช้งาน". Alice on `/grades` sees "ผลการเรียน".
- [ ] Implement, then GREEN.

### Task 3: Automation page — bilingual, admin-only, honest errors

**Files:**
- Modify:
  - `src/pages/Automation.tsx`: all strings go through `t.automation.*`, Delete opens a confirm dialog, and a JSON parse error shows a readable message.
  - `src/i18n/translations/th.ts` and `en.ts`, adding an `automation` block.
  - `src/App.tsx`: `/automation` RoleGuard becomes `['admin']`.
- Test: `e2e/automation.spec.ts`

- [ ] **RED:**
  - Admin in Thai (the default language) sees a Thai `h1` on `/automation`.
  - Staff opening `/automation` is redirected to `/dashboard` with the no-access toast.
  - Delete asks for confirmation. Cancelling keeps the rule (create a rule via API first, delete it via API in `afterEach`).
- [ ] Implement, then GREEN.

### Task 4: Sidebar tidy

- [ ] The admin sidebar lists `/dashboard` twice: remove the duplicate. RED E2E: admin's sidebar has exactly one link to `/dashboard`.
- [ ] Remove the glow `shadow-[0_0_8px_…]` from the active indicator. Task 5's static test covers this.

### Task 5: design.md visual sweep (all pages)

**Files:**
- Create: `src/lib/design-rules.test.ts`
- Modify: every page or component the test flags. Of the files that contain `bg-gradient-to`, 57 or so need case-by-case judgement under the Global Constraints.

**The guard test (write first, watch it fail):**

```ts
import { readFileSync } from 'node:fs';
import { globSync } from 'node:fs'; // Node 22+: fs.globSync; if unavailable use fast-glob (already a transitive dep) or a recursive readdir
import { describe, expect, it } from 'vitest';

const files = globSync('src/**/*.tsx').filter((f) => !f.endsWith('.test.tsx') && !f.includes('/components/ui/'));
const src = (f: string) => readFileSync(f, 'utf8');

// design.md §1 prohibitions + Por's Thai typography rule
const RULES: Array<[string, RegExp]> = [
  ['glassmorphism (backdrop-blur outside overlays)', /backdrop-blur(?![^"'`]*\boverlay\b)/],
  ['decorative blurred blob', /\bblur-(2xl|3xl)\b/],
  ['glow shadow', /shadow-\[0_0_/],
  ['gradient-filled surface', /\bbg-gradient-to-[a-z]+\b(?![^"'`]*\b(bg-clip-text|w-(?:[4-9]|1[0-2])\b|h-(?:[4-9]|1[0-2])\b))/],
];

describe('design.md visual rules', () => {
  for (const [name, pattern] of RULES) {
    it(`no ${name}`, () => {
      const offenders = files.filter((f) => pattern.test(src(f)));
      expect(offenders).toEqual([]);
    });
  }
});
```

  The regexes are a starting point. If the allowed cases in the Global Constraints (gradient title text via `bg-clip-text`, small avatar chips ≤ w-12, the §4.8 image placeholder, modal overlays) trip a rule, make the rule more precise. Never weaken it by allowlisting whole files without a ledger ruling.

- [ ] Run `npx vitest run src/lib/design-rules.test.ts`. Expected: RED, listing the offending files.
- [ ] Fix page by page:
  - Gradient card/banner/hero/stat fills become the flat surface tokens.
  - Text that was white on a gradient switches to `text-slate-900 dark:text-slate-100`, with labels `text-slate-500 dark:text-slate-400`.
  - Decorative blobs and glows are deleted.
  - The Header pill loses blur and gets a solid `bg-white dark:bg-slate-900` with a border when scrolled.
  - Page `h1` follows the Global Constraints.
  - Tabs that are full-width bars become §4.3 segmented controls.
  - `tracking-*` comes off Thai-capable text.
- [ ] GREEN on the guard test, then tsc, build, unit and the full E2E suite (restart the backend dev server first).
- [ ] **Screenshot pass.** For staff, lecturer, student and company, plus landing and login, take a Playwright screenshot of the dashboard and one inner page at 1280×900 and 390×844, in light and dark (`page.emulateMedia({ colorScheme })`). Save them to `.superpowers/sdd/<plan>/shots/`. Look at each and check: no invisible text, clickable cards still look clickable, nothing overflowing at 390. Fix anything found, test-first where it is behaviour.

### Finish

- [ ] Final review (opus) of the L1 diff, then fix Critical/Important findings test-first, with minors to the ledger.
- [ ] Two commits (no push). Ledger to `~/Documents/dii-audit-2026-10/l1-ledger.md`.

## Questions for Por (skipped, not guessed; asked before the agent team starts)

1. **design.md §3.1 "sacred padding"** `ml-0 md:ml-60 px-4 sm:px-6 lg:pl-8 lg:pr-52` vs Biw's layout.
   - Biw's sidebar collapses, so the left margin changes, and the mobile layout has its own shell.
   - Applying it verbatim fixes `ml-60` even when the sidebar is collapsed, and reserves 13rem on the right for nothing.
   - Options: follow design.md exactly / keep Biw's layout and update design.md / something in between.
2. **design.md features beyond style:**
   - §4.7 week/month switch with `?view=` (Biw's month view is not ported).
   - §4.10 every course card and timetable block links to `/courses`, plus a register CTA on empty states and `?tab=` deep links.
   - §4.9 badge progress counters, which conflict with the M1 "real data only" ruling unless the backend tracks progress.
   - These are feature work rather than L1 polish: do them now, or list them as follow-ups?
