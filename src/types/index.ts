// ================================
// USER ROLE TYPES
// ================================
export type UserRole = 'student' | 'lecturer' | 'staff' | 'company' | 'admin';

export interface BaseUser {
  id: string;
  email: string;
  name: string;
  nameThai: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  createdAt: Date;
  lastLogin?: Date;
  isActive: boolean;
}

// ================================
// STUDENT TYPES
// ================================
export interface Student extends BaseUser {
  role: 'student';
  studentId: string;
  major: string;
  program: 'bachelor' | 'master' | 'doctoral';
  year: number; // ชั้นปี
  semester: number; // เทอมปัจจุบัน
  academicYear: string; // ปีการศึกษา เช่น "2568"

  // Academic Info
  gpa: number;
  gpax: number;
  totalCredits: number;
  earnedCredits: number;
  requiredCredits: number;
  academicStatus: 'normal' | 'probation' | 'risk' | 'dropped';

  // Advisor
  advisorId?: string;
  advisorName?: string;

  // Skills & Portfolio
  skills: Skill[];
  portfolio?: Portfolio;
  cvUrl?: string;

  // Activities & Points
  activities: Activity[];
  totalActivityHours: number;
  gamificationPoints: number;
  badges: Badge[];

  // Internship
  internship?: InternshipRecord;

  // Consent
  dataConsent: DataConsent;

  // Timeline
  timeline: TimelineEvent[];
}

// ================================
// LECTURER TYPES
// ================================
export interface Lecturer extends BaseUser {
  role: 'lecturer';
  lecturerId: string;
  department: string;
  position: 'instructor' | 'assistant_professor' | 'associate_professor' | 'professor';

  // Teaching
  courses: Course[];
  teachingHours: number;
  maxTeachingHours: number;

  // Advising
  advisees: string[]; // Student IDs
  maxAdvisees: number;

  // Availability for appointments
  officeHours: OfficeHour[];
  appointments: Appointment[];

  // Specialization
  specialization: string[];
  researchInterests: string[];
}

// ================================
// STAFF TYPES
// ================================
export interface Staff extends BaseUser {
  role: 'staff';
  staffId: string;
  department: string;
  position: string;

  // Permissions
  permissions: Permission[];
  canManageUsers: boolean;
  canManageCourses: boolean;
  canManageSchedules: boolean;
  canViewReports: boolean;
  canManageInternships: boolean;

  // Audit logs
  activityLogs: AuditLog[];
}

// ================================
// COMPANY TYPES
// ================================
export interface Company extends BaseUser {
  role: 'company';
  companyId: string;
  companyName: string;
  companyNameThai: string;
  industry: string;
  size: 'startup' | 'small' | 'medium' | 'large' | 'enterprise';
  website?: string;
  address?: string;
  locationMapUrl?: string;
  productsServices?: string;
  contactPersonName?: string;
  contactPersonRole?: string;
  contactPersonEmail?: string;
  contactPersonPhone?: string;
  socialMedia?: string;
  onboardingStatus?: string;
  privacyProtocolAcceptedAt?: Date;

  // Job Postings
  jobPostings: JobPosting[];
  internshipSlots: number;
  currentInterns: number;

  // Student Access
  studentViewConsent: string[]; // Student IDs that granted access

  // Communication
  canContactStudents: boolean;
  messages: Message[];
}

// ================================
// ADMIN TYPES
// ================================
export interface Admin extends BaseUser {
  role: 'admin';
  adminId: string;
  isSuperAdmin: boolean;

  // Full access
  permissions: string[];

  // System management
  systemLogs: AuditLog[];
  automationRules: AutomationRule[];
}

// ================================
// COURSE TYPES
// ================================
export interface Course {
  id: string;
  code: string; // รหัสวิชา เช่น "CS101"
  name: string;
  nameThai: string;
  credits: number;

  // Academic period
  semester: number; // 1, 2, 3 (summer)
  academicYear: string; // "2568"
  year: number; // ชั้นปีที่ควรเรียน

  // Teaching
  lecturerId: string;
  lecturerName: string;
  sections: Section[];

  // Course info
  description?: string;
  prerequisites: string[]; // Course codes
  learningOutcomes: string[];
  syllabus?: string;

  // Schedule
  schedule: Schedule[];

  // Enrollment
  enrolledStudents: string[]; // Student IDs
  maxStudents: number;
  minStudents: number;

