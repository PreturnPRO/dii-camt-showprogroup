import React from 'react';
import { motion } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Briefcase,
  Calendar,
  CheckCircle,
  ClipboardCheck,
  Clock,
  FileText,
  GraduationCap,
  MessageSquare,
  Network,
  Printer,
  RefreshCw,
  Settings,
  ShieldCheck,
  TrendingUp,
  UserCog,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

type IconComponent = React.ComponentType<{ className?: string }>;

type StudentRow = {
  id: string;
  studentId: string;
  name: string;
  academicStatus: string;
  gpa: number;
  year: number;
  earnedCredits: number;
  requiredCredits: number;
};

type CourseRow = {
  id: string;
  code: string;
  name: string;
  semester: number;
  academicYear: string;
  enrolled: number;
  maxStudents: number;
};

type LecturerRow = {
  id: string;
  name: string;
  department: string;
  courses: number;
  advisees: number;
};

type WorkloadRow = {
  id: string;
  lecturerName: string;
  academicYear: string;
  semester: number;
  teachingHours: number;
  researchHours: number;
  advisingHours: number;
  serviceHours: number;
  totalHours: number;
  percentage: number;
};

type RequestRow = {
  id: string;
  title: string;
  type: string;
  status: string;
  studentName: string;
  submittedAt: Date;
};

type BudgetRow = {
  id: string;
  title: string;
  type: string;
  amount: number;
  category: string;
  status: string;
  date: Date;
};

type ActivityRow = {
  id: string;
  title: string;
  status: string;
  registrationStatus: string;
  startDate: Date;
  enrolled: number;
  maxParticipants: number;
};

type AppointmentRow = {
  id: string;
  purpose: string;
  status: string;
  date: Date;
  startTime: string;
  studentName: string;
  lecturerName: string;
};

type InternshipRow = {
  id: string;
  status: string;
  studentName: string;
  companyName: string;
  updatedAt: Date;
};

type MessageRow = {
  id: string;
  subject: string;
  read: boolean;
  fromName: string;
  timestamp: Date;
};

type NotificationRow = {
  id: string;
  title: string;
  priority: string;
  isRead: boolean;
  createdAt: Date;
};

type AuditRow = {
  id: string;
  action: string;
  resource: string;
  status: string;
  userName: string;
  timestamp: Date;
};

type CompanyRow = {
  id: string;
  name: string;
  industry: string;
};

type CooperationRow = {
  id: string;
  title: string;
  status: string;
};

type SystemReport = {
  totalUsers: number;
  activeUsers: number;
  usersByRole: Record<string, number>;
  totalCourses: number;
  totalJobs: number;
  pendingRequests: number;
  totalAppointments: number;
  unreadNotifications: number;
  totalAuditLogs: number;
};

const getNestedUserName = (value: unknown, fallback = '-') => {
  const user = asRecord(value);
  return asString(user.nameThai, asString(user.name, asString(user.email, fallback)));
};

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

const workloadPercent = (hours: number) => clampPercent((hours / 40) * 100);

const statusBadge = (status: string) => {
  const normalized = status.toLowerCase();
  if (['approved', 'active', 'confirmed', 'completed', 'success', 'open'].includes(normalized)) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-300';
  }
  if (['pending', 'under_review', 'in_progress', 'upcoming'].includes(normalized)) {
    return 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300';
  }
  if (['rejected', 'cancelled', 'failed', 'closed'].includes(normalized)) {
    return 'border-red-200 bg-red-50 text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300';
  }
  return 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300';
};

const mapStudent = (item: unknown): StudentRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id),
    studentId: asString(source.studentId),
    name: asString(source.nameThai, asString(source.name, '-')),
    academicStatus: asString(source.academicStatus, 'normal'),
    gpa: asNumber(source.gpa, asNumber(source.gpax, 0)),
    year: asNumber(source.year, 0),
    earnedCredits: asNumber(source.earnedCredits, 0),
    requiredCredits: asNumber(source.requiredCredits, 120),
  };
};

const mapCourse = (item: unknown): CourseRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id),
    code: asString(source.code),
    name: asString(source.nameThai, asString(source.name, '-')),
    semester: asNumber(source.semester, 0),
    academicYear: asString(source.academicYear),
    enrolled: asArray(source.enrollments).length,
    maxStudents: asNumber(source.maxStudents, 0),
  };
};

