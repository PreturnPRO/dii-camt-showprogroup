import React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Timetable } from '@/components/common/Timetable';
import { StudentTimeline } from '@/components/common/StudentTimeline';
import { DegreeProgressCard } from '@/components/dashboard/DegreeProgressCard';
import { CreditMatrixCard, type CurriculumCourse } from '@/components/dashboard/CreditMatrixCard';
import { GPAHistoryCard } from '@/components/dashboard/GPAHistoryCard';
import { TechnicalSkillsRubricCard } from '@/components/dashboard/TechnicalSkillsRubricCard';
import { SoftSkillsRubricCard } from '@/components/dashboard/SoftSkillsRubricCard';
import { SkillsRadarCard } from '@/components/dashboard/SkillsRadarCard';
import { CourseGradesCard } from '@/components/dashboard/CourseGradesCard';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapActivity, mapCourse, mapGrade, mapStudent, mapStudentStatsToStudent } from '@/lib/live-mappers';
import type { Activity, Course, Grade, Student } from '@/types';

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

type TechnicalSkillScores = {
  functionality: number;
  readability: number;
  bestPractice: number;
  professorWeight: number;
  peerWeight: number;
  professorScore: number;
  peerScore: number;
  commentTags: {
    bug: number;
    suggestion: number;
    goodJob: number;
  };
};

type SoftSkillScores = {
  communication: number;
  openness: number;
  professorWeight: number;
  peerWeight: number;
  professorScore: number;
  peerScore: number;
  feedbackHistory: {
    projectName: string;
    date: string;
    communicationScore: number;
    opennessScore: number;
    comments: number;
  }[];
};

type CompanyTarget = {
  id: string;
  jobId: string;
  name: string;
  role: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  applicationStatus?: string | null;
  requirements: {
    gpa: number;
    technicalSkills: {
      functionality: number;
      readability: number;
      bestPractice: number;
    };
    softSkills: {
      communication: number;
      openness: number;
    };
  };
};

const emptyTechnicalSkillScores: TechnicalSkillScores = {
  functionality: 0,
  readability: 0,
  bestPractice: 0,
  professorWeight: 60,
  peerWeight: 40,
  professorScore: 0,
  peerScore: 0,
  commentTags: { bug: 0, suggestion: 0, goodJob: 0 },
};

const emptySoftSkillScores: SoftSkillScores = {
  communication: 0,
  openness: 0,
  professorWeight: 60,
  peerWeight: 40,
  professorScore: 0,
  peerScore: 0,
  feedbackHistory: [],
};

const levelScore = (level: string) => {
  switch (level) {
    case 'expert':
      return 4.8;
    case 'advanced':
      return 4.2;
    case 'intermediate':
      return 3.3;
    case 'beginner':
      return 2.4;
    default:
      return 3;
  }
};

const averageScore = (values: number[], fallback = 3) => {
  const clean = values.filter(Number.isFinite);
  return clean.length ? clean.reduce((sum, value) => sum + value, 0) / clean.length : fallback;
};

const deriveTechnicalScores = (sourceStudent: Student): TechnicalSkillScores => {
  const technicalSkills = sourceStudent.skills.filter((skill) => skill.category !== 'soft_skill');
  const score = averageScore(technicalSkills.map((skill) => levelScore(skill.level)));
  return {
    functionality: score,
    readability: Math.max(0, score - 0.2),
    bestPractice: score,
    professorWeight: 60,
    peerWeight: 40,
    professorScore: score,
    peerScore: score,
    commentTags: { bug: 0, suggestion: 0, goodJob: 0 },
  };
};

const deriveSoftScores = (sourceStudent: Student): SoftSkillScores => {
  const softSkills = sourceStudent.skills.filter((skill) => skill.category === 'soft_skill');
  const score = averageScore(softSkills.map((skill) => levelScore(skill.level)), 3);
  return {
    communication: score,
    openness: score,
    professorWeight: 60,
    peerWeight: 40,
    professorScore: score,
    peerScore: score,
    feedbackHistory: [],
  };
};

const normalizeCurriculumCategory = (value: unknown): CurriculumCourse['category'] => {
  const category = asString(value, 'required');
  return category === 'ge' || category === 'free' ? category : 'required';
};

