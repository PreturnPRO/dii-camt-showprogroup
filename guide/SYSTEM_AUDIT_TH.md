# รายงานตรวจระบบ DII-CAMT ShowPro

อัปเดตล่าสุด: 30 เมษายน 2026

เอกสารนี้สรุปสถานะหลังการสำรวจ frontend, backend, database schema และ API ของระบบ เพื่อใช้ตรวจความพร้อมก่อนเปิดใช้งานจริง

## สรุปภาพรวม

- Backend หลักพร้อมใช้งานผ่าน Express + Prisma + PostgreSQL
- Frontend หลักเชื่อม API จริงแล้ว โดยยังมี mock/fallback บางจุดไว้กันกรณี backend ว่างหรือ offline
- หน้า static ที่ไม่จำเป็นต้องมี API ได้แก่ Landing, Terms, Privacy, NotFound, Placeholder
- หน้า Login/Register ใช้ flow auth จริงผ่าน `AuthContext` และ API `/auth`
- Dashboard นักศึกษาส่วน Curriculum Progress, ประวัติผลการเรียน, Skills และ Company Targets เปลี่ยนจากข้อมูล mock เป็นข้อมูลจาก backend แล้ว

## Dashboard นักศึกษา

| ส่วน | สถานะ | แหล่งข้อมูลจริง |
| --- | --- | --- |
| Curriculum Progress | ต่อข้อมูลจริงแล้ว | `GET /api/students/stats` -> `curriculumProgress` |
| ประวัติผลการเรียน | ต่อข้อมูลจริงแล้ว | `GET /api/students/stats` -> `gradeHistory` พร้อม credits/gradePoint |
| Skills | ต่อข้อมูลจริงแล้ว | `SkillRubric`, `submissions`, `student.skills` ผ่าน `GET /api/students/stats` |
| Company Targets | ต่อข้อมูลจริงแล้ว | `GET /api/career-targets` |
| ปุ่ม I'm Interested | ทำงานจริงแล้ว | `POST /api/applications` |

หมายเหตุ: ถ้า database ยังไม่มีข้อมูล ระบบจะแสดง empty state หรือ fallback ที่เหมาะสมแทนการแสดงค่าหลอกเป็นข้อมูลหลัก

## Backend/API ที่มีแล้ว

| ระบบ | Endpoint หลัก | สถานะ |
| --- | --- | --- |
| Auth / Register / Login / Profile | `/api/auth/*` | พร้อมใช้งาน |
| Users / Roles / Permissions | `/api/users`, `/api/roles`, `/api/permissions` | พร้อมใช้งาน |
| Student profiles / stats / transcript | `/api/students/*` | พร้อมใช้งาน |
| Courses / Enrollments / Schedule | `/api/courses`, `/api/enrollments`, `/api/schedule` | พร้อมใช้งาน |
| Assignments / Submissions / Rubrics | `/api/assignments`, `/api/submissions`, `/api/skill-rubrics` | พร้อมใช้งาน |
| Grades / Attendance | `/api/grades`, `/api/attendance` | พร้อมใช้งาน |
| Activities / Registrations | `/api/activities`, `/api/activity-registrations` | พร้อมใช้งาน |
| Quests / Gamification | `/api/quests`, `/api/quest-progress` | พร้อมใช้งาน |
| Jobs / Applications / Career targets | `/api/jobs`, `/api/applications`, `/api/career-targets` | พร้อมใช้งาน |
| Companies / Talent search / Student profiles | `/api/companies`, `/api/talent/*`, `/api/student-profiles` | พร้อมใช้งาน |
| Appointments | `/api/appointments` | พร้อมใช้งาน |
| Messages / Notifications | `/api/messages`, `/api/notifications` | พร้อมใช้งาน |
| Requests / Support | `/api/requests` | พร้อมใช้งาน |
| Documents / Files | `/api/documents`, `/api/files` | พร้อมใช้งาน |
| Reports / Audit logs | `/api/reports`, `/api/audit-logs` | พร้อมใช้งาน |
| Budget / Cooperation / Personnel / Workload | `/api/budget`, `/api/cooperation`, `/api/personnel`, `/api/workload` | พร้อมใช้งาน |
| Facilities / Automation | `/api/facilities`, `/api/automation` | พร้อมใช้งาน |
| OpenAPI docs | `/api/docs` | พร้อมใช้งาน |

## Frontend ที่ตรวจแล้ว

หน้าระบบหลักมีการเรียก API จริงหรือผ่าน live data bridge แล้ว:

- Activities / ActivitiesManagement
- Applicants / Appointments / Assignments / Attendance
- Audit / Budget / Cooperation / Courses
- Documents / Grades / Internships / InternTracking
- JobPostings / Messages / Network / Notifications
- PersonalDashboard / Portfolio / Personnel
- Reports / Requests / Schedule / ScheduleManagement
- Settings / SkillsRequirement / StudentProfiles / Students
- Subscription / Training / Users / Workload / WorkloadTracking
- AdminDashboard / CompanyDashboard / LecturerDashboard / StaffDashboard / StudentDashboard / TeacherDashboard

หน้าที่เป็น static หรือ shell โดยตั้งใจ:

- LandingPage
- Index
- NotFound
- PlaceholderPage
- PrivacyPolicy
- TermsOfService

## จุดที่ต้องตรวจด้วยข้อมูล production ก่อนเปิดจริง

- ใส่ข้อมูลหลักสูตรจริงให้ครบทุกวิชาในฐานข้อมูล
- ใส่ enrollment, grade และ attendance จริงของนักศึกษา
- ใส่ skill rubric/submission จริงเพื่อให้กราฟ skills แม่นยำ
- ใส่บริษัทและ job posting จริง เพื่อให้ Company Targets แนะนำงานได้ถูกต้อง
- เปลี่ยนรหัสผ่านบัญชี demo/admin หลัง seed
- ตั้งค่า `CORS_ORIGIN`, `JWT_SECRET`, `DATABASE_URL`, `VITE_API_BASE_URL` เป็นค่าจริงของ production
- ตั้ง backup database และ upload directory
- ทดสอบ upload/download เอกสารบน VPS จริง
- ทดสอบ login/register ทุก role หลังเปิด HTTPS

## คำสั่งตรวจความพร้อม

```bash
npm run typecheck
npm run lint
npm run build
npm run backend:validate
```

หรือรันรวม:

```bash
npm run check
```

## Smoke test หลัง deploy

```bash
curl https://YOUR_DOMAIN/health
curl https://YOUR_DOMAIN/api
curl https://YOUR_DOMAIN/api/docs
```

หลัง login แล้วให้ทดสอบ endpoint สำคัญด้วย token:

```bash
curl https://YOUR_DOMAIN/api/students/stats -H "Authorization: Bearer YOUR_TOKEN"
curl https://YOUR_DOMAIN/api/career-targets -H "Authorization: Bearer YOUR_TOKEN"
curl https://YOUR_DOMAIN/api/jobs -H "Authorization: Bearer YOUR_TOKEN"
curl https://YOUR_DOMAIN/api/notifications -H "Authorization: Bearer YOUR_TOKEN"
```

## สถานะพร้อมเปิด

ระบบอยู่ในสถานะพร้อมเตรียมเปิดใช้งาน หลังจากตั้งค่า production environment, domain, SSL, database seed/ข้อมูลจริง, backup และ smoke test บน VPS ผ่านครบทุกข้อ