const mapLecturer = (item: unknown, index: number): LecturerRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `lecturer-${index}`),
    name: getNestedUserName(source.user, asString(source.lecturerId, '-')),
    department: asString(source.department, '-'),
    courses: asArray(source.courses).length,
    advisees: asArray(source.advisees).length,
  };
};

const mapWorkload = (item: unknown, index: number): WorkloadRow => {
  const source = asRecord(item);
  const lecturer = asRecord(source.lecturer);
  const teachingHours = asNumber(source.teachingHours, 0);
  const researchHours = asNumber(source.researchHours, 0);
  const advisingHours = asNumber(source.advisingHours, 0);
  const serviceHours = asNumber(source.serviceHours, 0);
  const totalHours = teachingHours + researchHours + advisingHours + serviceHours;

  return {
    id: asString(source.id, `workload-${index}`),
    lecturerName: getNestedUserName(lecturer.user, asString(lecturer.lecturerId, '-')),
    academicYear: asString(source.academicYear, '-'),
    semester: asNumber(source.semester, 0),
    teachingHours,
    researchHours,
    advisingHours,
    serviceHours,
    totalHours,
    percentage: workloadPercent(totalHours),
  };
};

const mapRequest = (item: unknown, index: number): RequestRow => {
  const source = asRecord(item);
  const student = asRecord(source.student);
  return {
    id: asString(source.id, `request-${index}`),
    title: asString(source.title, '-'),
    type: asString(source.type, 'general'),
    status: asString(source.status, 'pending'),
    studentName: getNestedUserName(student.user, asString(source.studentId, '-')),
    submittedAt: asDate(source.submittedAt),
  };
};

const mapBudget = (item: unknown, index: number): BudgetRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `budget-${index}`),
    title: asString(source.title, '-'),
    type: asString(source.type, 'expense'),
    amount: asNumber(source.amount, 0),
    category: asString(source.category, '-'),
    status: asString(source.status, 'pending'),
    date: asDate(source.date),
  };
};

const mapActivity = (item: unknown, index: number): ActivityRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `activity-${index}`),
    title: asString(source.titleThai, asString(source.title, '-')),
    status: asString(source.status, 'upcoming'),
    registrationStatus: asString(source.registrationStatus, 'open'),
    startDate: asDate(source.startDate),
    enrolled: asArray(source.enrollments).length,
    maxParticipants: asNumber(source.maxParticipants, 0),
  };
};

const mapAppointment = (item: unknown, index: number): AppointmentRow => {
  const source = asRecord(item);
  const student = asRecord(source.student);
  const lecturer = asRecord(source.lecturer);
  return {
    id: asString(source.id, `appointment-${index}`),
    purpose: asString(source.purpose, '-'),
    status: asString(source.status, 'pending'),
    date: asDate(source.date),
    startTime: asString(source.startTime),
    studentName: getNestedUserName(student.user, '-'),
    lecturerName: getNestedUserName(lecturer.user, '-'),
  };
};

const mapInternship = (item: unknown, index: number): InternshipRow => {
  const source = asRecord(item);
  const student = asRecord(source.student);
  const company = asRecord(source.company);
  return {
    id: asString(source.id, `internship-${index}`),
    status: asString(source.status, 'not_started'),
    studentName: getNestedUserName(student.user, '-'),
    companyName: asString(company.companyNameThai, asString(company.companyName, asString(source.companyName, '-'))),
    updatedAt: asDate(source.updatedAt, asDate(source.createdAt)),
  };
};

const mapMessage = (item: unknown, index: number): MessageRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `message-${index}`),
    subject: asString(source.subject, '-'),
    read: Boolean(source.read),
    fromName: getNestedUserName(source.from, '-'),
    timestamp: asDate(source.timestamp),
  };
};

const mapNotification = (item: unknown, index: number): NotificationRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `notification-${index}`),
    title: asString(source.titleThai, asString(source.title, '-')),
    priority: asString(source.priority, 'medium'),
    isRead: Boolean(source.isRead),
    createdAt: asDate(source.createdAt),
  };
};

const mapAudit = (item: unknown, index: number): AuditRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `audit-${index}`),
    action: asString(source.action, '-'),
    resource: asString(source.resource, '-'),
    status: asString(source.status, 'success'),
    userName: getNestedUserName(source.user, '-'),
    timestamp: asDate(source.timestamp),
  };
};

