import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
  Calendar, Clock, MapPin, ChevronLeft, ChevronRight,
  BookOpen, GraduationCap, GripVertical, Info
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Timetable } from '@/components/common/Timetable';
import { DraggableSchedule } from '@/components/schedule/DraggableSchedule';
import { MonthCalendar } from '@/components/schedule/MonthCalendar';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { asRecord, asString } from '@/lib/live-data';
import { mapCourse, mapStudent } from '@/lib/live-mappers';
import { cn } from '@/lib/utils';
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Support ?view=week or ?view=month with 'week' as default
  const initialView = searchParams.get('view') === 'month' ? 'month' : 'week';
  const [calendarView, setCalendarView] = React.useState<'week' | 'month'>(initialView);
  const [currentWeek, setCurrentWeek] = React.useState(0);
  const [currentMonthOffset, setCurrentMonthOffset] = React.useState(0);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  // Sync view switcher with URL params
  const handleViewChange = (newView: 'week' | 'month') => {
    setCalendarView(newView);
    setSearchParams((prev) => {
      const updated = new URLSearchParams(prev);
      updated.set('view', newView);
      return updated;
    }, { replace: true });
  };

  type ScheduleItem = {
    id: string;
    courseCode: string;
    courseName: string;
    day: number;
    startTime: string;
    endTime: string;
    room: string;
  };

  // Transform courses to schedule items
  const scheduleItems: ScheduleItem[] = React.useMemo(() => {
    const dayIndexByName: Record<string, number> = {
      mon: 1,
      monday: 1,
      tue: 2,
      tuesday: 2,
      wed: 3,
      wednesday: 3,
      thu: 4,
      thursday: 4,
      fri: 5,
      friday: 5,
    };

    return courses.flatMap(course =>
      (course.sections?.[0]?.schedule || []).map((slot, idx) => ({
        id: `${course.id}-${idx}`,
        courseCode: course.code,
        courseName: course.name,
        day: dayIndexByName[slot.day.toLowerCase()] ?? 0,
        startTime: slot.startTime,
        endTime: slot.endTime,
<<<<<<< Updated upstream
        room: slot.room || course.room || (language === 'en' ? 'TBA' : 'ไม่ระบุ')
=======
        room: slot.room
>>>>>>> Stashed changes
      }))
    ).filter(item => item.day > 0);
  }, [courses]);

  React.useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    if (user?.role === 'student') {
      Promise.allSettled([
        api.students.profile(),
        api.enrollments.list(),
      ]).then(([profileResult, enrollmentsResult]) => {
        if (!mounted) return;
        let nextStudent: Student | null = null;
        if (profileResult.status === 'fulfilled') {
          nextStudent = mapStudent(profileResult.value.profile);
          setStudent(nextStudent);
        } else {
          setStudent(null);
        }
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

  const handleRequestMove = (item: ScheduleItem, targetDay: number, targetTime: string, mode: 'permanent' | 'one-time') => {
    toast.success(t.schedulePage.editSuccess, {
      description: `${t.schedulePage.editSuccessDesc} (${mode === 'permanent' ? t.schedulePage.permanent : t.schedulePage.todayOnly})`
    });
    setIsEditMode(false);
  };

  // Week calculation
  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + (currentWeek * 7));

  // Format week range (Monday to Friday or Sunday)
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  startOfWeek.setDate(diff);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4);

  // Month calculation
  const currentMonthDate = new Date();
  currentMonthDate.setMonth(currentMonthDate.getMonth() + currentMonthOffset);

  // Reset to today helper
  const handleJumpToToday = () => {
    setCurrentWeek(0);
    setCurrentMonthOffset(0);
  };

  // Switch from month view to week view for a specific clicked date
  const handleSwitchToWeekForDate = (targetDate: Date) => {
    const today = new Date();
    const diffTime = targetDate.getTime() - today.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
    const targetWeekOffset = Math.round(diffDays / 7);
    setCurrentWeek(targetWeekOffset);
    handleViewChange('week');
  };

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
              className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
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

    // Correctly filter courses for the student
    const studentCourses = courses.filter(c =>
      c.enrolledStudents.includes(student.id) || c.enrolledStudents.includes(student.studentId)
    );

    const totalCredits = studentCourses.reduce((sum, c) => sum + c.credits, 0);
    const totalHours = studentCourses.length * 3;

    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-10"
      >
        {/* Header Section */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5"
            >
              <Calendar className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>{t.schedulePage.semester}</span>
            </motion.div>
            <motion.h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {t.schedulePage.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 font-extrabold">{t.schedulePage.titleHighlight}</span>
            </motion.h1>
          </div>

          {/* Navigation Controls: View Switcher + Date Navigator */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Switcher: [ Week | Month ] */}
            <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/70 dark:border-slate-700/60 shadow-xs">
              <button
                type="button"
                onClick={() => handleViewChange('week')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                  calendarView === 'week'
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {language === 'en' ? 'Week' : 'สัปดาห์'}
              </button>
              <button
                type="button"
                onClick={() => handleViewChange('month')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                  calendarView === 'month'
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                )}
              >
                {language === 'en' ? 'Month' : 'เดือน'}
              </button>
            </div>

            {/* "วันนี้" / "Today" Quick Button */}
            {(currentWeek !== 0 || currentMonthOffset !== 0) && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleJumpToToday}
                className="h-8 px-2.5 text-xs font-medium rounded-xl border-slate-200/70 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {language === 'en' ? 'Today' : 'วันนี้'}
              </Button>
            )}

            {/* Date Navigator (‹ range ›) */}
            <motion.div
              className="flex items-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 shadow-sm border border-slate-200/70 dark:border-slate-800"
              whileHover={{ scale: 1.01 }}
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (calendarView === 'week') {
                    setCurrentWeek(currentWeek - 1);
                  } else {
                    setCurrentMonthOffset(currentMonthOffset - 1);
                  }
                }}
                className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div className="px-3 text-xs sm:text-sm font-semibold font-mono text-slate-700 dark:text-slate-200 min-w-[130px] text-center">
                {calendarView === 'week' ? (
                  `${startOfWeek.getDate()} ${startOfWeek.toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', { month: 'short' })} - ${endOfWeek.getDate()} ${endOfWeek.toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', { month: 'short' })}`
                ) : (
                  currentMonthDate.toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', { month: 'long', year: 'numeric' })
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (calendarView === 'week') {
                    setCurrentWeek(currentWeek + 1);
                  } else {
                    setCurrentMonthOffset(currentMonthOffset + 1);
                  }
                }}
                className="h-8 w-8 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Summary Cards — Refined SaaS style with subtle accents (not overpowering) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.schedulePage.totalCourses}</span>
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
                <BookOpen className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">{studentCourses.length}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{language === 'en' ? 'enrolled courses' : 'วิชาที่ลงทะเบียน'}</span>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.schedulePage.totalCredits}</span>
              <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalCredits}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{language === 'en' ? 'total credits' : 'หน่วยกิตสะสมเทอมนี้'}</span>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.schedulePage.hoursPerWeek}</span>
              <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">{totalHours}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{language === 'en' ? 'hours per week' : 'ชั่วโมงบรรยาย/ปฏิบัติ'}</span>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 rounded-2xl bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 shadow-sm relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.schedulePage.studyDays}</span>
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-bold font-mono text-slate-900 dark:text-slate-100">{t.schedulePage.monFri}</div>
            <span className="text-[11px] text-slate-400 mt-0.5 block">{language === 'en' ? 'weekday schedule' : 'จันทร์ ถึง ศุกร์'}</span>
          </motion.div>
        </div>

        {/* Timetable / Month Calendar Card - Hero Element */}
        <motion.div variants={itemVariants} className="bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm">
          {isLoading ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              กำลังโหลดตารางเรียนจากระบบ...
            </div>
          ) : studentCourses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              ยังไม่มีรายวิชาที่ลงทะเบียนในระบบ
            </div>
          ) : (
            <AnimatePresence mode="wait">
              {calendarView === 'week' ? (
                <motion.div
                  key="week-view"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <Timetable
                    courses={studentCourses}
                    semester={student.semester}
                    academicYear={student.academicYear}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="month-view"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                >
                  <MonthCalendar
                    courses={studentCourses}
                    currentDate={currentMonthDate}
                    onSwitchToWeek={handleSwitchToWeekForDate}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          )}
        </motion.div>

        {/* Today's Classes + Attendance & Warning Card */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Today's Classes List (Sorted Chronologically) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" /> {t.schedulePage.todayClasses}
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'th-TH', { weekday: 'long', day: 'numeric', month: 'short' })}
              </span>
            </div>

            <div className="space-y-2.5">
              {!isLoading && studentCourses.length === 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white/50 p-6 text-center text-xs font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400">
                  ยังไม่มีคาบเรียนวันนี้จากระบบ
                </div>
              )}
