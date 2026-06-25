# Company Role Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add frontend Excel/CSV import flows for companies and students, hide company cooperation/subscription menu items, and document backend follow-up work.

**Architecture:** Create shared import helpers and a reusable mapper dialog so `Users.tsx` and `Students.tsx` can reuse the same upload, column mapping, preview, validation, and progress behavior. Keep writes on the existing `api.users.create` endpoint, with backend batch support documented only.

**Tech Stack:** React, TypeScript, Vite, shadcn/ui, lucide-react, `xlsx`, existing `api.users.create`.

---

### Task 1: Import Mapping Utilities

**Files:**
- Create: `src/lib/import-mapping.ts`
- Create: `src/lib/import-mapping.test.ts`

- [ ] Define `ImportField`, `ParsedImportRow`, `ImportValidationResult`, `normalizeColumnName`, `guessColumnMapping`, `mapRows`, and `validateMappedRows`.
- [ ] Verify helper behavior with a small TypeScript test file executed through `tsx`.
- [ ] Ensure company and student field definitions include required and optional fields used by the UI.

### Task 2: Reusable Import Dialog

**Files:**
- Create: `src/components/common/ImportMappingDialog.tsx`

- [ ] Build a dialog that accepts field definitions, parse target label, and `onImport`.
- [ ] Parse uploaded Excel/CSV files with `xlsx`.
- [ ] Let staff map source columns to fields before import.
- [ ] Show preview rows, validation errors, and import progress.

### Task 3: Company Import In Users Page

**Files:**
- Modify: `src/pages/Users.tsx`
- Modify: `src/lib/api.ts`

- [ ] Add company import button and dialog.
- [ ] Convert mapped rows into `api.users.create` role `COMPANY` payloads.
- [ ] Report created and failed row counts.
- [ ] Refresh user list after import.

### Task 4: Student Import In Students Page

**Files:**
- Modify: `src/pages/Students.tsx`

- [ ] Add student import button for staff/admin.
- [ ] Convert mapped rows into `api.users.create` role `STUDENT` payloads.
- [ ] Refresh student list after import.

### Task 5: Company Login And Onboarding UI

**Files:**
- Modify: `src/pages/LoginPage.tsx`
- Modify: `src/components/layout/DashboardLayout.tsx` or create a focused onboarding component if cleaner

- [ ] Add company login mode UI that accepts phone and password.
- [ ] Keep email login path unchanged until backend phone login exists.
- [ ] Add company onboarding dialog when required company profile fields are missing.
- [ ] Update profile through existing `updateProfile`.

### Task 6: Hide Temporary Company Menu Items

**Files:**
- Modify: `src/components/layout/Sidebar.tsx`

- [ ] Remove company sidebar links for `/cooperation` and `/subscription`.
- [ ] Keep routes in `App.tsx` unchanged.

### Task 7: Backend Guide

**Files:**
- Create: `guide/backend-company-import.md`

- [ ] Document proposed batch import endpoints, request payloads, response shape, validation rules, duplicate handling, and phone-login endpoint behavior.

### Task 8: Verification

**Files:**
- No new source files.

- [ ] Run utility tests.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Run `npm run backend:validate` only if backend files changed.
