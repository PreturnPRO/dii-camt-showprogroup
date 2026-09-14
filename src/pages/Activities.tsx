import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Calendar, Users, CheckCircle, Clock, MapPin,
  Star, Award, Sparkles, Zap, Target, ArrowRight, Hourglass,
  ArrowUpRight, Flame, Lock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api, ApiError } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapActivity, mapStudentStatsToStudent } from '@/lib/live-mappers';
import { toast } from 'sonner';
import type { Activity, Student } from '@/types';

type ActivityRow = Activity;
type LeaderboardRow = { rank: number; name: string; points: number; badge: string };

const emptyStudent: Student = {
  id: '',
  email: '',
  name: '',
  nameThai: '',
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

const buildLeaderboard = (
  rawActivities: unknown[],
  currentUserName: string,
  currentPoints: number,
): LeaderboardRow[] => {
  const totals = new Map<string, { name: string; points: number }>();

  rawActivities.forEach((item) => {
    const activity = asRecord(item);
    const points = asNumber(activity.gamificationPoints, 0);

    asArray(activity.enrollments).forEach((enrollmentItem) => {
      const enrollment = asRecord(enrollmentItem);
      const student = asRecord(enrollment.student);
      const studentUser = asRecord(student.user);
      const id = asString(enrollment.studentId, asString(student.id, asString(studentUser.id)));
      const name = asString(studentUser.nameThai, asString(studentUser.name, "Student"));
      const status = asString(enrollment.status).toLowerCase();
      const earned = status === "completed" || status === "attended" ? points : Math.ceil(points / 2);

      if (!id) return;
      const current = totals.get(id) ?? { name, points: 0 };
      totals.set(id, { name: current.name, points: current.points + earned });
    });
  });

  if (currentUserName && !Array.from(totals.values()).some((item) => item.name === currentUserName)) {
    totals.set("current-user", { name: currentUserName, points: currentPoints });
  }

  return Array.from(totals.values())
    .sort((a, b) => b.points - a.points)
    .slice(0, 5)
    .map((item, index) => ({
      rank: index + 1,
      name: item.name,
      points: item.points,
      badge: index === 0 ? "Top" : "",
    }));
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

function CalendarView({ activities, isTH }: { activities: any[], isTH: boolean }) {
  const [currentDate, setCurrentDate] = React.useState(() => {
    const upcoming = activities.find((a: any) => a.status === 'upcoming');
    return upcoming ? new Date(upcoming.startDate) : new Date();
  });

  const getDaysInMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const getFirstDayOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1).getDay();

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));

  const monthNamesTH = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
  const monthNamesEN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNamesTH = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];
  const dayNamesEN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => i);
  const daysLabels = isTH ? dayNamesTH : dayNamesEN;
  
  const currentMonthName = isTH ? monthNamesTH[currentDate.getMonth()] : monthNamesEN[currentDate.getMonth()];
  const currentYear = currentDate.getFullYear() + (isTH ? 543 : 0);

  return (
    <div className="w-full flex flex-col pt-2 pb-6 px-1">
      <div className="flex justify-between items-center w-full mb-6 max-w-5xl mx-auto">
        <h3 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400">
          {currentMonthName} {currentYear}
        </h3>
        <div className="flex gap-2">
          <Button variant="outline" size="icon" onClick={prevMonth} className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900/50">
             &lt;
          </Button>
          <Button variant="outline" size="icon" onClick={nextMonth} className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900/50">
             &gt;
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-7 gap-2 sm:gap-3 lg:gap-4 w-full max-w-5xl mx-auto">
        {daysLabels.map(day => (
          <div key={day} className="text-center text-sm font-bold text-slate-400 uppercase tracking-wider pb-2">
            {day}
          </div>
        ))}
        {emptyDays.map(i => <div key={`empty-${i}`} />)}
        {days.map(day => {
          const cellDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
          const dateStr = cellDate.toDateString();
          const dayActivities = activities.filter((a: any) => new Date(a.startDate).toDateString() === dateStr);
          const isToday = cellDate.toDateString() === new Date().toDateString();
          
          return (
             <div
              key={day} 
              className={`min-h-[100px] flex flex-col border ${isToday ? 'border-blue-400 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-200/60 dark:border-slate-700/50 bg-white/40 dark:bg-slate-900/40'} backdrop-blur-xl rounded-2xl p-2 sm:p-3 overflow-hidden shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-300`}
            >
              <div className={`text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${isToday ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30' : 'text-slate-700 dark:text-slate-300'}`}>
                {day}
              </div>
              <div className="space-y-1.5 flex-1 w-full hide-scrollbar overflow-y-auto">
                {dayActivities.map((a: any, idx: number) => (
                  <div 
                    key={idx} 
                    className="text-[10px] sm:text-xs font-medium bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/60 dark:to-blue-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-800/60 px-1.5 py-1 rounded-md line-clamp-2 leading-tight shadow-sm hover:shadow-md transition-all cursor-pointer"
                    title={isTH ? a.titleThai || a.title : a.title}
                  >
                    {isTH ? a.titleThai || a.title : a.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Activities() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const isTH = language !== 'en';
  const [activeTab, setActiveTab] = React.useState('upcoming');
  const [activities, setActivities] = React.useState<ActivityRow[]>([]);
  const [student, setStudent] = React.useState<Student>(emptyStudent);
  const [selectedActivity, setSelectedActivity] = React.useState<ActivityRow | null>(null);
  const [selectedBadge, setSelectedBadge] = React.useState<number>(1);
  const [leaderboard, setLeaderboard] = React.useState<LeaderboardRow[]>([]);

  const upcomingActivities = activities.filter(a => a.status === 'upcoming');
  const historyActivities = activities.filter(a =>
    a.enrolledStudents.includes(student.id) ||
    a.attendedStudents.includes(student.id) ||
    new Date(a.endDate).getTime() < Date.now(),
  );
  const studentPoints = student.gamificationPoints;
  const studentHours = student.totalActivityHours;
  const badgesEarned = student.badges.length;
  const enrolledCount = activities.filter(a => a.enrolledStudents.includes(student.id)).length;

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.activities.list(),
      api.player.stats(),
    ]).then(([activitiesResult, statsResult]) => {
      if (!mounted) return;

      let nextStudent = emptyStudent;
      if (statsResult.status === 'fulfilled') {
        nextStudent = mapStudentStatsToStudent(emptyStudent, statsResult.value.stats);
        setStudent(nextStudent);
      }

      if (activitiesResult.status === 'fulfilled') {
        setActivities(activitiesResult.value.activities.map(mapActivity));
        setLeaderboard(buildLeaderboard(
          activitiesResult.value.activities,
          user?.nameThai || user?.name || nextStudent.nameThai,
          nextStudent.gamificationPoints,
        ));
      }
    }).catch((error) => {
      console.warn('Unable to load activities from API', error);
    });

    return () => {
      mounted = false;
    };
  }, [user?.name, user?.nameThai]);

  const refreshActivities = React.useCallback(async () => {
    const response = await api.activities.list();
    setActivities(response.activities.map(mapActivity));
    setLeaderboard(buildLeaderboard(
      response.activities,
      user?.nameThai || user?.name || student.nameThai,
      student.gamificationPoints,
    ));
  }, [student.gamificationPoints, student.nameThai, user?.name, user?.nameThai]);

  const handleEnroll = async (activityId: string) => {
    try {
      await api.activities.enroll(activityId);
      await refreshActivities();
      toast.success(t.activitiesPage.joinActivity);
    } catch (error) {
      console.warn('Unable to enroll activity', error);
      toast.error(error instanceof ApiError ? error.message : t.activitiesPage.details);
    }
  };


  if (user?.role !== 'student') {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Student view only
      </div>
    );
  }

  type StatCardProps = {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    subtext?: React.ReactNode;
    accentColor: string;
    iconBg: string;
    delay?: number;
    onClick?: () => void;
  };

  const StatCard = ({ icon: Icon, label, value, subtext, accentColor, iconBg, onClick }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      onClick={onClick}
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
          <div className={`p-2 rounded-xl ${iconBg} ${accentColor} border border-current/15`}>
            <Icon className="w-4 h-4" />
          </div>
        </div>
        <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">{value}</h3>
      </div>
      {subtext && <div className="mt-2.5">{subtext}</div>}
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header Section — Matching Refined SaaS Style */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5"
          >
            <Trophy className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            <span>{t.activitiesPage.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {t.activitiesPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-500 font-extrabold">{t.activitiesPage.titleHighlight}</span>
          </motion.h1>
        </div>
      </div>

      {/* Top Summary Cards — Height reduced by ~25%, restrained dark navy surfaces */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Points Card (Orange semantic) */}
        <StatCard
          icon={Trophy}
          label={t.activitiesPage.totalPoints}
          value={`${studentPoints} XP`}
          accentColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
          subtext={
            <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
              <Flame className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
              <span>Level 12 Explorer</span>
            </div>
          }
        />

        {/* Activity Hours (Orange/Green semantic) */}
        <StatCard
          icon={Clock}
          label={t.activitiesPage.activityHours}
          value={`${studentHours} ${t.activitiesPage.hours}`}
          accentColor="text-orange-600 dark:text-orange-400"
          iconBg="bg-orange-500/10"
          subtext={
            <div>
              <div className="flex justify-between text-[10.5px] font-mono text-slate-400 mb-1">
                <span>ความคืบหน้า</span>
                <span>{Math.min((studentHours / 100) * 100, 100).toFixed(0)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min((studentHours / 100) * 100, 100)}%` }}
                />
              </div>
            </div>
          }
        />

        {/* Badges Earned (Purple semantic) */}
        <StatCard
          icon={Star}
          label={t.activitiesPage.badgesEarned}
          value={badgesEarned}
          accentColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-500/10"
          subtext={<span className="text-purple-600 dark:text-purple-400/90 text-[11px] font-medium">{t.activitiesPage.unlockNext}</span>}
        />

        {/* Semester Goal (Green semantic) */}
        <StatCard
          icon={Target}
          label={t.activitiesPage.semesterGoal}
          value={`${Math.min(enrolledCount, 5)}/5`}
          accentColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
          subtext={
            <div>
              <div className="flex justify-between text-[10.5px] font-mono text-slate-400 mb-1">
                <span>สำเร็จแล้ว</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{Math.min(enrolledCount * 20, 100)}%</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(enrolledCount * 20, 100)}%` }}
                />
              </div>
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Left Column: Activity Feed (2/3) */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-5">
          <Tabs defaultValue="upcoming" onValueChange={setActiveTab} className="w-full space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.activitiesPage.activityList}</h2>
              {/* Compact Segmented Control (Not full width) */}
              <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
                <TabsTrigger
                  value="upcoming"
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                >
                  {t.activitiesPage.upcomingTab}
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                >
                  {isTH ? 'ปฏิทินกิจกรรม' : 'Calendar'}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-lg px-3.5 py-1.5 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
                >
                  {t.activitiesPage.historyTab}
                </TabsTrigger>
              </TabsList>
            </div>

            <AnimatePresence mode="wait">
              {activeTab === 'upcoming' && (
                <TabsContent value="upcoming" className="space-y-4 mt-0" key="upcoming" forceMount>
                  {upcomingActivities.map((activity, index) => (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -15 }}
                      transition={{ delay: index * 0.08 }}
                      onClick={() => setSelectedActivity(activity)}
                      className="group bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer overflow-hidden"
                    >
                      <div className="flex flex-col md:flex-row gap-4 sm:gap-5">
                        {/* Image: approximately 200-220px wide on desktop */}
                        <div className="relative shrink-0 w-full md:w-[210px] h-40 md:h-auto rounded-xl overflow-hidden bg-slate-900 shadow-inner">
                          <img
                            src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=400&h=300"
                            alt={activity.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute top-2.5 right-2.5 bg-slate-900/90 backdrop-blur-md px-2 py-0.5 rounded-lg text-xs font-mono font-bold text-amber-400 shadow-sm border border-slate-700/60 flex items-center gap-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{activity.gamificationPoints} XP</span>
                          </div>
                        </div>

                        {/* Content Area */}
                        <div className="flex-1 flex flex-col justify-between py-0.5">
                          <div>
                            {/* Tags */}
                            <div className="flex flex-wrap items-center gap-1.5 mb-2">
                              <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/50 text-[10.5px] font-medium rounded-md px-2 py-0.5">
                                {activity.type}
                              </Badge>
                              {index === 0 && (
                                <Badge className="bg-orange-500 hover:bg-orange-600 text-white border-0 text-[10.5px] font-semibold rounded-md px-2 py-0.5 shadow-xs">
                                  {t.activitiesPage.hotRecommended}
                                </Badge>
                              )}
                            </div>

                            {/* Title */}
                            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors mb-2 tracking-tight line-clamp-1">
                              {isTH ? activity.titleThai || activity.title : activity.title}
                            </h3>

                            {/* Metadata Strip */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 py-2 px-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 text-xs text-slate-600 dark:text-slate-300 font-mono mb-4">
                              <div className="flex items-center gap-1.5 truncate">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{new Date(activity.startDate).toLocaleDateString(isTH ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{activity.location}</span>
                              </div>
                              <div className="flex items-center gap-1.5 truncate">
                                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{activity.enrolledStudents.length}/{activity.maxParticipants || '-'} {t.activitiesPage.people}</span>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2.5 pt-1">
                            <Button
                              size="sm"
                              className="rounded-xl h-9 bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-semibold px-4 transition-all"
                              disabled={activity.enrolledStudents.includes(student.id)}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleEnroll(activity.id);
                              }}
                            >
                              {activity.enrolledStudents.includes(student.id) ? 'ลงทะเบียนแล้ว' : t.activitiesPage.joinActivity}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="rounded-xl h-9 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium px-3.5 transition-colors"
                              onClick={(event) => {
                                event.stopPropagation();
                                setSelectedActivity(activity);
                              }}
                            >
                              {t.activitiesPage.details}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {upcomingActivities.length === 0 && (
                    <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 p-10 text-center">
                      <Calendar className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีกิจกรรมที่เปิดรับ</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เมื่อ staff หรือ lecturer เพิ่มกิจกรรม ข้อมูลจะแสดงจาก backend ที่นี่</p>
                    </div>
                  )}
                </TabsContent>
              )}

              {activeTab === 'history' && (
                <TabsContent value="history" className="mt-0" key="history" forceMount>
                  <div className="space-y-4">
                    {historyActivities.map((activity) => (
                      <button
                        key={activity.id}
                        type="button"
                        onClick={() => setSelectedActivity(activity)}
                        className="w-full text-left bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl rounded-[2rem] p-5 border border-white/60 dark:border-slate-800/60 shadow-sm hover:shadow-lg transition-all"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <h3 className="font-bold text-slate-900 dark:text-white">{isTH ? activity.titleThai : activity.title}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{new Date(activity.startDate).toLocaleDateString('th-TH')} • {activity.activityHours} ชม.</p>
                          </div>
                          <Badge variant={activity.attendedStudents.includes(student.id) ? 'default' : 'secondary'}>
                            {activity.attendedStudents.includes(student.id) ? 'completed' : 'registered'}
                          </Badge>
                        </div>
                      </button>
                    ))}
                    {historyActivities.length === 0 && (
                      <div className="bg-white/40 backdrop-blur-xl rounded-[2rem] p-12 text-center text-slate-400 border border-dashed border-slate-300 dark:bg-slate-900/50">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-200 dark:border-slate-700">
                          <Hourglass className="w-10 h-10 opacity-30" />
                        </div>
                        <p className="text-lg font-medium">{t.activitiesPage.noHistory}</p>
                        <p className="text-sm">{t.activitiesPage.startCollecting}</p>
                      </div>
                    )}
                  </div>
                </TabsContent>
              )}

              {activeTab === 'calendar' && (
                <TabsContent value="calendar" className="mt-0" key="calendar" forceMount>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-[2rem] p-4 sm:p-6 shadow-sm dark:bg-slate-900/50"
                  >
                    <CalendarView activities={activities} isTH={isTH} />
                  </motion.div>
                </TabsContent>
              )}
            </AnimatePresence>
          </Tabs>
        </motion.div>

        {/* Right Column: Gamification & Leaderboard (1/3) */}
        <motion.div variants={itemVariants} className="space-y-5">
          {/* Leaderboard Card — Subtle secondary styling */}
          <div className="bg-white dark:bg-[#0c1222] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                <Trophy className="w-4 h-4 text-amber-500" />
                {t.activitiesPage.leaderboard}
              </h3>
              <Badge variant="outline" className="rounded-md border-slate-200 dark:border-slate-700 text-slate-400 text-[9.5px] uppercase tracking-wider font-mono">
                {t.activitiesPage.thisSemester}
              </Badge>
            </div>
            <div className="space-y-2.5">
              {leaderboard.map((user, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-all duration-150 ${
                    user.rank === 1
                      ? 'bg-amber-500/10 border border-amber-500/20'
                      : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold font-mono text-xs ${
                    user.rank === 1
                      ? 'bg-amber-500 text-white shadow-xs'
                      : user.rank === 2
                      ? 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                      : user.rank === 3
                      ? 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300'
                      : 'text-slate-400 font-normal'
                  }`}>
                    {user.rank}
                  </div>
                  <Avatar className="w-8 h-8 border border-slate-200/60 dark:border-slate-700/60 shadow-xs">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                    <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate flex items-center gap-1">
                      <span>{user.name}</span>
                      <span className="text-sm">{user.badge}</span>
                    </div>
                    <div className="text-[10.5px] font-mono text-slate-400">{user.points} XP</div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full mt-4 rounded-xl border-slate-200/80 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 h-8 text-xs font-medium"
            >
              {t.activitiesPage.viewAllRanks}
            </Button>
          </div>

          {/* Badges Collection Card — Distinct Unlocked vs Locked System */}
          <div className="relative overflow-hidden bg-white dark:bg-[#0c1222] rounded-2xl shadow-xs border border-slate-200/80 dark:border-slate-800 p-5 text-slate-900 dark:text-white">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white tracking-tight">
                  <Sparkles className="w-4 h-4 text-purple-500" />
                  {t.activitiesPage.badgesCollection}
                </h3>
                <div className="text-[10px] text-purple-600 dark:text-purple-400 font-bold tracking-wider uppercase font-mono px-2 py-0.5 rounded bg-purple-50 dark:bg-purple-950/50 border border-purple-200/50 dark:border-purple-800/50">
                  {badgesEarned} ปลดล็อกแล้ว
                </div>
              </div>

              {/* 4-Column Compact Badge Grid */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: 1, icon: '🚀', name: 'Early Bird', unlocked: true },
                  { id: 2, icon: '🎯', name: 'Goal Getter', unlocked: true },
                  { id: 3, icon: '💎', name: 'Pro Contributor', unlocked: true },
                  { id: 4, icon: '🏆', name: 'Activity Master', unlocked: false, progress: '6/10' },
                  { id: 5, icon: '⚡', name: 'Speed Star', unlocked: false },
                  { id: 6, icon: '🌟', name: 'Innovator', unlocked: false },
                  { id: 7, icon: '🛡️', name: 'Team Player', unlocked: false },
                  { id: 8, icon: '👑', name: 'Campus Legend', unlocked: false },
                ].map((b) => {
                  const isSelected = selectedBadge === b.id;

                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBadge(b.id)}
                      className={`relative aspect-square rounded-xl flex flex-col items-center justify-center transition-all duration-150 cursor-pointer select-none ${
                        b.unlocked
                          ? isSelected
                            ? 'bg-purple-50 dark:bg-purple-950/60 border-2 border-purple-500 dark:border-purple-400 shadow-xs'
                            : 'bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 hover:border-purple-300 dark:hover:border-purple-700'
                          : isSelected
                          ? 'bg-slate-100/70 dark:bg-slate-900 border-2 border-slate-400 dark:border-slate-500'
                          : 'bg-slate-50/50 dark:bg-slate-900/40 border border-dashed border-slate-200 dark:border-slate-800/80 opacity-60 hover:opacity-85'
                      }`}
                    >
                      {b.unlocked ? (
                        <div className="text-xl transition-transform duration-200 hover:scale-110">
                          {b.icon}
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <Lock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                          <span className="text-[9px] font-mono text-slate-400 dark:text-slate-500">{b.icon}</span>
                        </div>
                      )}

                      {/* Selected Small Accent Indicator */}
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-purple-500 dark:bg-purple-400 ring-2 ring-white dark:ring-slate-900" />
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Badge Progress Section */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800/80">
                <div className="flex justify-between items-baseline mb-1.5">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider font-mono mb-0.5">
                      {t.activitiesPage.nextBadge}
                    </p>
                    <p className="text-xs font-bold text-slate-800 dark:text-purple-200">
                      Activity Master
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold font-mono text-purple-600 dark:text-purple-400">
                      6 / 10 ครั้ง
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono ml-1.5">
                      (60%)
                    </span>
                  </div>
                </div>

                <Progress
                  value={60}
                  className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full"
                  indicatorClassName="bg-purple-600 dark:bg-purple-500 rounded-full"
                />

                <p className="text-[10.5px] text-slate-500 dark:text-slate-400 mt-2 text-center">
                  เข้าร่วมกิจกรรมให้ครบ 10 ครั้งเพื่อปลดล็อก
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
      <Dialog open={Boolean(selectedActivity)} onOpenChange={(open) => !open && setSelectedActivity(null)}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem]">
          {selectedActivity && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">{isTH ? selectedActivity.titleThai : selectedActivity.title}</DialogTitle>
                <DialogDescription>{selectedActivity.description}</DialogDescription>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <div className="text-slate-400 font-semibold mb-1">Date</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{new Date(selectedActivity.startDate).toLocaleString('th-TH')}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <div className="text-slate-400 font-semibold mb-1">Location</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{selectedActivity.location}</div>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <div className="text-slate-400 font-semibold mb-1">Reward</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{selectedActivity.gamificationPoints} XP / {selectedActivity.activityHours} ชม.</div>
                </div>
                <div className="rounded-2xl bg-slate-50 dark:bg-slate-900 p-4">
                  <div className="text-slate-400 font-semibold mb-1">Participants</div>
                  <div className="font-bold text-slate-800 dark:text-slate-100">{selectedActivity.enrolledStudents.length}/{selectedActivity.maxParticipants || '-'}</div>
                </div>
              </div>
              <div className="flex justify-end gap-3">
                {selectedActivity.enrolledStudents.includes(student.id) && selectedActivity.checkInEnabled && (
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        await api.activities.checkIn(selectedActivity.id);
                        await refreshActivities();
                        toast.success('เช็คอินสำเร็จ');
                        setSelectedActivity(null);
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : 'เช็คอินไม่สำเร็จ');
                      }
                    }}
                  >
                    Check in
                  </Button>
                )}
                <Button
                  disabled={selectedActivity.enrolledStudents.includes(student.id)}
                  onClick={async () => {
                    await handleEnroll(selectedActivity.id);
                    setSelectedActivity(null);
                  }}
                >
                  {selectedActivity.enrolledStudents.includes(student.id) ? 'ลงทะเบียนแล้ว' : t.activitiesPage.joinActivity}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
