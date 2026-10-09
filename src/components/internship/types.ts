export type DailyLogItem = {
  id: string;
  date: string;
  hours: number;
  activities: string;
  learnings: string;
  challenges: string;
  reviewStatus: string;
  reviewComment: string;
  /** the version a reviewer is looking at; sent back so a newer edit cannot be approved unseen */
  updatedAt: string;
};

export type InternshipPeriodInfo = {
  startDate: string;
  endDate: string;
  durationMonths: number | null;
  /** weeks with at least one diary entry */
  currentWeek: number;
  /** the planned duration in weeks; null when none was recorded */
  totalWeeks: number | null;
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
  /** not_started | in_progress | completed | cancelled — the first diary entry starts it, staff close it */
  status: string;
  studentId?: string;
  name: string;
  nameEn: string;
  position: string;
  company: string;
  companyEn: string;
  /** logged weeks over planned weeks; null without a planned duration */
  progress: number | null;
  weeks: number;
  totalWeeks: number | null;
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
