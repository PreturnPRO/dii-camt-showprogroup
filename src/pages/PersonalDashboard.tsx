import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
    User, Calendar, GraduationCap, Sparkles, ChevronRight,
    Mail, Phone, MapPin, Award, BookOpen, Users, Briefcase,
    Building2, ShieldCheck, BarChart3, Settings, FileText,
    Clock, Wallet, Bell, MessageSquare, ClipboardList, UserCheck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timetable } from '@/components/common/Timetable';
import { DegreeProgressCard } from '@/components/dashboard/DegreeProgressCard';
import { GPAHistoryCard } from '@/components/dashboard/GPAHistoryCard';
import { TechnicalSkillsCard } from '@/components/dashboard/TechnicalSkillsCard';
import { SoftSkillsCard } from '@/components/dashboard/SoftSkillsCard';
import { CourseGradesCard } from '@/components/dashboard/CourseGradesCard';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapCourse, mapGrade, mapStudent, mapStudentStatsToStudent } from '@/lib/live-mappers';
import type { Course, Grade, Student, UserRole } from '@/types';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
};

type SemesterGPAHistory = {
    semester: string;
    gpa: number;
    credits: number;
}[];

type SoftSkillDashboardScores = {
    leadership: number;
    discipline: number;
    responsibility: number;
    communication: number;
};

type PeerFeedbackRow = {
    projectName: string;
    teamSize: number;
    averageScore: number;
    date: string;
};

// Transform grades for CourseGradesCard
const transformGradesForCard = (
    studentGrades: Grade[],
    courses: Course[],
) => {
    return studentGrades.map(grade => {
        const course = courses.find(c => c.id === grade.courseId);
        return {
            courseId: grade.courseId,
            courseCode: course?.code || '',
            courseName: course?.nameThai || course?.name || '',
            credits: course?.credits || 0,
            letterGrade: grade.letterGrade || 'I',
            semester: course ? `${course.semester}/${course.academicYear}` : '1/2568',
            total: grade.total,
        };
    });
};

type RoleMetric = {
    label: string;
    value: string;
    description: string;
    icon: React.ElementType;
    tone: string;
};

type RoleAction = {
    label: string;
    path: string;
    icon: React.ElementType;
};

type DashboardUser = {
    id: string;
    email: string;
    name: string;
    nameThai: string;
    role: UserRole;
    avatar?: string;
    phone?: string;
    raw: unknown;
};

const roleProfileKey: Record<UserRole, string> = {
    student: 'studentProfile',
    lecturer: 'lecturerProfile',
    staff: 'staffProfile',
    company: 'companyProfile',
    admin: 'adminProfile',
};