const mapCompany = (item: unknown, index: number): CompanyRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `company-${index}`),
    name: asString(source.companyNameThai, asString(source.companyName, '-')),
    industry: asString(source.industry, '-'),
  };
};

const mapCooperation = (item: unknown, index: number): CooperationRow => {
  const source = asRecord(item);
  return {
    id: asString(source.id, `cooperation-${index}`),
    title: asString(source.title, '-'),
    status: asString(source.status, 'active'),
  };
};

const mapSystemReport = (item: unknown): SystemReport => {
  const source = asRecord(item);
  return {
    totalUsers: asNumber(source.totalUsers, 0),
    activeUsers: asNumber(source.activeUsers, 0),
    usersByRole: asRecord(source.usersByRole) as Record<string, number>,
    totalCourses: asNumber(source.totalCourses, 0),
    totalJobs: asNumber(source.totalJobs, 0),
    pendingRequests: asNumber(source.pendingRequests, 0),
    totalAppointments: asNumber(source.totalAppointments, 0),
    unreadNotifications: asNumber(source.unreadNotifications, 0),
    totalAuditLogs: asNumber(source.totalAuditLogs, 0),
  };
};

function MetricCard({
  icon: Icon,
  label,
  value,
  detail,
  gradient,
  onClick,
}: {
  icon: IconComponent;
  label: string;
  value: string | number;
  detail: string;
  gradient: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      type="button"
      variants={itemVariants}
      whileHover={{ y: -3 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-2xl p-5 text-left text-white shadow-lg ${gradient}`}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2">
          <div className="rounded-xl bg-white/20 p-2">
            <Icon className="h-5 w-5" />
          </div>
          <span className="text-sm font-medium text-white/90">{label}</span>
        </div>
        <div className="mt-4 text-3xl font-bold">{value}</div>
        <div className="mt-1 text-sm text-white/80">{detail}</div>
      </div>
    </motion.button>
  );
}

function ActionButton({
  icon: Icon,
  label,
  detail,
  path,
  accent,
}: {
  icon: IconComponent;
  label: string;
  detail: string;
  path: string;
  accent: string;
}) {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => navigate(path)}
      className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white/80 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900/80"
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className={`rounded-xl p-2.5 ${accent}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <div className="font-semibold text-slate-900 dark:text-slate-100">{label}</div>
          <div className="truncate text-sm text-slate-500 dark:text-slate-400">{detail}</div>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-1" />
    </button>
  );
}

export default function StaffDashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const mountedRef = React.useRef(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadWarning, setLoadWarning] = React.useState('');
  const [systemReport, setSystemReport] = React.useState<SystemReport | null>(null);
  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [courses, setCourses] = React.useState<CourseRow[]>([]);
  const [lecturers, setLecturers] = React.useState<LecturerRow[]>([]);
  const [requests, setRequests] = React.useState<RequestRow[]>([]);
  const [workloads, setWorkloads] = React.useState<WorkloadRow[]>([]);
  const [budgets, setBudgets] = React.useState<BudgetRow[]>([]);
  const [activities, setActivities] = React.useState<ActivityRow[]>([]);
  const [appointments, setAppointments] = React.useState<AppointmentRow[]>([]);
  const [internships, setInternships] = React.useState<InternshipRow[]>([]);
  const [messages, setMessages] = React.useState<MessageRow[]>([]);
  const [notifications, setNotifications] = React.useState<NotificationRow[]>([]);
  const [auditLogs, setAuditLogs] = React.useState<AuditRow[]>([]);
  const [companies, setCompanies] = React.useState<CompanyRow[]>([]);
  const [cooperation, setCooperation] = React.useState<CooperationRow[]>([]);

  const staffProfile = asRecord(asRecord(user?.raw).staffProfile);
  const staffName = user?.nameThai || user?.name || 'Staff';
  const staffDepartment = asString(staffProfile.department, 'DII Office');
  const staffPosition = asString(staffProfile.position, 'Staff');
  const dateLocale = language === 'th' ? 'th-TH' : 'en-US';

  const formatDate = React.useCallback(
    (date: Date) =>
      date.toLocaleDateString(dateLocale, {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
    [dateLocale],
  );

  const loadDashboard = React.useCallback(async () => {
    setIsLoading(true);
    setLoadWarning('');

    const results = await Promise.allSettled([
      api.reports.systemUsage(),
      api.students.list(),
      api.courses.list(),
      api.lecturers.list(),
      api.requests.list(),
      api.workload.list(),
      api.budget.list(),
      api.activities.list(),
      api.appointments.list(),
      api.internship.list(),
      api.messages.list(),
      api.notifications.list(),
      api.audit.list(),
      api.companies.list(),
      api.cooperation.list(),
    ]);

    if (!mountedRef.current) return;

    const [
      reportResult,
      studentsResult,
      coursesResult,
      lecturersResult,
      requestsResult,
      workloadResult,
      budgetResult,
      activitiesResult,
      appointmentsResult,
      internshipsResult,
      messagesResult,
      notificationsResult,
      auditResult,
      companiesResult,
      cooperationResult,
    ] = results;

    if (reportResult.status === 'fulfilled') setSystemReport(mapSystemReport(reportResult.value.report));
    if (studentsResult.status === 'fulfilled') setStudents(studentsResult.value.students.map(mapStudent));
    if (coursesResult.status === 'fulfilled') setCourses(coursesResult.value.courses.map(mapCourse));
    if (lecturersResult.status === 'fulfilled') setLecturers(lecturersResult.value.lecturers.map(mapLecturer));
    if (requestsResult.status === 'fulfilled') setRequests(requestsResult.value.requests.map(mapRequest));
    if (workloadResult.status === 'fulfilled') setWorkloads(workloadResult.value.workload.map(mapWorkload));
    if (budgetResult.status === 'fulfilled') setBudgets(budgetResult.value.budget.map(mapBudget));
    if (activitiesResult.status === 'fulfilled') setActivities(activitiesResult.value.activities.map(mapActivity));
    if (appointmentsResult.status === 'fulfilled') setAppointments(appointmentsResult.value.appointments.map(mapAppointment));
    if (internshipsResult.status === 'fulfilled') setInternships(internshipsResult.value.internships.map(mapInternship));
    if (messagesResult.status === 'fulfilled') setMessages(messagesResult.value.messages.map(mapMessage));
    if (notificationsResult.status === 'fulfilled') setNotifications(notificationsResult.value.notifications.map(mapNotification));
    if (auditResult.status === 'fulfilled') setAuditLogs(auditResult.value.logs.map(mapAudit));
    if (companiesResult.status === 'fulfilled') setCompanies(companiesResult.value.companies.map(mapCompany));
    if (cooperationResult.status === 'fulfilled') setCooperation(cooperationResult.value.cooperation.map(mapCooperation));

    const failedCount = results.filter((result) => result.status === 'rejected').length;
    if (failedCount > 0) {
      setLoadWarning(`โหลดข้อมูลจริงไม่ครบ ${failedCount} ส่วน กรุณาตรวจสิทธิ์หรือ backend log`);
    }

    setIsLoading(false);
  }, []);

  React.useEffect(() => {
    mountedRef.current = true;
    void loadDashboard();

    return () => {
      mountedRef.current = false;
    };
  }, [loadDashboard]);

  const refreshDashboard = async () => {
    await loadDashboard();
    toast.success('รีเฟรชข้อมูล dashboard แล้ว');
  };

  const atRiskStudents = students.filter((student) => ['probation', 'risk'].includes(student.academicStatus));
  const pendingRequests = requests.filter((request) => ['pending', 'under_review'].includes(request.status));
  const pendingDocumentRequests = requests.filter((request) => {
    if (!['pending', 'under_review'].includes(request.status)) return false;
    const text = `${request.type} ${request.title}`.toLowerCase();
    return text.includes('document') || text.includes('certificate') || text.includes('transcript') || text.includes('letter') || text.includes('เอกสาร') || text.includes('ใบ') || text.includes('หนังสือ');
  });
  const pendingActivities = activities.filter((activity) => activity.status === 'pending');
  const upcomingActivities = activities.filter((activity) => activity.status === 'upcoming' || activity.startDate >= new Date());
  const pendingAppointments = appointments.filter((appointment) => appointment.status === 'pending');
  const activeInternships = internships.filter((internship) => ['in_progress', 'active'].includes(internship.status));
  const pendingBudget = budgets.filter((budget) => budget.status === 'pending');
  const totalIncome = budgets.filter((budget) => budget.type !== 'expense').reduce((sum, budget) => sum + budget.amount, 0);
  const totalExpense = budgets.filter((budget) => budget.type === 'expense').reduce((sum, budget) => sum + budget.amount, 0);
  const remainingBudget = totalIncome - totalExpense;
  const totalEnrollments = courses.reduce((sum, course) => sum + course.enrolled, 0);
  const averageClassSize = courses.length ? Math.round(totalEnrollments / courses.length) : 0;
  const averageGpa = students.length
    ? (students.reduce((sum, student) => sum + student.gpa, 0) / students.length).toFixed(2)
    : '0.00';
  const overloadedWorkloads = workloads.filter((workload) => workload.percentage >= 90 || workload.totalHours > 36);
  const averageWorkload = workloads.length
    ? Math.round(workloads.reduce((sum, workload) => sum + workload.percentage, 0) / workloads.length)
    : 0;
  const unreadMessages = messages.filter((message) => !message.read);
  const unreadNotifications = notifications.filter((notification) => !notification.isRead);
  const urgentNotifications = notifications.filter((notification) => ['high', 'urgent'].includes(notification.priority));
  const activeCooperation = cooperation.filter((item) => item.status === 'active');
  const failedAudits = auditLogs.filter((log) => log.status === 'failed');
  const roleCounts = systemReport?.usersByRole ?? {};
  const totalUsers =
    systemReport?.totalUsers ||
    students.length + lecturers.length + companies.length + asNumber(roleCounts.STAFF, 0) + asNumber(roleCounts.ADMIN, 0);
  const activeUsers = systemReport?.activeUsers || totalUsers;

  const topRiskStudents = atRiskStudents.slice(0, 5);
  const topWorkloads = [...workloads].sort((a, b) => b.percentage - a.percentage).slice(0, 5);
  const recentRequests = pendingRequests.slice(0, 5);
  const recentAudits = auditLogs.slice(0, 5);

  const actionItems = [
    {
      icon: FileText,
      label: 'ตรวจคำร้องนักศึกษา',
      detail: `${pendingRequests.length} รายการรอดำเนินการ`,
      path: '/requests',
      accent: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    },
    {
      icon: Printer,
      label: 'ออกเอกสาร',
      detail: `${pendingDocumentRequests.length} รายการรอออกเอกสาร`,
      path: '/documents',
      accent: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300',
    },
    {
      icon: Activity,
      label: 'อนุมัติกิจกรรม',
      detail: `${pendingActivities.length} รายการรออนุมัติ`,
      path: '/activities-management',
      accent: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    },
    {
      icon: BarChart3,
      label: 'ติดตาม workload',
      detail: `${overloadedWorkloads.length} คนเกินเกณฑ์`,
      path: '/workload-tracking',
      accent: 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300',
    },
    {
      icon: Wallet,
      label: 'งบประมาณ',
      detail: `${pendingBudget.length} รายการรอตรวจ`,
      path: '/budget',
      accent: 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300',
    },
    {
      icon: Users,
      label: 'ผู้ใช้และบทบาท',
      detail: `${totalUsers} บัญชีในระบบ`,
      path: '/users',
      accent: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    },
    {
      icon: Calendar,
      label: 'จัดตารางเรียน',
      detail: `${courses.length} วิชาที่ต้องดูแล`,
      path: '/schedule-management',
      accent: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    },
    {
      icon: Network,
      label: 'เครือข่ายบริษัท',
      detail: `${companies.length} บริษัทคู่ความร่วมมือ`,
      path: '/network',
      accent: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    },
    {
      icon: ShieldCheck,
      label: 'Audit และรายงาน',
      detail: `${failedAudits.length} เหตุการณ์ผิดพลาด`,
      path: '/audit',
      accent: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
    },
  ];

  const priorityQueue = [
    {
      icon: Printer,
      label: 'คำร้องเอกสาร',
      value: pendingDocumentRequests.length,
      detail: 'รอออกเอกสาร (Transcript, ฯลฯ)',
      path: '/documents',
    },
    {
      icon: FileText,
      label: 'คำร้องทั่วไป',
      value: pendingRequests.length,
      detail: 'รอ staff ตรวจสอบ',
      path: '/requests',
    },
    {
      icon: Wallet,
      label: 'งบประมาณ',
      value: pendingBudget.length,
      detail: `ยอดคงเหลือ ฿${remainingBudget.toLocaleString()}`,
      path: '/budget',
    },
    {
      icon: Activity,
      label: 'กิจกรรม',
      value: pendingActivities.length,
      detail: `${upcomingActivities.length} กิจกรรมกำลังจะมาถึง`,
      path: '/activities-management',
    },
    {
      icon: Calendar,
      label: 'นัดหมาย',
      value: pendingAppointments.length,
      detail: 'รายการรอยืนยัน',
      path: '/appointments',
    },
  ];

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <motion.div variants={itemVariants}>
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            <div className="rounded-xl bg-purple-100 p-2 dark:bg-purple-950/50">
              <Settings className="h-5 w-5 text-purple-600 dark:text-purple-300" />
            </div>
            <span>Staff Dashboard · {staffDepartment}</span>
          </div>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-950 dark:text-white md:text-5xl">
            สวัสดี, <span className="bg-gradient-to-r from-purple-500 to-violet-500 bg-clip-text text-transparent">{staffName}</span>
          </h1>
          <p className="mt-2 text-sm font-medium text-slate-500 dark:text-slate-400">
            {staffPosition} · ข้อมูลทั้งหมดบนหน้านี้ดึงจาก API/Database จริง
          </p>
        </motion.div>

        <motion.div variants={itemVariants} className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={refreshDashboard} disabled={isLoading} className="rounded-xl">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            รีเฟรช
          </Button>
          <Button variant="outline" onClick={() => navigate('/notifications')} className="rounded-xl">
            <Bell className="mr-2 h-4 w-4" />
            แจ้งเตือน
          </Button>
          <Button variant="outline" onClick={() => navigate('/messages')} className="rounded-xl">
            <MessageSquare className="mr-2 h-4 w-4" />
            ข้อความ
          </Button>
          <Button onClick={() => navigate('/settings')} className="rounded-xl bg-purple-600 hover:bg-purple-700">
            <Settings className="mr-2 h-4 w-4" />
            ตั้งค่า
          </Button>
        </motion.div>
      </div>

      {loadWarning && (
        <motion.div
          variants={itemVariants}
          className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0" />
          <div>
            <div className="font-semibold">โหลดข้อมูลบางส่วนไม่สำเร็จ</div>
            <div className="text-sm">{loadWarning}</div>
          </div>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          icon={Users}
          label="นักศึกษาทั้งหมด"
          value={students.length}
          detail={`เสี่ยง ${atRiskStudents.length} คน · GPA เฉลี่ย ${averageGpa}`}
          gradient="bg-gradient-to-br from-purple-500 to-violet-600"
          onClick={() => navigate('/students')}
        />
        <MetricCard
          icon={BookOpen}
          label="รายวิชา"
          value={courses.length}
          detail={`ลงทะเบียน ${totalEnrollments} คน · เฉลี่ย ${averageClassSize}/ห้อง`}
          gradient="bg-gradient-to-br from-blue-500 to-indigo-600"
          onClick={() => navigate('/courses')}
        />
        <MetricCard
          icon={BarChart3}
          label="Workload อาจารย์"
          value={`${averageWorkload}%`}
          detail={`เกินเกณฑ์ ${overloadedWorkloads.length} จาก ${workloads.length} รายการ`}
          gradient="bg-gradient-to-br from-rose-500 to-pink-600"
          onClick={() => navigate('/workload-tracking')}
        />
        <MetricCard
          icon={ClipboardCheck}
          label="งานรอตรวจ"
          value={pendingRequests.length + pendingActivities.length + pendingBudget.length}
          detail={`คำร้อง ${pendingRequests.length} · กิจกรรม ${pendingActivities.length} · งบ ${pendingBudget.length}`}
          gradient="bg-gradient-to-br from-amber-500 to-orange-600"
          onClick={() => navigate('/requests')}
        />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">ผู้ใช้ที่ใช้งานอยู่</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{activeUsers}</p>
              </div>
              <UserCog className="h-8 w-8 text-purple-500" />
            </div>
            <Progress value={totalUsers ? (activeUsers / totalUsers) * 100 : 0} className="mt-4 h-2" />
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">ฝึกงานกำลังดำเนินการ</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{activeInternships.length}</p>
              </div>
              <Briefcase className="h-8 w-8 text-emerald-500" />
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">ทั้งหมด {internships.length} รายการ</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">ข้อความยังไม่อ่าน</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{unreadMessages.length}</p>
              </div>
              <MessageSquare className="h-8 w-8 text-blue-500" />
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">แจ้งเตือนด่วน {urgentNotifications.length} รายการ</p>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">บริษัทคู่ความร่วมมือ</p>
                <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{companies.length}</p>
              </div>
              <Network className="h-8 w-8 text-orange-500" />
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">MOU active {activeCooperation.length} รายการ</p>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {actionItems.map((action) => (
          <ActionButton key={action.label} {...action} />
        ))}
      </motion.div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <motion.div variants={itemVariants} className="xl:col-span-2">
          <Card className="rounded-2xl border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950 dark:text-white">
                <ClipboardCheck className="h-5 w-5 text-purple-500" />
                คิวงานสำคัญ
              </CardTitle>
              <CardDescription>รายการที่ staff ควรจัดการก่อนจากข้อมูลจริงล่าสุด</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {priorityQueue.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => navigate(item.path)}
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-4 text-left hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-800/70"
                >
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
                      <item.icon className="h-5 w-5 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">{item.detail}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-slate-950 dark:text-white">{item.value}</div>
                </button>
              ))}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-slate-200 bg-white/80 shadow-sm dark:border-slate-800 dark:bg-slate-900/80">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-slate-950 dark:text-white">
                <BarChart3 className="h-5 w-5 text-rose-500" />
                Workload Tracking
              </CardTitle>
              <CardDescription>เชื่อมจากตาราง WorkloadRecord จริงในฐานข้อมูล</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-500 dark:text-slate-400">ค่าเฉลี่ยภาพรวม</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">{averageWorkload}%</span>
                </div>
                <Progress value={averageWorkload} className="h-2" />
              </div>
              <div className="space-y-3">
                {topWorkloads.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    ยังไม่มีข้อมูล workload ในฐานข้อมูล
                  </div>
                )}
                {topWorkloads.map((workload) => (
                  <div key={workload.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900 dark:text-slate-100">{workload.lecturerName}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {workload.academicYear}/{workload.semester} · {workload.totalHours} ชม.
                        </div>
                      </div>
                      <Badge variant="outline" className={statusBadge(workload.percentage >= 90 ? 'pending' : 'active')}>
                        {workload.percentage}%
                      </Badge>
                    </div>
                    <Progress value={workload.percentage} className="mt-3 h-2" />
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate('/workload-tracking')}>
                เปิดหน้าติดตาม workload
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="academic" className="space-y-4">
          <TabsList className="rounded-xl border bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
            <TabsTrigger value="academic">Academic</TabsTrigger>
            <TabsTrigger value="operations">Operations</TabsTrigger>
            <TabsTrigger value="system">System</TabsTrigger>
          </TabsList>

          <TabsContent value="academic" className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-amber-500" />
                  นักศึกษาที่ต้องติดตาม
                </CardTitle>
                <CardDescription>สถานะ probation/risk จากข้อมูลนักศึกษาจริง</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {topRiskStudents.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-slate-700">
                    ยังไม่มีนักศึกษากลุ่มเสี่ยง
                  </div>
                )}
                {topRiskStudents.map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400">
                        {student.studentId} · ปี {student.year} · GPA {student.gpa.toFixed(2)}
                      </div>
                    </div>
                    <Badge variant="outline" className={statusBadge(student.academicStatus)}>
                      {student.academicStatus}
                    </Badge>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate('/students')}>
                  ดูนักศึกษาทั้งหมด
                </Button>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-blue-500" />
                  ภาพรวมรายวิชา
                </CardTitle>
                <CardDescription>จำนวนผู้เรียนและความจุจากรายวิชาในระบบ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {courses.slice(0, 5).map((course) => {
                  const capacity = course.maxStudents ? clampPercent((course.enrolled / course.maxStudents) * 100) : 0;
                  return (
                    <div key={course.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-slate-900 dark:text-slate-100">
                            {course.code} · {course.name}
                          </div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">
                            เทอม {course.semester}/{course.academicYear} · {course.enrolled}/{course.maxStudents || '-'} คน
                          </div>
                        </div>
                        <Badge variant="outline">{capacity}%</Badge>
                      </div>
                      <Progress value={capacity} className="mt-3 h-2" />
                    </div>
                  );
                })}
                {courses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-sm text-slate-500 dark:border-slate-700">
                    ยังไม่มีรายวิชาในฐานข้อมูล
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="operations" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>คำร้องล่าสุด</CardTitle>
                <CardDescription>รายการ pending/under review</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentRequests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">{request.title}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {request.studentName} · {formatDate(request.submittedAt)}
                        </div>
                      </div>
                      <Badge variant="outline" className={statusBadge(request.status)}>
                        {request.status}
                      </Badge>
                    </div>
                  </div>
                ))}
                {recentRequests.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400">ไม่มีคำร้องค้าง</div>}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>กิจกรรมและนัดหมาย</CardTitle>
                <CardDescription>งานที่เกี่ยวข้องกับนักศึกษาในช่วงนี้</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {upcomingActivities.slice(0, 3).map((activity) => (
                  <div key={activity.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{activity.title}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {formatDate(activity.startDate)} · {activity.enrolled}/{activity.maxParticipants || '-'} คน
                    </div>
                  </div>
                ))}
                {pendingAppointments.slice(0, 2).map((appointment) => (
                  <div key={appointment.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{appointment.purpose}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {appointment.studentName} กับ {appointment.lecturerName} · {formatDate(appointment.date)} {appointment.startTime}
                    </div>
                  </div>
                ))}
                {upcomingActivities.length === 0 && pendingAppointments.length === 0 && (
                  <div className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มีงานกิจกรรมหรือนัดหมายที่ต้องติดตาม</div>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>งบประมาณ</CardTitle>
                <CardDescription>รายรับรายจ่ายจาก BudgetRecord</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
                    <div className="text-xs text-emerald-700 dark:text-emerald-300">รายรับ</div>
                    <div className="font-bold text-emerald-800 dark:text-emerald-200">฿{totalIncome.toLocaleString()}</div>
                  </div>
                  <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/30">
                    <div className="text-xs text-red-700 dark:text-red-300">รายจ่าย</div>
                    <div className="font-bold text-red-800 dark:text-red-200">฿{totalExpense.toLocaleString()}</div>
                  </div>
                </div>
                {pendingBudget.slice(0, 3).map((budget) => (
                  <div key={budget.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{budget.title}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{budget.category}</div>
                    </div>
                    <div className="font-semibold">฿{budget.amount.toLocaleString()}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-emerald-500" />
                  System Health
                </CardTitle>
                <CardDescription>สรุปจาก system usage report และ audit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {[
                  { label: 'ผู้ใช้ทั้งหมด', value: totalUsers, icon: Users },
                  { label: 'Job postings', value: systemReport?.totalJobs || 0, icon: Briefcase },
                  { label: 'Audit logs', value: systemReport?.totalAuditLogs || auditLogs.length, icon: ShieldCheck },
                  { label: 'Unread notifications', value: systemReport?.unreadNotifications || unreadNotifications.length, icon: Bell },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <item.icon className="h-4 w-4" />
                      <span>{item.label}</span>
                    </div>
                    <span className="font-bold text-slate-950 dark:text-white">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Audit ล่าสุด</CardTitle>
                <CardDescription>ตรวจสอบการเปลี่ยนแปลงที่เกิดขึ้นในระบบ</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {recentAudits.map((log) => (
                  <div key={log.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-slate-100">{log.action}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {log.userName} · {log.resource} · {formatDate(log.timestamp)}
                      </div>
                    </div>
                    {log.status === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500" />
                    )}
                  </div>
                ))}
                {recentAudits.length === 0 && <div className="text-sm text-slate-500 dark:text-slate-400">ยังไม่มี audit log</div>}
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-slate-200 bg-white/80 dark:border-slate-800 dark:bg-slate-900/80">
              <CardHeader>
                <CardTitle>Communication</CardTitle>
                <CardDescription>ข้อความและแจ้งเตือนของบัญชี staff นี้</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {messages.slice(0, 3).map((message) => (
                  <div key={message.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate font-medium text-slate-900 dark:text-slate-100">{message.subject}</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {message.fromName} · {formatDate(message.timestamp)}
                        </div>
                      </div>
                      {!message.read && <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />}
                    </div>
                  </div>
                ))}
                <Button variant="outline" className="w-full rounded-xl" onClick={() => navigate('/messages')}>
                  เปิดกล่องข้อความ
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>

      {isLoading && (
        <div className="rounded-xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400">
          กำลังโหลดข้อมูลจริงจาก backend...
        </div>
      )}
    </motion.div>
  );
}
