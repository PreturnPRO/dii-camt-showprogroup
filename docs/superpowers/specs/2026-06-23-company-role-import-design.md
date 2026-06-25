# Company Role Import Design

## Scope

Build the company and student import experience on the frontend first. Staff and admin users can upload Excel or CSV files, preview rows in an Excel-like table, map source columns to system fields before import, and then create records through the existing single-user API as a frontend batch. Backend batch endpoints are documented as a follow-up guide but are not implemented in this pass.

## Features

Staff/admin company import lives on the existing user management page. The import flow reads `.xlsx`, `.xls`, or `.csv` files with the existing `xlsx` package, shows detected columns, lets staff map columns to company fields, validates required fields, previews parsed rows, and creates company users by calling `api.users.create` for each valid row.

Staff/admin student import lives on the existing student database page. The flow is the same: upload, map columns, preview rows, validate required fields, then create student users through `api.users.create`.

The company login screen gains a company mode where companies can sign in with mobile number and password. Because backend phone login is out of scope, this pass adds the UI and clear wiring point, while keeping the existing email/password login functional. Backend guidance explains the required endpoint behavior.

After a company signs in, if company profile data is incomplete, the app displays an onboarding dialog for missing fields and password setup. Backend support for detecting temporary passwords is documented as follow-up; frontend detection uses missing profile fields in this pass.

Company sidebar temporarily hides cooperation and subscription menu items. Existing routes remain untouched.

## Data Flow

Import files are parsed entirely in the browser. The mapper converts each source row into the existing `/users` create payload:

- Company rows become role `COMPANY` users with `profile.companyId`, `companyName`, `companyNameThai`, `industry`, `size`, and optional contact fields.
- Student rows become role `STUDENT` users with `profile.studentId`, `major`, `program`, `year`, `semester`, and `academicYear`.

Email and display names are derived from mapped fields when a spreadsheet does not provide them. The existing backend temporary password fallback remains the default unless the spreadsheet maps a password column.

## Backend Guide

Future backend work should add batch endpoints such as `POST /api/users/import/companies` and `POST /api/users/import/students`. Each endpoint should accept normalized row objects, validate duplicates before writes, return per-row results, and wrap each row creation in a transaction. Company phone login should support a dedicated identifier field, lookup active company users by normalized phone number, compare password, and return the same session payload as email login.

## Testing

Frontend utility tests should cover column normalization, row mapping, required-field validation, and default value generation. Manual verification should include uploading representative company and student spreadsheets, mapping columns, confirming preview errors, and confirming cooperation/subscription are hidden from company navigation.
