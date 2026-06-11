# ShowPro - DBML (แบ่งตามหมวดหมู่) 10/6/69

โค้ด DBML ด้านล่างถูกแบ่งย่อยออกเป็นหลายๆ ส่วนตามการใช้งานของแต่ละระบบย่อย (Module) เพื่อให้สามารถนำไปวางในเว็บเช่น [dbdiagram.io](https://dbdiagram.io) ได้ง่ายขึ้นและไม่ซับซ้อนจนเกินไป คุณสามารถคัดลอกเฉพาะระบบที่สนใจไปสร้างเป็นแผนภาพได้เลย

## Users & Profiles (ระบบผู้ใช้งานและโปรไฟล์)
```dbml
Table User {
  id String [primary key]
  email String [unique]
  passwordHash String
  name String
  nameThai String
  role Role
  avatar String
  phone String
  isActive Boolean
  createdAt DateTime
  updatedAt DateTime
  lastLogin DateTime
  studentProfile StudentProfile
  lecturerProfile LecturerProfile
  staffProfile StaffProfile
  companyProfile CompanyProfile
  adminProfile AdminProfile
  notifications NotificationArray
  auditLogs AuditLogArray
  uploadedFiles FileAssetArray
}

Table StudentProfile {
  id String [primary key]
  userId String [unique]
  studentId String [unique]
  major String
  program String
  year Int
  semester Int
  academicYear String
  gpa Float
  gpax Float
  totalCredits Int
  earnedCredits Int
  requiredCredits Int
  academicStatus String
  cvUrl String
  advisorId String
  skills StudentSkillArray
  enrollments EnrollmentArray
  activityEnrollments ActivityEnrollmentArray
  questEnrollments QuestEnrollmentArray
  portfolio Portfolio
  internship InternshipRecord
  requests RequestArray
  timeline TimelineEventArray
  consent DataConsent
  xp Int
  coins Int
  gamificationPoints Int
  totalActivityHours Int
  badges BadgeArray
  applications ApplicationArray
  skillRubrics SkillRubricArray
  submissions SubmissionArray
  createdAt DateTime
  updatedAt DateTime
}

Table LecturerProfile {
  id String [primary key]
  userId String [unique]
  lecturerId String [unique]
  department String
  position String
  specialization StringArray
  researchInterests StringArray
  courses CourseArray
  officeHours OfficeHourArray
  workload WorkloadRecordArray
  createdAt DateTime
  updatedAt DateTime
}

Table StaffProfile {
  id String [primary key]
  userId String [unique]
  staffId String [unique]
  department String
  position String
  permissions StringArray
  canManageUsers Boolean
  canManageCourses Boolean
  canManageSchedules Boolean
  canViewReports Boolean
  canManageInternships Boolean
  createdAt DateTime
  updatedAt DateTime
}

Table CompanyProfile {
  id String [primary key]
  userId String [unique]
  companyId String [unique]
  companyName String
  companyNameThai String
  industry String
  size String
  website String
  address String
  locationMapUrl String
  productsServices String
  contactPersonName String
  contactPersonRole String
  contactPersonEmail String
  contactPersonPhone String
  socialMedia String
  onboardingStatus String
  privacyProtocolAcceptedAt DateTime
  internshipSlots Int
  currentInterns Int
  subscription String
  subscriptionStatus String
  canContactStudents Boolean
  jobPostings JobPostingArray
  cooperation CooperationRecordArray
  payments PaymentHistoryArray
  interns InternshipRecordArray
  createdAt DateTime
  updatedAt DateTime
}

Table AdminProfile {
  id String [primary key]
  userId String [unique]
  adminId String [unique]
  isSuperAdmin Boolean
  permissions StringArray
  automationRules AutomationRuleArray
  createdAt DateTime
  updatedAt DateTime
}

Table DataConsent {
  id String [primary key]
  studentId String [unique]
  allowDataSharing Boolean
  allowPortfolioSharing Boolean
  sharedWithCompanies StringArray
  emailNotifications Boolean
  smsNotifications Boolean
  inAppNotifications Boolean
  showInLeaderboard Boolean
  profileVisibility String
  consentDate DateTime
  updatedAt DateTime
  history Json
}

Table OfficeHour {
  id String [primary key]
  lecturerId String
  day String
  startTime String
  endTime String
  location String
  isAvailable Boolean
}

Table WorkloadRecord {
  id String [primary key]
  lecturerId String
  academicYear String
  semester Int
  teachingHours Int
  researchHours Int
  advisingHours Int
  serviceHours Int
  createdAt DateTime
}

Table AutomationRule {
  id String [primary key]
  adminId String
  name String
  description String
  trigger Json
  action Json
  isActive Boolean
  lastRun DateTime
  nextRun DateTime
  executionCount Int
  createdAt DateTime
}

Enum Role {
  STUDENT
  LECTURER
  STAFF
  COMPANY
  ADMIN
}

Ref: StudentProfile.id - User.id
Ref: StudentProfile.id < LecturerProfile.id
Ref: LecturerProfile.id - User.id
Ref: StaffProfile.id - User.id
Ref: CompanyProfile.id - User.id
Ref: AdminProfile.id - User.id
Ref: DataConsent.id - StudentProfile.id
Ref: OfficeHour.id - LecturerProfile.id
Ref: WorkloadRecord.id - LecturerProfile.id
Ref: AutomationRule.id - AdminProfile.id
```

## Academic & Courses (ระบบการเรียนการสอน)
```dbml
Table Course {
  id String [primary key]
  code String [unique]
  name String
  nameThai String
  credits Int
  semester Int
  academicYear String
  year Int
  lecturerId String
  description String
  prerequisites StringArray
  learningOutcomes StringArray
  syllabus String
  schedule Json
  maxStudents Int
  minStudents Int
  sections SectionArray
  materials CourseMaterialArray
  assignments AssignmentArray
  enrollments EnrollmentArray
  createdAt DateTime
  updatedAt DateTime
}

Table Section {
  id String [primary key]
  courseId String
  number String
  room String
  facilityId String
  maxStudents Int
  schedule Json
  enrollments EnrollmentArray
}

Table Facility {
  id String [primary key]
  code String [unique]
  name String
  building String
  room String
  floor String
  type String
  capacity Int
  isActive Boolean
  notes String
  createdAt DateTime
  updatedAt DateTime
  sections SectionArray
}

Table Enrollment {
  id String [primary key]
  studentId String
  courseId String
  sectionId String
  midterm Float
  final Float
  assignments Float
  participation Float
  project Float
  total Float
  letterGrade String
  status String
  gradedBy String
  gradedAt DateTime
  remarks String
  history GradeHistoryArray
  attendance AttendanceRecordArray
  createdAt DateTime
  updatedAt DateTime
}

Table AttendanceRecord {
  id String [primary key]
  enrollmentId String
  date DateTime
  status String
  checkedInAt DateTime
}

Table Assignment {
  id String [primary key]
  courseId String
  title String
  description String
  type String
  dueDate DateTime
  maxScore Int
  isPublished Boolean
  submissions SubmissionArray
  createdAt DateTime
  updatedAt DateTime
}

Table Submission {
  id String [primary key]
  assignmentId String
  studentId String
  files StringArray
  submittedAt DateTime
  score Float
  feedback String
  status String
}

Table CourseMaterial {
  id String [primary key]
  courseId String
  title String
  type String
  url String
  uploadDate DateTime
  size String
}

Table GradeHistory {
  id String [primary key]
  enrollmentId String
  modifiedBy String
  previousGrade String
  newGrade String
  reason String
  modifiedAt DateTime
}

Ref: Section.id - Course.id
Ref: Section.id - Facility.id
Ref: Enrollment.id - Course.id
Ref: Enrollment.id - Section.id
Ref: AttendanceRecord.id - Enrollment.id
Ref: Assignment.id - Course.id
Ref: Submission.id - Assignment.id
Ref: CourseMaterial.id - Course.id
Ref: GradeHistory.id - Enrollment.id
```

## Skills & Portfolio (ระบบทักษะและแฟ้มสะสมผลงาน)
```dbml
Table Skill {
  id String [primary key]
  name String [unique]
  category String
  description String
  students StudentSkillArray
  createdAt DateTime
}

Table StudentSkill {
  id String [primary key]
  studentId String
  skillId String
  level String
  verifiedBy String
  yearsOfExperience Int
  updatedAt DateTime
}

Table Portfolio {
  id String [primary key]
  studentId String [unique]
  summary String
  summaryThai String
  githubUrl String
  linkedinUrl String
  personalWebsite String
  isPublic Boolean
  sharedWith StringArray
  projects ProjectArray
  updatedAt DateTime
}

Table Project {
  id String [primary key]
  portfolioId String
  title String
  description String
  technologies StringArray
  role String
  startDate DateTime
  endDate DateTime
  url String
  images StringArray
  highlights StringArray
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

Ref: StudentSkill.id - Skill.id
Ref: Project.id - Portfolio.id
```

## Internships & Jobs (ระบบฝึกงานและการจ้างงาน)
```dbml
Table InternshipRecord {
  id String [primary key]
  studentId String [unique]
  startMonth String
  endMonth String
  duration Int
  companyId String
  companyName String
  position String
  supervisor String
  supervisorContact String
  status String
  documents InternshipDocumentArray
  logs InternshipLogArray
  evaluation InternshipEvaluation
  createdAt DateTime
  updatedAt DateTime
}

Table InternshipLog {
  id String [primary key]
  recordId String
  date DateTime
  activities String
  hours Int
  learnings String
  challenges String
}

Table InternshipDocument {
  id String [primary key]
  recordId String
  type String
  title String
  url String
  uploadedAt DateTime
  status String
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
  comments String
  recommendations String
  evaluatedAt DateTime
}

Table JobPosting {
  id String [primary key]
  companyId String
  title String
  type String
  positions Int
  description String
  responsibilities StringArray
  requirements StringArray
  preferredSkills StringArray
  salary String
  benefits StringArray
  location String
  workType String
  startDate DateTime
  deadline DateTime
  maxApplicants Int
  status String
  isActive Boolean
  postedAt DateTime
  applications ApplicationArray
  createdAt DateTime
  updatedAt DateTime
}

Table Application {
  id String [primary key]
  jobPostingId String
  studentId String
  appliedAt DateTime
  status String
  coverLetter String
  resumeUrl String
  notes String
}

Table CooperationRecord {
  id String [primary key]
  companyId String
  title String
  type String
  details String
  expiryDate DateTime
  status String
  createdAt DateTime
}

Table PaymentHistory {
  id String [primary key]
  companyId String
  amount Float
  planName String
  referenceNumber String
  date DateTime
  status String
  receiptUrl String
}

Ref: InternshipLog.id - InternshipRecord.id
Ref: InternshipDocument.id - InternshipRecord.id
Ref: InternshipEvaluation.id - InternshipRecord.id
Ref: Application.id - JobPosting.id
```

## Quests & Activities (ระบบกิจกรรมและภารกิจ)
```dbml
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
  maxParticipants Int
  isGroupActivity Boolean
  teamSize Int
  qrCode String
  checkInEnabled Boolean
  status String
  registrationStatus String
  requiresPeerEvaluation Boolean
  evaluations Json
  enrollments ActivityEnrollmentArray
  createdAt DateTime
  updatedAt DateTime
}

Table ActivityEnrollment {
  id String [primary key]
  activityId String
  studentId String
  status String
  rewardGranted Boolean
  checkedInAt DateTime
}

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
  tasks QuestTaskArray
  enrollments QuestEnrollmentArray
  createdAt DateTime
  updatedAt DateTime
}

Table QuestTask {
  id String [primary key]
  questId String
  title String
  titleEn String
  sortOrder Int
}

Table QuestEnrollment {
  id String [primary key]
  questId String
  studentId String
  status String
  progress Int
  completedTasks StringArray
  rewardGranted Boolean
  startedAt DateTime
  completedAt DateTime
}

Table Badge {
  id String [primary key]
  studentId String
  name String
  nameThai String
  description String
  icon String
  criteria String
  earnedAt DateTime
}

Ref: ActivityEnrollment.id - Activity.id
Ref: QuestTask.id - Quest.id
Ref: QuestEnrollment.id - Quest.id
```

## System & Communications (ระบบคำร้องและการสื่อสารอื่นๆ)
```dbml
Table Request {
  id String [primary key]
  studentId String
  type String
  title String
  description String
  documents StringArray
  status String
  assignedTo String
  reviewedBy String
  reviewNotes String
  submittedAt DateTime
  reviewedAt DateTime
  completedAt DateTime
  comments RequestCommentArray
}

Table RequestComment {
  id String [primary key]
  requestId String
  authorId String
  text String
  createdAt DateTime
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
  notes String
  status String
  meetingNotes String
  followUp String
  createdAt DateTime
}

Table Message {
  id String [primary key]
  fromId String
  toId String
  subject String
  preview String
  body String
  read Boolean
  starred Boolean
  hasAttachment Boolean
  attachments Json
  category String
  timestamp DateTime
}

Table Notification {
  id String [primary key]
  userId String
  title String
  titleThai String
  message String
  messageThai String
  type String
  priority String
  channels StringArray
  isRead Boolean
  readAt DateTime
  actionUrl String
  actionLabel String
  createdAt DateTime
  expiresAt DateTime
}

Table AuditLog {
  id String [primary key]
  userId String
  action String
  resource String
  resourceId String
  changes Json
  ipAddress String
  timestamp DateTime
  status String
  errorMessage String
}

Table TimelineEvent {
  id String [primary key]
  studentId String
  type String
  title String
  titleThai String
  description String
  date DateTime
  semester Int
  academicYear String
  relatedId String
  relatedType String
  isImportant Boolean
  tags StringArray
  metadata Json
}

Table FileAsset {
  id String [primary key]
  uploaderId String
  originalName String
  filename String
  mimeType String
  size Int
  storagePath String [unique]
  visibility FileVisibility
  category String
  checksum String
  createdAt DateTime
  updatedAt DateTime
}

Table BudgetRecord {
  id String [primary key]
  title String
  amount Float
  type String
  category String
  date DateTime
  status String
  note String
  createdAt DateTime
}

Enum FileVisibility {
  PUBLIC
  PRIVATE
}

Ref: RequestComment.id - Request.id
```