const normalizeCurriculumStatus = (value: unknown): CurriculumCourse['status'] => {
  const status = asString(value, 'remaining');
  return status === 'completed' || status === 'inProgress' ? status : 'remaining';
};

const mapCurriculumCourse = (value: unknown, index: number): CurriculumCourse => {
  const source = asRecord(value);
  return {
    id: asString(source.id, `curriculum-${index}`),
    code: asString(source.code, `COURSE-${index + 1}`),
    nameTH: asString(source.nameTH, asString(source.nameThai, asString(source.name, 'รายวิชา'))),
    nameEN: asString(source.nameEN, asString(source.name, 'Course')),
    credits: asNumber(source.credits, 3),
    year: asNumber(source.year, 1),
    semester: asNumber(source.semester, 1),
    category: normalizeCurriculumCategory(source.category),
    status: normalizeCurriculumStatus(source.status),
    grade: asString(source.grade, ''),
    prerequisites: asArray<string>(source.prerequisites),
    description: asString(source.description, ''),
  };
};

const mapCompanyTarget = (value: unknown, index: number): CompanyTarget => {
  const source = asRecord(value);
  const requirements = asRecord(source.requirements);
  const technical = asRecord(requirements.technicalSkills);
  const soft = asRecord(requirements.softSkills);
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
      gpa: asNumber(requirements.gpa, 3),
      technicalSkills: {
        functionality: asNumber(technical.functionality, 3),
        readability: asNumber(technical.readability, 3),
        bestPractice: asNumber(technical.bestPractice, 3),
      },
      softSkills: {
        communication: asNumber(soft.communication, 3),
        openness: asNumber(soft.openness, 3),
      },
    },
  };
};