  // Materials
  materials: CourseMaterial[];
  assignments: Assignment[];

  // Grading
  grades: Grade[];
  gradingCriteria?: GradingCriteria;
}

export interface Section {
  id: string;
  sectionNumber: string; // "01", "02"
  room?: string;
  maxStudents: number;
  enrolledStudents: string[];
  schedule: Schedule[];
}

export interface Schedule {
  id: string;
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  dayThai: string;
  startTime: string; // "09:00"
  endTime: string; // "12:00"
  room?: string;
  building?: string;
  type: 'lecture' | 'lab' | 'tutorial';
}

export interface CourseMaterial {
  id: string;
  title: string;
  type: 'video' | 'document' | 'slide' | 'link';
  url: string;
  uploadDate: Date;
  size?: string;
}

export interface Assignment {
  id: string;
  title: string;
  description: string;
  type: 'individual' | 'group';
  dueDate: Date;
  maxScore: number;
  submissions: Submission[];
  isPublished: boolean;
}

export interface Submission {
  id: string;
  studentId: string;
  studentIds?: string[]; // For group work
  submittedAt: Date;
  files: string[];
  score?: number;
  feedback?: string;
  status: 'submitted' | 'graded' | 'late' | 'missing';
}

export interface GradingCriteria {
  midterm: number; // percentage
  final: number;
  assignments: number;
  participation: number;
  project?: number;
}

export interface Grade {
  studentId: string;
  courseId: string;
  midterm?: number;
  final?: number;
  assignments?: number;
  participation?: number;
  project?: number;
  total?: number;
  letterGrade?: 'A' | 'B+' | 'B' | 'C+' | 'C' | 'D+' | 'D' | 'F' | 'I' | 'W';
  gradedBy: string;
  gradedAt?: Date;
  remarks?: string;
  history: GradeHistory[];
}

export interface GradeHistory {
  modifiedBy: string;
  modifiedAt: Date;
  previousGrade?: string;
  newGrade: string;
  reason: string;
}

// ================================
// SCHEDULE & TIMETABLE TYPES
// ================================
export interface Timetable {
  studentId?: string;
  lecturerId?: string;
  semester: number;
  academicYear: string;
  courses: TimetableEntry[];
  totalCredits: number;
}

export interface TimetableEntry {
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  section: string;
  lecturerName: string;
  schedule: Schedule[];
  room?: string;
}

// ================================
// ACTIVITY TYPES
// ================================
export interface Activity {
  id: string;
  title: string;
  titleThai: string;
  description: string;
  type: 'event' | 'hackathon' | 'internship' | 'workshop' | 'seminar' | 'competition' | 'volunteer';

  // Event details
  startDate: Date;
  endDate: Date;
  location: string;
  organizer: string;

  // Points & Hours
  activityHours: number;
  gamificationPoints: number;

  // Enrollment
  maxParticipants?: number;
  enrolledStudents: string[];
  attendedStudents: string[];

  // Type specific
  isGroupActivity: boolean;
  teamSize?: number;

  // QR Check-in
  qrCode?: string;
  checkInEnabled: boolean;

  // Status
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registrationStatus: 'open' | 'closed' | 'full';

  // Evaluation
  requiresPeerEvaluation: boolean;
  evaluations?: PeerEvaluation[];
}

export interface PeerEvaluation {
  evaluatorId: string;
  evaluatedId: string;
  activityId: string;
  teamworkScore: number;
  contributionScore: number;
  communicationScore: number;
  comments?: string;
  submittedAt: Date;
}

// ================================
// INTERNSHIP TYPES
// ================================
export interface InternshipRecord {
  id: string;
  studentId: string;

  // Period
  startMonth: string; // "2568-06"
  endMonth: string; // "2568-08"
  duration: number; // months

  // Company
  companyId?: string;
  companyName?: string;
  position?: string;
  supervisor?: string;
  supervisorContact?: string;

  // Status
  status: 'not_started' | 'in_progress' | 'paused' | 'completed' | 'cancelled';

  // Documents
  documents: InternshipDocument[];

  // Daily logs
  logs: InternshipLog[];

  // Evaluation
  evaluation?: InternshipEvaluation;
}

