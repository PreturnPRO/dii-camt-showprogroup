import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  TrendingUp,
  Award,
  Download,
  BarChart3,
  PieChart,
  FileText,
  GraduationCap,
  BookOpen,
  Target,
  Star,
  Sparkles,
  ChevronRight,
  Share2,
  Printer,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asRecord } from '@/lib/live-data';
import { mapCourse, mapGrade, mapStudent, mapStudentStatsToStudent, mapTermGpaHistory } from '@/lib/live-mappers';
import type { Course, Grade, Student } from '@/types';
import { EMPTY_STUDENT as emptyStudent } from '@/lib/constants/defaults';

const gradePoint = (grade?: string) => {
  switch (grade) {
    case 'A': return 4;
    case 'B+': return 3.5;
    case 'B': return 3;
    case 'C+': return 2.5;
    case 'C': return 2;
    case 'D+': return 1.5;
    case 'D': return 1;
    default: return 0;
  }
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function StudentGradesView() {
  const { t, language } = useLanguage();
  const [student, setStudent] = useState<Student>(emptyStudent);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // from the server: GPA of the current term (null = nothing graded yet) and one entry per graded term
  const [currentTermGpa, setCurrentTermGpa] = useState<number | null>(null);
  const [termGpaHistory, setTermGpaHistory] = useState<ReturnType<typeof mapTermGpaHistory>>([]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.allSettled([
      api.students.profile(),
      api.students.stats(),
      api.grades.transcript(),
      api.courses.list(),
    ])
      .then(([profileResult, statsResult, transcriptResult, coursesResult]) => {
        if (!mounted) return;

        let nextStudent = emptyStudent;
        if (profileResult.status === 'fulfilled') {
          nextStudent = mapStudent(profileResult.value.profile);
        }
        if (statsResult.status === 'fulfilled') {
          nextStudent = mapStudentStatsToStudent(nextStudent, statsResult.value.stats);
          const stats = statsResult.value.stats as Record<string, unknown>;
          setCurrentTermGpa(typeof stats.currentTermGpa === 'number' ? stats.currentTermGpa : null);
          setTermGpaHistory(mapTermGpaHistory(stats));
        }
        setStudent(nextStudent);

        if (transcriptResult.status === 'fulfilled') {
          setGrades(transcriptResult.value.transcript?.map(mapGrade) || []);
        }

        if (coursesResult.status === 'fulfilled') {
          setCourses(coursesResult.value.courses?.map(mapCourse) || []);
        }
      })
      .catch((error) => {
        console.warn('Unable to load grades from API', error);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleDownloadTranscript = async () => {
    try {
      const blob = await api.documents.transcript();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.warn('Unable to download transcript', error);
      toast.error(t.grades.transcriptPDF);
    }
  };

  const studentGrades = grades.filter((g) => g.studentId === student.id || g.studentId === student.studentId);
  const currentTermGrades = studentGrades.filter((g) => {
    const course = courses.find((c) => c.id === g.courseId);
    return course?.semester === student.semester && course?.academicYear === student.academicYear;
  });

  // newest term first in the list; ungraded courses never count as 0 (server-side termGpa)
  const semesterGrades = Object.fromEntries(
    [...termGpaHistory].reverse().map((term) => [term.semester, { gpa: term.gpa, credits: term.credits }]),
  );

  const gradeDistribution = {
    A: studentGrades.filter((g) => g.letterGrade === 'A').length,
    'B+': studentGrades.filter((g) => g.letterGrade === 'B+').length,
    B: studentGrades.filter((g) => g.letterGrade === 'B').length,
    'C+': studentGrades.filter((g) => g.letterGrade === 'C+').length,
    C: studentGrades.filter((g) => g.letterGrade === 'C').length,
    'D+': studentGrades.filter((g) => g.letterGrade === 'D+').length,
    D: studentGrades.filter((g) => g.letterGrade === 'D').length,
    F: studentGrades.filter((g) => g.letterGrade === 'F').length,
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <span className="text-sm font-medium">
          {language === 'th' ? 'กำลังโหลดข้อมูลผลการเรียน...' : 'Loading grades...'}
        </span>
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5"
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-500 dark:text-emerald-400" />
            <span>{t.grades.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 leading-snug"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {t.grades.title}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 dark:from-emerald-400 dark:to-teal-400 font-extrabold">
              {t.grades.titleHighlight}
            </span>
          </motion.h1>
        </div>

        <motion.div className="flex items-center gap-2.5 w-full sm:w-auto" variants={itemVariants}>
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs h-9 px-3.5 font-medium transition-colors flex-1 sm:flex-initial"
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            {t.grades.shareGrades}
          </Button>
          <Button
            size="sm"
            className="rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-white text-xs h-9 px-4 font-semibold shadow-xs transition-all flex-1 sm:flex-initial"
            onClick={handleDownloadTranscript}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            {t.grades.transcriptPDF}
          </Button>
        </motion.div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* GPAX */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.grades.gpaxCumulative}
              </span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <Star className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400 tracking-tight" data-testid="gpax">
              {student.gpax.toFixed(2)}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400/90 font-medium flex items-center gap-1">
            {student.gpax >= 3.5 ? <Sparkles className="w-3.5 h-3.5 shrink-0" /> : null}
            <span>{student.gpax >= 3.5 ? t.grades.excellent : t.grades.normalRange}</span>
          </div>
        </motion.div>

        {/* Current Semester GPA */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.grades.gpaSemester}
              </span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                <Award className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight" data-testid="term-gpa">
              {currentTermGpa === null ? '-' : currentTermGpa.toFixed(2)}
            </div>
          </div>
        </motion.div>

        {/* Cumulative Credits */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.grades.creditsCumulative}
              </span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl sm:text-4xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">
              {student.earnedCredits}
            </div>
          </div>
          <div>
            <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400 font-mono">
              <span>
                {t.grades.from} {student.totalCredits}
              </span>
              <span>{((student.earnedCredits / Math.max(student.totalCredits, 1)) * 100).toFixed(0)}%</span>
            </div>
            <div className="mt-1.5 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${(student.earnedCredits / Math.max(student.totalCredits, 1)) * 100}%` }}
                transition={{ duration: 0.8 }}
                className="h-full bg-purple-500 rounded-full"
              />
            </div>
          </div>
        </motion.div>

        {/* Academic Status */}
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t.grades.statusLabel}
              </span>
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
              {t.grades.normal}
            </div>
          </div>
          <div className="mt-3 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            {t.grades.noRisk}
          </div>
        </motion.div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="current" className="space-y-6">
        <div className="flex items-center justify-between">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
            <TabsTrigger
              value="current"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-emerald-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              <BookOpen className="w-3.5 h-3.5 mr-1.5 inline-block" />
              {t.grades.currentSemester}
            </TabsTrigger>
            <TabsTrigger
              value="all"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-emerald-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5 inline-block" />
              {t.grades.allSemesters}
            </TabsTrigger>
            <TabsTrigger
              value="analysis"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-emerald-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              <PieChart className="w-3.5 h-3.5 mr-1.5 inline-block" />
              {t.grades.analysis}
            </TabsTrigger>
            <TabsTrigger
              value="transcript"
              className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-emerald-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
            >
              <FileText className="w-3.5 h-3.5 mr-1.5 inline-block" />
              Transcript
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="current" className="space-y-6">
          <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full">
            {currentTermGrades.map((grade) => {
              const course = courses.find((c) => c.id === grade.courseId);
              if (!course) return null;

              const getGradeBadge = (g?: string) => {
                if (!g) return 'bg-slate-400 text-white';
                if (g === 'A') return 'bg-emerald-600 text-white';
                if (g.startsWith('B')) return 'bg-blue-600 text-white';
                if (g.startsWith('C')) return 'bg-amber-600 text-white';
                return 'bg-red-600 text-white';
              };

              return (
                <motion.div
                  key={grade.courseId}
                  data-testid="grade-card"
                  whileHover={{ y: -2 }}
                  transition={{ duration: 0.15 }}
                  className="flex flex-col justify-between bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200"
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center shrink-0">
                          <span className="font-mono font-bold text-xs text-slate-800 dark:text-slate-200 leading-none">
                            {course.credits}
                          </span>
                          <span className="text-[9px] text-slate-400 dark:text-slate-400 mt-0.5 leading-none">
                            {language === 'th' ? 'หน่วยกิต' : 'Credits'}
                          </span>
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">
                              {course.code}
                            </span>
                          </div>
                          <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate mt-1">
                            {course.name}
                          </h3>
                        </div>
                      </div>

                      <div
                        className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shrink-0 shadow-xs select-none ${getGradeBadge(
                          grade.letterGrade,
                        )}`}
                      >
                        {grade.letterGrade}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 my-3 p-2 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70 text-center font-mono">
                      {grade.scores?.map((score) => (
                        <div
                          key={score.criteriaId}
                          className="p-1.5 rounded-lg bg-white/80 dark:bg-slate-800/60 border border-slate-200/50 dark:border-slate-700/50"
                        >
                          <div className="text-[10px] text-slate-400 uppercase font-sans mb-0.5 truncate">
                            {score.criteriaName || 'Score'}
                          </div>
                          <div className="font-bold text-xs text-slate-700 dark:text-slate-200">{score.score}</div>
                        </div>
                      ))}
                      <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/60">
                        <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-sans font-bold mb-0.5">
                          Total
                        </div>
                        <div className="font-bold text-xs text-emerald-700 dark:text-emerald-300">{grade.total}</div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
                    <span className="text-slate-400 dark:text-slate-400 font-mono text-[11px]">
                      {course.credits} {t.grades.credits} ({course.nameThai || course.code})
                    </span>
                    {grade.remarks ? (
                      <span className="text-emerald-600 dark:text-emerald-400 text-[11px] font-medium flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> {grade.remarks}
                      </span>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-400 text-[11px]">
                        {language === 'th' ? 'ผ่านเกณฑ์มาตรฐาน' : 'Standard Passed'}
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        </TabsContent>

        <TabsContent value="all" className="space-y-6">
          <div className="grid grid-cols-1 gap-4">
            {Object.entries(semesterGrades).map(([semester, data], index) => (
              <motion.div
                key={semester}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
                className="group flex items-center justify-between p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all cursor-pointer"
              >
                <div className="flex items-center gap-6">
                  <div className="bg-emerald-600 w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-xl shadow-lg group-hover:scale-110 transition-transform">
                    {data.gpa.toFixed(2)}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
                      {t.grades.semester} {semester}
                    </h3>
                    <p className="text-slate-500 dark:text-slate-400">
                      {data.credits} {t.grades.credits} • {data.gpa >= 3.0 ? t.grades.goodStanding : t.grades.needsImprovement}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors dark:text-slate-400" />
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-700"
            >
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-emerald-500 dark:text-slate-400" />
                {t.grades.distribution}
              </h3>
              <div className="space-y-4">
                {Object.entries(gradeDistribution).map(([grade, count]) => {
                  if (count === 0) return null;
                  const percentage = (count / Math.max(studentGrades.length, 1)) * 100;
                  return (
                    <div key={grade}>
                      <div className="flex justify-between text-sm mb-2 font-medium">
                        <span className="text-slate-700 dark:text-slate-300">
                          {t.grades.grade} {grade}
                        </span>
                        <span className="text-slate-500 dark:text-slate-400">
                          {count} {t.grades.subjects} ({percentage.toFixed(0)}%)
                        </span>
                      </div>
                      <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 1 }}
                          className={`h-full rounded-full ${
                            grade === 'A'
                              ? 'bg-emerald-500'
                              : grade.startsWith('B')
                              ? 'bg-blue-500'
                              : 'bg-orange-500'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center text-center dark:bg-slate-900"
            >
              <div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center mb-6 dark:bg-slate-800">
                <TrendingUp className="w-12 h-12 text-emerald-600 dark:text-slate-300" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2 leading-snug">{t.grades.excellentTrend}</h3>
              <p className="text-slate-500 max-w-xs mx-auto dark:text-slate-400">{t.grades.trendDescription}</p>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="transcript" className="space-y-6">
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl p-10 shadow-lg border border-slate-100 dark:border-slate-800 max-w-4xl mx-auto dark:bg-slate-900"
          >
            <div className="text-center mb-10 border-b border-slate-100 dark:border-slate-800 pb-8">
              <div className="w-20 h-20 bg-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-xl leading-snug">
                CMU
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-200 leading-snug">{t.grades.universityName}</h2>
              <p className="text-slate-500 dark:text-slate-400">{t.grades.officialTranscript}</p>
            </div>

            <div className="grid grid-cols-2 gap-y-4 gap-x-12 mb-10 text-sm">
              <div className="flex justify-between border-b border-slate-50 py-2">
                <span className="text-slate-500 dark:text-slate-400">Name</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{student.nameThai}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-2">
                <span className="text-slate-500 dark:text-slate-400">Student ID</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{student.studentId}</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-2">
                <span className="text-slate-500 dark:text-slate-400">Faculty</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">CAMT</span>
              </div>
              <div className="flex justify-between border-b border-slate-50 py-2">
                <span className="text-slate-500 dark:text-slate-400">Major</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{student.major}</span>
              </div>
            </div>

            <div className="md:flex gap-4 justify-center">
              <Button
                className="w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 h-12 px-8 rounded-xl"
                onClick={handleDownloadTranscript}
              >
                <Download className="w-4 h-4 mr-2" /> {t.grades.downloadPDF}
              </Button>
              <Button
                variant="outline"
                className="w-full md:w-auto h-12 px-8 rounded-xl"
                onClick={() => window.print()}
              >
                <Printer className="w-4 h-4 mr-2" /> {t.grades.print}
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
}
