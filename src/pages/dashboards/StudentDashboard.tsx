import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Calendar, Trophy, TrendingUp, Clock, Award,
  AlertCircle, CheckCircle2, GraduationCap, Target, Activity as ActivityIcon,
  Sparkles, Flame, Star, Zap, ChevronRight, Bell, ArrowUpRight,
  MoreHorizontal, User, Briefcase
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { WeeklyTimetable } from '@/components/common/WeeklyTimetable';
import { CoursesLoadError, RegisterCta } from '@/components/common/RegisterCta';
import { useWeekMoves } from '@/hooks/use-week-moves';
import { StudentTimeline } from '@/components/common/StudentTimeline';
import { DegreeProgressCard } from '@/components/dashboard/DegreeProgressCard';
import { CreditMatrixCard, type CurriculumCourse } from '@/components/dashboard/CreditMatrixCard';
import { GPAHistoryCard } from '@/components/dashboard/GPAHistoryCard';
import { CareerGoalCard } from '@/components/dashboard/CareerGoalCard';
import { CourseGradesCard } from '@/components/dashboard/CourseGradesCard';
import { api } from '@/lib/api';
import { studentEntries, type Term } from '@/lib/timetable';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapActivity, mapCourse, mapGrade, mapStudent, mapStudentStatsToStudent, mapTermGpaHistory } from '@/lib/live-mappers';
import type { Activity, Course, Grade, Student } from '@/types';
import { gradesForCard } from '@/lib/grade-cards';

// course cards are real links: open-in-new-tab and screen readers work (design.md §4.10)
const MotionLink = motion.create(Link);

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
};

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

// Transform grades for CourseGradesCard

type CompanyTarget = {
  id: string;
  jobId: string;
  name: string;
  role: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  applicationStatus?: string | null;
  // only what the posting actually states; gpa is null when the company gave none
  requirements: {
    gpa: number | null;
    skills: string[];
  };
};


const CURRICULUM_STATUSES: CurriculumCourse['status'][] = ['completed', 'failed', 'withdrawn', 'incomplete', 'inProgress', 'notGraded'];
const normalizeCurriculumStatus = (value: unknown): CurriculumCourse['status'] => {
  const status = asString(value, 'notGraded') as CurriculumCourse['status'];
  return CURRICULUM_STATUSES.includes(status) ? status : 'notGraded';
};

const mapCurriculumCourse = (value: unknown, index: number): CurriculumCourse => {
  const source = asRecord(value);
  return {
    id: asString(source.id, `curriculum-${index}`),
    code: asString(source.code, `COURSE-${index + 1}`),
    nameTH: asString(source.nameTH, asString(source.nameThai, asString(source.name, 'รายวิชา'))),
    nameEN: asString(source.nameEN, asString(source.name, 'Course')),
    credits: asNumber(source.credits, 0),
    year: asNumber(source.year, 0),
    semester: asNumber(source.semester, 0),
    status: normalizeCurriculumStatus(source.status),
    grade: asString(source.grade, ''),
  };
};

const mapCompanyTarget = (value: unknown, index: number): CompanyTarget => {
  const source = asRecord(value);
  const requirements = asRecord(source.requirements);
  return {
    id: asString(source.id, `target-${index}`),
    jobId: asString(source.jobId, asString(source.id, `target-${index}`)),
    name: asString(source.name, asString(source.companyName, 'Company')),
    role: asString(source.role, 'Role'),
    matchScore: asNumber(source.matchScore, 0),
    matchedSkills: asArray<string>(source.matchedSkills),
    missingSkills: asArray<string>(source.missingSkills),
    applicationStatus: asString(source.applicationStatus, ''),
    requirements: {
      gpa: requirements.gpa === null || requirements.gpa === undefined ? null : asNumber(requirements.gpa, 0),
      skills: asArray<string>(requirements.skills),
    },
  };
};

