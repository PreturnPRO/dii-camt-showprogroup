import type { Student, Course, Schedule } from '@/types';

export const EMPTY_SCHEDULE: Schedule = {
  id: 'schedule-0',
  day: 'monday',
  dayThai: 'Monday',
  startTime: '09:00',
  endTime: '10:00',
  room: '',
  building: '',
  type: 'lecture',
};

export const createEmptySchedule = (id = 'schedule-0'): Schedule => ({
  ...EMPTY_SCHEDULE,
  id,
});

export const EMPTY_STUDENT: Student = {
  id: 'student-0',
  email: '',
  name: 'Student',
  nameThai: 'Student',
  role: 'student',
  createdAt: new Date(),
  isActive: true,
  studentId: '',
  major: '',
  program: 'bachelor',
  year: 1,
  semester: 1,
  academicYear: '',
  gpa: 0,
  gpax: 0,
  totalCredits: 0,
  earnedCredits: 0,
  requiredCredits: 0,
  academicStatus: 'normal',
  advisorName: 'ผศ.ดร. นรินทร์ พิชยกุล',
  advisorNameThai: 'ผศ.ดร. นรินทร์ พิชยกุล',
  coAdvisorName: 'ดร. วิลเลียม สมิธ',
  coAdvisorNameThai: 'ดร. วิลเลียม สมิธ',
  skills: [],
  activities: [],
  totalActivityHours: 0,
  gamificationPoints: 0,
  badges: [],
  dataConsent: {
    studentId: '',
    allowDataSharing: false,
    allowPortfolioSharing: false,
    sharedWithCompanies: [],
    emailNotifications: true,
    smsNotifications: false,
    inAppNotifications: true,
    showInLeaderboard: false,
    profileVisibility: 'private',
    consentDate: new Date(),
    lastModified: new Date(),
    history: [],
  },
  timeline: [],
};

export const createEmptyStudent = (index = 0): Student => ({
  ...EMPTY_STUDENT,
  id: `student-${index}`,
});

export const EMPTY_COURSE: Course = {
  id: 'course-0',
  code: '',
  name: 'Untitled course',
  nameThai: 'Untitled course',
  credits: 0,
  semester: 1,
  academicYear: '',
  year: 1,
  lecturerId: '',
  lecturerName: '',
  sections: [],
  description: '',
  prerequisites: [],
  learningOutcomes: [],
  syllabus: '',
  schedule: [],
  enrolledStudents: [],
  maxStudents: 0,
  minStudents: 0,
  materials: [],
  grades: [],
};

export const createEmptyCourse = (index = 0): Course => ({
  ...EMPTY_COURSE,
  id: `course-${index}`,
});