export default function StudentDashboard() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [student, setStudent] = React.useState<Student>(emptyStudent);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [timeline, setTimeline] = React.useState<Student['timeline']>([]);
  const [grades, setGrades] = React.useState<Grade[]>([]);
  const [semesterHistory, setSemesterHistory] = React.useState<{ semester: string; gpa: number; credits: number }[]>([]);
  const [curriculumCourses, setCurriculumCourses] = React.useState<CurriculumCourse[]>([]);
  const [curriculumTotals, setCurriculumTotals] = React.useState({ required: 0, ge: 0, free: 0 });
  const [technicalSkillScores, setTechnicalSkillScores] = React.useState<TechnicalSkillScores>(emptyTechnicalSkillScores);
  const [softSkillScores, setSoftSkillScores] = React.useState<SoftSkillScores>(emptySoftSkillScores);
  const [companyTargets, setCompanyTargets] = React.useState<CompanyTarget[]>([]);

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.students.profile(),
      api.students.stats(),
      api.grades.transcript(),
      api.enrollments.list(),
      api.activities.list(),
      api.careerTargets.list(),
    ]).then(([profileResult, statsResult, transcriptResult, enrollmentsResult, activitiesResult, targetsResult]) => {
      if (!mounted) return;

      let nextStudent = emptyStudent;
      if (profileResult.status === 'fulfilled') {
        nextStudent = mapStudent(profileResult.value.profile);
        setTimeline(asArray(asRecord(profileResult.value.profile).timeline) as typeof timeline);
      }
      if (statsResult.status === 'fulfilled') {
        nextStudent = mapStudentStatsToStudent(nextStudent, statsResult.value.stats);
        const stats = asRecord(statsResult.value.stats);
        const gradeHistory = asArray(stats.gradeHistory);
        const bySemester = new Map<string, { credits: number; points: number }>();
        gradeHistory.forEach((item) => {
          const row = asRecord(item);
          const key = `${row.semester}/${row.academicYear}`;
          const current = bySemester.get(key) ?? { credits: 0, points: 0 };
          const credits = asNumber(row.credits, 3);
          const letter = String(row.letterGrade ?? '');
          const point = letter === 'A' ? 4 : letter === 'B+' ? 3.5 : letter === 'B' ? 3 : letter === 'C+' ? 2.5 : letter === 'C' ? 2 : letter === 'D+' ? 1.5 : letter === 'D' ? 1 : 0;
          current.credits += credits;
          current.points += point * credits;
          bySemester.set(key, current);
        });
        if (bySemester.size > 0) {
          setSemesterHistory(Array.from(bySemester.entries()).map(([semester, value]) => ({
            semester,
            gpa: value.credits ? value.points / value.credits : 0,
            credits: value.credits,
          })));
        }
        const skillSummary = asRecord(stats.skillSummary);
        const technical = asRecord(skillSummary.technical);
        const commentTags = asRecord(technical.commentTags);
        setTechnicalSkillScores((current) => ({
          functionality: asNumber(technical.functionality, current.functionality),
          readability: asNumber(technical.readability, current.readability),
          bestPractice: asNumber(technical.bestPractice, current.bestPractice),
          professorWeight: asNumber(technical.professorWeight, current.professorWeight),
          peerWeight: asNumber(technical.peerWeight, current.peerWeight),
          professorScore: asNumber(technical.professorScore, current.professorScore),
          peerScore: asNumber(technical.peerScore, current.peerScore),
          commentTags: {
            bug: asNumber(commentTags.bug, current.commentTags.bug),
            suggestion: asNumber(commentTags.suggestion, current.commentTags.suggestion),
            goodJob: asNumber(commentTags.goodJob, current.commentTags.goodJob),
          },
        }));

        const soft = asRecord(skillSummary.soft);
        setSoftSkillScores((current) => ({
          communication: asNumber(soft.communication, current.communication),
          openness: asNumber(soft.openness, current.openness),
          professorWeight: asNumber(soft.professorWeight, current.professorWeight),
          peerWeight: asNumber(soft.peerWeight, current.peerWeight),
          professorScore: asNumber(soft.professorScore, current.professorScore),
          peerScore: asNumber(soft.peerScore, current.peerScore),
          feedbackHistory: asArray(soft.feedbackHistory).map((item, index) => {
            const feedback = asRecord(item);
            return {
              projectName: asString(feedback.projectName, `Feedback ${index + 1}`),
              date: feedback.date ? new Date(String(feedback.date)).toLocaleDateString('th-TH') : '',
              communicationScore: asNumber(feedback.communicationScore, current.communication),
              opennessScore: asNumber(feedback.opennessScore, current.openness),
              comments: asNumber(feedback.comments, 0),
            };
          }),
        }));

        const curriculumProgress = asRecord(stats.curriculumProgress);
        const totals = asRecord(curriculumProgress.categoryTotals);
        setCurriculumTotals({
          required: asNumber(totals.required, nextStudent.requiredCredits),
          ge: asNumber(totals.ge, 0),
          free: asNumber(totals.free, 0),
        });
        const mappedCurriculum = asArray(curriculumProgress.courses).map(mapCurriculumCourse);
        if (mappedCurriculum.length) {
          setCurriculumCourses(mappedCurriculum);
        }
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
  const courseGrades = transformGradesForCard(grades, courses);
  const liveCurriculumCourses = curriculumCourses.length
    ? curriculumCourses
    : courses.map((course, index) => {
      const grade = grades.find((item) => item.courseId === course.id);
      return mapCurriculumCourse({
        id: course.id,
        code: course.code,
        nameTH: course.nameThai,
        nameEN: course.name,
        credits: course.credits,
        year: course.year,
        semester: course.semester,
        category: course.code.toUpperCase().startsWith('GE') ? 'ge' : course.code.toUpperCase().startsWith('FREE') ? 'free' : 'required',
        status: grade?.letterGrade ? 'completed' : 'inProgress',
        grade: grade?.letterGrade,
        prerequisites: course.prerequisites,
        description: course.description,
      }, index);
    });

  const creditProgress = (student.earnedCredits / student.totalCredits) * 100;
  
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
            <div className="w-28 h-28 lg:w-32 lg:h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 p-1 shadow-xl shadow-blue-500/30">
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
                <span>{t.studentDashboard.semester} {student.semester}/{student.academicYear}</span>
              </div>
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-yellow-400" />
                <span>{student.gamificationPoints} XP</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mt-4">
              <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30">
                {t.studentDashboard.studentId} {student.studentId}
              </Badge>
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30">
                GPAX: {student.gpax.toFixed(2)}
              </Badge>
              {student.academicStatus === 'normal' && (
                <Badge className="bg-green-500/20 text-green-300 border-green-500/30">
                  {t.studentDashboard.statusNormal}
                </Badge>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={() => navigate('/portfolio')}
              className="bg-white dark:bg-slate-900/10 hover:bg-white dark:bg-slate-900/20 text-white border border-white/20 rounded-xl"
            >
              <Trophy className="w-4 h-4 mr-2 text-yellow-500" />
              {t.studentDashboard.viewPortfolio}
            </Button>
            <Button
              onClick={() => navigate('/settings')}
              variant="ghost"
              className="text-slate-300 hover:text-white hover:bg-white dark:bg-slate-900/10 rounded-xl"
            >
              {t.studentDashboard.editProfile}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-8" onValueChange={setActiveTab}>
        <div className="flex justify-center md:justify-start">
          <TabsList className="bg-white dark:bg-slate-900/40 backdrop-blur-xl border border-white/40 p-1.5 h-auto rounded-2xl shadow-sm flex-wrap">
            {[
              { id: 'overview', icon: Target, label: t.studentDashboard.overview },
              { id: 'schedule', icon: Calendar, label: t.studentDashboard.schedule },
              { id: 'grades', icon: TrendingUp, label: t.studentDashboard.grades },
              { id: 'skills', icon: Zap, label: t.studentDashboard.skills },
              { id: 'timeline', icon: ActivityIcon, label: 'Timeline' },
              { id: 'careers', icon: Briefcase, label: 'Company Targets' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="rounded-xl px-4 lg:px-6 py-2.5 data-[state=active]:bg-white dark:bg-slate-900 data-[state=active]:text-blue-600 data-[state=active]:shadow-lg shadow-blue-500/10 transition-all duration-300 font-medium text-slate-600 dark:text-slate-400"
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
                    <div className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                      <Timetable
                        courses={studentCourses}
                        semester={student.semester}
                        academicYear={student.academicYear}
                      />
                    </div>
                  </motion.div>

                  {/* Current Courses */}
                  <motion.div variants={itemVariants} className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500 dark:text-slate-400" /> {t.studentDashboard.coursesThisSem}
                      </h3>
                      <Button variant="ghost" className="text-slate-500 dark:text-slate-400 hover:text-purple-600" onClick={() => navigate('/courses')}>{t.studentDashboard.viewAll}</Button>
                    </div>

                    <div className="grid gap-4">
                      {currentCourses.slice(0, 3).map((course, index) => (
                        <motion.div
                          key={course.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="group relative bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 p-5 rounded-2xl shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
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
                        </motion.div>
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
                      registeredCredits={studentCourses.reduce((sum, c) => sum + c.credits, 0)}
                      requiredCredits={student.requiredCredits || student.totalCredits}
                    />
                  </motion.div>

                  {/* Upcoming Events */}
                  <motion.div variants={itemVariants} className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
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
                    courses={liveCurriculumCourses}
                    categoryTotals={curriculumTotals}
                    gpax={student.gpax}
                  />
                </motion.div>

                {/* Weekly timetable */}
                <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
                  <Timetable
                    courses={studentCourses}
                    semester={student.semester}
                    academicYear={student.academicYear}
                  />
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
            </TabsContent>
          )}

          {/* Skills Tab */}
          {activeTab === 'skills' && (
            <TabsContent value="skills" className="mt-0" key="skills" forceMount>
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* Technical Skills - Rubric Based */}
                <motion.div variants={itemVariants}>
                  <TechnicalSkillsRubricCard
                    functionality={technicalSkillScores.functionality}
                    readability={technicalSkillScores.readability}
                    bestPractice={technicalSkillScores.bestPractice}
                    professorWeight={technicalSkillScores.professorWeight}
                    peerWeight={technicalSkillScores.peerWeight}
                    professorScore={technicalSkillScores.professorScore}
                    peerScore={technicalSkillScores.peerScore}
                    commentTags={technicalSkillScores.commentTags}
                  />
                </motion.div>

                {/* Soft Skills - AAC&U Value Rubrics Based */}
                <motion.div variants={itemVariants}>
                  <SoftSkillsRubricCard
                    communication={softSkillScores.communication}
                    openness={softSkillScores.openness}
                    professorWeight={softSkillScores.professorWeight}
                    peerWeight={softSkillScores.peerWeight}
                    professorScore={softSkillScores.professorScore}
                    peerScore={softSkillScores.peerScore}
                    feedbackHistory={softSkillScores.feedbackHistory}
                  />
                </motion.div>

                {/* Skills Radar Chart */}
                <motion.div variants={itemVariants}>
                  <SkillsRadarCard
                    technicalSkills={{
                      functionality: technicalSkillScores.functionality,
                      readability: technicalSkillScores.readability,
                      bestPractice: technicalSkillScores.bestPractice,
                    }}
                    softSkills={{
                      communication: softSkillScores.communication,
                      openness: softSkillScores.openness,
                    }}
                  />
                </motion.div>
              </div>
            </TabsContent>
          )}

          {/* Timeline Tab */}
          {activeTab === 'timeline' && (
            <TabsContent value="timeline" className="mt-0" key="timeline" forceMount>
              <motion.div variants={itemVariants} className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm">
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
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Company Targets & Requirements</h2>
                    <p className="text-slate-500 dark:text-slate-400">See what skills you need to develop to meet recruiter expectations.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {companyTargets.map((company, idx) => {
                    const isGpaMet = student.gpa >= company.requirements.gpa;
                    const isTechMet = (
                      technicalSkillScores.functionality >= company.requirements.technicalSkills.functionality &&
                      technicalSkillScores.readability >= company.requirements.technicalSkills.readability &&
                      technicalSkillScores.bestPractice >= company.requirements.technicalSkills.bestPractice
                    );
                    const isSoftMet = (
                      softSkillScores.communication >= company.requirements.softSkills.communication &&
                      softSkillScores.openness >= company.requirements.softSkills.openness
                    );
                    const isAllMet = isGpaMet && isTechMet && isSoftMet;

                    return (
                      <motion.div
                          key={company.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.1 }}
                          className="group relative bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/60 dark:border-slate-700/50 rounded-3xl p-8 shadow-xl shadow-slate-200/20 dark:shadow-black/40 flex flex-col justify-between overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 dark:from-blue-900/10 dark:to-purple-900/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-3xl" />
                          <div className="relative z-10">
                            <div className="flex items-start justify-between mb-6">
                              <div className="flex gap-4 items-center">
                                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
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
                                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 text-white text-xs font-bold shadow-md shadow-emerald-500/20">
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
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-slate-600 dark:text-slate-400">GPA Minimum</span>
                                <span className={`font-semibold ${isGpaMet ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {student.gpa.toFixed(2)} / {company.requirements.gpa.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">Technical Skills Required</span>
                              <div className="flex justify-between items-center">
                                <span>Functionality</span>
                                <span className={technicalSkillScores.functionality >= company.requirements.technicalSkills.functionality ? 'text-emerald-600' : 'text-rose-500'}>
                                  {technicalSkillScores.functionality.toFixed(1)} / {company.requirements.technicalSkills.functionality.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Readability</span>
                                <span className={technicalSkillScores.readability >= company.requirements.technicalSkills.readability ? 'text-emerald-600' : 'text-rose-500'}>
                                  {technicalSkillScores.readability.toFixed(1)} / {company.requirements.technicalSkills.readability.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Best Practices</span>
                                <span className={technicalSkillScores.bestPractice >= company.requirements.technicalSkills.bestPractice ? 'text-emerald-600' : 'text-rose-500'}>
                                  {technicalSkillScores.bestPractice.toFixed(1)} / {company.requirements.technicalSkills.bestPractice.toFixed(1)}
                                </span>
                              </div>
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                              <span className="text-slate-600 dark:text-slate-400 block mb-1">Soft Skills Required</span>
                              <div className="flex justify-between items-center">
                                <span>Communication</span>
                                <span className={softSkillScores.communication >= company.requirements.softSkills.communication ? 'text-emerald-600' : 'text-rose-500'}>
                                  {softSkillScores.communication.toFixed(1)} / {company.requirements.softSkills.communication.toFixed(1)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span>Openness to Feedback</span>
                                <span className={softSkillScores.openness >= company.requirements.softSkills.openness ? 'text-emerald-600' : 'text-rose-500'}>
                                  {softSkillScores.openness.toFixed(1)} / {company.requirements.softSkills.openness.toFixed(1)}
                                </span>
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
                    <Card className="md:col-span-2 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-700/50 rounded-3xl">
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
