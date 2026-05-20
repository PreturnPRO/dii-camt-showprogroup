import React from 'react';
import { motion } from 'framer-motion';
import { 
  BookOpen, 
  Users, 
  ClipboardList, 
  Calendar,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  Clock,
  GraduationCap
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { StatsCard } from '@/components/common/StatsCard';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { mapAppointment, mapCourse, mapStudent } from '@/lib/live-mappers';
import { Link } from 'react-router-dom';
import type { Appointment, Course } from '@/types';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function TeacherDashboard() {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [teacherCourses, setTeacherCourses] = React.useState<Course[]>([]);
  const [teacherAppointments, setTeacherAppointments] = React.useState<Appointment[]>([]);
  const [atRiskStudents, setAtRiskStudents] = React.useState<{ id: string; name: string; studentId: string; gpa: number; issue: string }[]>([]);
  const totalCourses = teacherCourses.length;
  const totalStudents = teacherCourses.reduce((sum, course) => sum + (course.enrolledStudents?.length || 0), 0);
  const pendingAppointments = teacherAppointments.filter(apt => apt.status === 'pending').length;
  const advisees = totalStudents;

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.courses.lecturerSchedule(),
      api.appointments.list(),
      api.students.list(),
    ]).then(([scheduleResult, appointmentsResult, studentsResult]) => {
      if (!mounted) return;
      if (scheduleResult.status === 'fulfilled') {
        setTeacherCourses(scheduleResult.value.schedule.map(mapCourse));
      }
      if (appointmentsResult.status === 'fulfilled') {
        setTeacherAppointments(appointmentsResult.value.appointments.map(mapAppointment));
      }
      if (studentsResult.status === 'fulfilled') {
        setAtRiskStudents(studentsResult.value.students
          .map(mapStudent)
          .filter(student => student.academicStatus === 'probation' || student.academicStatus === 'risk')
          .map(student => ({
            id: student.id,
            name: student.nameThai,
            studentId: student.studentId,
            gpa: student.gpa,
            issue: student.academicStatus,
          })));
      }
    }).catch((error) => {
      console.warn('Unable to load teacher dashboard data from API', error);
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
      className="space-y-6"
    >
      {/* Welcome Section */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            {t.teacherDashboard.hello} {user?.nameThai || user?.name || ''}
          </h1>
          <p className="text-muted-foreground mt-1">
            {user?.email || ''}
          </p>
        </div>
        <Button variant="teacher" asChild>
          <Link to="/grades">
            <GraduationCap className="mr-2 h-4 w-4" />
            {t.teacherDashboard.manageSchedule}
          </Link>
        </Button>
      </motion.div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title={t.teacherDashboard.coursesTaught}
          value={totalCourses}
          subtitle={t.teacherDashboard.coursesThisSem}
          icon={<BookOpen className="w-5 h-5" />}
          variant="teacher"
        />
        <StatsCard
          title={t.teacherDashboard.totalStudents}
          value={totalStudents}
          subtitle={t.teacherDashboard.people}
          icon={<Users className="w-5 h-5" />}
          variant="default"
        />
        <StatsCard
          title={t.teacherDashboard.pendingGrades}
          value={12}
          subtitle={t.teacherDashboard.items}
          icon={<ClipboardList className="w-5 h-5" />}
          variant="warning"
        />
        <StatsCard
          title={t.teacherDashboard.pendingAppointments}
          value={pendingAppointments}
          subtitle={t.teacherDashboard.appointmentsLabel}
          icon={<Calendar className="w-5 h-5" />}
          variant="default"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <motion.div variants={itemVariants} className="lg:col-span-2 space-y-6">
          {/* Courses */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{t.teacherDashboard.courseList}</CardTitle>
                <CardDescription>{t.teacherDashboard.semester}</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/courses">
                  {t.teacherDashboard.viewAll}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teacherCourses.slice(0, 3).map((course) => (
                  <div
                    key={course.id}
                    className="flex items-center justify-between p-4 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg bg-role-teacher/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-role-teacher" />
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{course.name}</p>
                        <p className="text-sm text-muted-foreground">{course.code} • {course.schedule?.[0] ? `${course.schedule[0].day} ${course.schedule[0].startTime}` : '-'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-foreground">{course.enrolledStudents?.length || 0}</p>
                      <p className="text-xs text-muted-foreground">{t.teacherDashboard.students}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* At-Risk Students */}
          <Card className="border-warning/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-warning" />
                <div>
                  <CardTitle>{t.teacherDashboard.atRiskStudents}</CardTitle>
                  <CardDescription>{t.teacherDashboard.atRiskDesc}</CardDescription>
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/students">
                  {t.teacherDashboard.viewAll}
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atRiskStudents.map((student) => (
                  <div
                    key={student.id}
                    className="flex items-center justify-between p-4 rounded-xl border border-warning/30 bg-warning/5 hover:bg-warning/10 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback className="bg-warning/20 text-warning">
                          {student.name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">{student.studentId}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant="outline" className="bg-warning/10 border-warning/30 text-warning">
                        GPA {student.gpa.toFixed(2)}
                      </Badge>
                      <p className="text-xs text-warning mt-1">{student.issue}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Right Column */}
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Upcoming Appointments */}
          <Card>
            <CardHeader>
              <CardTitle>{t.teacherDashboard.upcomingAppointments}</CardTitle>
              <CardDescription>{t.teacherDashboard.appointmentsDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {teacherAppointments.map((appointment) => (
                  <div key={appointment.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      appointment.status === 'confirmed' ? 'bg-success/10' : 'bg-warning/10'
                    }`}>
                      {appointment.status === 'confirmed' ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-sm text-foreground">{appointment.purpose}</p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.date.toLocaleDateString('th-TH')} • {appointment.startTime} น.
                      </p>
                      <Badge 
                        variant={appointment.status === 'confirmed' ? 'default' : 'outline'}
                        className="mt-1 text-xs"
                      >
                        {appointment.status === 'confirmed' ? t.teacherDashboard.confirmed : t.teacherDashboard.pending}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4" asChild>
                <Link to="/appointments">{t.teacherDashboard.viewAllAppointments}</Link>
              </Button>
            </CardContent>
          </Card>

          {/* Advisees Summary */}
          <Card>
            <CardHeader>
              <CardTitle>{t.teacherDashboard.adviseeSummary}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.teacherDashboard.allStudents}</span>
                  <span className="font-semibold">{advisees}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.teacherDashboard.normalStatus}</span>
                  <span className="font-semibold text-success">{advisees - atRiskStudents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">{t.teacherDashboard.needsAttention}</span>
                  <span className="font-semibold text-warning">{atRiskStudents.length}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>{t.teacherDashboard.quickActions}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/grades">
                  <ClipboardList className="mr-2 h-4 w-4" />
                  {t.teacherDashboard.recordGrades}
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/assignments">
                  <BookOpen className="mr-2 h-4 w-4" />
                  {t.teacherDashboard.createAssignment}
                </Link>
              </Button>
              <Button variant="outline" className="w-full justify-start" asChild>
                <Link to="/students">
                  <Users className="mr-2 h-4 w-4" />
                  {t.teacherDashboard.viewStudentList}
                </Link>
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
