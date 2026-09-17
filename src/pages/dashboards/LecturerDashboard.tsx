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
          <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight leading-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {t.lecturerDashboard.hello} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-500">{lecturer.nameThai}</span> 👋
          </motion.h1>
        </div>

        <motion.div variants={itemVariants} className="flex items-center gap-3">
          <Link to="/schedule">
            <Button variant="outline" className="h-9 px-3.5 text-xs font-medium rounded-xl border-slate-200/80 dark:border-slate-800">
              <Calendar className="w-4 h-4 mr-2" />
              {t.lecturerDashboard.manageSchedule}
            </Button>
          </Link>
          <Link to="/messages">
            <Button className="bg-slate-900 dark:bg-blue-600 hover:bg-slate-800 dark:hover:bg-blue-700 text-white h-9 px-4 text-xs font-semibold rounded-xl">
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
          className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5"
        >
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                <BookOpen className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.lecturerDashboard.coursesTaught}</span>
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{lecturerCourses.length}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.lecturerDashboard.coursesThisSem}</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/students')}
          className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5"
        >
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                <Users className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.lecturerDashboard.totalStudents}</span>
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{totalStudents}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.lecturerDashboard.allStudents}</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/students')}
          className={`bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 cursor-pointer ${atRiskAdvisees.length > 0
            ? ''
            : ''
            }`}
        >
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                <Award className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.lecturerDashboard.advisees}</span>
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{adviseesList.length}/{lecturer.maxAdvisees}</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">
              {atRiskAdvisees.length > 0 ? `${t.lecturerDashboard.atRisk} ${atRiskAdvisees.length} ${t.lecturerDashboard.people}` : t.lecturerDashboard.allNormal}
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          onClick={() => navigate('/workload')}
          className={`bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 cursor-pointer ${workloadPercentage >= 80
            ? ''
            : ''
            }`}
        >
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                <Clock className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{t.lecturerDashboard.workload}</span>
            </div>
            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{lecturer.teachingHours}/{lecturer.maxTeachingHours} ชม.</div>
            <div className="text-xs text-slate-400 dark:text-slate-500 mt-1">{workloadPercentage.toFixed(0)}% {t.lecturerDashboard.ofWorkTime}</div>
          </div>
        </motion.div>
      </motion.div>

      <motion.div variants={itemVariants} className="mt-8">
        <Tabs defaultValue="courses" className="space-y-6">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
            <TabsTrigger value="courses" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none">{t.lecturerDashboard.coursesTab}</TabsTrigger>
            <TabsTrigger value="students" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none">{t.lecturerDashboard.studentsTab}</TabsTrigger>
            <TabsTrigger value="advisees" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none">{t.lecturerDashboard.adviseesTab}</TabsTrigger>
            <TabsTrigger value="grades" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none">{t.lecturerDashboard.gradesTab}</TabsTrigger>
            <TabsTrigger value="schedule" className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none">{t.lecturerDashboard.scheduleTab}</TabsTrigger>
          </TabsList>

          {/* Courses Tab */}
          <TabsContent value="courses" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Courses List */}
              <div className="lg:col-span-2 space-y-4">
                <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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
                              {course.assignments?.length || 0}
                            </div>
                            <div className="text-xs text-gray-600 dark:text-slate-300">{t.lecturerDashboard.assignments}</div>
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
                <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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
                <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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
                <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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
            <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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

            <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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
            <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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
            <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
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
