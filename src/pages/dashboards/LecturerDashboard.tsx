import React from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen, Users, Calendar, TrendingUp, Clock,
  FileText, CheckCircle, AlertCircle, MessageSquare, Award,
  ChevronRight
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { mapAppointment, mapCourse, mapGrade, mapStudent } from '@/lib/live-mappers';

type LecturerCourse = ReturnType<typeof mapCourse>;
type LecturerStudent = ReturnType<typeof mapStudent>;
type LecturerGrade = ReturnType<typeof mapGrade>;
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
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const lecturer = {
    department: '',
    position: '',
    advisees: [] as string[],
    maxAdvisees: 0,
    teachingHours: 0,
    maxTeachingHours: 1,
    officeHours: [] as Array<{ id: string; day: string; startTime: string; endTime: string; location?: string }>,
    nameThai: user?.nameThai || user?.name || '',
    name: user?.name || '',
  };
  const [appointments, setAppointments] = React.useState<LecturerAppointment[]>([]);
  const [lecturerCourses, setLecturerCourses] = React.useState<LecturerCourse[]>([]);
  const [students, setStudents] = React.useState<LecturerStudent[]>([]);
  const [grades, setGrades] = React.useState<LecturerGrade[]>([]);
  const upcomingAppointments = appointments.filter(a => a.status === 'confirmed').slice(0, 3);

  const totalStudents = lecturerCourses.reduce((sum, course) => sum + course.enrolledStudents.length, 0);

  // Advisees
  const matchedAdvisees = students.filter(s => lecturer.advisees.includes(s.id) || lecturer.advisees.includes(s.studentId));
  const adviseesList = matchedAdvisees.length > 0 ? matchedAdvisees : students.slice(0, lecturer.maxAdvisees);
  const atRiskAdvisees = adviseesList.filter(s => s.academicStatus === 'probation' || s.academicStatus === 'risk');

  const workloadPercentage = (lecturer.teachingHours / lecturer.maxTeachingHours) * 100;

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.courses.lecturerSchedule(),
      api.students.list(),
      api.appointments.list(),
      api.enrollments.list(),
    ]).then(([scheduleResult, studentsResult, appointmentsResult, enrollmentsResult]) => {
      if (!mounted) return;
      if (scheduleResult.status === 'fulfilled') {
        setLecturerCourses(scheduleResult.value.schedule.map(mapCourse));
      }
      if (studentsResult.status === 'fulfilled') {
        setStudents(studentsResult.value.students.map(mapStudent));
      }
      if (appointmentsResult.status === 'fulfilled') {
        setAppointments(appointmentsResult.value.appointments.map(mapAppointment));
      }
      if (enrollmentsResult.status === 'fulfilled') {
        const nextGrades = enrollmentsResult.value.enrollments.map(mapGrade).filter((grade) => grade.letterGrade || typeof grade.total === 'number');
        setGrades(nextGrades);
      }
    }).catch((error) => {
      console.warn('Unable to load lecturer dashboard data from API', error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 relative pb-10"
    >
      {/* Decorative Background */}
      <div className="absolute top-0 left-0 w-full h-[300px] overflow-hidden -z-10 pointer-events-none rounded-3xl">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[150%] rounded-full bg-emerald-400/20 dark:bg-emerald-900/20 blur-[100px]" />
        <div className="absolute top-[10%] -right-[10%] w-[40%] h-[120%] rounded-full bg-teal-400/20 dark:bg-teal-900/20 blur-[120px]" />
      </div>

      {/* Welcome Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pt-4">
        <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-3">
            <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
              <BookOpen className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="tracking-wide uppercase text-sm font-semibold">{`${lecturer.department} • ${lecturer.position === 'assistant_professor' ? 'ผู้ช่วยศาสตราจารย์' :
              lecturer.position === 'associate_professor' ? 'รองศาสตราจารย์' :
                lecturer.position === 'professor' ? 'ศาสตราจารย์' : 'อาจารย์'
              }`}</span>
          </motion.div>
          <motion.h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {t.lecturerDashboard.hello} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">{lecturer.nameThai}</span>
          </motion.h1>
        </div>

        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Link to="/schedule">
            <Button variant="outline" className="rounded-lg px-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-slate-200/60 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
              <Calendar className="w-4 h-4 mr-2" />
              {t.lecturerDashboard.manageSchedule}
            </Button>
          </Link>
          <Link to="/messages">
            <Button className="rounded-lg px-5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-all border-0">
              <MessageSquare className="w-4 h-4 mr-2" />
              {t.lecturerDashboard.messages}
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Key Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/courses')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white shadow-xl shadow-emerald-200 cursor-pointer"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.lecturerDashboard.coursesTaught}</span>
            </div>
            <div className="text-4xl font-bold">{lecturerCourses.length}</div>
            <div className="text-sm text-white/80 mt-2">{t.lecturerDashboard.coursesThisSem}</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/students')}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-6 text-white shadow-xl shadow-blue-200 cursor-pointer"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.lecturerDashboard.totalStudents}</span>
            </div>
            <div className="text-4xl font-bold">{totalStudents}</div>
            <div className="text-sm text-white/80 mt-2">{t.lecturerDashboard.allStudents}</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/students')}
          className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl cursor-pointer ${atRiskAdvisees.length > 0
            ? 'bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 shadow-orange-200'
            : 'bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 shadow-purple-200'
            }`}
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <Award className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.lecturerDashboard.advisees}</span>
            </div>
            <div className="text-4xl font-bold">{adviseesList.length}/{lecturer.maxAdvisees}</div>
            <div className="text-sm text-white/80 mt-2">
              {atRiskAdvisees.length > 0 ? `${t.lecturerDashboard.atRisk} ${atRiskAdvisees.length} ${t.lecturerDashboard.people}` : t.lecturerDashboard.allNormal}
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/workload')}
          className={`relative overflow-hidden rounded-2xl p-6 text-white shadow-xl cursor-pointer ${workloadPercentage >= 80
            ? 'bg-gradient-to-br from-red-500 via-rose-500 to-pink-500 shadow-red-200'
            : 'bg-gradient-to-br from-green-500 via-emerald-500 to-teal-500 shadow-green-200'
            }`}
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <Clock className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.lecturerDashboard.workload}</span>
            </div>
            <div className="text-3xl font-bold">{lecturer.teachingHours}/{lecturer.maxTeachingHours} ชม.</div>
            <div className="text-sm text-white/80 mt-2">{workloadPercentage.toFixed(0)}% {t.lecturerDashboard.ofWorkTime}</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-8">
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5 lg:w-auto p-1 bg-slate-100/50 dark:bg-slate-800/50 backdrop-blur-md rounded-2xl">
            <TabsTrigger value="courses" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">{t.lecturerDashboard.coursesTab}</TabsTrigger>
            <TabsTrigger value="students" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">{t.lecturerDashboard.studentsTab}</TabsTrigger>
            <TabsTrigger value="advisees" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">{t.lecturerDashboard.adviseesTab}</TabsTrigger>
            <TabsTrigger value="grades" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">{t.lecturerDashboard.gradesTab}</TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">{t.lecturerDashboard.scheduleTab}</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Courses List */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                  <CardHeader>
                    <CardTitle>{t.lecturerDashboard.courseList}</CardTitle>
                    <CardDescription>เทอม 1/2568 • {lecturerCourses.length} วิชา</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {lecturerCourses.map(course => (
                      <div key={course.id} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-semibold text-lg">{course.code}</h3>
                              <Badge variant="secondary">{course.credits} {t.lecturerDashboard.credits}</Badge>
                            </div>
                            <p className="text-gray-600 dark:text-slate-300">{course.nameThai}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4 pt-3 border-t">
                          <div className="text-center">
                            <div className="text-2xl font-bold text-blue-600 dark:text-slate-300">
                              {course.enrolledStudents.length}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-slate-300">{t.lecturerDashboard.students}</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {course.sections.length}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-slate-300">Section</div>
                          </div>
                          <div className="text-center">
                            <div className="text-2xl font-bold text-purple-600 dark:text-slate-300">
                              {course.grades.length}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-slate-300">{t.lecturerDashboard.gradesTab}</div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate('/courses')}>
                            <FileText className="w-4 h-4 mr-2" />
                            {t.lecturerDashboard.manageCourse}
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1" onClick={() => navigate('/students')}>
                            <Users className="w-4 h-4 mr-2" />
                            {t.lecturerDashboard.viewStudents}
                          </Button>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-4">
                {/* Workload */}
                <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                  <CardHeader>
                    <CardTitle className="text-sm">{t.lecturerDashboard.teachingWorkload}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm">{t.lecturerDashboard.teachingHours}</span>
                        <span className="text-sm font-semibold">
                          {lecturer.teachingHours}/{lecturer.maxTeachingHours} ชม.
                        </span>
                      </div>
                      <Progress value={workloadPercentage} className="h-2" />
                      <p className="text-xs text-gray-500 dark:text-slate-400 mt-2">
                        {workloadPercentage < 80 ? t.lecturerDashboard.workloadNormal : t.lecturerDashboard.workloadHigh}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                {/* Upcoming Appointments */}
                <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">{t.lecturerDashboard.upcomingAppointments}</CardTitle>
                      <Button variant="ghost" size="sm">{t.lecturerDashboard.viewAll}</Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {upcomingAppointments.length > 0 ? (
                      upcomingAppointments.map(apt => (
                        <div key={apt.id} className="border rounded-lg p-3 space-y-2">
                          <div className="font-semibold text-sm">{apt.studentName}</div>
                          <div className="text-xs text-gray-600 dark:text-slate-300">{apt.purpose}</div>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-slate-400">
                            <span>{new Date(apt.date).toLocaleDateString('th-TH')}</span>
                            <span>{apt.startTime} - {apt.endTime}</span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-slate-400 text-center py-4">
                        {t.lecturerDashboard.noAppointments}
                      </p>
                    )}
                  </CardContent>
                </Card>

                {/* Office Hours */}
                <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                  <CardHeader>
                    <CardTitle className="text-sm">{t.lecturerDashboard.consultHours}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {lecturer.officeHours.map(hour => (
                      <div key={hour.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded dark:bg-slate-800">
                        <span className="font-medium capitalize">{hour.day}</span>
                        <span className="text-gray-600 dark:text-slate-300">{hour.startTime}-{hour.endTime}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
              <CardHeader>
                <CardTitle>{t.lecturerDashboard.allStudentsInCourses}</CardTitle>
                <CardDescription>{t.lecturerDashboard.studentsInCourses}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lecturerCourses.map(course => {
                    const courseStudents = students.filter(s =>
                      course.enrolledStudents.includes(s.id)
                    );
                    return (
                      <div key={course.id} className="border rounded-lg p-4">
                        <h3 className="font-semibold mb-3">{course.code} - {course.nameThai}</h3>
                        <div className="grid gap-2">
                          {courseStudents.map(student => (
                            <div key={student.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg dark:bg-slate-800">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center dark:bg-slate-800">
                                  <span className="text-sm font-semibold text-blue-600 dark:text-slate-300">
                                    {student.nameThai.charAt(0)}
                                  </span>
                                </div>
                                <div>
                                  <div className="font-semibold text-sm">{student.nameThai}</div>
                                  <div className="text-xs text-gray-600 dark:text-slate-300">{student.studentId}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <Badge variant="secondary">GPA {student.gpa.toFixed(2)}</Badge>
                                <Button size="sm" variant="ghost">{t.lecturerDashboard.viewData}</Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Advisees Tab */}
          <TabsContent value="advisees" className="space-y-4">
            {atRiskAdvisees.length > 0 && (
              <Card className="bg-red-50/60 backdrop-blur-xl border border-red-200 rounded-3xl shadow-sm">
                <CardHeader>
                  <CardTitle className="text-red-900 flex items-center gap-2 dark:text-slate-200">
                    <AlertCircle className="w-5 h-5" />
                    {t.lecturerDashboard.atRiskStudents} ({atRiskAdvisees.length} {t.lecturerDashboard.people})
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {atRiskAdvisees.map(student => (
                    <div key={student.id} className="bg-white border border-red-200 rounded-lg p-4 dark:bg-slate-900">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{student.nameThai}</h3>
                          <p className="text-sm text-gray-600 dark:text-slate-300">{student.studentId}</p>
                        </div>
                        <Badge variant="destructive">{student.academicStatus}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-slate-300">GPA</div>
                          <div className="font-semibold text-red-600 dark:text-slate-300">{student.gpa.toFixed(2)}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-slate-300">{t.lecturerDashboard.credits}</div>
                          <div className="font-semibold">{student.earnedCredits}/{student.totalCredits}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-600 dark:text-slate-300">{t.lecturerDashboard.year}</div>
                          <div className="font-semibold">{student.year}</div>
                        </div>
                      </div>
                      <Link to={`/students`}>
                        <Button size="sm" className="w-full">
                          <MessageSquare className="w-4 h-4 mr-2" />
                          {t.lecturerDashboard.contactConsult}
                        </Button>
                      </Link>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
              <CardHeader>
                <CardTitle>{t.lecturerDashboard.allAdvisees}</CardTitle>
                <CardDescription>{adviseesList.length} {t.lecturerDashboard.people}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {adviseesList.map(student => (
                    <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <span className="text-lg font-bold text-white">
                            {student.nameThai.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold">{student.nameThai}</h3>
                          <p className="text-sm text-gray-600 dark:text-slate-300">{student.studentId} • {t.lecturerDashboard.yearLevel} {student.year}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <div className="text-sm font-semibold">GPA {student.gpa.toFixed(2)}</div>
                          <Badge variant={student.academicStatus === 'normal' ? 'default' : 'destructive'}>
                            {student.academicStatus === 'normal' ? t.lecturerDashboard.normal : t.lecturerDashboard.risk}
                          </Badge>
                        </div>
                        <Link to={`/intern-tracking?internId=${student.id}&tab=daily`}>
                          <Button size="sm" variant="outline" className="gap-1.5 text-xs text-orange-600 border-orange-200 hover:bg-orange-50 dark:border-orange-800 dark:text-orange-400">
                            <BookOpen className="w-3.5 h-3.5 text-orange-500" />
                            {language === 'th' ? 'ตรวจไดอารี่ฝึกงาน' : 'Review Diary'}
                          </Button>
                        </Link>
                        <Button size="sm" variant="outline">{t.lecturerDashboard.viewData}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Grades Tab */}
          <TabsContent value="grades">
            <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
              <CardHeader>
                <CardTitle>{t.lecturerDashboard.gradeManagement}</CardTitle>
                <CardDescription>{t.lecturerDashboard.gradeManagementDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lecturerCourses.map(course => {
                    const courseGrades = grades.filter(g => g.courseId === course.id);
                    return (
                      <div key={course.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <h3 className="font-semibold">{course.code} - {course.nameThai}</h3>
                            <p className="text-sm text-gray-600 dark:text-slate-300">{courseGrades.length} {t.lecturerDashboard.points}</p>
                          </div>
                          <Button size="sm">
                            <FileText className="w-4 h-4 mr-2" />
                            {t.lecturerDashboard.saveGrade}
                          </Button>
                        </div>
                        {courseGrades.length > 0 && (
                          <div className="space-y-2">
                            {courseGrades.map((grade, index) => {
                              const student = students.find(s => s.id === grade.studentId || s.studentId === grade.studentId);
                              return (
                                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded dark:bg-slate-800">
                                  <span className="text-sm">{student?.nameThai}</span>
                                  <div className="flex items-center gap-2">
                                    <Badge>{grade.letterGrade}</Badge>
                                    <span className="text-sm text-gray-600 dark:text-slate-300">{grade.total?.toFixed(0)} {t.lecturerDashboard.points}</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Schedule Tab */}
          <TabsContent value="schedule">
            <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
              <CardHeader>
                <CardTitle>{t.lecturerDashboard.weeklySchedule}</CardTitle>
                <CardDescription>{t.lecturerDashboard.weeklyScheduleDesc}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {lecturerCourses.map(course => (
                    <div key={course.id} className="border rounded-lg p-4">
                      <h3 className="font-semibold mb-3">{course.code} - {course.nameThai}</h3>
                      <div className="grid gap-2">
                        {course.schedule.map((schedule, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-blue-50 rounded-lg dark:bg-slate-800">
                            <div className="flex items-center gap-3">
                              <Calendar className="w-4 h-4 text-blue-600 dark:text-slate-300" />
                              <span className="font-medium">{schedule.dayThai}</span>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-slate-300">
                              <span>{schedule.startTime} - {schedule.endTime}</span>
                              <span>{t.lecturerDashboard.room} {schedule.room}</span>
                              <Badge variant="secondary">{schedule.type}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </motion.div>
  );
}