const roleDashboardConfig: Record<Exclude<UserRole, 'student'>, {
    title: string;
    subtitle: string;
    badge: string;
    gradient: string;
    actions: RoleAction[];
    focus: string[];
    defaultMetrics: RoleMetric[];
}> = {
    lecturer: {
        title: 'Lecturer Workspace',
        subtitle: 'ภาพรวมการสอน การดูแลนักศึกษา และงานประจำวันของอาจารย์',
        badge: 'อาจารย์',
        gradient: 'from-indigo-700 via-blue-700 to-cyan-700',
        actions: [
            { label: 'นักศึกษาในที่ปรึกษา', path: '/students', icon: Users },
            { label: 'รายวิชาที่สอน', path: '/courses', icon: BookOpen },
            { label: 'กรอกผลการเรียน', path: '/grades', icon: Award },
            { label: 'นัดหมาย', path: '/appointments', icon: Calendar },
            { label: 'ข้อความ', path: '/messages', icon: MessageSquare },
        ],
        focus: ['ตรวจงานที่รอให้คะแนน', 'ตอบนัดหมายนักศึกษา', 'เช็คตารางสอนวันนี้'],
        defaultMetrics: [
            { label: 'รายวิชาที่สอน', value: '0', description: 'จากตารางสอนจริง', icon: BookOpen, tone: 'from-blue-500 to-indigo-600' },
            { label: 'นัดหมาย', value: '0', description: 'รายการทั้งหมดในระบบ', icon: Calendar, tone: 'from-emerald-500 to-teal-600' },
            { label: 'นักศึกษา', value: '0', description: 'ข้อมูลจากรายชื่อนักศึกษา', icon: Users, tone: 'from-violet-500 to-purple-600' },
            { label: 'ข้อความ', value: '0', description: 'การสื่อสารกับนักศึกษา/บริษัท', icon: MessageSquare, tone: 'from-amber-500 to-orange-600' },
        ],
    },
    staff: {
        title: 'Staff Operations',
        subtitle: 'ศูนย์ควบคุมงานเอกสาร ผู้ใช้ งบประมาณ และการประสานงาน',
        badge: 'เจ้าหน้าที่',
        gradient: 'from-slate-900 via-slate-800 to-blue-900',
        actions: [
            { label: 'จัดการผู้ใช้', path: '/users', icon: Users },
            { label: 'งบประมาณ', path: '/budget', icon: Wallet },
            { label: 'เอกสาร', path: '/documents', icon: FileText },
            { label: 'บุคลากร', path: '/personnel', icon: UserCheck },
            { label: 'ตารางงาน', path: '/schedule-management', icon: Calendar },
            { label: 'กิจกรรม', path: '/activities-management', icon: ClipboardList },
        ],
        focus: ['ตรวจรายการอนุมัติที่ค้างอยู่', 'อัปเดตเอกสารและบุคลากร', 'ติดตาม audit log ล่าสุด'],
        defaultMetrics: [
            { label: 'ผู้ใช้', value: '0', description: 'บัญชีในระบบ', icon: Users, tone: 'from-blue-500 to-cyan-600' },
            { label: 'งบประมาณ', value: '0', description: 'รายการงบประมาณ', icon: Wallet, tone: 'from-emerald-500 to-teal-600' },
            { label: 'กิจกรรม', value: '0', description: 'กิจกรรมทั้งหมด', icon: ClipboardList, tone: 'from-violet-500 to-purple-600' },
            { label: 'Audit', value: '0', description: 'รายการตรวจสอบ', icon: ShieldCheck, tone: 'from-amber-500 to-orange-600' },
        ],
    },
    company: {
        title: 'Company Talent Hub',
        subtitle: 'พื้นที่ติดตามประกาศงาน ผู้สมัคร นักศึกษาฝึกงาน และสิทธิ์การใช้งาน',
        badge: 'บริษัท',
        gradient: 'from-emerald-700 via-teal-700 to-cyan-700',
        actions: [
            { label: 'ประกาศงาน', path: '/job-postings', icon: Briefcase },
            { label: 'ผู้สมัคร', path: '/applicants', icon: Users },
            { label: 'ค้นหานักศึกษา', path: '/student-profiles', icon: GraduationCap },
            { label: 'ติดตามฝึกงาน', path: '/intern-tracking', icon: Building2 },
            { label: 'แพ็กเกจ', path: '/subscription', icon: Wallet },
            { label: 'ข้อความ', path: '/messages', icon: MessageSquare },
        ],
        focus: ['ตรวจผู้สมัครใหม่', 'อัปเดตสถานะนักศึกษาฝึกงาน', 'ดูสิทธิ์แพ็กเกจปัจจุบัน'],
        defaultMetrics: [
            { label: 'ประกาศงาน', value: '0', description: 'ตำแหน่งที่เปิด', icon: Briefcase, tone: 'from-emerald-500 to-teal-600' },
            { label: 'ผู้สมัคร', value: '0', description: 'ใบสมัครทั้งหมด', icon: Users, tone: 'from-blue-500 to-indigo-600' },
            { label: 'ฝึกงาน', value: '0', description: 'รายการ internship', icon: Building2, tone: 'from-violet-500 to-purple-600' },
            { label: 'การชำระเงิน', value: '0', description: 'รายการ subscription', icon: Wallet, tone: 'from-amber-500 to-orange-600' },
        ],
    },
    admin: {
        title: 'Admin Control Center',
        subtitle: 'ภาพรวมระบบ ผู้ใช้ ความปลอดภัย รายงาน และการแจ้งเตือน',
        badge: 'ผู้ดูแลระบบ',
        gradient: 'from-rose-700 via-red-700 to-orange-700',
        actions: [
            { label: 'ผู้ใช้ทั้งหมด', path: '/users', icon: Users },
            { label: 'รายงานระบบ', path: '/reports', icon: BarChart3 },
            { label: 'Audit log', path: '/audit', icon: ShieldCheck },
            { label: 'แจ้งเตือน', path: '/notifications', icon: Bell },
            { label: 'ตั้งค่า', path: '/settings', icon: Settings },
            { label: 'ข้อความ', path: '/messages', icon: MessageSquare },
        ],
        focus: ['ตรวจสิทธิ์ผู้ใช้', 'ดูรายงานการใช้งานระบบ', 'ตรวจความผิดปกติจาก audit log'],
        defaultMetrics: [
            { label: 'ผู้ใช้', value: '0', description: 'บัญชีทั้งหมด', icon: Users, tone: 'from-blue-500 to-indigo-600' },
            { label: 'รายงาน', value: '1', description: 'system usage', icon: BarChart3, tone: 'from-emerald-500 to-teal-600' },
            { label: 'Audit', value: '0', description: 'รายการตรวจสอบ', icon: ShieldCheck, tone: 'from-violet-500 to-purple-600' },
            { label: 'แจ้งเตือน', value: '0', description: 'notification', icon: Bell, tone: 'from-amber-500 to-orange-600' },
        ],
    },
};

