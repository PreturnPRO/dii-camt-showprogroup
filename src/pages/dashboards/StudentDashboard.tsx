import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  BookOpen, Calendar, Trophy, TrendingUp, Clock, Award,
  AlertCircle, CheckCircle2, GraduationCap, Target, Activity as ActivityIcon,
  Sparkles, Flame, Star, Zap, ChevronRight, Bell, ArrowUpRight,
  MoreHorizontal, User, Briefcase, UserCheck
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar as CalendarUI } from '@/components/ui/calendar';
import { Timetable } from '@/components/common/Timetable';
import { StudentTimeline } from '@/components/common/StudentTimeline';
import { DegreeProgressCard } from '@/components/dashboard/DegreeProgressCard';
import { CreditMatrixCard, type CurriculumCourse } from '@/components/dashboard/CreditMatrixCard';
import { GPAHistoryCard } from '@/components/dashboard/GPAHistoryCard';
import { CareerGoalCard } from '@/components/dashboard/CareerGoalCard';
import { TechnicalSkillsRubricCard } from '@/components/dashboard/TechnicalSkillsRubricCard';
import { SoftSkillsRubricCard } from '@/components/dashboard/SoftSkillsRubricCard';
import { SkillsRadarCard } from '@/components/dashboard/SkillsRadarCard';
import { CourseGradesCard } from '@/components/dashboard/CourseGradesCard';
import { CourseStatusRingCard } from '@/components/dashboard/CourseStatusRingCard';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapActivity, mapCourse, mapGrade, mapStudent, mapStudentStatsToStudent } from '@/lib/live-mappers';
import type { Activity, Course, Grade, Student } from '@/types';
import { EMPTY_STUDENT as emptyStudent } from '@/lib/constants/defaults';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 100 } },
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

  const mainAdvisorName = language === 'th'
    ? (student.advisorNameThai || (student.advisorName === 'Dr. Narin Techakul' ? 'ผศ.ดร. นรินทร์ พิชยกุล' : (student.advisorName || 'ผศ.ดร. นรินทร์ พิชยกุล')))
    : (student.advisorName || 'Asst. Prof. Dr. Narin Pichayakorn');

  const coAdvisorName = language === 'th'
    ? (student.coAdvisorNameThai || student.coAdvisorName || 'ดร. วิลเลียม สมิธ')
    : (student.coAdvisorName || 'Dr. William Smith');

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="w-full space-y-6 pb-12"
    >
      {/* Student Summary Header — Linear/Stripe Enterprise SaaS Identity Header */}
      <motion.div
        variants={itemVariants}
        className="w-full bg-white dark:bg-[#0c1222] rounded-2xl p-6 sm:p-7 border border-slate-200/80 dark:border-slate-800 shadow-sm transition-all duration-200"
      >
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-5 lg:gap-8">
          {/* Left + Center: Identity Section */}
          <div className="flex items-center gap-5 sm:gap-6 flex-1 min-w-0">
            {/* Student Avatar with Status Ring */}
            <motion.div whileHover={{ scale: 1.02 }} transition={{ duration: 0.15 }} className="relative shrink-0">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-b from-blue-500/20 to-indigo-500/20 dark:from-blue-500/30 dark:to-indigo-500/30 p-1 shadow-sm">
                <div className="w-full h-full rounded-[14px] bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex items-center justify-center overflow-hidden">
                  {student.avatar ? (
                    <img src={student.avatar} alt={student.name} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-400" />
                  )}
                </div>
              </div>
              <div className="absolute -bottom-1.5 -right-1.5 bg-slate-900 text-slate-100 dark:bg-slate-800 dark:text-blue-300 text-sm font-mono font-bold px-2.5 py-0.5 rounded-md border border-slate-700 shadow-sm leading-none">
                {yearLabel}
              </div>
            </motion.div>

            {/* Content: 3 Clean Horizontal Tiers */}
            <div className="flex-1 min-w-0 flex flex-col justify-center gap-2.5">
              {/* Row 1: Student Thai Name (Primary Hero) + English Name */}
              <div className="flex flex-wrap items-baseline gap-x-3.5 gap-y-1">
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {student.nameThai}
                </h1>
                <span className="text-base sm:text-lg font-semibold text-slate-500 dark:text-slate-400 font-mono tracking-wide">
                  {student.name}
                </span>
              </div>

              {/* Row 2: Metadata Badges on ONE Single Horizontal Row (All text >= text-sm) */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
                <span className="inline-flex items-center px-3 py-1 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 font-mono text-sm font-semibold border border-slate-200 dark:border-slate-700">
                  {student.studentId}
                </span>
                <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-mono text-sm font-bold border border-blue-200/60 dark:border-blue-800/50">
                  <span className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">GPAX</span>
                  {student.gpax.toFixed(2)}
                </span>
                <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                <span className="text-slate-700 dark:text-slate-200 text-sm font-medium truncate max-w-[260px] sm:max-w-none">
                  {student.major}
                </span>
                <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                <span className="text-slate-600 dark:text-slate-400 text-sm font-mono font-medium">
                  {t.studentDashboard.semester} {student.semester}/{student.academicYear}
                </span>
                <span className="text-slate-300 dark:text-slate-700 select-none">·</span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 font-mono text-sm font-bold border border-indigo-200/60 dark:border-indigo-800/50">
                  <span>{student.gamificationPoints}</span>
                  <span className="text-xs sm:text-sm font-semibold text-indigo-400">XP</span>
                </span>
              </div>

              {/* Row 3: Advisors (Compact modern chips) */}
              <div className="flex flex-wrap items-center gap-2.5 pt-0.5 text-sm">
                <div
                  onClick={() => navigate('/students')}
                  className="group cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-blue-50/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 transition-all duration-150"
                  title={language === 'th' ? 'คลิกเพื่อดูข้อมูลอาจารย์ที่ปรึกษา' : 'Click to view advisor details'}
                >
                  <GraduationCap className="w-4 h-4 text-blue-500 dark:text-blue-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    {language === 'th' ? 'อาจารย์ที่ปรึกษาหลัก:' : 'Main Advisor:'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {mainAdvisorName}
                  </span>
                </div>

                <div
                  onClick={() => navigate('/students')}
                  className="group cursor-pointer inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-50 hover:bg-indigo-50/80 dark:bg-slate-800/50 dark:hover:bg-slate-800 border border-slate-200/60 dark:border-slate-700/50 transition-all duration-150"
                  title={language === 'th' ? 'คลิกเพื่อดูข้อมูลอาจารย์ที่ปรึกษา' : 'Click to view advisor details'}
                >
                  <UserCheck className="w-4 h-4 text-indigo-500 dark:text-indigo-400 shrink-0" />
                  <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">
                    {language === 'th' ? 'อาจารย์ที่ปรึกษาร่วม:' : 'Co-Advisor:'}
                  </span>
                  <span className="font-bold text-slate-800 dark:text-slate-100 text-sm group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {coAdvisorName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col shrink-0">
            <CareerGoalCard />
            <Button
              onClick={() => navigate('/portfolio')}
              className="bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white shadow-sm shadow-blue-600/20 rounded-xl text-sm sm:text-base h-11 px-5 font-semibold transition-all duration-150 flex-1 sm:flex-initial justify-center"
            >
              <Trophy className="w-4 h-4 mr-2 text-blue-100" />
              {t.studentDashboard.viewPortfolio}
            </Button>
            <Button
              onClick={() => navigate('/settings')}
              variant="outline"
              className="rounded-xl text-sm sm:text-base h-11 px-5 border-slate-200 dark:border-slate-700/80 bg-slate-50/50 dark:bg-slate-800/40 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white transition-all duration-150 flex-1 sm:flex-initial justify-center font-semibold"
            >
              {t.studentDashboard.editProfile}
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Clean Linear-style Segmented Navigation Tabs */}
      <Tabs defaultValue="overview" className="space-y-5" onValueChange={setActiveTab}>
        <div className="border-b border-slate-200/70 dark:border-slate-800 pb-0">
          <TabsList className="bg-transparent border-none p-0 h-auto rounded-none flex flex-wrap gap-4 sm:gap-8">
            {[
              { id: 'overview', icon: Target, label: t.studentDashboard.overview || 'Overall' },
              { id: 'schedule', icon: Calendar, label: t.studentDashboard.schedule || 'Degree' },
              { id: 'grades', icon: TrendingUp, label: t.studentDashboard.grades || 'Upcoming' },
              { id: 'skills', icon: Zap, label: t.studentDashboard.skills || 'Skills' },
              { id: 'timeline', icon: ActivityIcon, label: 'Timeline' },
              { id: 'careers', icon: Briefcase, label: 'Company' },
            ].map((tab) => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="bg-transparent border-none px-3 py-2.5 pb-3.5 rounded-none data-[state=active]:bg-transparent data-[state=active]:text-blue-600 data-[state=active]:dark:text-blue-400 data-[state=active]:font-bold font-semibold text-sm sm:text-base text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 relative transition-colors duration-150 cursor-pointer"
              >
                <tab.icon className="w-4.5 h-4.5 mr-2 inline-block -mt-0.5" />
                <span>{tab.label}</span>
                {activeTab === tab.id && (
                  <motion.div
                    layoutId="activeStudentTab"
                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-blue-600 dark:bg-blue-400 rounded-full"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <AnimatePresence mode="wait">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <TabsContent value="overview" className="mt-0" key="overview" forceMount>
              <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_420px] gap-6 w-full">
                {/* Left Column — 2/3 (Takes available space, expands timetable) */}
                <div className="space-y-6 min-w-0">
                  {/* Weekly Schedule */}
                  <motion.div variants={itemVariants}>
                    <div className="bg-white dark:bg-slate-900/80 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800">
                      {/* Integrated Header at the top of the card */}
                      <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-100 dark:border-slate-800">
                        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-3 tracking-tight">
                          <Calendar className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                          {t.studentDashboard.weeklySchedule}
                        </h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate('/schedule')}
                          className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm sm:text-base h-9 px-3.5 font-medium transition-colors cursor-pointer"
                        >
                          {t.studentDashboard.fullscreen} <ChevronRight className="w-4 h-4 ml-1" />
                        </Button>
                      </div>
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
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => navigate('/courses')}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/courses'); } }}
                        className="flex items-center gap-3 cursor-pointer group/title select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded-lg p-1 -m-1"
                        title={t.studentDashboard.viewAll}
                      >
                        <BookOpen className="w-6 h-6 text-blue-600 dark:text-blue-400 group-hover/title:scale-110 transition-transform" />
                        <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight group-hover/title:text-blue-600 dark:group-hover/title:text-blue-400 transition-colors">
                          {t.studentDashboard.coursesThisSem}
                        </h3>
                      </div>
                      <Button variant="ghost" size="sm" className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 text-sm sm:text-base h-9 px-3.5 font-medium transition-colors" onClick={() => navigate('/courses')}>{t.studentDashboard.viewAll}</Button>
                    </div>

                    <div className="grid gap-3.5">
                      {currentCourses.length === 0 ? (
                        <div
                          role="button"
                          tabIndex={0}
                          onClick={() => navigate('/courses')}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate('/courses'); } }}
                          className="bg-white dark:bg-slate-900/80 border border-dashed border-slate-200 dark:border-slate-800 p-6 rounded-xl text-center cursor-pointer hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all"
                        >
                          <p className="text-slate-500 dark:text-slate-400 text-sm">{language === 'th' ? 'ยังไม่มีรายวิชาในเทอมนี้ คลิกเพื่อไปหน้าลงทะเบียน' : 'No courses this semester. Click to go to course registration.'}</p>
                        </div>
                      ) : (
                        currentCourses.slice(0, 3).map((course, index) => (
                          <motion.div
                            key={course.id}
                            initial={{ opacity: 0, x: -6 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            onClick={() => navigate('/courses')}
                            className="group bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-4 sm:p-5 rounded-xl shadow-xs hover:border-blue-300 dark:hover:border-blue-800 hover:shadow-md transition-all duration-200 cursor-pointer"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-base font-mono font-bold text-slate-800 dark:text-slate-200 border border-slate-200/70 dark:border-slate-700/60 group-hover:scale-105 transition-transform duration-150 shrink-0">
                                  {course.code?.substring(0, 3)}
                                </div>
                                <div>
                                  <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {course.nameThai}
                                  </h4>
                                  <div className="flex flex-wrap items-center gap-2.5 text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-1.5">
                                    <span className="font-mono font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-sm border border-slate-200/70 dark:border-slate-700/60">{course.code}</span>
                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                    <span className="font-medium">{course.credits} {t.studentDashboard.credits}</span>
                                    <span className="text-slate-300 dark:text-slate-700">•</span>
                                    <span className="flex items-center gap-1.5 font-medium"><GraduationCap className="w-4 h-4 text-slate-400" /> {course.lecturerName}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-900/30 transition-colors shrink-0">
                                <ChevronRight className="w-4.5 h-4.5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400" />
                              </div>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Right Column — Fixed 420px sidebar column on desktop */}
                <div className="space-y-6">
                  {/* Degree Progress */}
                  <motion.div variants={itemVariants}>
                    <DegreeProgressCard
                      totalCredits={student.totalCredits}
                      earnedCredits={student.earnedCredits}
                      registeredCredits={studentCourses.reduce((sum, c) => sum + c.credits, 0)}
                      requiredCredits={student.requiredCredits || student.totalCredits}
                    />
                  </motion.div>

                  {/* Course Status Ring */}
                  <motion.div variants={itemVariants}>
                    {(() => {
                      const completedCourses = liveCurriculumCourses.filter(c => c.status === 'completed');
                      const inProgressCourses = liveCurriculumCourses.filter(c => c.status === 'inProgress');
                      const remainingCourses = liveCurriculumCourses.filter(c => c.status === 'remaining');
                      // "Must register" = remaining courses that have no unmet prerequisites
                      const completedCodes = new Set(completedCourses.map(c => c.code));
                      const mustRegister = remainingCourses.filter(c =>
                        c.prerequisites.length === 0 || c.prerequisites.every(p => completedCodes.has(p))
                      );
                      const notRegistered = remainingCourses.filter(c =>
                        c.prerequisites.length > 0 && !c.prerequisites.every(p => completedCodes.has(p))
                      );
                      return (
                        <CourseStatusRingCard
                          completedCount={completedCourses.length}
                          inProgressCount={inProgressCourses.length}
                          registeredCount={mustRegister.length}
                          remainingCount={notRegistered.length}
                          completedCredits={completedCourses.reduce((s, c) => s + c.credits, 0)}
                          inProgressCredits={inProgressCourses.reduce((s, c) => s + c.credits, 0)}
                          registeredCredits={mustRegister.reduce((s, c) => s + c.credits, 0)}
                          remainingCredits={notRegistered.reduce((s, c) => s + c.credits, 0)}
                        />
                      );
                    })()}
                  </motion.div>

                  {/* Upcoming Events */}
                  <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-7 shadow-sm border border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center justify-between mb-5">
                      <h3 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-3">
                        <Calendar className="w-6 h-6 text-orange-500" />
                        {t.studentDashboard.upcomingActivities}
                      </h3>
                      <Badge variant="secondary" className="bg-orange-50 text-orange-600 hover:bg-orange-100 border-none text-xs sm:text-sm font-semibold px-3 py-1 rounded-full dark:bg-orange-900/20 dark:text-orange-400">ใน 1 เดือน</Badge>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/70 dark:border-slate-700/60 p-2 flex justify-center mb-5 overflow-hidden">
                      <CalendarUI
                        mode="single"
                        selected={new Date()}
                        className="bg-transparent border-0 scale-95 sm:scale-100 origin-top text-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="space-y-3">
                      {upcomingActivities.map((activity, i) => (
                        <div key={i} className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200/70 dark:border-slate-700/60 hover:border-orange-200 dark:hover:border-orange-800 transition-colors cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center text-orange-500 shrink-0">
                              <Calendar className="w-4.5 h-4.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base leading-snug line-clamp-2">{activity.titleThai}</h4>
                              <div className="flex items-center gap-2.5 mt-2">
                                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{new Date(activity.startDate).toLocaleDateString("th-TH", { day: "numeric", month: "short" })}</span>
                                <Badge variant="secondary" className="text-xs sm:text-sm font-mono font-semibold bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 h-6 px-2.5">+{activity.gamificationPoints} XP</Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      {upcomingActivities.length === 0 && (
                        <div className="text-center py-6 text-sm text-slate-400 font-medium">ไม่มีกิจกรรมเร็วๆนี้</div>
                      )}
                    </div>
                    <Button variant="outline" size="sm" className="w-full mt-4 rounded-xl border-dashed border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:text-orange-600 hover:border-orange-300 text-sm sm:text-base h-11 font-semibold" onClick={() => navigate("/activities")}>
                      {t.studentDashboard.viewCalendar}
                    </Button>
                  </motion.div>
                </div>
              </div>
            </TabsContent>
          )}

          {/* Schedule / Degree Tab */}
          {activeTab === 'schedule' && (
            <TabsContent value="schedule" className="mt-0" key="schedule" forceMount>
              <div className="space-y-6">
                <motion.div variants={itemVariants}>
                  <CreditMatrixCard
                    courses={liveCurriculumCourses}
                    categoryTotals={curriculumTotals}
                    gpax={student.gpax}
                  />
                </motion.div>
                <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800">
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
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div variants={itemVariants}>
                  <GPAHistoryCard
                    semesterHistory={semesterHistory}
                    currentGPA={student.gpa}
                    gpax={student.gpax}
                  />
                </motion.div>
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
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
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
              <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-sm border border-gray-100 dark:border-slate-800">
                <StudentTimeline events={timeline} showFilters />
              </motion.div>
            </TabsContent>
          )}

          {/* Careers / Company Tab */}
          {activeTab === 'careers' && (
            <TabsContent value="careers" className="mt-0" key="careers" forceMount>
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Company Targets & Requirements</h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">See what skills you need to develop to meet recruiter expectations.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.08 }}
                        className="group bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-start justify-between mb-5">
                            <div className="flex gap-3 items-center">
                              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md">
                                <Briefcase className="w-5 h-5" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-slate-800 dark:text-white group-hover:text-indigo-600 transition-colors">{company.name}</h3>
                                <span className="inline-flex px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-300 text-[10px] font-semibold uppercase tracking-wide">{company.role}</span>
                              </div>
                            </div>
                            {isAllMet ? (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Ready</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-xs font-semibold">
                                <AlertCircle className="w-3.5 h-3.5" />
                                <span>Gap</span>
                              </div>
                            )}
                          </div>
                          <div className="space-y-3 text-sm">
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl">
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">GPA Min</span>
                                <span className={`font-semibold ${isGpaMet ? 'text-emerald-600' : 'text-rose-500'}`}>
                                  {student.gpa.toFixed(2)} / {company.requirements.gpa.toFixed(2)}
                                </span>
                              </div>
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl space-y-1.5">
                              <span className="text-slate-500 text-xs">Technical Skills</span>
                              {[
                                { label: 'Functionality', score: technicalSkillScores.functionality, req: company.requirements.technicalSkills.functionality },
                                { label: 'Readability', score: technicalSkillScores.readability, req: company.requirements.technicalSkills.readability },
                                { label: 'Best Practices', score: technicalSkillScores.bestPractice, req: company.requirements.technicalSkills.bestPractice },
                              ].map(({ label, score, req }) => (
                                <div key={label} className="flex justify-between items-center">
                                  <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                  <span className={score >= req ? 'text-emerald-600' : 'text-rose-500'}>{score.toFixed(1)} / {req.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                            <div className="bg-gray-50 dark:bg-slate-800 p-3 rounded-xl space-y-1.5">
                              <span className="text-slate-500 text-xs">Soft Skills</span>
                              {[
                                { label: 'Communication', score: softSkillScores.communication, req: company.requirements.softSkills.communication },
                                { label: 'Openness', score: softSkillScores.openness, req: company.requirements.softSkills.openness },
                              ].map(({ label, score, req }) => (
                                <div key={label} className="flex justify-between items-center">
                                  <span className="text-slate-600 dark:text-slate-400">{label}</span>
                                  <span className={score >= req ? 'text-emerald-600' : 'text-rose-500'}>{score.toFixed(1)} / {req.toFixed(1)}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm h-9"
                            disabled={Boolean(company.applicationStatus)}
                            onClick={async () => {
                              if (company.applicationStatus) {
                                toast.info("Already submitted", {
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
                                toast.error("Unable to submit interest", {
                                  description: error instanceof Error ? error.message : "Please try again later.",
                                  duration: 3000,
                                });
                                return;
                              }
                              toast.success("Interest Expressed!", {
                                description: `HR at ${company.name} has been notified of your interest.`,
                                duration: 3000,
                              });
                            }}
                          >
                            <Trophy className="w-3.5 h-3.5 mr-1.5" />
                            {company.applicationStatus ? `Status: ${company.applicationStatus}` : "I'm Interested"}
                          </Button>
                        </div>
                      </motion.div>
                    );
                  })}
                  {companyTargets.length === 0 && (
                    <Card className="md:col-span-2 bg-white dark:bg-slate-900 border border-gray-100 dark:border-slate-800 rounded-2xl">
                      <CardContent className="p-8 text-center">
                        <Briefcase className="w-10 h-10 mx-auto text-slate-300 mb-3" />
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