export interface InternshipDocument {
  id: string;
  type: 'application' | 'acceptance_letter' | 'agreement' | 'report' | 'evaluation' | 'certificate';
  title: string;
  url: string;
  uploadedAt: Date;
  status: 'pending' | 'approved' | 'rejected';
}

export interface InternshipLog {
  id: string;
  date: Date;
  activities: string;
  hours: number;
  learnings?: string;
  challenges?: string;
}

export interface InternshipEvaluation {
  evaluatedBy: string; // Company supervisor
  technicalSkills: number;
  softSkills: number;
  workEthic: number;
  problemSolving: number;
  overallScore: number;
  comments?: string;
  recommendations?: string;
  evaluatedAt: Date;
}

// ================================
// JOB POSTING TYPES
// ================================
export interface JobPosting {
  id: string;
  companyId: string;
  companyName: string;

  // Job details
  title: string;
  type: 'internship' | 'full-time' | 'part-time' | 'contract';
  positions: number;

  // Description
  description: string;
  responsibilities: string[];
  requirements: string[];
  preferredSkills: string[];

  // Compensation
  salary?: string;
  benefits?: string[];

  // Location
  location: string;
  workType: 'onsite' | 'remote' | 'hybrid';

  // Timeline
  startDate?: Date;
  deadline: Date;

  // Applications
  applicants: Application[];
  maxApplicants?: number;

  // Status
  status: 'open' | 'closed' | 'filled';
  isActive: boolean;
  postedAt: Date;
}

export interface Application {
  id: string;
  jobPostingId: string;
  studentId: string;
  appliedAt: Date;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interviewed' | 'accepted' | 'rejected';
  coverLetter?: string;
  resumeUrl?: string;
  notes?: string;
}

// ================================
// SKILL & PORTFOLIO TYPES
// ================================
export interface Skill {
  name: string;
  category: 'programming' | 'framework' | 'tool' | 'language' | 'soft_skill';
  level: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  verifiedBy?: string; // Course or activity that verified this skill
}

export interface Portfolio {
  studentId: string;
  summary: string;
  summaryThai: string;

  // Projects
  projects: Project[];

  // Links
  githubUrl?: string;
  linkedinUrl?: string;
  personalWebsite?: string;

  // Visibility
  isPublic: boolean;
  sharedWith: string[]; // Company IDs

  updatedAt: Date;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  technologies: string[];
  role: string;
  startDate: Date;
  endDate?: Date;
  url?: string;
  images?: string[];
  highlights: string[];
}

// ================================
// GAMIFICATION TYPES
// ================================
export interface Badge {
  id: string;
  name: string;
  nameThai: string;
  description: string;
  icon: string;
  earnedAt: Date;
  criteria: string;
}

export interface Leaderboard {
  period: 'weekly' | 'monthly' | 'semester' | 'all-time';
  entries: LeaderboardEntry[];
}

export interface LeaderboardEntry {
  rank: number;
  studentId: string;
  studentName: string;
  points: number;
  badges: number;
  activities: number;
}

// ================================
// NOTIFICATION TYPES
// ================================
export interface Notification {
  id: string;
  recipientId: string;
  recipientRole: UserRole;

  title: string;
  titleThai: string;
  message: string;
  messageThai: string;

  type: 'info' | 'success' | 'warning' | 'error' | 'schedule_change' | 'grade' | 'appointment' | 'application';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  // Channels
  channels: ('in-app' | 'email' | 'sms')[];

  // Status
  isRead: boolean;
  readAt?: Date;

  // Action
  actionUrl?: string;
  actionLabel?: string;

  createdAt: Date;
  expiresAt?: Date;
}

// ================================
// APPOINTMENT TYPES
// ================================
export interface OfficeHour {
  id: string;
  lecturerId: string;
  day: string;
  startTime: string;
  endTime: string;
  location: string;
  isAvailable: boolean;
}

export interface Appointment {
  id: string;
  studentId: string;
  studentName: string;
  lecturerId: string;
  lecturerName: string;

  date: Date;
  startTime: string;
  endTime: string;
  location: string;

  purpose: string;
  notes?: string;

  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';

  // Meeting notes
  meetingNotes?: string;
  followUp?: string;

  createdAt: Date;
}

// ================================
// TIMELINE TYPES
// ================================
export interface TimelineEvent {
  id: string;
  studentId: string;

  type: 'enrollment' | 'course' | 'grade' | 'activity' | 'internship' | 'achievement' | 'warning' | 'plan_change';

