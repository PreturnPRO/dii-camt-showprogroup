import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, BookOpen, Building, Activity, Settings, Database, Bell } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsCard } from '@/components/common/StatsCard';
import { api } from '@/lib/api';
import { asNumber, asRecord } from '@/lib/live-data';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [apiOnline, setApiOnline] = React.useState<boolean | null>(null); // D-17: สถานะจริงจาก API
  const [stats, setStats] = React.useState({
    totalUsers: 0,
    totalCourses: 0,
    totalCompanies: 0,
    totalStudents: 0,
    totalLecturers: 0,
  });

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([
      api.reports.systemUsage(),
      api.companies.list(),
      api.students.list(),
      api.lecturers.list(),
    ]).then(([reportResult, companiesResult, studentsResult, lecturersResult]) => {
      if (!mounted) return;
      setApiOnline(reportResult.status === 'fulfilled'); // D-17: query DB ผ่าน = API+DB online
      const report = reportResult.status === 'fulfilled' ? asRecord(reportResult.value.report) : {};
      setStats(() => ({
        totalUsers: asNumber(report.totalUsers, 0),
        totalCourses: asNumber(report.totalCourses, 0),
        totalCompanies: companiesResult.status === 'fulfilled' ? companiesResult.value.companies.length : 0,
        totalStudents: studentsResult.status === 'fulfilled' ? studentsResult.value.students.length : 0,
        totalLecturers: lecturersResult.status === 'fulfilled' ? lecturersResult.value.lecturers.length : 0,
      }));
    }).catch((error) => {
      console.warn('Unable to load admin dashboard stats from API', error);
    });

    return () => {
      mounted = false;
    };
  }, []);

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 p-6">
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-slate-200">{t.adminDashboard.title}</h1>
          <p className="text-gray-600 mt-1 dark:text-slate-300">{t.adminDashboard.subtitle}</p>
        </div>
        <Button onClick={() => navigate('/settings')}><Settings className="w-4 h-4 mr-2" />{t.adminDashboard.systemSettings}</Button>
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard title={t.adminDashboard.totalUsers} value={stats.totalUsers.toString()} icon={<Users className="w-5 h-5" />} description={t.adminDashboard.totalUsersDesc} />
        <StatsCard title={t.adminDashboard.courses} value={stats.totalCourses.toString()} icon={<BookOpen className="w-5 h-5" />} description={t.adminDashboard.coursesDesc} />
        <StatsCard title={t.adminDashboard.companies} value={stats.totalCompanies.toString()} icon={<Building className="w-5 h-5" />} description={t.adminDashboard.companiesDesc} />
        <StatsCard title={t.adminDashboard.system} value={t.adminDashboard.systemNormal} icon={<Activity className="w-5 h-5" />} description={t.adminDashboard.systemWorking} />
      </motion.div>

      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader><CardTitle>{t.adminDashboard.manageUsers}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/users')}><Users className="w-4 h-4 mr-2" />{t.adminDashboard.manageStudents} ({stats.totalStudents})</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/personnel')}><Users className="w-4 h-4 mr-2" />{t.adminDashboard.manageLecturers} ({stats.totalLecturers})</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/cooperation')}><Building className="w-4 h-4 mr-2" />{t.adminDashboard.manageCompanies} ({stats.totalCompanies})</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.adminDashboard.systemAndSettings}</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/settings')}><Settings className="w-4 h-4 mr-2" />{t.adminDashboard.generalSettings}</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/automation')}><Bell className="w-4 h-4 mr-2" />{t.adminDashboard.autoNotifications}</Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => toast.info(language === 'th' ? 'ระบบสำรองข้อมูลจะเปิดใช้งานเมื่อเชื่อมต่อ backend service แล้ว' : 'Backup will be available once the backend service is connected')}><Database className="w-4 h-4 mr-2" />{t.adminDashboard.backup}</Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>{t.adminDashboard.systemStatus}</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between"><span className="text-sm">Database</span>{apiOnline === null ? <Badge variant="secondary">…</Badge> : <Badge variant={apiOnline ? 'default' : 'destructive'}>{apiOnline ? 'Online' : 'Offline'}</Badge>}</div>
            <div className="flex items-center justify-between"><span className="text-sm">API Server</span>{apiOnline === null ? <Badge variant="secondary">…</Badge> : <Badge variant={apiOnline ? 'default' : 'destructive'}>{apiOnline ? 'Running' : 'Down'}</Badge>}</div>
            <div className="flex items-center justify-between"><span className="text-sm">Backup</span><Badge variant="secondary">Manual</Badge></div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
