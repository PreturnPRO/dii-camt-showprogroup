import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy, Calendar, Users, CheckCircle, Clock, MapPin,
  Star, Award, Sparkles, Zap, Target, ArrowRight, Hourglass,
  ArrowUpRight, Flame
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
    gradient: string;
    delay?: number;
    onClick?: () => void;
  };

  const StatCard = ({ icon: Icon, label, value, subtext, gradient, onClick }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`relative overflow-hidden rounded-3xl p-6 cursor-pointer group shadow-lg hover:shadow-2xl transition-all duration-300 border border-white/20 ${gradient}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-white/20 transition-colors dark:bg-slate-900/50" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-sm border border-white/10 dark:bg-slate-900/50">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity dark:bg-slate-900/50">
            <ArrowUpRight className="w-4 h-4 text-white" />
          </div>
        </div>
        <div>
          <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
          {subtext && <div className="mt-2">{subtext}</div>}
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header Section - Matching Dashboard/Courses/Schedule Style */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
          >
            <Trophy className="w-4 h-4 text-amber-500" />
            <span>{t.activitiesPage.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {t.activitiesPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">{t.activitiesPage.titleHighlight}</span>
          </motion.h1>
        </div>
      </div>

      {/* Bento Grid Stats - Matching Dashboard Theme */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Trophy}
          label={t.activitiesPage.totalPoints}
          value={studentPoints}
          gradient="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500"
          subtext={
            <div className="flex items-center gap-1.5 text-xs text-orange-100 bg-orange-500/30 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
              <Flame className="w-3 h-3 fill-orange-100" />
              <span>Level 12 Explorer</span>
            </div>
          }
        />
        <StatCard
          icon={Clock}
          label={t.activitiesPage.activityHours}
          value={`${studentHours} ${t.activitiesPage.hours}`}
          gradient="bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
          subtext={
            <div className="h-1.5 w-full bg-black/20 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-white dark:bg-slate-900 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                style={{ width: `${Math.min((studentHours / 100) * 100, 100)}%` }}
              />
            </div>
          }
        />
        <StatCard
          icon={Star}
          label={t.activitiesPage.badgesEarned}
          value={badgesEarned}
          gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-600"
          subtext={<span className="text-blue-100 text-xs">{t.activitiesPage.unlockNext}</span>}
        />
        <StatCard
          icon={Target}
          label={t.activitiesPage.semesterGoal}
          value={`${Math.min(enrolledCount, 5)}/5`}
          gradient="bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500"
          subtext={<span className="text-purple-100 text-xs text-right block">{Math.min(enrolledCount * 20, 100)}% {t.activitiesPage.achieved}</span>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Activity Feed */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="upcoming" onValueChange={setActiveTab} className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">{t.activitiesPage.activityList}</h2>
              <TabsList className="bg-white/40 backdrop-blur-xl border border-white/40 p-1.5 h-auto rounded-2xl shadow-sm dark:bg-slate-900/50">
                <TabsTrigger
                  value="upcoming"
                  className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg shadow-blue-500/10 transition-all duration-300 font-medium text-slate-600 dark:text-slate-300 dark:bg-slate-900/50"
                >
                  {t.activitiesPage.upcomingTab}
                </TabsTrigger>
                <TabsTrigger
                  value="calendar"
                  className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg shadow-blue-500/10 transition-all duration-300 font-medium text-slate-600 dark:text-slate-300 dark:bg-slate-900/50"
                >
                  {isTH ? 'ปฏิทินกิจกรรม' : 'Calendar'}
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg shadow-blue-500/10 transition-all duration-300 font-medium text-slate-600 dark:text-slate-300 dark:bg-slate-900/50"
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
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ delay: index * 0.1 }}
                      onClick={() => setSelectedActivity(activity)}
                      className="group bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-[2rem] p-5 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden dark:bg-slate-900/50"
                    >
                      <div className="flex flex-col md:flex-row gap-6">
                        <div className="relative shrink-0 w-full md:w-52 h-36 md:h-auto rounded-2xl overflow-hidden shadow-md">
                          <img
                            src="https://images.unsplash.com/photo-1523580494863-6f3031224c94?auto=format&fit=crop&q=80&w=400&h=300"
                            alt="Activity cover"
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                          />
                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2.5 py-1 rounded-xl text-xs font-bold text-indigo-600 shadow-sm border border-white/50 dark:text-slate-300 dark:bg-slate-900/50">
                            {activity.gamificationPoints} XP
                          </div>
                        </div>
                        <div className="flex-1 flex flex-col justify-between py-1">
                          <div>
                            <div className="flex gap-2 mb-3">
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-0 rounded-lg px-2.5 dark:text-slate-300">{activity.type}</Badge>
                              {index === 0 && <Badge className="bg-orange-500 hover:bg-orange-600 border-0 rounded-lg px-2.5 shadow-lg shadow-orange-500/20">{t.activitiesPage.hotRecommended}</Badge>}
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors mb-2 tracking-tight">{activity.title}</h3>
                            <div className="flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400 font-medium">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4 text-slate-400" />
                                {new Date(activity.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <MapPin className="w-4 h-4 text-slate-400" />
                                {activity.location}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Users className="w-4 h-4 text-slate-400" />
                                {activity.enrolledStudents.length}/{activity.maxParticipants || '-'} {t.activitiesPage.people}
                              </div>
                            </div>
                          </div>
                          <div className="mt-6 flex gap-3">
                            <Button
                              className="rounded-xl h-11 bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 px-8 font-bold border border-slate-700"
                              disabled={activity.enrolledStudents.includes(student.id)}
                              onClick={(event) => {
                                event.stopPropagation();
                                void handleEnroll(activity.id);
                              }}
                            >
                              {activity.enrolledStudents.includes(student.id) ? 'ลงทะเบียนแล้ว' : t.activitiesPage.joinActivity}
                            </Button>
                            <Button
                              variant="ghost"
                              className="rounded-xl h-11 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 font-medium px-6 dark:bg-slate-800"
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

        {/* Right Column: Gamification & Leaderboard */}
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white/60 dark:border-slate-800/60 shadow-sm p-6 dark:bg-slate-900/50">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Trophy className="w-5 h-5 text-amber-500" />
                {t.activitiesPage.leaderboard}
              </h3>
              <Badge variant="outline" className="rounded-full border-slate-200 dark:border-slate-700 text-slate-400 text-[10px] uppercase tracking-wider">{t.activitiesPage.thisSemester}</Badge>
            </div>
            <div className="space-y-4">
              {leaderboard.map((user, idx) => (
                <div key={idx} className={`flex items-center gap-4 p-3.5 rounded-2xl transition-all duration-300 ${user.rank === 1 ? 'bg-amber-400/10 border border-amber-200/50 shadow-inner' : 'hover:bg-white/50'} dark:bg-slate-900/50`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${user.rank === 1 ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 ring-2 ring-white/50' :
                    user.rank === 2 ? 'bg-slate-300 text-slate-600' :
                      user.rank === 3 ? 'bg-orange-200 text-orange-700' :
                        'bg-slate-100 text-slate-400'
                    } dark:text-slate-400`}>
                    {user.rank}
                  </div>
                  <Avatar className="w-11 h-11 border-2 border-white shadow-md">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.name}`} />
                    <AvatarFallback>{user.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      {user.name} <span className="text-lg">{user.badge}</span>
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">{user.points} XP</div>
                  </div>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-8 rounded-xl border-dashed border-slate-300 text-slate-500 dark:text-slate-400 hover:text-indigo-600 hover:border-indigo-300 h-11 font-medium">{t.activitiesPage.viewAllRanks}</Button>
          </div>

          <div className="relative overflow-hidden bg-gradient-to-br from-indigo-900 via-slate-900 to-black rounded-[2rem] shadow-2xl p-7 text-white">
            <div className="absolute top-0 right-0 w-40 h-40 bg-purple-500/20 rounded-full blur-[60px]" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px]" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-purple-300" />
                  {t.activitiesPage.badgesCollection}
                </h3>
                <div className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{badgesEarned} Unlocked</div>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <div key={i} className="aspect-square rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/15 transition-all cursor-pointer group shadow-sm dark:bg-slate-900/50">
                    {i <= 3 ? (
                      <div className="text-2xl group-hover:scale-125 group-hover:rotate-12 transition-all duration-500">
                        {i === 1 ? '🚀' : i === 2 ? '🎯' : '💎'}
                      </div>
                    ) : (
                      <div className="w-2.5 h-2.5 rounded-full bg-white/20 group-hover:bg-white/40 transition-colors dark:bg-slate-900/50" />
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10">
                <div className="flex justify-between items-end mb-2">
                  <div>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">{t.activitiesPage.nextBadge}</p>
                    <p className="text-sm font-bold text-purple-200">Activity Master</p>
                  </div>
                  <div className="text-xs font-bold text-white">60%</div>
                </div>
                <Progress value={60} className="h-2 bg-white/10 dark:bg-slate-900/50" indicatorClassName="bg-gradient-to-r from-purple-400 to-indigo-400" />
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-2 text-center font-medium">{t.activitiesPage.joinToUnlock}</p>
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