export default function StudentDashboard() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { weekStart: thisWeek, moves: weekMoves } = useWeekMoves();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [student, setStudent] = React.useState<Student>(emptyStudent);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [timeline, setTimeline] = React.useState<Student['timeline']>([]);
  const [inProgressCredits, setInProgressCredits] = React.useState<number | null>(null);
  const [enrollmentRows, setEnrollmentRows] = React.useState<unknown[]>([]);
  const [timetableTerm, setTimetableTerm] = React.useState<Term | null>(null);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [currentTermGpa, setCurrentTermGpa] = React.useState<number | null>(null);
  const [semesterHistory, setSemesterHistory] = React.useState<{ semester: string; gpa: number; credits: number }[]>([]);
  const [curriculumCourses, setCurriculumCourses] = React.useState<CurriculumCourse[]>([]);
  // credits against the whole curriculum; null until stats load (audit M1: no categories)
  const [curriculumCredits, setCurriculumCredits] = React.useState<{ required: number | null; completed: number | null; inProgress: number | null; registrar: number | null }>({ required: null, completed: null, inProgress: null, registrar: null });
  const [companyTargets, setCompanyTargets] = React.useState<CompanyTarget[]>([]);
  // only a loaded, empty course list earns the register call-to-action
  // the term filter needs the profile too, so both must have loaded
  const [coursesState, setCoursesState] = React.useState<'loading' | 'ok' | 'error'>('loading');

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.students.profile(),
      api.students.stats(),
      api.grades.transcript(),
      api.enrollments.list(),
      api.activities.list(),
      api.careerTargets.list(),
      api.enrollments.summary(),
    ]).then(([profileResult, statsResult, transcriptResult, enrollmentsResult, activitiesResult, targetsResult, summaryResult]) => {
      if (!mounted) return;
      setInProgressCredits(summaryResult.status === 'fulfilled' ? summaryResult.value.summary.inProgressCredits : null);
      setTimetableTerm(summaryResult.status === 'fulfilled'
        ? { semester: summaryResult.value.summary.semester, academicYear: summaryResult.value.summary.academicYear }
        : null);
      setEnrollmentRows(enrollmentsResult.status === 'fulfilled' ? enrollmentsResult.value.enrollments : []);

      let nextStudent = emptyStudent;
      if (profileResult.status === 'fulfilled') {
        nextStudent = mapStudent(profileResult.value.profile);
        setTimeline(asArray(asRecord(profileResult.value.profile).timeline) as typeof timeline);
      }
      if (statsResult.status === 'fulfilled') {
        nextStudent = mapStudentStatsToStudent(nextStudent, statsResult.value.stats);
        const stats = asRecord(statsResult.value.stats);
        // one point per graded term, oldest first, computed by the server (ungraded courses never count as 0)
        setSemesterHistory(mapTermGpaHistory(stats));
        setCurrentTermGpa(typeof stats.currentTermGpa === 'number' ? stats.currentTermGpa : null);
        const curriculumProgress = asRecord(stats.curriculumProgress);
        setCurriculumCredits({
          required: typeof curriculumProgress.requiredCredits === 'number' ? curriculumProgress.requiredCredits : null,
          completed: typeof curriculumProgress.completedCredits === 'number' ? curriculumProgress.completedCredits : null,
          inProgress: typeof curriculumProgress.inProgressCredits === 'number' ? curriculumProgress.inProgressCredits : null,
          registrar: typeof stats.earnedCredits === 'number' ? stats.earnedCredits : null,
        });
        const mappedCurriculum = asArray(curriculumProgress.courses).map(mapCurriculumCourse);
        setCurriculumCourses(mappedCurriculum);
      }
      setStudent(nextStudent);

      if (transcriptResult.status === 'fulfilled') {
        setGrades(transcriptResult.value.transcript.map(mapGrade));
      }
      if (enrollmentsResult.status === 'fulfilled') {
        setCourses(enrollmentsResult.value.enrollments.map((item, index) => {
          const enrollment = asRecord(item);
          const course = mapCourse(enrollment.course, index);
          return { ...course, enrolledStudents: [String(enrollment.studentId ?? nextStudent.id)] };
        }));
      }
      setCoursesState(enrollmentsResult.status === 'fulfilled' && profileResult.status === 'fulfilled' ? 'ok' : 'error');
      if (activitiesResult.status === 'fulfilled') {
        setActivities(activitiesResult.value.activities.map(mapActivity));
      }
      if (targetsResult.status === 'fulfilled') {
        setCompanyTargets(targetsResult.value.targets.map(mapCompanyTarget));
      }
    }).catch((error) => {
      console.warn('Unable to load student dashboard data from API', error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  const currentCourses = courses.filter(
    course => course.semester === student.semester &&
      course.academicYear === student.academicYear
  );

  const studentCourses = courses.filter(c => c.enrolledStudents.includes(student.id) || c.enrolledStudents.includes(student.studentId));
  const courseGrades = gradesForCard(grades, courses);
  
  const today = new Date();
  const nextMonth = new Date();
  nextMonth.setMonth(today.getMonth() + 1);
  
  const upcomingActivities = activities.filter(a => {
    if (a.status !== 'upcoming') return false;
    const actDate = new Date(a.startDate);
    return actDate >= today && actDate <= nextMonth;
  }).sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime()).slice(0, 3);


  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? t.studentDashboard.goodMorning : hour < 18 ? t.studentDashboard.goodAfternoon : t.studentDashboard.goodEvening;

  const yearLabel = ['', 'ปี 1', 'ปี 2', 'ปี 3', 'ปี 4'][student.year] || `ปี ${student.year}`;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Profile Header with Year */}
      <motion.div
        variants={itemVariants}
        className="bg-slate-900 relative overflow-hidden rounded-3xl p-8 text-white shadow-2xl"
      >

        <div className="relative z-10 flex flex-col lg:flex-row items-center gap-8">
          {/* Avatar */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative"
          >
            <div className="bg-blue-600 w-28 h-28 lg:w-32 lg:h-32 rounded-3xl p-1 shadow-xl">
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
            <h1 className="text-3xl lg:text-4xl font-bold mb-2 leading-snug">{student.nameThai}</h1>
            <p className="text-slate-400 mb-4">{student.name}</p>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-4 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <span>{student.major}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>{t.studentDashboard.semester} {student.semester}/{student.academicYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>{student.gamificationPoints} XP</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-4">
              <Badge className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:border-blue-500/30">
                {t.studentDashboard.studentId} {student.studentId}
              </Badge>
              <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/30">
                GPAX: {student.gpax.toFixed(2)}
              </Badge>
              {student.academicStatus === 'normal' && (
                <Badge className="bg-green-50 text-green-700 border-green-200 dark:bg-green-500/20 dark:text-green-300 dark:border-green-500/30">
                  {t.studentDashboard.statusNormal}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-3">
            <CareerGoalCard />
            <Button
              onClick={() => navigate('/portfolio')}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
            >
              <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
              {t.studentDashboard.viewPortfolio}
            </Button>
            <Button
              onClick={() => navigate('/settings')}
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white/10 rounded-xl"
            >
              {t.studentDashboard.editProfile}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
        <div className="flex justify-center md:justify-start">
          <TabsList className="bg-white dark:bg-slate-900 border border-white/40 p-1.5 h-auto rounded-2xl shadow-sm flex-wrap">
            {[
              { id: 'overview', icon: Target, label: t.studentDashboard.overview },
              { id: 'schedule', icon: Calendar, label: t.studentDashboard.schedule },
              { id: 'grades', icon: TrendingUp, label: t.studentDashboard.grades },
              { id: 'timeline', icon: ActivityIcon, label: 'Timeline' },
              { id: 'careers', icon: Briefcase, label: 'Company Targets' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-xl px-4 lg:px-6 py-2.5 data-[state=active]:bg-white dark:bg-slate-900 data-[state=active]:text-blue-600 data-[state=active]:shadow-lg transition-all duration-300 font-medium text-slate-600 dark:text-slate-400"
              >
                <tab.icon className="w-4 h-4 mr-2" />
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <TabsContent value="overview" className="mt-0" key="overview" forceMount>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column - 2/3 */}
                <div className="lg:col-span-2 space-y-8">
                  {/* Class Schedule */}
                  <motion.div variants={itemVariants}>
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-purple-500 dark:text-slate-400" />
                        {t.studentDashboard.weeklySchedule}
                      </h2>
                      <Button
                        variant="ghost"
                        onClick={() => navigate('/schedule')}
                        className="text-slate-500 dark:text-slate-400 hover:text-purple-600"
                      >
                        {t.studentDashboard.fullscreen} <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                    <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                      <WeeklyTimetable entries={studentEntries(enrollmentRows, timetableTerm)} term={timetableTerm} weekStart={thisWeek} moves={weekMoves} />
                    </div>
                  </motion.div>

                  {/* Current Courses */}
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200">
                        <button type="button" data-testid="dashboard-courses-title" onClick={() => navigate('/courses')} className="flex items-center gap-2 cursor-pointer rounded-lg hover:text-purple-700 dark:hover:text-purple-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500">
                          <BookOpen className="w-5 h-5 text-purple-500 dark:text-slate-400" /> {t.studentDashboard.coursesThisSem}
                        </button>
                      </h3>
                      <Button variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-purple-600" onClick={() => navigate('/courses')}>{t.studentDashboard.viewAll}</Button>
                    </div>

                    <div className="grid gap-4">
                      {coursesState === 'error' && <CoursesLoadError />}
                      {coursesState === 'ok' && currentCourses.length === 0 && <RegisterCta />}
                      {currentCourses.slice(0, 3).map((course, index) => (
                        <MotionLink
                          key={course.id}
                          to="/courses"
                          data-testid="dashboard-course"
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 block cursor-pointer overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-500"
                        >
                          <div className="bg-purple-50 dark:bg-purple-500/10 absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-5">
                              <div className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 shadow-md flex items-center justify-center text-lg font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-800 group-hover:scale-110 transition-transform">
                                {course.code?.substring(0, 3)}
                              </div>
                              <div>
                                <h4 className="text-lg font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 transition-colors">{course.nameThai}</h4>
                                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
                                  <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-800">{course.code}</span>
                                  <span>•</span>
                                  <span>{course.credits} {t.studentDashboard.credits}</span>
                                  <span>•</span>
                                  <span className="flex items-center gap-1"><GraduationCap className="w-3 h-3" /> {course.lecturerName}</span>
                                </div>
                              </div>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors dark:text-slate-300">
                              <ChevronRight className="w-5 h-5" />
                            </div>
                          </div>
                        </MotionLink>
                      ))}
                    </div>
                  </motion.div>
                </div>

                {/* Right Column - 1/3 */}
                <div className="space-y-8">
                  {/* Degree Progress */}
                  <motion.div variants={itemVariants}>
                    <DegreeProgressCard
                      totalCredits={student.totalCredits}
                      earnedCredits={student.earnedCredits}
                      registeredCredits={inProgressCredits}
                      requiredCredits={student.requiredCredits || student.totalCredits}
                    />
                  </motion.div>

                  {/* Upcoming Events */}
                  <motion.div variants={itemVariants} className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-orange-500 dark:text-slate-400" /> {t.studentDashboard.upcomingActivities}
                      </h3>
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100 shadow-sm border-orange-200 dark:text-slate-300">ใน 1 เดือน</Badge>
                    </div>

                                          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] p-0 sm:p-2 flex justify-center mb-6 overflow-hidden">
                         <CalendarUI 
                            mode="single"
                            selected={new Date()}
                            className="bg-transparent border-0 scale-90 sm:scale-100 origin-top text-slate-800 dark:text-slate-100"
                         />
                      </div>
  
                      <div className="flex overflow-x-auto snap-x snap-mandatory gap-4 pb-4 -mx-2 px-2 scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700">
                        {upcomingActivities.map((activity, i) => (
                          <div key={i} className="min-w-[240px] snap-center flex-shrink-0 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_10px_-2px_rgba(0,0,0,0.05)] hover:shadow-md transition-shadow cursor-pointer flex flex-col justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-2">
                                <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-500/10 flex items-center justify-center text-orange-500 dark:text-slate-400">
                                  <Calendar className="w-4 h-4" />
                                </div>
                                <div className="text-xs font-bold text-orange-500 dark:text-slate-400">{new Date(activity.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</div>
                              </div>
                              <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm mb-1 leading-tight line-clamp-2">{activity.titleThai}</h4>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Badge variant="secondary" className="text-[10px] bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300">+{activity.gamificationPoints} XP</Badge>
                              <Badge variant="outline" className="text-[10px] border-slate-200 dark:border-slate-700">{activity.activityHours} ชม.</Badge>
                            </div>
                          </div>
                        ))}
                        {upcomingActivities.length === 0 && (
                          <div className="text-center w-full py-4 text-sm text-slate-500 dark:text-slate-400">ไม่มีกิจกรรมเร็วๆนี้</div>
                        )}
                      </div>
                      <Button variant="outline" className="w-full mt-2 rounded-xl border-dashed border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:text-orange-600 hover:border-orange-300" onClick={() => navigate("/activities")}>
                        {t.studentDashboard.viewCalendar}
                      </Button>
                    </motion.div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Schedule Tab */}
          {activeTab === 'schedule' && (
            <TabsContent value="schedule" className="mt-0" key="schedule" forceMount>
              <div className="space-y-6">
                {/* Credit matrix table */}
                <motion.div variants={itemVariants}>
                  <CreditMatrixCard
                    courses={curriculumCourses}
                    requiredCredits={curriculumCredits.required}
                    completedCredits={curriculumCredits.completed}
                    inProgressCredits={curriculumCredits.inProgress}
                    registrarEarnedCredits={curriculumCredits.registrar}
                    gpax={student.gpax}
                  />
                </motion.div>

                {/* Weekly timetable */}
                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                  <WeeklyTimetable entries={studentEntries(enrollmentRows, timetableTerm)} term={timetableTerm} weekStart={thisWeek} moves={weekMoves} />
                </motion.div>
              </div>
            </TabsContent>
          )}

          {/* Grades Tab */}
          {activeTab === 'grades' && (
            <TabsContent value="grades" className="mt-0" key="grades" forceMount>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* GPA History */}
                <motion.div variants={itemVariants}>
                  <GPAHistoryCard
                    semesterHistory={semesterHistory}
                    currentGPA={currentTermGpa}
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
            </TabsContent>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <TabsContent value="timeline" className="mt-0" key="timeline" forceMount>
              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                <StudentTimeline events={timeline} showFilters />
              </motion.div>
            </TabsContent>
          )}

          {/* Careers Tab */}
          {activeTab === 'careers' && (
            <TabsContent value="careers" className="mt-0" key="careers" forceMount>
              <div className="grid gap-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 leading-snug">Company Targets & Requirements</h2>
                    <p className="text-slate-500 dark:text-slate-400">See what skills you need to develop to meet recruiter expectations.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {companyTargets.map((company, idx) => {
                    const requiredGpa = company.requirements.gpa;
                    const isGpaMet = requiredGpa === null || student.gpax >= requiredGpa;
                    const isAllMet = isGpaMet && company.missingSkills.length === 0;

                    return (
                      <motion.div
                          key={company.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group relative bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/50 rounded-3xl p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/40 flex flex-col justify-between overflow-hidden"
                        >
                          <div className="bg-blue-50 dark:bg-blue-500/10 absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg">
                                  <Briefcase className="w-6 h-6" />
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{company.name}</h3>
                                  <div className="inline-flex px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-semibold tracking-wide uppercase">
                                    {company.role}
                                  </div>
                                </div>
                              </div>
                              {isAllMet ? (
                                <div className="bg-emerald-600 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold shadow-md">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>Ready</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-700 text-xs font-semibold">
                                  <AlertCircle className="w-4 h-4" />
                                  <span>Skill Gap</span>
                                </div>
                              )}
                            </div>
                            <div className="space-y-4 text-sm mt-6">
                            {requiredGpa !== null && (
                              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between items-center mb-1">
                                  <span className="text-slate-600 dark:text-slate-400">GPA Minimum</span>
                                  <span className={`font-semibold ${isGpaMet ? 'text-emerald-600' : 'text-rose-500'}`}>
                                    {student.gpax.toFixed(2)} / {requiredGpa.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">
                                {language === 'th' ? 'ทักษะที่ประกาศต้องการ' : 'Skills in the posting'} ({company.matchedSkills.length}/{company.matchedSkills.length + company.missingSkills.length})
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {company.matchedSkills.map((skill) => (
                                  <span key={`m-${skill}`} className="px-2 py-0.5 rounded-full text-xs bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">✓ {skill}</span>
                                ))}
                                {company.missingSkills.map((skill) => (
                                  <span key={`x-${skill}`} className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300">{skill}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-6">
                          <Button
                            className="w-full bg-purple-600 hover:bg-purple-700 text-white rounded-xl"
                            disabled={Boolean(company.applicationStatus)}
                            onClick={async () => {
                              if (company.applicationStatus) {
                                toast({
                                  title: "Already submitted",
                                  description: `${company.name} already has your application status: ${company.applicationStatus}.`,
                                  duration: 3000,
                                });
                                return;
                              }
                              try {
                                await api.applications.create({ jobPostingId: company.jobId });
                                setCompanyTargets((current) => current.map((target) =>
                                  target.jobId === company.jobId ? { ...target, applicationStatus: 'pending' } : target,
                                ));
                              } catch (error) {
                                toast({
                                  title: "Unable to submit interest",
                                  description: error instanceof Error ? error.message : "Please try again later.",
                                  variant: "destructive",
                                  duration: 3000,
                                });
                                return;
                              }
                              toast({
                                title: "Interest Expressed!",
                                description: `HR at ${company.name} has been notified of your interest.`,
                                duration: 3000,
                              });
                            }}
                          >
                            <Trophy className="w-4 h-4 mr-2" />
                            {company.applicationStatus ? `Status: ${company.applicationStatus}` : "I'm Interested"}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {companyTargets.length === 0 && (
                    <Card className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-700/50 rounded-3xl">
                      <CardContent className="p-8 text-center">
                        <Briefcase className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                        <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มี Company Targets</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เมื่อบริษัทเปิดตำแหน่งงาน ระบบจะคำนวณ match และ skill gap จากข้อมูลจริงให้ทันที</p>
                        <Button className="mt-5 rounded-xl" onClick={() => navigate('/internships')}>
                          ดูตำแหน่งงานทั้งหมด
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>
          )}
        </AnimatePresence>
      </Tabs>
    </motion.div>
  );
}
