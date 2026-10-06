export type DailyLogItem = {
  id: string;
  date: string;
  hours: number;
  activities: string;
  learnings: string;
  challenges: string;
  status: 'pending' | 'approved' | 'needs_revision';
  mentorComment?: string;
  reviewedBy?: string;
  reviewedAt?: string;
};

export type MonthlyPayment = {
  id: string;
  month: string;
  expectedAmount: number;
  actualAmount: number;
  status: 'paid_full' | 'paid_partial' | 'pending' | 'overdue';
  paidDate?: string;
  notes?: string;
};

export type StipendInfo = {
  monthlyRate: number;
  currentMonth: string;
  currentMonthStatus: 'paid_full' | 'paid_partial' | 'pending' | 'overdue';
  currentMonthActual: number;
  paymentDay: number;
  paymentHistory: MonthlyPayment[];
};

export type InternshipPeriodInfo = {
  startDate: string;
  endDate: string;
  durationMonths: number;
  currentWeek: number;
  totalWeeks: number;
};

export type WeeklyReportItem = {
  week: number;
  submitted: boolean;
  score: number;
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
  rating: number;
  avatar: string;
  companyId?: string;
  companyAddress?: string;
  mentorName?: string;
  period: InternshipPeriodInfo;
  stipend: StipendInfo;
  dailyLogs: DailyLogItem[];
  performance: {
    technical: number;
    communication: number;
    teamwork: number;
    punctuality: number;
    initiative: number;
    weeklyReports: WeeklyReportItem[];
  };
};
