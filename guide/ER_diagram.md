# ShowPro - Full Database DBML

นี่คือโครงสร้างฐานข้อมูลทั้งหมดของระบบ (Full Database ER Diagram) ที่อิงตาม `schema.prisma` โดยได้รวมทุกตารางไว้ในที่เดียว และเชื่อมความสัมพันธ์ (Relationships) แบบ `1:1`, `1:N` อย่างถูกต้องตาม Prisma schema 

สามารถนำโค้ดด้านล่างไปวางใน [dbdiagram.io](https://dbdiagram.io) เพื่อสร้างเป็นแผนภาพ ER Diagram รวมได้เลย

```dbml
// ==========================
// Enums
// ==========================
Enum Role {
  STUDENT
  LECTURER
  STAFF
  COMPANY
  ADMIN
}

Enum FileVisibility {
  PUBLIC
  PRIVATE
}

// ==========================
// Users & Core Profiles
// ==========================
Table User {
  id String [primary key]
  email String [unique]
  passwordHash String
  name String
  nameThai String
  role Role
  avatar String [null]
  phone String [null]
  isActive Boolean [default: true]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
  lastLogin DateTime [null]
}

Table StudentProfile {
  id String [primary key]
  userId String [unique, note: 'อ้างอิง User.id (Foreign Key)']
  studentId String [unique, note: 'รหัสนักศึกษา เช่น 64061xxxx (Business Key)']
  major String
  program String
  year Int
  semester Int
  academicYear String
  gpa Float [default: 0]
  gpax Float [default: 0]
  totalCredits Int [default: 120]
  earnedCredits Int [default: 0]
  requiredCredits Int [default: 120]
  academicStatus String [default: 'normal']
  cvUrl String [null]
  advisorId String [null, note: 'อ้างอิง LecturerProfile.id (อาจารย์ที่ปรึกษา)']
  xp Int [default: 0]
  coins Int [default: 0]
  gamificationPoints Int [default: 0]
  totalActivityHours Int [default: 0]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table LecturerProfile {
  id String [primary key]
  userId String [unique, note: 'อ้างอิง User.id (Foreign Key)']
  lecturerId String [unique, note: 'รหัสประจำตัวอาจารย์ (Business Key)']
  department String
  position String
  specialization "String[]"
  researchInterests "String[]"
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table StaffProfile {
  id String [primary key]
  userId String [unique, note: 'อ้างอิง User.id (Foreign Key)']
  staffId String [unique, note: 'รหัสประจำตัวเจ้าหน้าที่ (Business Key)']
  department String
  position String
  permissions "String[]"
  canManageUsers Boolean [default: false]
  canManageCourses Boolean [default: false]
  canManageSchedules Boolean [default: false]
  canViewReports Boolean [default: false]
  canManageInternships Boolean [default: false]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table CompanyProfile {
  id String [primary key]
  userId String [unique, note: 'อ้างอิง User.id (Foreign Key)']
  companyId String [unique, note: 'เลขทะเบียนหรือรหัสบริษัท (Business Key)']
  companyName String
  companyNameThai String
  industry String
  size String
  website String [null]
  address String [null]
  locationMapUrl String [null]
  productsServices String [null]
  contactPersonName String [null]
  contactPersonRole String [null]
  contactPersonEmail String [null]
  contactPersonPhone String [null]
  socialMedia String [null]
  onboardingStatus String [default: 'pending_review']
  privacyProtocolAcceptedAt DateTime [null]
  internshipSlots Int [default: 0]
  currentInterns Int [default: 0]
  subscription String [default: 'free']
  subscriptionStatus String [default: 'inactive']
  canContactStudents Boolean [default: true]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table AdminProfile {
  id String [primary key]
  userId String [unique, note: 'อ้างอิง User.id (Foreign Key)']
  adminId String [unique, note: 'รหัสประจำตัวแอดมิน (Business Key)']
  isSuperAdmin Boolean [default: false]
  permissions "String[]"
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

// ==========================
// Academic & Courses
// ==========================
Table Course {
  id String [primary key]
  code String [unique]
  name String
  nameThai String
  credits Int
  semester Int
  academicYear String
  year Int
  lecturerId String [note: 'อ้างอิง LecturerProfile.id (Foreign Key ไม่ใช่รหัสอาจารย์)']
  description String [null]
  prerequisites "String[]"
  learningOutcomes "String[]"
  syllabus String [null]
  schedule Json [null]
  room String [null]
  status String [default: 'active']
  maxStudents Int [default: 60]
  minStudents Int [default: 1]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table Section {
  id String [primary key]
  courseId String
  number String
  room String [null]
  facilityId String [null]
  maxStudents Int [default: 60]
  schedule Json
}

Table Enrollment {
  id String [primary key]
  studentId String [note: 'อ้างอิง StudentProfile.id (Foreign Key ไม่ใช่รหัสนักศึกษา)']
  courseId String
  sectionId String [null]
  midterm Float [null]
  final Float [null]
  assignments Float [null]
  participation Float [null]
  project Float [null]
  total Float [null]
  letterGrade String [null]
  status String [default: 'enrolled']
  gradedBy String [null]
  gradedAt DateTime [null]
  remarks String [null]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table AttendanceRecord {
  id String [primary key]
  enrollmentId String
  date DateTime
  status String
  checkedInAt DateTime [default: `now()`]
}

Table Assignment {
  id String [primary key]
  courseId String
  title String
  description String
  type String
  dueDate DateTime
  maxScore Int
  isPublished Boolean [default: false]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table Submission {
  id String [primary key]
  assignmentId String
  studentId String
  files "String[]"
  submittedAt DateTime [default: `now()`]
  score Float [null]
  feedback String [null]
  status String [default: 'submitted']
}

Table CourseMaterial {
  id String [primary key]
  courseId String
  title String
  type String
  url String
  uploadDate DateTime [default: `now()`]
  size String [null]
}

Table GradeHistory {
  id String [primary key]
  enrollmentId String
  modifiedBy String
  previousGrade String [null]
  newGrade String
  reason String
  modifiedAt DateTime [default: `now()`]
}

// ==========================
// Skills & Portfolio
// ==========================
Table Skill {
  id String [primary key]
  name String [unique]
  category String
  description String [null]
  createdAt DateTime [default: `now()`]
}

Table StudentSkill {
  id String [primary key]
  studentId String
  skillId String
  level String
  verifiedBy String [null]
  yearsOfExperience Int [default: 0]
  updatedAt DateTime
}

Table Portfolio {
  id String [primary key]
  studentId String [unique]
  summary String
  summaryThai String
  githubUrl String [null]
  linkedinUrl String [null]
  personalWebsite String [null]
  isPublic Boolean [default: true]
  sharedWith "String[]"
  updatedAt DateTime
}

Table Project {
  id String [primary key]
  portfolioId String
  title String
  description String
  technologies "String[]"
  role String
  startDate DateTime
  endDate DateTime [null]
  url String [null]
  images "String[]"
  highlights "String[]"
}

Table SkillRubric {
  id String [primary key]
  studentId String
  category String
  skillName String
  professorScore Float
  peerScore Float
  totalScore Float
  updatedAt DateTime
}

// ==========================
// Internships & Jobs
// ==========================
Table InternshipRecord {
  id String [primary key]
  studentId String [unique, note: 'อ้างอิง StudentProfile.id (Foreign Key)']
  startMonth String [null]
  endMonth String [null]
  duration Int [default: 0]
  companyId String [null, note: 'อ้างอิง CompanyProfile.id (Foreign Key)']
  companyName String [null]
  position String [null]
  supervisor String [null]
  supervisorContact String [null]
  status String [default: 'not_started']
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table InternshipLog {
  id String [primary key]
  recordId String
  date DateTime
  activities String
  hours Int
  learnings String [null]
  challenges String [null]
}

Table InternshipDocument {
  id String [primary key]
  recordId String
  type String
  title String
  url String
  uploadedAt DateTime [default: `now()`]
  status String [default: 'pending']
}

Table InternshipEvaluation {
  id String [primary key]
  recordId String [unique]
  evaluatedBy String
  technicalSkills Float
  softSkills Float
  workEthic Float
  problemSolving Float
  overallScore Float
  comments String [null]
  recommendations String [null]
  evaluatedAt DateTime [default: `now()`]
}

Table JobPosting {
  id String [primary key]
  companyId String [note: 'อ้างอิง CompanyProfile.id (Foreign Key ไม่ใช่รหัสบริษัท)']
  title String
  type String
  positions Int [default: 1]
  description String
  responsibilities "String[]"
  requirements "String[]"
  preferredSkills "String[]"
  salary String [null]
  benefits "String[]"
  location String
  workType String
  startDate DateTime [null]
  deadline DateTime
  maxApplicants Int [null]
  status String [default: 'open']
  isActive Boolean [default: true]
  postedAt DateTime [default: `now()`]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table Application {
  id String [primary key]
  jobPostingId String
  studentId String
  appliedAt DateTime [default: `now()`]
  status String [default: 'pending']
  coverLetter String [null]
  resumeUrl String [null]
  notes String [null]
}

Table CooperationRecord {
  id String [primary key]
  companyId String
  title String
  type String
  details String [null]
  expiryDate DateTime [null]
  status String [default: 'active']
  createdAt DateTime [default: `now()`]
}

Table PaymentHistory {
  id String [primary key]
  companyId String
  amount Float
  planName String
  referenceNumber String [null]
  date DateTime [default: `now()`]
  status String [default: 'paid']
  receiptUrl String [null]
}

// ==========================
// Quests & Activities
// ==========================
Table Quest {
  id String [primary key]
  title String
  titleEn String
  description String
  descriptionEn String
  type String
  difficulty String
  category String
  xp Int
  coins Int
  deadline DateTime
  assignerId String
  assignerType String
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table QuestTask {
  id String [primary key]
  questId String
  title String
  titleEn String
  sortOrder Int [default: 0]
}

Table QuestEnrollment {
  id String [primary key]
  questId String
  studentId String
  status String [default: 'in-progress']
  progress Int [default: 0]
  completedTasks "String[]"
  rewardGranted Boolean [default: false]
  startedAt DateTime [default: `now()`]
  completedAt DateTime [null]
}

Table Activity {
  id String [primary key]
  title String
  titleThai String
  description String
  type String
  startDate DateTime
  endDate DateTime
  location String
  organizer String
  activityHours Int
  gamificationPoints Int
  maxParticipants Int [null]
  isGroupActivity Boolean [default: false]
  teamSize Int [null]
  qrCode String [null]
  checkInEnabled Boolean [default: false]
  status String [default: 'upcoming']
  registrationStatus String [default: 'open']
  requiresPeerEvaluation Boolean [default: false]
  evaluations Json [null]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table ActivityEnrollment {
  id String [primary key]
  activityId String
  studentId String
  status String [default: 'registered']
  rewardGranted Boolean [default: false]
  checkedInAt DateTime [null]
}

Table Badge {
  id String [primary key]
  studentId String
  name String
  nameThai String
  description String
  icon String
  criteria String
  earnedAt DateTime [default: `now()`]
}

// ==========================
// System & Communications
// ==========================
Table Request {
  id String [primary key]
  studentId String
  type String
  title String
  description String
  documents "String[]"
  status String [default: 'pending']
  assignedTo String [null]
  reviewedBy String [null]
  reviewNotes String [null]
  submittedAt DateTime [default: `now()`]
  reviewedAt DateTime [null]
  completedAt DateTime [null]
}

Table RequestComment {
  id String [primary key]
  requestId String
  authorId String
  text String
  createdAt DateTime [default: `now()`]
}

Table Appointment {
  id String [primary key]
  studentId String
  lecturerId String
  date DateTime
  startTime String
  endTime String
  location String
  purpose String
  notes String [null]
  status String [default: 'pending']
  meetingNotes String [null]
  followUp String [null]
  createdAt DateTime [default: `now()`]
}

Table Message {
  id String [primary key]
  fromId String
  toId String
  subject String
  preview String
  body String
  read Boolean [default: false]
  starred Boolean [default: false]
  hasAttachment Boolean [default: false]
  attachments Json [null]
  category String
  timestamp DateTime [default: `now()`]
}

Table Notification {
  id String [primary key]
  userId String
  title String
  titleThai String [null]
  message String
  messageThai String [null]
  type String
  priority String [default: 'medium']
  channels "String[]"
  isRead Boolean [default: false]
  readAt DateTime [null]
  actionUrl String [null]
  actionLabel String [null]
  createdAt DateTime [default: `now()`]
  expiresAt DateTime [null]
}

Table AuditLog {
  id String [primary key]
  userId String [null]
  action String
  resource String
  resourceId String [null]
  changes Json [null]
  ipAddress String [null]
  timestamp DateTime [default: `now()`]
  status String [default: 'success']
  errorMessage String [null]
}

Table TimelineEvent {
  id String [primary key]
  studentId String
  type String
  title String
  titleThai String
  description String
  date DateTime [default: `now()`]
  semester Int
  academicYear String
  relatedId String [null]
  relatedType String [null]
  isImportant Boolean [default: false]
  tags "String[]"
  metadata Json [null]
}

Table FileAsset {
  id String [primary key]
  uploaderId String [null]
  originalName String
  filename String
  mimeType String
  size Int
  storagePath String [unique]
  visibility FileVisibility [default: 'PRIVATE']
  category String [default: 'general']
  checksum String [null]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table BudgetRecord {
  id String [primary key]
  title String
  amount Float
  type String
  category String
  date DateTime
  status String [default: 'pending']
  note String [null]
  createdAt DateTime [default: `now()`]
}

Table Facility {
  id String [primary key]
  code String [unique]
  name String
  building String
  room String [null]
  floor String [null]
  type String
  capacity Int [default: 0]
  isActive Boolean [default: true]
  notes String [null]
  createdAt DateTime [default: `now()`]
  updatedAt DateTime
}

Table OfficeHour {
  id String [primary key]
  lecturerId String
  day String
  startTime String
  endTime String
  location String
  isAvailable Boolean [default: true]
}

Table WorkloadRecord {
  id String [primary key]
  lecturerId String
  academicYear String
  semester Int
  teachingHours Int
  researchHours Int
  advisingHours Int
  serviceHours Int [default: 0]
  createdAt DateTime [default: `now()`]
}

Table DataConsent {
  id String [primary key]
  studentId String [unique]
  allowDataSharing Boolean [default: false]
  allowPortfolioSharing Boolean [default: false]
  sharedWithCompanies "String[]"
  emailNotifications Boolean [default: true]
  smsNotifications Boolean [default: false]
  inAppNotifications Boolean [default: true]
  showInLeaderboard Boolean [default: true]
  profileVisibility String [default: 'university']
  consentDate DateTime [default: `now()`]
  updatedAt DateTime
  history Json [null]
}

Table AutomationRule {
  id String [primary key]
  adminId String [note: 'อ้างอิง AdminProfile.id (Foreign Key ไม่ใช่รหัสแอดมิน)']
  name String
  description String
  trigger Json
  action Json
  isActive Boolean [default: true]
  lastRun DateTime [null]
  nextRun DateTime [null]
  executionCount Int [default: 0]
  createdAt DateTime [default: `now()`]
}

// ==========================
// Relationships
// ==========================

// -----------------------------------------
// 1. One-to-One / Zero-to-One (1:1 / 1:0..1)
// -----------------------------------------
// Profiles (User can have 0 or 1 of each profile)
Ref: StudentProfile.userId - User.id
Ref: LecturerProfile.userId - User.id
Ref: StaffProfile.userId - User.id
Ref: CompanyProfile.userId - User.id
Ref: AdminProfile.userId - User.id

// Student Specific 1:1
Ref: Portfolio.studentId - StudentProfile.id
Ref: InternshipRecord.studentId - StudentProfile.id
Ref: DataConsent.studentId - StudentProfile.id

// Internship Evaluation 1:1
Ref: InternshipEvaluation.recordId - InternshipRecord.id

// -----------------------------------------
// 2. One-to-Many (1:N)
// -----------------------------------------
// User 1:N
Ref: Message.fromId > User.id
Ref: Message.toId > User.id
Ref: Notification.userId > User.id
Ref: AuditLog.userId > User.id
Ref: FileAsset.uploaderId > User.id

// Lecturer 1:N
Ref: StudentProfile.advisorId > LecturerProfile.id // Advisor -> Advisees
Ref: Course.lecturerId > LecturerProfile.id
Ref: OfficeHour.lecturerId > LecturerProfile.id
Ref: Appointment.lecturerId > LecturerProfile.id
Ref: WorkloadRecord.lecturerId > LecturerProfile.id

// Company 1:N
Ref: JobPosting.companyId > CompanyProfile.id
Ref: CooperationRecord.companyId > CompanyProfile.id
Ref: PaymentHistory.companyId > CompanyProfile.id
Ref: InternshipRecord.companyId > CompanyProfile.id // 1 Company has many Interns

// Admin 1:N
Ref: AutomationRule.adminId > AdminProfile.id

// Course 1:N
Ref: Section.courseId > Course.id
Ref: CourseMaterial.courseId > Course.id
Ref: Assignment.courseId > Course.id

// Student 1:N
Ref: Request.studentId > StudentProfile.id
Ref: TimelineEvent.studentId > StudentProfile.id
Ref: Badge.studentId > StudentProfile.id
Ref: Appointment.studentId > StudentProfile.id
Ref: SkillRubric.studentId > StudentProfile.id

// Portfolio 1:N
Ref: Project.portfolioId > Portfolio.id

// Internship 1:N
Ref: InternshipLog.recordId > InternshipRecord.id
Ref: InternshipDocument.recordId > InternshipRecord.id

// Others 1:N
Ref: Section.facilityId > Facility.id
Ref: RequestComment.requestId > Request.id
Ref: QuestTask.questId > Quest.id

// -----------------------------------------
// 3. Many-to-Many (M:N) via Join Tables
// -----------------------------------------
// Student <-> Course (via Enrollment)
Ref: Enrollment.studentId > StudentProfile.id
Ref: Enrollment.courseId > Course.id
Ref: Enrollment.sectionId > Section.id

// Enrollment <-> Grade/Attendance
Ref: GradeHistory.enrollmentId > Enrollment.id
Ref: AttendanceRecord.enrollmentId > Enrollment.id

// Student <-> Skill (via StudentSkill)
Ref: StudentSkill.studentId > StudentProfile.id
Ref: StudentSkill.skillId > Skill.id

// Student <-> Assignment (via Submission)
Ref: Submission.studentId > StudentProfile.id
Ref: Submission.assignmentId > Assignment.id

// Student <-> Activity (via ActivityEnrollment)
Ref: ActivityEnrollment.studentId > StudentProfile.id
Ref: ActivityEnrollment.activityId > Activity.id

// Student <-> Quest (via QuestEnrollment)
Ref: QuestEnrollment.studentId > StudentProfile.id
Ref: QuestEnrollment.questId > Quest.id

// Student <-> JobPosting (via Application)
Ref: Application.studentId > StudentProfile.id
Ref: Application.jobPostingId > JobPosting.id
