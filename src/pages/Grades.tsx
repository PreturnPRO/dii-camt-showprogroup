import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, Award, AlertCircle, Download,
  Filter, BarChart3, PieChart, FileText, GraduationCap, BookOpen, Target,
  Star, Sparkles, ChevronRight, Share2, Printer
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { mockStudent, mockGrades, mockCourses } from '@/lib/mockData';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapCourse, mapGrade, mapStudent, mapStudentStatsToStudent } from '@/lib/live-mappers';

type StudentRow = typeof mockStudent;
type GradeRow = (typeof mockGrades)[number];
type CourseRow = (typeof mockCourses)[number];
type EnrollmentRow = {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  midterm?: number;
  final?: number;
  assignments?: number;
  participation?: number;
  project?: number;
  total?: number;
  letterGrade?: string;
  remarks?: string;
};

const emptyStudent: StudentRow = {
  ...mockStudent,
  id: '',
  email: '',
  name: '',
  nameThai: '',
  studentId: '',
  major: '',
  gpa: 0,
  gpax: 0,
  totalCredits: 0,
  earnedCredits: 0,
  requiredCredits: 0,
  skills: [],
  badges: [],
  activities: [],
  portfolio: { ...mockStudent.portfolio, projects: [] },
  timeline: [],
};

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

