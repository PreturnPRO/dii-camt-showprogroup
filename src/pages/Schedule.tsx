import React from 'react';
import { motion } from 'framer-motion';
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
import { toast } from 'sonner';
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
  const [currentWeek, setCurrentWeek] = React.useState(0);
  const [isEditMode, setIsEditMode] = React.useState(false);
  const [courses, setCourses] = React.useState<Course[]>([]);
  const [student, setStudent] = React.useState<Student | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

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
      (course.schedule || []).map((slot, idx) => ({
        id: `${course.id}-${idx}`,
        courseCode: course.code,
        courseName: course.name,
        day: dayIndexByName[slot.day.toLowerCase()] ?? 0,
        startTime: slot.startTime,
        endTime: slot.endTime,
        room: slot.room || course.room || (language === 'en' ? 'TBA' : 'ไม่ระบุ')
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

  const currentDate = new Date();
  currentDate.setDate(currentDate.getDate() + (currentWeek * 7));

  // Format week range
  const startOfWeek = new Date(currentDate);
  const day = startOfWeek.getDay();
  const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
  startOfWeek.setDate(diff);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 4);

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
              className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.schedulePage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600">{t.schedulePage.titleHighlight}</span>
            </motion.h1>
          </div>

          <motion.div
            className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-2xl p-1.5 shadow-sm border border-slate-200 dark:border-slate-700"
            whileHover={{ scale: 1.02 }}
          >
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(currentWeek - 1)} className="rounded-xl hover:bg-slate-100 dark:bg-slate-800">
              <ChevronLeft className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
            <div className="px-4 text-sm font-bold text-slate-700 dark:text-slate-300">
              {startOfWeek.getDate()} {startOfWeek.toLocaleDateString('th-TH', { month: 'short' })} - {endOfWeek.getDate()} {endOfWeek.toLocaleDateString('th-TH', { month: 'short' })}
            </div>
            <Button variant="ghost" size="icon" onClick={() => setCurrentWeek(currentWeek + 1)} className="rounded-xl hover:bg-slate-100 dark:bg-slate-800">
              <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </Button>
          </motion.div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90 text-sm">{t.schedulePage.totalCourses}</span>
            </div>
            <div className="text-3xl font-bold">{studentCourses.length}</div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <GraduationCap className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90 text-sm">{t.schedulePage.totalCredits}</span>
            </div>
            <div className="text-3xl font-bold">{totalCredits}</div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-5 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90 text-sm">{t.schedulePage.hoursPerWeek}</span>
            </div>
            <div className="text-3xl font-bold">{totalHours}</div>
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
            <div className="text-3xl font-bold">{t.schedulePage.monFri}</div>
          </motion.div>
        </div>

        {/* Timetable Card */}
        <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
          {isLoading ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              กำลังโหลดตารางเรียนจากระบบ...
            </div>
          ) : studentCourses.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-10 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:text-slate-400">
              ยังไม่มีรายวิชาที่ลงทะเบียนในระบบ
            </div>
          ) : (
            <Timetable
              courses={studentCourses}
              semester={student.semester}
              academicYear={student.academicYear}
            />
          )}
        </motion.div>

        {/* Today's Classes */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-purple-500 dark:text-slate-400" /> {t.schedulePage.todayClasses}
            </h3>
            <div className="space-y-3">
              {!isLoading && studentCourses.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white/70 p-6 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                  ยังไม่มีคาบเรียนวันนี้จากระบบ
                </div>
              )}
              {studentCourses.slice(0, 3).map((course, index) => {
                const slot = course.schedule?.[0];
                const location = [slot?.room, slot?.building].filter(Boolean).join(' ');

                return (
                <motion.div
                  key={course.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex flex-col items-center justify-center bg-purple-50 text-purple-700 rounded-xl px-4 py-2 min-w-[80px] group-hover:bg-purple-500 group-hover:text-white transition-colors dark:text-slate-300 dark:bg-slate-800">
                    <div className="text-sm font-bold">{slot?.startTime || '--:--'}</div>
                    <div className="text-xs opacity-75">{slot?.endTime || '--:--'}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-800 dark:text-slate-200 group-hover:text-purple-600 transition-colors truncate">{course.name}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-1">
                      <MapPin className="w-3 h-3 shrink-0" />
                      <span className="truncate">{location || '-'}</span>
                    </div>
                  </div>
                  <Badge variant="secondary" className="bg-purple-100 text-purple-600 group-hover:bg-white group-hover:text-purple-600 dark:text-slate-300 dark:bg-slate-800 shrink-0">
                    {t.schedulePage.inClass}
                  </Badge>
                </motion.div>
                );
              })}
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