<<<<<<< Updated upstream
              {studentCourses.slice(0, 3).map((course, index) => {
                const slot = course.schedule?.[0];
                const location = [slot?.room, slot?.building].filter(Boolean).join(' ');

                  return (
                    <motion.div
                      key={`${course.id}-${index}`}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className={cn(
                        "flex items-center gap-3.5 p-3 rounded-xl border bg-white dark:bg-slate-900/80 shadow-sm transition-all duration-150 group cursor-default",
                        isActiveNow
                          ? "border-blue-500/80 bg-blue-50/40 dark:bg-blue-950/20"
                          : "border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700"
                      )}
                    >
                      {/* Time Block */}
                      <div className={cn(
                        "flex flex-col items-center justify-center rounded-lg px-3 py-1.5 min-w-[76px] font-mono transition-colors",
                        isActiveNow
                          ? "bg-blue-600 text-white dark:bg-blue-500 font-bold"
                          : "bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300"
                      )}>
                        <div className="text-xs font-bold leading-tight">{slot?.startTime || '--:--'}</div>
                        <div className="text-[10px] opacity-70 leading-tight">{slot?.endTime || '--:--'}</div>
                      </div>

                      {/* Course Information: Code, Name, Room */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-mono font-semibold text-blue-600 dark:text-blue-400">
                            {course.code}
                          </span>
                          <h4 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {course.nameThai || course.name}
                          </h4>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5 font-mono">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{location || '-'}</span>
                        </div>
                      </div>

                      {/* Status Indicator */}
                      {isActiveNow ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[11px] font-medium shrink-0 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          {t.schedulePage.inClass}
                        </span>
                      ) : (
                        <span className="text-[11px] font-mono text-slate-400 dark:text-slate-400 shrink-0 px-2 py-0.5 rounded bg-slate-100/60 dark:bg-slate-800/50">
                          {course.credits} {t.schedulePage.totalCredits}
                        </span>
                      )}
                    </motion.div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Attendance / Warning Card — Light & Dark SaaS Adaptive Style */}
          <div className="bg-white dark:bg-slate-900/90 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-5 text-slate-900 dark:text-white relative overflow-hidden flex flex-col justify-between shadow-sm transition-colors">
            <div>
              <div className="flex items-center justify-between mb-3.5">
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                  <Info className="w-4 h-4 text-purple-600 dark:text-purple-400" /> {t.schedulePage.warnings}
                </h3>
                <span className="text-[10px] font-mono text-purple-700 dark:text-purple-300 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800/50 px-2 py-0.5 rounded-full font-medium">
                  Policy
                </span>
              </div>
              <ul className="space-y-2.5 text-slate-600 dark:text-slate-300 text-xs">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-purple-600 dark:text-purple-300 shrink-0 mt-0.5">1</span>
                  <span className="leading-relaxed">{t.schedulePage.warningLate}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-purple-600 dark:text-purple-300 shrink-0 mt-0.5">2</span>
                  <span className="leading-relaxed">{t.schedulePage.warningLeave}</span>
                </li>
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-[10px] font-mono font-bold text-purple-600 dark:text-purple-300 shrink-0 mt-0.5">3</span>
                  <span className="leading-relaxed">{t.schedulePage.warningDress}</span>
                </li>
              </ul>
            </div>
            <Button className="w-full mt-5 bg-purple-600 hover:bg-purple-700 text-white font-medium text-xs h-8 rounded-xl transition-all duration-150 shadow-sm">
              {t.schedulePage.viewRules}
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // Lecturer View
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
          <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {t.schedulePage.lecturerTitle}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{t.schedulePage.lecturerHighlight}</span>
          </motion.h1>
        </div>
        <Button
          variant={isEditMode ? "secondary" : "default"}
          onClick={() => setIsEditMode(!isEditMode)}
          className="rounded-xl px-6"
        >
          {isEditMode ? t.schedulePage.saveChanges : t.schedulePage.editSchedule}
        </Button>
      </div>

      {isEditMode && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-orange-50 border border-orange-200 text-orange-800 p-4 rounded-xl flex items-center gap-3 dark:text-slate-200"
        >
          <Clock className="w-5 h-5" />
          <span className="font-medium">Complete editing mode enabled. Drag and drop slots to reschedule.</span>
        </motion.div>
      )}

      <motion.div variants={itemVariants} className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 dark:bg-slate-900 dark:border-slate-700">
        {isLoading ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
            กำลังโหลดตารางสอนจากระบบ...
          </div>
        ) : courses.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
            ไม่พบข้อมูลตารางสอนจากระบบ
          </div>
        ) : isEditMode ? (
          <DraggableSchedule
            initialSchedule={scheduleItems}
            editable={true}
            onRequestMove={handleRequestMove}
          />
        ) : (
          <Timetable
            courses={courses}
            semester={courses[0]?.semester ?? 1}
            academicYear={courses[0]?.academicYear ?? '2568'}
          />
        )}
      </motion.div>
    </motion.div>
  );
}
