export type DailyLogItem = {
  id: string;
  date: string;
  hours: number;
  activities: string;
  learnings: string;
  challenges: string;
};

export type InternshipPeriodInfo = {
  startDate: string;
  endDate: string;
  durationMonths: number | null;
  currentWeek: number;
  totalWeeks: number;
};

export type WeeklyReportItem = {
  week: number;
  submitted: boolean;
  /** no per-week score is stored; null until one exists */
  score: number | null;
  summary: string;
  summaryEn: string;
};

export type InternRow = {
  id: string;
  studentId?: string;
  name: string;
  nameEn: string;
  position: string;
  company: string;
  companyEn: string;
  progress: number;
  weeks: number;
  totalWeeks: number;
  /** null when the company has not evaluated the intern */
  rating: number | null;
  avatar: string;
  companyId?: string;
  companyAddress?: string;
  mentorName?: string;
  period: InternshipPeriodInfo;
  dailyLogs: DailyLogItem[];
  performance: {
    technical: number | null;
    communication: number | null;
    teamwork: number | null;
    punctuality: number | null;
    initiative: number | null;
    weeklyReports: WeeklyReportItem[];
  };
};