export default function Grades() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [student, setStudent] = React.useState<StudentRow>(emptyStudent);
  const [grades, setGrades] = React.useState<GradeRow[]>([]);
  const [courses, setCourses] = React.useState<CourseRow[]>([]);
  const [enrollments, setEnrollments] = React.useState<EnrollmentRow[]>([]);
  const [selectedCourseId, setSelectedCourseId] = React.useState<string>('all');
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    setIsLoading(true);

    if (user?.role === 'student') {
      Promise.allSettled([
        api.students.profile(),
        api.students.stats(),
        api.grades.transcript(),
        api.courses.list(),
      ]).then(([profileResult, statsResult, transcriptResult, coursesResult]) => {
        if (!mounted) return;

        let nextStudent = emptyStudent;
        if (profileResult.status === 'fulfilled') {
          nextStudent = mapStudent(profileResult.value.profile);
        }
        if (statsResult.status === 'fulfilled') {
          nextStudent = mapStudentStatsToStudent(nextStudent, statsResult.value.stats);
        }
        setStudent(nextStudent);

        if (transcriptResult.status === 'fulfilled') {
          setGrades(transcriptResult.value.transcript.map(mapGrade));
          const transcriptCourses = transcriptResult.value.transcript
            .map((item, index) => mapCourse(asRecord(item).course, index))
            .filter((course) => course.id);
          if (transcriptCourses.length > 0) {
            setCourses(transcriptCourses);
          }
        }

        if (coursesResult.status === 'fulfilled') {
          setCourses(coursesResult.value.courses.map(mapCourse));
        }
      }).catch((error) => {
        console.warn('Unable to load grades from API', error);
        setStudent(emptyStudent);
        setGrades([]);
        setCourses([]);
      }).finally(() => {
        if (mounted) setIsLoading(false);
      });
    } else {
      Promise.allSettled([
        api.courses.lecturerSchedule().then((response) => response.schedule),
        api.enrollments.list(),
      ])
        .then(([coursesResult, enrollmentsResult]) => {
          if (!mounted) return;

          if (coursesResult.status === 'fulfilled') {
            setCourses(coursesResult.value.map(mapCourse));
          } else {
            setCourses([]);
          }

          if (enrollmentsResult.status === 'fulfilled') {
            setEnrollments(enrollmentsResult.value.enrollments.map((item) => {
              const enrollment = asRecord(item);
              const studentRecord = asRecord(enrollment.student);
              const studentUser = asRecord(studentRecord.user);
              const course = asRecord(enrollment.course);
              const total = enrollment.total === null || typeof enrollment.total === 'undefined'
                ? undefined
                : asNumber(enrollment.total, 0);

              return {
                id: asString(enrollment.id),
                studentId: asString(enrollment.studentId),
                studentCode: asString(studentRecord.studentId, asString(enrollment.studentId)),
                studentName: asString(studentUser.nameThai, asString(studentUser.name, 'Student')),
                courseId: asString(enrollment.courseId),
                courseCode: asString(course.code),
                courseName: asString(course.nameThai, asString(course.name)),
                midterm: enrollment.midterm === null ? undefined : asNumber(enrollment.midterm, 0),
                final: enrollment.final === null ? undefined : asNumber(enrollment.final, 0),
                assignments: enrollment.assignments === null ? undefined : asNumber(enrollment.assignments, 0),
                participation: enrollment.participation === null ? undefined : asNumber(enrollment.participation, 0),
                project: enrollment.project === null ? undefined : asNumber(enrollment.project, 0),
                total,
                letterGrade: asString(enrollment.letterGrade),
                remarks: asString(enrollment.remarks),
              };
            }));
          } else {
            setEnrollments([]);
          }
        })
        .catch((error) => {
          console.warn('Unable to load lecturer courses from API', error);
          setCourses([]);
          setEnrollments([]);
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    }

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  const handleDownloadTranscript = async () => {
    try {
      const blob = await api.documents.transcript(user?.role === 'student' ? undefined : student.studentId);
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch (error) {
      console.warn('Unable to download transcript', error);
      toast.error(t.grades.transcriptPDF);
    }
  };

  const updateEnrollmentDraft = (id: string, field: keyof EnrollmentRow, value: string) => {
    setEnrollments((current) => current.map((item) => {
      if (item.id !== id) return item;
      if (['midterm', 'final', 'assignments', 'participation', 'project', 'total'].includes(field)) {
        return { ...item, [field]: value === '' ? undefined : Number(value) };
      }
      return { ...item, [field]: value };
    }));
  };

  const saveLecturerGrades = async () => {
    const rowsToSave = enrollments.filter((item) => selectedCourseId === 'all' || item.courseId === selectedCourseId);
    setIsSaving(true);
    try {
      const response = await api.grades.bulkUpdate({
        grades: rowsToSave.map((item) => ({
          enrollmentId: item.id,
          studentId: item.studentId,
          courseId: item.courseId,
          midterm: item.midterm,
          final: item.final,
          assignments: item.assignments,
          participation: item.participation,
          project: item.project,
          total: item.total,
          letterGrade: item.letterGrade || undefined,
          remarks: item.remarks || undefined,
          reason: 'Lecturer grade update',
        })),
      });

      const updatedById = new Map(response.grades.map((item) => {
        const record = asRecord(item);
        return [asString(record.id), record] as const;
      }));

      setEnrollments((current) => current.map((item) => {
        const updated = updatedById.get(item.id);
        if (!updated) return item;
        return {
          ...item,
          midterm: updated.midterm === null ? undefined : asNumber(updated.midterm, item.midterm),
          final: updated.final === null ? undefined : asNumber(updated.final, item.final),
          assignments: updated.assignments === null ? undefined : asNumber(updated.assignments, item.assignments),
          participation: updated.participation === null ? undefined : asNumber(updated.participation, item.participation),
          project: updated.project === null ? undefined : asNumber(updated.project, item.project),
          total: updated.total === null ? undefined : asNumber(updated.total, item.total),
          letterGrade: asString(updated.letterGrade, item.letterGrade),
          remarks: asString(updated.remarks, item.remarks),
        };
      }));

      toast.success(language === 'th' ? 'บันทึกคะแนนแล้ว' : 'Grades saved');
    } catch (error) {
      console.warn('Unable to save grades', error);
      toast.error(language === 'th' ? 'บันทึกคะแนนไม่สำเร็จ' : 'Unable to save grades');
    } finally {
      setIsSaving(false);
    }
  };

  if (user?.role === 'student') {
    const studentGrades = grades.filter(g => g.studentId === student.id || g.studentId === student.studentId);
    const currentTermGrades = studentGrades.filter(g => {
      const course = courses.find(c => c.id === g.courseId);
      return course?.semester === student.semester;
    });

    const gpa = student.gpa;
    const gpax = student.gpax;

    const semesterSummary = studentGrades.reduce<Record<string, { credits: number; totalPoints: number }>>((summary, grade) => {
      const course = courses.find(c => c.id === grade.courseId);
      if (!course) return summary;
      const key = `${course.semester}/${course.academicYear}`;
      const current = summary[key] ?? { credits: 0, totalPoints: 0 };
      current.credits += course.credits;
      current.totalPoints += gradePoint(grade.letterGrade) * course.credits;
      summary[key] = current;
      return summary;
    }, {});

    const semesterGrades = Object.fromEntries(
      Object.entries(semesterSummary).map(([semester, data]) => [
        semester,
        { gpa: data.credits ? data.totalPoints / data.credits : 0, credits: data.credits },
      ]),
    );

    const gradeDistribution = {
      'A': studentGrades.filter(g => g.letterGrade === 'A').length,
      'B+': studentGrades.filter(g => g.letterGrade === 'B+').length,
      'B': studentGrades.filter(g => g.letterGrade === 'B').length,
      'C+': studentGrades.filter(g => g.letterGrade === 'C+').length,
      'C': studentGrades.filter(g => g.letterGrade === 'C').length,
      'D+': studentGrades.filter(g => g.letterGrade === 'D+').length,
      'D': studentGrades.filter(g => g.letterGrade === 'D').length,
      'F': studentGrades.filter(g => g.letterGrade === 'F').length,
    };

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-10"
      >
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
            >
              <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-slate-400" />
              <span>{t.grades.subtitle}</span>
            </motion.div>
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.grades.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{t.grades.titleHighlight}</span>
            </motion.h1>
          </div>

          <motion.div className="flex gap-3" variants={itemVariants}>
            <Button variant="outline" className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-white hover:text-emerald-600 dark:text-slate-300 dark:bg-slate-900">
              <Share2 className="w-4 h-4 mr-2" />
              {t.grades.shareGrades}
            </Button>
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20" onClick={handleDownloadTranscript}>
              <Download className="w-4 h-4 mr-2" />
              {t.grades.transcriptPDF}
            </Button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                  <Star className="w-6 h-6" />
                </div>
                <span className="font-medium text-white/90">{t.grades.gpaxCumulative}</span>
              </div>
              <div className="text-5xl font-bold tracking-tight">{student.gpax.toFixed(2)}</div>
              <div className="mt-3 text-sm text-emerald-100 flex items-center gap-1">
                {student.gpax >= 3.5 ? <Sparkles className="w-4 h-4" /> : null}
                {student.gpax >= 3.5 ? t.grades.excellent : t.grades.normalRange}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-950/30 dark:group-hover:text-blue-400 transition-colors">
                  <Award className="w-6 h-6" />
                </div>
                <span className="font-medium text-slate-600 dark:text-slate-300">{t.grades.gpaSemester}</span>
              </div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{gpa.toFixed(2)}</div>
              <div className="mt-3 text-sm text-slate-400">
                {t.grades.target}: <span className="text-slate-600 font-semibold dark:text-slate-300">3.80</span>
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 dark:group-hover:bg-purple-950/30 dark:group-hover:text-purple-400 transition-colors">
                  <BookOpen className="w-6 h-6" />
                </div>
                <span className="font-medium text-slate-600 dark:text-slate-300">{t.grades.creditsCumulative}</span>
              </div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">{student.earnedCredits}</div>
              <div className="mt-3 flex items-center justify-between text-sm text-slate-400">
                <span>{t.grades.from} {student.totalCredits}</span>
                <span>{(student.earnedCredits / Math.max(student.totalCredits, 1) * 100).toFixed(0)}%</span>
              </div>
              <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(student.earnedCredits / Math.max(student.totalCredits, 1)) * 100}%` }}
                  className="h-full bg-purple-500 rounded-full"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 dark:group-hover:bg-orange-950/30 dark:group-hover:text-orange-400 transition-colors">
                  <Target className="w-6 h-6" />
                </div>
                <span className="font-medium text-slate-600 dark:text-slate-300">{t.grades.statusLabel}</span>
              </div>
              <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">{t.grades.normal}</div>
              <div className="mt-3 text-sm text-green-600 font-medium bg-green-50 dark:bg-green-950/30 dark:text-green-400 w-fit px-2 py-1 rounded-lg">
                {t.grades.noRisk}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="current" className="space-y-8">
          <TabsList className="bg-white/40 backdrop-blur-xl border border-white/40 p-1.5 h-auto rounded-2xl shadow-sm w-full md:w-auto flex overflow-x-auto dark:bg-slate-900/50">
            <TabsTrigger value="current" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              <BookOpen className="w-4 h-4 mr-2" />
              {t.grades.currentSemester}
            </TabsTrigger>
            <TabsTrigger value="all" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              <BarChart3 className="w-4 h-4 mr-2" />
              {t.grades.allSemesters}
            </TabsTrigger>
            <TabsTrigger value="analysis" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              <PieChart className="w-4 h-4 mr-2" />
              {t.grades.analysis}
            </TabsTrigger>
            <TabsTrigger value="transcript" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-emerald-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              <FileText className="w-4 h-4 mr-2" />
              Transcript
            </TabsTrigger>
          </TabsList>

          <TabsContent value="current" className="space-y-6">
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentTermGrades.map((grade, index) => {
                const course = courses.find(c => c.id === grade.courseId);
                if (!course) return null;

                const getGradeColor = (g: string) => {
                  if (g === 'A') return 'bg-emerald-500 text-white shadow-emerald-200';
                  if (g.startsWith('B')) return 'bg-blue-500 text-white shadow-blue-200';
                  if (g.startsWith('C')) return 'bg-orange-500 text-white shadow-orange-200';
                  return 'bg-red-500 text-white shadow-red-200';
                };

                return (
                  <motion.div
                    key={grade.courseId}
                    whileHover={{ y: -4 }}
                    className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all dark:bg-slate-900/50"
                  >
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-950 flex items-center justify-center font-bold text-slate-700 dark:text-slate-300 border border-slate-100 dark:border-slate-700">
                          {course.code?.slice(-2) || 'XX'}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-200">{course.code}</h3>
                          <p className="text-slate-500 text-sm line-clamp-1 dark:text-slate-400">{course.name}</p>
                        </div>
                      </div>
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold shadow-lg ${getGradeColor(grade.letterGrade)}`}>
                        {grade.letterGrade}
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2 mb-6">
                      <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <div className="text-xs text-slate-400 mb-1">Mid</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{grade.midterm || '-'}</div>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <div className="text-xs text-slate-400 mb-1">Final</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{grade.final || '-'}</div>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-slate-50 dark:bg-slate-800">
                        <div className="text-xs text-slate-400 mb-1">Assign</div>
                        <div className="font-bold text-slate-700 dark:text-slate-300">{grade.assignments || '-'}</div>
                      </div>
                      <div className="text-center p-2 rounded-xl bg-emerald-50 border border-emerald-100 dark:bg-slate-800">
                        <div className="text-xs text-emerald-600 mb-1 dark:text-slate-300">Total</div>
                        <div className="font-bold text-emerald-700 dark:text-slate-300">{grade.total}</div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <Badge variant="outline" className="text-slate-500 border-slate-200 dark:border-slate-700 font-normal dark:text-slate-300">{course.credits} {t.grades.credits}</Badge>
                      {grade.remarks && <span className="text-orange-500 text-xs flex items-center gap-1 dark:text-slate-400"><AlertCircle className="w-3 h-3" /> {grade.remarks}</span>}
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
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-emerald-500/20 group-hover:scale-110 transition-transform">
                      {data.gpa.toFixed(2)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">{t.grades.semester} {semester}</h3>
                      <p className="text-slate-500 dark:text-slate-400">{data.credits} {t.grades.credits} • {data.gpa >= 3.0 ? t.grades.goodStanding : t.grades.needsImprovement}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-300 group-hover:text-emerald-500 transition-colors dark:text-slate-400" />
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 dark:bg-slate-900 dark:border-slate-700">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-6 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500 dark:text-slate-400" />
                  {t.grades.distribution}
                </h3>
                <div className="space-y-4">
                  {Object.entries(gradeDistribution).map(([grade, count]) => {
                    if (count === 0) return null;
                    const percentage = (count / studentGrades.length) * 100;
                    return (
                      <div key={grade}>
                        <div className="flex justify-between text-sm mb-2 font-medium">
                          <span className="text-slate-700 dark:text-slate-300">{t.grades.grade} {grade}</span>
                          <span className="text-slate-500 dark:text-slate-400">{count} {t.grades.subjects} ({percentage.toFixed(0)}%)</span>
                        </div>
                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${percentage}%` }}
                            transition={{ duration: 1 }}
                            className={`h-full rounded-full ${grade === 'A' ? 'bg-emerald-500' : grade.startsWith('B') ? 'bg-blue-500' : 'bg-orange-500'}`}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center text-center dark:bg-slate-900">
                <div className="w-32 h-32 rounded-full bg-emerald-50 flex items-center justify-center mb-6 dark:bg-slate-800">
                  <TrendingUp className="w-12 h-12 text-emerald-600 dark:text-slate-300" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">{t.grades.excellentTrend}</h3>
                <p className="text-slate-500 max-w-xs mx-auto dark:text-slate-400">
                  {t.grades.trendDescription}
                </p>
              </motion.div>
            </div>
          </TabsContent>

          <TabsContent value="transcript" className="space-y-6">
            <motion.div variants={itemVariants} className="bg-white rounded-3xl p-10 shadow-lg border border-slate-100 dark:border-slate-800 max-w-4xl mx-auto dark:bg-slate-900">
              <div className="text-center mb-10 border-b border-slate-100 dark:border-slate-800 pb-8">
                <div className="w-20 h-20 bg-purple-600 rounded-2xl mx-auto flex items-center justify-center text-white text-2xl font-bold mb-4 shadow-xl shadow-purple-500/30">
                  CMU
                </div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-200">{t.grades.universityName}</h2>
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
                <Button className="w-full md:w-auto bg-slate-900 text-white hover:bg-slate-800 h-12 px-8 rounded-xl" onClick={handleDownloadTranscript}>
                  <Download className="w-4 h-4 mr-2" /> {t.grades.downloadPDF}
                </Button>
                <Button variant="outline" className="w-full md:w-auto h-12 px-8 rounded-xl" onClick={() => window.print()}>
                  <Printer className="w-4 h-4 mr-2" /> {t.grades.print}
                </Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  }

  const filteredEnrollments = selectedCourseId === 'all'
    ? enrollments
    : enrollments.filter((item) => item.courseId === selectedCourseId);
  const gradedCount = enrollments.filter((item) => item.letterGrade).length;
  const pendingCount = enrollments.length - gradedCount;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      <div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
          <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-slate-400" />
          <span>{t.grades.lecturerSubtitle}</span>
        </motion.div>
        <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          {t.grades.lecturerTitle}<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{t.grades.lecturerTitleHighlight}</span>
        </motion.h1>
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: BookOpen, label: t.grades.coursesTaught, value: isLoading ? '...' : courses.length.toString(), gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-200' },
          { icon: Target, label: t.grades.pendingGrading, value: isLoading ? '...' : String(pendingCount), gradient: 'from-orange-500 to-amber-500', shadow: 'shadow-orange-200' },
          { icon: Award, label: t.grades.gradingCompleted, value: isLoading ? '...' : String(gradedCount), gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
          { icon: GraduationCap, label: t.grades.totalStudents, value: isLoading ? '...' : String(new Set(enrollments.map((item) => item.studentId)).size), gradient: 'from-purple-500 to-pink-500', shadow: 'shadow-purple-200' },
        ].map((stat, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-xl ${stat.shadow}`}>
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50"><stat.icon className="w-5 h-5" /></div>
                <span className="font-medium text-white/90">{stat.label}</span>
              </div>
              <div className="text-4xl font-bold">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div variants={itemVariants} className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/50">
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {language === 'th' ? 'จัดการคะแนนรายวิชา' : 'Course grade entry'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {language === 'th' ? 'ดึงรายชื่อนักศึกษาจากการลงทะเบียนจริง และบันทึกผ่าน API' : 'Loaded from live enrollments and saved through the grade API.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">{language === 'th' ? 'ทุกวิชา' : 'All courses'}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>{course.code} - {course.name}</option>
              ))}
            </select>
            <Button onClick={saveLecturerGrades} disabled={isSaving || filteredEnrollments.length === 0} className="h-11 rounded-2xl">
              {isSaving ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึกคะแนน' : 'Save grades')}
            </Button>
          </div>
        </div>

        {!isLoading && filteredEnrollments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            {language === 'th' ? 'ยังไม่มีนักศึกษาลงทะเบียนในรายวิชาที่เลือก' : 'No enrollments found for the selected course.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px] space-y-2">
              <div className="grid grid-cols-[1.3fr_1fr_repeat(6,88px)_100px_1.2fr] gap-2 px-3 text-xs font-bold uppercase tracking-wide text-slate-400">
                <span>{language === 'th' ? 'นักศึกษา' : 'Student'}</span>
                <span>{language === 'th' ? 'วิชา' : 'Course'}</span>
                <span>Mid</span>
                <span>Final</span>
                <span>Assign</span>
                <span>Part.</span>
                <span>Project</span>
                <span>Total</span>
                <span>Grade</span>
                <span>{language === 'th' ? 'หมายเหตุ' : 'Remarks'}</span>
              </div>
              {filteredEnrollments.map((row) => (
                <div key={row.id} className="grid grid-cols-[1.3fr_1fr_repeat(6,88px)_100px_1.2fr] items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{row.studentName}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{row.studentCode}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-emerald-700 dark:text-emerald-300">{row.courseCode}</div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{row.courseName}</div>
                  </div>
                  {(['midterm', 'final', 'assignments', 'participation', 'project', 'total'] as const).map((field) => (
                    <Input
                      key={field}
                      type="number"
                      min="0"
                      value={row[field] ?? ''}
                      onChange={(event) => updateEnrollmentDraft(row.id, field, event.target.value)}
                      className="h-10 rounded-xl border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900"
                    />
                  ))}
                  <Input
                    value={row.letterGrade ?? ''}
                    onChange={(event) => updateEnrollmentDraft(row.id, 'letterGrade', event.target.value.toUpperCase())}
                    placeholder="A"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-center font-bold dark:border-slate-700 dark:bg-slate-900"
                  />
                  <Input
                    value={row.remarks ?? ''}
                    onChange={(event) => updateEnrollmentDraft(row.id, 'remarks', event.target.value)}
                    placeholder={language === 'th' ? 'หมายเหตุ' : 'Remarks'}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
