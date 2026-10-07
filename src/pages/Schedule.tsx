import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Calendar, Clock, MapPin,
  BookOpen, GraduationCap, Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { occurrenceKey, WeeklyTimetable } from '@/components/common/WeeklyTimetable';
import { ClassMoveDialog } from '@/components/schedule/ClassMoveDialog';
import { toast } from 'sonner';
import { useSearchParams } from 'react-router-dom';
import type { ClassMoveView } from '@/lib/api';
import { thaiToday } from '@/lib/thai-date';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { type Occurrence, addDays, weekOccurrences, weekOf, DAY_LABELS, formatHours, formatMinutes, placeSlots, studentEntries, studyDays, teachingEntries, termKey, termsOf, weeklyMinutes, type Term } from '@/lib/timetable';
import { api } from '@/lib/api';
import { asRecord, asString } from '@/lib/live-data';
import { mapCourse, mapStudent } from '@/lib/live-mappers';
import type { Course, Student } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Schedule() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [enrollmentRows, setEnrollmentRows] = React.useState<unknown[]>([]);
  const [studentTerm, setStudentTerm] = React.useState<Term | null>(null);
  const [termValue, setTermValue] = React.useState('');
  const [searchParams, setSearchParams] = useSearchParams();
  const weekParam = searchParams.get('week');
  const weekStart = weekOf(weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : thaiToday());
  const setWeekStart = (next: string) => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('week', next); return p; });
  const [moves, setMoves] = React.useState<ClassMoveView[]>([]);
  const [moveTarget, setMoveTarget] = React.useState<Occurrence | null>(null);
  const reloadMoves = React.useCallback(() => {
    api.classMoves.list(weekStart, addDays(weekStart, 6))
      .then((r) => setMoves(r.moves))
      .catch(() => setMoves([]));
  }, [weekStart]);
  React.useEffect(() => {
    if (user?.role === 'student' || user?.role === 'lecturer') reloadMoves();
  }, [reloadMoves, user?.role]);
  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    if (user?.role === 'student') {
      Promise.allSettled([
        api.students.profile(),
        api.enrollments.list(),
        api.enrollments.summary(),
      ]).then(([profileResult, enrollmentsResult, summaryResult]) => {
        if (!mounted) return;
        // the student's current term, as the backend enforces it
        setStudentTerm(summaryResult.status === 'fulfilled'
          ? { semester: summaryResult.value.summary.semester, academicYear: summaryResult.value.summary.academicYear }
          : null);
        let nextStudent: Student | null = null;
        if (profileResult.status === 'fulfilled') {
          nextStudent = mapStudent(profileResult.value.profile);
          setStudent(nextStudent);
        } else {
          setStudent(null);
        }
        setEnrollmentRows(enrollmentsResult.status === 'fulfilled' ? enrollmentsResult.value.enrollments : []);
        if (enrollmentsResult.status === 'fulfilled') {
          const enrolledCourses = enrollmentsResult.value.enrollments.map((item, index) => {
            const enrollment = asRecord(item);
            const course = mapCourse(enrollment.course, index);
            return {
              ...course,
              enrolledStudents: [asString(enrollment.studentId, nextStudent?.id ?? '')].filter(Boolean),
            };
          });
          setCourses(enrolledCourses);
        } else {
          setCourses([]);
        }
      }).catch((error) => {
        console.warn('Unable to load student schedule from API', error);
        if (!mounted) return;
        setStudent(null);
        setCourses([]);
      }).finally(() => {
        if (mounted) setIsLoading(false);
      });
    } else if (user?.role === 'lecturer') {
      api.courses
        .lecturerSchedule()
        .then((response) => {
          if (!mounted) return;
          setCourses(response.schedule.map(mapCourse));
        })
        .catch((error) => {
          console.warn('Unable to load lecturer schedule from API', error);
          if (mounted) setCourses([]);
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    } else {
      setCourses([]);
      setStudent(null);
      setIsLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  const today = thaiToday();
  const dayList = (days: ReturnType<typeof studyDays>) =>
    days.length ? days.map((d) => (language === 'en' ? DAY_LABELS[d].en.slice(0, 3) : DAY_LABELS[d].short)).join(' ') : '-';

  if (user?.role === 'student') {
    if (!student) {
      return (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8 pb-10"
        >
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
            >
              <Calendar className="w-4 h-4 text-purple-500 dark:text-slate-400" />
              <span>{t.schedulePage.semester}</span>
            </motion.div>
            <motion.h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.schedulePage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{t.schedulePage.titleHighlight}</span>
            </motion.h1>
          </div>
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/70 p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
            {isLoading ? 'กำลังโหลดตารางเรียนจากระบบ...' : 'ไม่พบข้อมูลตารางเรียนจากระบบ'}
          </div>
        </motion.div>
      );
    }

    const entries = studentEntries(enrollmentRows, studentTerm);
    const placed = placeSlots(entries);
    const studentCourses = Array.from(new Map(entries.map((e) => [e.course.id, e.course])).values());
    const totalCredits = studentCourses.reduce((sum, c) => sum + c.credits, 0);
    const totalHours = formatHours(weeklyMinutes(placed));
    // today's classes come from this week's dated classes, so moves in and out are honoured
    const todaySlots = weekOccurrences(entries, weekOf(today), weekOf(today) === weekStart ? moves : [])
      .filter((o) => o.date === today && o.kind !== 'moved-out');

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
              <Calendar className="w-4 h-4 text-purple-500 dark:text-slate-400" />
              <span>{t.schedulePage.semester}</span>
            </motion.div>
            <motion.h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.schedulePage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{t.schedulePage.titleHighlight}</span>
            </motion.h1>
          </div>

        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 text-sm">{t.schedulePage.totalCourses}</span>
            </div>
            <div className="text-3xl font-bold">{studentCourses.length}</div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 text-sm">{t.schedulePage.totalCredits}</span>
            </div>
            <div className="text-3xl font-bold">{totalCredits}</div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 text-sm">{t.schedulePage.hoursPerWeek} {language === 'th' ? '(ตามตารางประจำ)' : '(usual week)'}</span>
            </div>
            <div className="text-3xl font-bold">{totalHours} <span className="text-base font-medium">{language === 'th' ? 'ชม.' : 'h'}</span></div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-5 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-sm text-slate-700 dark:text-slate-200"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800">
                <Calendar className="w-5 h-5 text-slate-500 dark:text-slate-400" />
              </div>
              <span className="font-medium text-slate-500 dark:text-slate-400 text-sm">{t.schedulePage.studyDays}</span>
            </div>
            <div className="text-3xl font-bold">{dayList(studyDays(placed))}</div>
          </motion.div>
        </div>

        {/* Timetable Card */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              กำลังโหลดตารางเรียนจากระบบ...
            </div>
          ) : studentCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              ยังไม่มีรายวิชาที่ลงทะเบียนในระบบ
            </div>
          ) : (
            <WeeklyTimetable entries={entries} term={studentTerm} weekStart={weekStart} moves={moves} showWeekNav onWeekChange={setWeekStart} />
          )}
        </motion.div>

        {/* Today's Classes */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500 dark:text-slate-400" /> {t.schedulePage.todayClasses}
            </h3>
            <div className="space-y-3">
              {!isLoading && todaySlots.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                  {language === 'th' ? 'วันนี้ไม่มีคาบเรียน' : 'No classes today'}
                </div>
              )}
              {todaySlots.map((p, index) => (
                <motion.div
                  key={p.key}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                  <div className="flex flex-col items-center justify-center bg-purple-50 text-purple-700 rounded-xl px-4 py-2 min-w-[80px] dark:text-slate-300 dark:bg-slate-800">
                    <div className="text-sm font-bold">{formatMinutes(p.start)}</div>
                    <div className="text-xs opacity-75">{formatMinutes(p.end)}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{p.course.code} {language === 'th' ? p.course.nameThai || p.course.name : p.course.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{[p.slot.room || p.section?.room, p.slot.building].filter(Boolean).join(' ') || '-'}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-3xl p-8 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 rounded-full blur-[80px]" />
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-purple-400" /> {t.schedulePage.warnings}
              </h3>
              <ul className="space-y-4 text-slate-300 text-sm">
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                  {t.schedulePage.warningLate}
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                  {t.schedulePage.warningLeave}
                </li>
                <li className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-slate-700 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                  {t.schedulePage.warningDress}
                </li>
              </ul>
              <Button className="w-full mt-8 bg-purple-600 hover:bg-purple-500 text-white border-0">
                {t.schedulePage.viewRules}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Lecturer View: newest term first, switchable
  const terms = termsOf(courses);
  const lecturerTerm = terms.find((term) => termKey(term) === termValue) ?? terms[0] ?? null;
  // a class with a waiting request shows it, and the request can be withdrawn there
  const pendingByKey = Object.fromEntries(moves.filter((m) => m.status === 'pending').map((m) => [`${m.sectionId}|${m.originalDate}|${m.originalStart}`, m]));
  const withdraw = async (id: string) => {
    try {
      await api.classMoves.withdraw(id);
      toast.success(language === 'th' ? 'ถอนคำขอแล้ว' : 'Request withdrawn');
      reloadMoves();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not withdraw');
    }
  };
  const badges = Object.fromEntries(Object.entries(pendingByKey).map(([key, m]) => [key, (
    <div className="mt-1 flex items-center gap-1">
      <span className="rounded bg-amber-100 px-1 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
        {language === 'th' ? `รออนุมัติ → ${m.newDate} ${m.newStart}` : `Pending → ${m.newDate} ${m.newStart}`}
      </span>
      <button type="button" className="underline" onClick={(e) => { e.stopPropagation(); void withdraw(m.id); }}>{language === 'th' ? 'ถอน' : 'Withdraw'}</button>
    </div>
  )]));
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <div className="flex items-end justify-between">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
            <Calendar className="w-4 h-4 text-purple-500 dark:text-slate-400" />
            <span>{t.schedulePage.lecturerSubtitle}</span>
          </motion.div>
          <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {t.schedulePage.lecturerTitle}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{t.schedulePage.lecturerHighlight}</span>
          </motion.h1>
        </div>
        <Select value={lecturerTerm ? termKey(lecturerTerm) : ''} onValueChange={setTermValue}>
          <SelectTrigger data-testid="term-picker" className="w-48 rounded-xl"><SelectValue placeholder={language === 'th' ? 'เลือกเทอม' : 'Term'} /></SelectTrigger>
          <SelectContent>
            {terms.map((term) => (
              <SelectItem key={termKey(term)} value={termKey(term)}>{language === 'th' ? `เทอม ${term.semester}/${term.academicYear}` : `Term ${term.semester}/${term.academicYear}`}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
            กำลังโหลดตารางสอนจากระบบ...
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
            ไม่พบข้อมูลตารางสอนจากระบบ
          </div>
        ) : (
          <WeeklyTimetable
            entries={teachingEntries(courses, lecturerTerm)} term={lecturerTerm} weekStart={weekStart} moves={moves} showWeekNav onWeekChange={setWeekStart}
            badges={badges}
            onSlotClick={(o) => { if (!pendingByKey[occurrenceKey(o)]) setMoveTarget(o); }}
          />
        )}
      </motion.div>
      <ClassMoveDialog open={!!moveTarget} onOpenChange={(open) => { if (!open) setMoveTarget(null); }} occurrence={moveTarget} mode="request" onDone={reloadMoves} />
    </motion.div>
  );
}
