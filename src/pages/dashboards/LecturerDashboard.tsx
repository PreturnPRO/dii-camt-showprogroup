import React from 'react';
import { motion } from 'framer-motion';
import { Users, Calendar, BookOpen, ClipboardList, ChevronRight, UserCog, CheckSquare, PenLine } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { WeeklyTimetable } from '@/components/common/WeeklyTimetable';
import { useWeekMoves } from '@/hooks/use-week-moves';
import { api } from '@/lib/api';
import { asArray, asRecord } from '@/lib/live-data';
import { mapAppointment, mapCourse } from '@/lib/live-mappers';
import { teachingEntries, termKey, type Term } from '@/lib/timetable';
import { gradeProgress, teachingTerm, upcomingAppointments as upcomingFrom } from '@/lib/lecturer-dashboard';
import { thaiToday } from '@/lib/thai-date';

type LecturerCourse = ReturnType<typeof mapCourse>;
type LecturerAppointment = ReturnType<typeof mapAppointment>;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function LecturerDashboard() {
  const { language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();

  const { weekStart: thisWeek, moves: weekMoves } = useWeekMoves();
  const [courses, setCourses] = React.useState<LecturerCourse[]>([]);
  const [appointments, setAppointments] = React.useState<LecturerAppointment[]>([]);
  const [adviseeCount, setAdviseeCount] = React.useState<number | null>(null);
  const [progress, setProgress] = React.useState<Map<string, { enrolled: number; awaitingGrade: number }>>(new Map());
  const [currentTerm, setCurrentTerm] = React.useState<Term | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  const rawUser = asRecord(user?.raw);
  const lecturerProfile = asRecord(rawUser.lecturerProfile);
  const nameThai = (lecturerProfile.nameThai as string) || user?.name || '';

  const copy =
    language === 'th'
      ? {
          title: 'แดชบอร์ดอาจารย์',
          subtitle: `สวัสดี ${nameThai}`,
          totalAdvisee: 'นักศึกษาในที่ปรึกษาทั้งหมด',
          weeklySchedule: 'ตารางสอนประจำสัปดาห์',
          coursesList: 'รายวิชาที่สอน',
          upcoming: 'งานและนัดหมายที่กำลังจะมาถึง',
          noCourses: 'ยังไม่มีวิชาที่สอนในเทอมนี้',
          noUpcoming: 'ไม่มีงานหรือนัดหมายที่จะถึง',
          viewAll: 'ดูทั้งหมด',
          credits: 'หน่วยกิต',
          reviewDiary: 'ตรวจไดอารี่ฝึกงาน',
          students: 'นักศึกษา',
          awaitingGrade: 'รอให้เกรด',
          takeAttendance: 'เช็คชื่อ',
          enterGrades: 'ให้เกรด',
          awaitingConfirm: 'รอยืนยัน',
        }
      : {
          title: 'Teacher Dashboard',
          subtitle: `Hello, ${nameThai}`,
          totalAdvisee: 'Total advisee',
          weeklySchedule: 'Weekly teaching schedule',
          coursesList: 'Courses list',
          upcoming: 'Upcoming work & appointments',
          noCourses: 'No courses this term.',
          noUpcoming: 'No upcoming work or appointments.',
          viewAll: 'View all',
          credits: 'credits',
          reviewDiary: 'Review Diary',
          students: 'Students',
          awaitingGrade: 'Awaiting grade',
          takeAttendance: 'Attendance',
          enterGrades: 'Grades',
          awaitingConfirm: 'To confirm',
        };

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.courses.lecturerSchedule(),
      api.appointments.list(),
    ]).then(([scheduleResult, appointmentsResult]) => {
      if (!mounted) return;

      if (scheduleResult.status === 'fulfilled') {
        setCourses(scheduleResult.value.schedule.map(mapCourse));
        setProgress(new Map(scheduleResult.value.schedule.map((raw) => [String(asRecord(raw).id), gradeProgress(raw)])));
        setCurrentTerm(teachingTerm(scheduleResult.value.schedule));
        const lecturer = asRecord(scheduleResult.value.lecturer);
        setAdviseeCount(asArray(lecturer.advisees).length);
      }
      if (appointmentsResult.status === 'fulfilled') {
        setAppointments(appointmentsResult.value.appointments.map(mapAppointment));
      }
    }).catch((error) => {
      console.warn('Unable to load lecturer dashboard data from API', error);
    }).finally(() => {
      if (mounted) setIsLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, []);

  // only what is still ahead (Bangkok calendar), and only this term's courses (M12)
  const upcomingAppointments = upcomingFrom(appointments, thaiToday());
  const termCourses = currentTerm ? courses.filter((course) => termKey({ semester: Number(course.semester), academicYear: String(course.academicYear) }) === termKey(currentTerm)) : [];

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="h-20 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <motion.h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-snug" variants={itemVariants}>
            {copy.title}
          </motion.h1>
          <motion.p className="mt-2 text-sm text-slate-500 dark:text-slate-400" variants={itemVariants}>
            {copy.subtitle}
          </motion.p>
        </div>

        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/intern-tracking')}
            className="rounded-xl border-slate-200 dark:border-slate-800 text-xs sm:text-sm"
          >
            <UserCog className="w-4 h-4 mr-1.5 text-blue-500" />
            {copy.reviewDiary}
          </Button>
          <Badge
            onClick={() => navigate('/advisees')}
            className="cursor-pointer text-sm px-4 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <Users className="w-4 h-4 mr-2" />
            {copy.totalAdvisee}: {adviseeCount ?? 0}
          </Badge>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div variants={itemVariants} className="lg:col-span-2">
          <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-emerald-500" />
                  {copy.weeklySchedule}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => navigate('/schedule')}>
                  {copy.viewAll} <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {courses.length > 0 ? (
                <WeeklyTimetable entries={teachingEntries(courses, currentTerm)} term={currentTerm} weekStart={thisWeek} moves={weekMoves} />
              ) : (
                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-10 text-center text-sm text-slate-500 dark:text-slate-400">
                  {copy.noCourses}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <div className="space-y-6">
          <motion.div variants={itemVariants}>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    {copy.coursesList}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/courses')}>
                    {copy.viewAll}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {termCourses.slice(0, 5).map((course) => {
                  const counts = progress.get(course.id) ?? { enrolled: 0, awaitingGrade: 0 };
                  return (
                    <div key={course.id} data-testid="lecturer-course" className="space-y-2 p-2.5 border border-slate-100 dark:border-slate-800 rounded-lg text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-medium truncate">{course.code}</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{course.nameThai || course.name}</div>
                        </div>
                        <Badge variant="outline" className="shrink-0">{course.credits} {copy.credits}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-300">
                        <span data-testid="course-enrolled">{copy.students}: <span className="font-mono font-semibold">{counts.enrolled}</span></span>
                        <span data-testid="course-awaiting" className={counts.awaitingGrade > 0 ? 'text-amber-700 dark:text-amber-400' : ''}>{copy.awaitingGrade}: <span className="font-mono font-semibold">{counts.awaitingGrade}</span></span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Button asChild size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs">
                          <Link to={`/attendance?courseId=${encodeURIComponent(course.id)}`}><CheckSquare className="mr-1 h-3.5 w-3.5" />{copy.takeAttendance}</Link>
                        </Button>
                        <Button asChild size="sm" variant="outline" className="h-7 rounded-lg px-2 text-xs">
                          <Link to={`/grades?courseId=${encodeURIComponent(course.id)}`}><PenLine className="mr-1 h-3.5 w-3.5" />{copy.enterGrades}</Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}
                {termCourses.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {copy.noCourses}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <ClipboardList className="w-4 h-4 text-orange-500" />
                    {copy.upcoming}
                  </CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/appointments')}>
                    {copy.viewAll}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {upcomingAppointments.map((appt) => (
                  <Link key={appt.id} to="/appointments" className="block p-2.5 border border-slate-100 dark:border-slate-800 rounded-lg text-sm hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium truncate">{appt.purpose || appt.studentName}</span>
                      {appt.status === 'pending' && <Badge variant="outline" className="shrink-0 border-amber-300 text-[11px] text-amber-700 dark:text-amber-400">{copy.awaitingConfirm}</Badge>}
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      {new Date(appt.date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })} · {appt.startTime}
                    </div>
                  </Link>
                ))}
                {upcomingAppointments.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-xs text-slate-500 dark:text-slate-400">
                    {copy.noUpcoming}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}