function RolePersonalDashboard({
    user,
    metrics,
    isLoading,
    onNavigate,
}: {
    user: DashboardUser;
    metrics: RoleMetric[];
    isLoading: boolean;
    onNavigate: (path: string) => void;
}) {
    const role = user.role === 'student' ? 'lecturer' : user.role;
    const config = roleDashboardConfig[role];
    const profile = asRecord(asRecord(user.raw)[roleProfileKey[user.role]]);
    const displayName = user.nameThai || user.name || user.email;
    const displaySubtitle = asString(
        profile.department,
        asString(profile.companyNameThai, asString(profile.companyName, asString(profile.position, user.email))),
    );
    const roleIdentifier = asString(
        profile.lecturerId,
        asString(profile.staffId, asString(profile.companyId, asString(profile.adminId, user.id))),
    );
    const displayMetrics = metrics.length ? metrics : config.defaultMetrics;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 pb-10"
        >
            <motion.div
                variants={itemVariants}
                className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${config.gradient} p-8 text-white shadow-2xl`}
            >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_35%)]" />
                <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-3xl border border-white/20 bg-white/10 shadow-xl">
                            {user.avatar ? (
                                <img src={user.avatar} alt={displayName} className="h-full w-full object-cover" />
                            ) : (
                                <User className="h-14 w-14 text-white/70" />
                            )}
                        </div>
                        <div>
                            <div className="mb-3 flex flex-wrap items-center gap-2">
                                <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">{config.badge}</Badge>
                                <Badge className="border-white/20 bg-white/15 text-white hover:bg-white/20">ID: {roleIdentifier}</Badge>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight lg:text-5xl">{displayName}</h1>
                            <p className="mt-2 max-w-2xl text-sm text-white/75 lg:text-base">{config.subtitle}</p>
                        </div>
                    </div>
                    <div className="grid gap-3 text-sm text-white/85 sm:grid-cols-2 lg:w-80 lg:grid-cols-1">
                        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                            <Mail className="h-4 w-4" />
                            <span className="truncate">{user.email}</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                            <Phone className="h-4 w-4" />
                            <span className="truncate">{user.phone || '-'}</span>
                        </div>
                        <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-3">
                            <Building2 className="h-4 w-4" />
                            <span className="truncate">{displaySubtitle}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                {displayMetrics.map((metric) => (
                    <motion.div
                        key={metric.label}
                        variants={itemVariants}
                        className="rounded-3xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60"
                    >
                        <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${metric.tone} text-white shadow-lg`}>
                            <metric.icon className="h-5 w-5" />
                        </div>
                        <div className="text-3xl font-bold text-slate-900 dark:text-white">{isLoading ? '...' : metric.value}</div>
                        <div className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{metric.label}</div>
                        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{metric.description}</p>
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
                <motion.div variants={itemVariants} className="lg:col-span-2 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
                    <div className="mb-5 flex items-center justify-between">
                        <div>
                            <h2 className="text-xl font-bold text-slate-900 dark:text-white">{config.title}</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">เมนูที่ใช้บ่อยตามบทบาทของคุณ</p>
                        </div>
                        <Sparkles className="h-5 w-5 text-amber-500" />
                    </div>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {config.actions.map((action) => (
                            <button
                                key={action.path}
                                type="button"
                                onClick={() => onNavigate(action.path)}
                                className="group flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition-colors hover:border-blue-200 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900"
                            >
                                <span className="flex items-center gap-3">
                                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600 group-hover:bg-blue-100 group-hover:text-blue-700 dark:bg-slate-900 dark:text-slate-300">
                                        <action.icon className="h-5 w-5" />
                                    </span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{action.label}</span>
                                </span>
                                <ChevronRight className="h-4 w-4 text-slate-400" />
                            </button>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="rounded-3xl border border-white/60 bg-white/70 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60">
                    <div className="mb-5 flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-950">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Focus Today</h2>
                            <p className="text-xs text-slate-500 dark:text-slate-400">สิ่งที่ควรตรวจในวันนี้</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {config.focus.map((item, index) => (
                            <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 p-4 dark:bg-slate-950">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-900 dark:text-slate-200">
                                    {index + 1}
                                </div>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{item}</p>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}

export default function PersonalDashboard() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const { user } = useAuth();
    const [student, setStudent] = React.useState<Student | null>(null);
    const [courses, setCourses] = React.useState<Course[]>([]);
    const [grades, setGrades] = React.useState<Grade[]>([]);
    const [gpaHistory, setGpaHistory] = React.useState<SemesterGPAHistory>([]);
    const [isStudentDashboardLoading, setIsStudentDashboardLoading] = React.useState(true);
    const [softSkillScores, setSoftSkillScores] = React.useState<SoftSkillDashboardScores>({
        leadership: 0,
        discipline: 0,
        responsibility: 0,
        communication: 0,
    });
    const [peerFeedbacks, setPeerFeedbacks] = React.useState<PeerFeedbackRow[]>([]);
    const [roleMetrics, setRoleMetrics] = React.useState<RoleMetric[]>([]);
    const [isRoleMetricsLoading, setIsRoleMetricsLoading] = React.useState(false);

    React.useEffect(() => {
        if (user?.role !== 'student') return;

        let mounted = true;
        setIsStudentDashboardLoading(true);

        const loadDashboard = async () => {
            try {
                const [profileResult, statsResult, transcriptResult, enrollmentsResult] = await Promise.allSettled([
                    api.students.profile(),
                    api.students.stats(),
                    api.grades.transcript(),
                    api.enrollments.list(),
                ]);

                if (!mounted) return;

                let nextStudent: Student | null = null;
                if (profileResult.status === 'fulfilled') {
                    nextStudent = mapStudent(profileResult.value.profile);
                }
                if (statsResult.status === 'fulfilled' && nextStudent) {
                    const stats = asRecord(statsResult.value.stats);
                    nextStudent = mapStudentStatsToStudent(nextStudent, stats);
                    const history = asArray(stats.gradeHistory)
                        .map((item) => {
                            const row = asRecord(item);
                            return {
                                semester: asString(row.semester, '1/2568'),
                                gpa: asNumber(row.gpa, 0),
                                credits: asNumber(row.credits, 0),
                            };
                        })
                        .filter((item) => item.gpa > 0);
                    if (history.length) {
                        setGpaHistory(history);
                    } else {
                        setGpaHistory([]);
                    }
                    const softSummary = asRecord(asRecord(asRecord(stats.skillSummary).soft));
                    setSoftSkillScores({
                        leadership: asNumber(softSummary.openness, 0),
                        discipline: asNumber(softSummary.professorScore, 0),
                        responsibility: asNumber(softSummary.peerScore, 0),
                        communication: asNumber(softSummary.communication, 0),
                    });
                    setPeerFeedbacks(asArray(softSummary.feedbackHistory).map((item) => {
                        const row = asRecord(item);
                        const averageScore = (
                            asNumber(row.communicationScore, 0) +
                            asNumber(row.opennessScore, 0)
                        ) / 2;

                        return {
                            projectName: asString(row.projectName, 'Feedback'),
                            teamSize: Math.max(asNumber(row.comments, 0), 1),
                            averageScore,
                            date: row.date ? new Date(String(row.date)).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: '2-digit' }) : '-',
                        };
                    }).filter((item) => item.averageScore > 0));
                } else {
                    setGpaHistory([]);
                    setSoftSkillScores({ leadership: 0, discipline: 0, responsibility: 0, communication: 0 });
                    setPeerFeedbacks([]);
                }
                setStudent(nextStudent);

                if (transcriptResult.status === 'fulfilled') {
                    const transcript = asArray(transcriptResult.value.transcript);
                    const nextGrades = transcript.map(mapGrade);
                    setGrades(nextGrades);
                } else {
                    setGrades([]);
                }

                if (enrollmentsResult.status === 'fulfilled' && nextStudent) {
                    const nextCourses = enrollmentsResult.value.enrollments
                        .map((item, index) => ({
                            ...mapCourse(asRecord(item).course, index),
                            enrolledStudents: [nextStudent.id, nextStudent.studentId].filter(Boolean),
                        }))
                        .filter((course) => course.id);
                    setCourses(nextCourses);
                } else {
                    setCourses([]);
                }
            } catch (error) {
                console.warn('Unable to load personal dashboard from API', error);
                if (!mounted) return;
                setStudent(null);
                setCourses([]);
                setGrades([]);
                setGpaHistory([]);
                setSoftSkillScores({ leadership: 0, discipline: 0, responsibility: 0, communication: 0 });
                setPeerFeedbacks([]);
            } finally {
                if (mounted) setIsStudentDashboardLoading(false);
            }
        };

        loadDashboard();

        return () => {
            mounted = false;
        };
    }, [user?.role]);

    React.useEffect(() => {
        if (!user || user.role === 'student') return;

        let mounted = true;
        const role = user.role;
        const config = roleDashboardConfig[role];
        setRoleMetrics(config.defaultMetrics);
        setIsRoleMetricsLoading(true);

        const rowsFromResult = (result: PromiseSettledResult<unknown>, key: string) => {
            if (result.status !== 'fulfilled') return [];
            return asArray(asRecord(result.value)[key]);
        };

        const loadRoleMetrics = async () => {
            try {
                if (role === 'lecturer') {
                    const [coursesResult, appointmentsResult, studentsResult, messagesResult] = await Promise.allSettled([
                        api.courses.lecturerSchedule(),
                        api.appointments.list(),
                        api.students.list(),
                        api.messages.list(),
                    ]);

                    if (!mounted) return;
                    setRoleMetrics([
                        { ...config.defaultMetrics[0], value: String(rowsFromResult(coursesResult, 'schedule').length) },
                        { ...config.defaultMetrics[1], value: String(rowsFromResult(appointmentsResult, 'appointments').length) },
                        { ...config.defaultMetrics[2], value: String(rowsFromResult(studentsResult, 'students').length) },
                        { ...config.defaultMetrics[3], value: String(rowsFromResult(messagesResult, 'messages').length) },
                    ]);
                } else if (role === 'staff') {
                    const [usersResult, budgetResult, activitiesResult, auditResult] = await Promise.allSettled([
                        api.users.list(),
                        api.budget.list(),
                        api.activities.list(),
                        api.audit.list(),
                    ]);

                    if (!mounted) return;
                    setRoleMetrics([
                        { ...config.defaultMetrics[0], value: String(rowsFromResult(usersResult, 'users').length) },
                        { ...config.defaultMetrics[1], value: String(rowsFromResult(budgetResult, 'budget').length) },
                        { ...config.defaultMetrics[2], value: String(rowsFromResult(activitiesResult, 'activities').length) },
                        { ...config.defaultMetrics[3], value: String(rowsFromResult(auditResult, 'logs').length) },
                    ]);
                } else if (role === 'company') {
                    const [jobsResult, applicationsResult, internshipsResult, paymentsResult] = await Promise.allSettled([
                        api.jobs.list(),
                        api.applications.list(),
                        api.internship.list(),
                        api.subscription.payments(),
                    ]);

                    if (!mounted) return;
                    setRoleMetrics([
                        { ...config.defaultMetrics[0], value: String(rowsFromResult(jobsResult, 'jobs').length) },
                        { ...config.defaultMetrics[1], value: String(rowsFromResult(applicationsResult, 'applications').length) },
                        { ...config.defaultMetrics[2], value: String(rowsFromResult(internshipsResult, 'internships').length) },
                        { ...config.defaultMetrics[3], value: String(rowsFromResult(paymentsResult, 'payments').length) },
                    ]);
                } else if (role === 'admin') {
                    const [usersResult, reportsResult, auditResult, notificationsResult] = await Promise.allSettled([
                        api.users.list(),
                        api.reports.systemUsage(),
                        api.audit.list(),
                        api.notifications.list(),
                    ]);

                    if (!mounted) return;
                    setRoleMetrics([
                        { ...config.defaultMetrics[0], value: String(rowsFromResult(usersResult, 'users').length) },
                        { ...config.defaultMetrics[1], value: reportsResult.status === 'fulfilled' ? '1' : '0' },
                        { ...config.defaultMetrics[2], value: String(rowsFromResult(auditResult, 'logs').length) },
                        { ...config.defaultMetrics[3], value: String(rowsFromResult(notificationsResult, 'notifications').length) },
                    ]);
                }
            } catch (error) {
                console.warn('Unable to load role personal dashboard metrics from API', error);
                if (mounted) setRoleMetrics(config.defaultMetrics);
            } finally {
                if (mounted) setIsRoleMetricsLoading(false);
            }
        };

        loadRoleMetrics();

        return () => {
            mounted = false;
        };
    }, [user]);

    if (user && user.role !== 'student') {
        return (
            <RolePersonalDashboard
                user={user as DashboardUser}
                metrics={roleMetrics}
                isLoading={isRoleMetricsLoading}
                onNavigate={navigate}
            />
        );
    }

    if (!student) {
        return (
            <motion.div
                variants={containerVariants}
                initial="hidden"
                animate="visible"
                className="space-y-8 pb-10"
            >
                <motion.div
                    variants={itemVariants}
                    className="rounded-3xl border border-white/60 bg-white/70 p-10 text-center shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/60"
                >
                    <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                        <User className="h-7 w-7" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {isStudentDashboardLoading ? 'กำลังโหลด Personal Dashboard...' : 'ไม่พบข้อมูลนักศึกษาจากระบบ'}
                    </h1>
                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                        {isStudentDashboardLoading ? 'ระบบกำลังดึงข้อมูลโปรไฟล์ ตารางเรียน เกรด และความก้าวหน้าจริง' : 'โปรดตรวจสอบบัญชีนักศึกษาหรือข้อมูล profile ในหลังบ้าน'}
                    </p>
                </motion.div>
            </motion.div>
        );
    }

    const enrolledCourses = courses.filter(c => c.enrolledStudents.includes(student.id) || c.enrolledStudents.includes(student.studentId));
    const studentCourses = enrolledCourses.length ? enrolledCourses : courses;
    const courseGrades = transformGradesForCard(grades, courses);
    const technicalActivities = student.activities.slice(0, 5).map((activity) => ({
        name: activity.titleThai || activity.title,
        type: activity.type,
        date: new Date(activity.startDate).toLocaleDateString('th-TH', { month: 'short', year: '2-digit' }),
    }));

    // Time-based greeting
    const hour = new Date().getHours();
    const greeting = hour < 12 ? t.personalDashboard.goodMorning : hour < 18 ? t.personalDashboard.goodAfternoon : t.personalDashboard.goodEvening;

    const yearLabel = ['', t.personalDashboard.year1, t.personalDashboard.year2, t.personalDashboard.year3, t.personalDashboard.year4][student.year] || `${t.personalDashboard.year1.split(' ')[0]} ${student.year}`;

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-8 pb-10"
        >
            {/* Profile Header */}
            <motion.div
                variants={itemVariants}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 text-white shadow-2xl"
            >
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-emerald-500/10 to-teal-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

                <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
                    {/* Avatar */}
                    <motion.div
                        whileHover={{ scale: 1.05 }}
                        className="relative"
                    >
                        <div className="w-32 h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-xl shadow-blue-500/30">
                            <div className="w-full h-full rounded-[22px] bg-slate-800 flex items-center justify-center overflow-hidden">
                                {student.avatar ? (
                                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                                ) : (
                                    <User className="w-16 h-16 text-slate-400" />
                                )}
                            </div>
                        </div>
                        <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            {yearLabel}
                        </div>
                    </motion.div>

                    {/* Info */}
                    <div className="flex-1 text-center lg:text-left">
                        <div className="flex items-center justify-center lg:justify-start gap-2 text-slate-400 text-sm mb-2">
                            <Sparkles className="w-4 h-4 text-yellow-500" />
                            <span>{greeting}</span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-bold mb-2">{student.nameThai}</h1>
                        <p className="text-slate-400 mb-4">{student.name}</p>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-slate-300">
                            <div className="flex items-center gap-2">
                                <GraduationCap className="w-4 h-4 text-blue-400" />
                                <span>{student.major}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-emerald-400" />
                                <span>{t.personalDashboard.semester} {student.semester}/{student.academicYear}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Award className="w-4 h-4 text-yellow-400" />
                                <span>{student.gamificationPoints} XP</span>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-4">
                            <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                                {t.personalDashboard.studentId} {student.studentId}
                            </Badge>
                            <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                                GPAX: {student.gpax.toFixed(2)}
                            </Badge>
                            {student.academicStatus === 'normal' && (
                                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                                    {t.personalDashboard.statusNormal}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-col gap-3">
                        <Button
                            onClick={() => navigate('/portfolio')}
                            className="bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl dark:bg-slate-900/50"
                        >
                            <User className="w-4 h-4 mr-2" />
                            {t.common.details} Portfolio
                        </Button>
                        <Button
                            onClick={() => navigate('/settings')}
                            variant="ghost"
                            className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl dark:bg-slate-900/50"
                        >
                            {t.personalDashboard.editProfile}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - 2/3 */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Class Schedule */}
                    <motion.div variants={itemVariants}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                <Calendar className="w-5 h-5 text-purple-500 dark:text-slate-400" />
                                {t.personalDashboard.schedule}
                            </h2>
                            <Button
                                variant="ghost"
                                onClick={() => navigate('/schedule')}
                                className="text-slate-500 hover:text-purple-600 dark:text-slate-300"
                            >
                                {t.personalDashboard.fullscreen} <ChevronRight className="w-4 h-4 ml-1" />
                            </Button>
                        </div>
                        <div className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
                            <Timetable
                                courses={studentCourses}
                                semester={student.semester}
                                academicYear={student.academicYear}
                            />
                        </div>
                    </motion.div>

                    {/* GPA History */}
                    <motion.div variants={itemVariants}>
                        <GPAHistoryCard
                            semesterHistory={gpaHistory}
                            currentGPA={student.gpa}
                            gpax={student.gpax}
                        />
                    </motion.div>

                    {/* Course Grades */}
                    <motion.div variants={itemVariants}>
                        <CourseGradesCard
                            grades={courseGrades}
                            currentSemester={`${student.semester}/${student.academicYear}`}
                        />
                    </motion.div>
                </div>

                {/* Right Column - 1/3 */}
                <div className="space-y-8">
                    {/* Degree Progress */}
                    <motion.div variants={itemVariants}>
                        <DegreeProgressCard
                            totalCredits={student.totalCredits}
                            earnedCredits={student.earnedCredits}
                            registeredCredits={studentCourses.reduce((sum, c) => sum + c.credits, 0)}
                            requiredCredits={student.requiredCredits || student.totalCredits}
                        />
                    </motion.div>

                    {/* Technical Skills */}
                    <motion.div variants={itemVariants}>
                        <TechnicalSkillsCard
                            skills={student.skills}
                            activities={technicalActivities}
                        />
                    </motion.div>

                    {/* Soft Skills */}
                    <motion.div variants={itemVariants}>
                        <SoftSkillsCard
                            leadership={softSkillScores.leadership}
                            discipline={softSkillScores.discipline}
                            responsibility={softSkillScores.responsibility}
                            communication={softSkillScores.communication}
                            peerFeedbacks={peerFeedbacks}
                        />
                    </motion.div>
                </div>
            </div>
        </motion.div>
    );
}