  title: string;
  titleThai: string;
  description: string;

  date: Date;
  semester: number;
  academicYear: string;

  // Related data
  relatedId?: string; // Course ID, Activity ID, etc.
  relatedType?: string;

  // Status
  isImportant: boolean;
  tags: string[];

  metadata?: Record<string, unknown>;
}

// ================================
// CONSENT & PRIVACY TYPES
// ================================
export interface DataConsent {
  studentId: string;

  // General consent
  allowDataSharing: boolean;
  allowPortfolioSharing: boolean;

  // Company access
  sharedWithCompanies: string[]; // Company IDs

  // Notification preferences
  emailNotifications: boolean;
  smsNotifications: boolean;
  inAppNotifications: boolean;

  // Visibility
  showInLeaderboard: boolean;
  profileVisibility: 'private' | 'university' | 'public';

  consentDate: Date;
  lastModified: Date;

  history: ConsentHistory[];
}

export interface ConsentHistory {
  action: 'granted' | 'revoked' | 'modified';
  target: string; // What was changed
  timestamp: Date;
  reason?: string;
}

// ================================
// PERMISSION & AUDIT TYPES
// ================================
export interface Permission {
  resource: string;
  actions: ('create' | 'read' | 'update' | 'delete')[];
  conditions?: Record<string, unknown>;
}

export interface AuditLog {
  id: string;
  userId: string;
  userRole: UserRole;
  action: string;
  resource: string;
  resourceId?: string;
  changes?: Record<string, unknown>;
  ipAddress?: string;
  timestamp: Date;
  status: 'success' | 'failed';
  errorMessage?: string;
}

// ================================
// AUTOMATION TYPES
// ================================
export interface AutomationRule {
  id: string;
  name: string;
  description: string;

  // Trigger
  trigger: {
    type: 'schedule' | 'event' | 'condition';
    schedule?: string; // cron expression
    event?: string;
    condition?: string;
  };

  // Action
  action: {
    type: 'notification' | 'email' | 'task' | 'api_call';
    target: string;
    template?: string;
    data?: Record<string, unknown>;
  };

  // Status
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  executionCount: number;

  createdBy: string;
  createdAt: Date;
}

// ================================
// MESSAGE & COMMUNICATION TYPES
// ================================
// MESSAGE & COMMUNICATION TYPES
// ================================
export interface Message {
  id: string;
  from: string;
  fromId: string;
  toId: string;
  subject: string;
  preview: string;
  body: string;
  timestamp: Date;
  read: boolean;
  starred: boolean;
  hasAttachment: boolean;
  attachments: { name: string; url: string; size: string }[];
  category: string;
}

// ================================
// REQUEST & PETITION TYPES
// ================================
export interface Request {
  id: string;
  studentId: string;
  studentName: string;

  type: 'course_override' | 'certificate' | 'scholarship' | 'grade_appeal' | 'withdrawal' | 'other';
  title: string;
  description: string;

  // Documents
  documents: string[];

  // Status
  status: 'pending' | 'under_review' | 'approved' | 'rejected' | 'completed';

  // Processing
  assignedTo?: string;
  reviewedBy?: string;
  reviewNotes?: string;

  submittedAt: Date;
  reviewedAt?: Date;
  completedAt?: Date;
}

// ================================
// STATS & ANALYTICS TYPES
// ================================
export interface StudentStats {
  totalStudents: number;
  byYear: Record<number, number>;
  byMajor: Record<string, number>;
  byStatus: Record<string, number>;
  atRisk: number;
  onProbation: number;
}

export interface LecturerWorkload {
  lecturerId: string;
  lecturerName: string;
  totalCourses: number;
  totalStudents: number;
  teachingHours: number;
  maxHours: number;
  advisees: number;
  workloadPercentage: number;
}

export interface DepartmentStats {
  totalCourses: number;
  totalSections: number;
  totalEnrollments: number;
  averageClassSize: number;
  lecturerWorkloads: LecturerWorkload[];
}

// ================================
// EXPORT TYPES
// ================================
export type { BaseUser as User };

// Request Types
export interface StudentRequest {
  id: string;
  type: 'course_opening' | 'certificate' | 'scholarship' | 'other';
  title: string;
  description: string;
  status: 'pending' | 'processing' | 'approved' | 'rejected';
  createdAt: Date;
  updatedAt: Date;
}

