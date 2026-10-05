import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, GraduationCap, Briefcase, AlertCircle, Search } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asRecord, asString, asNumber } from '@/lib/live-data';

type AdviseeRow = {
  id: string;
  nameThai: string;
  name: string;
  studentId: string;
  year: number;
  academicStatus: string;
  internshipCompany: string | null;
  internshipStatus: string | null;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Advisees() {
  const { language } = useLanguage();
  const [advisees, setAdvisees] = useState<AdviseeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [classSearch, setClassSearch] = useState('');
  const [classStatusFilter, setClassStatusFilter] = useState('all');
  const [internSearch, setInternSearch] = useState('');

  const copy = language === 'th'
    ? {
        title: 'นักศึกษาในที่ปรึกษา',
        subtitle: 'ภาพรวมนักศึกษาที่คุณเป็นอาจารย์ที่ปรึกษา',
        totalAdvisee: 'นักศึกษาในที่ปรึกษาทั้งหมด',
        classAdvisee: 'ที่ปรึกษาปกติ',
        internAdvisee: 'ที่ปรึกษาฝึกงาน',
        atRisk: 'นักศึกษาที่ต้องดูแลเป็นพิเศษ',
        classListTitle: 'รายชื่อที่ปรึกษาปกติ',
        internListTitle: 'รายชื่อที่ปรึกษาฝึกงาน',
        searchPlaceholder: 'ค้นหาชื่อ',
        statusAll: 'สถานะทั้งหมด',
        statusNormal: 'ปกติ',
        statusRisk: 'เสี่ยง',
        statusProbation: 'รอพินิจ',
        colName: 'ชื่อ',
        colYear: 'ชั้นปี',
        colStatus: 'สถานะ',
        colCompany: 'บริษัท',
        noClassAdvisees: 'ไม่มีนักศึกษาที่ปรึกษาปกติตามเงื่อนไขนี้',
        noInternAdvisees: 'ไม่มีนักศึกษาที่ปรึกษาฝึกงาน',
        loading: 'กำลังโหลด...',
      }
    : {
        title: 'Advisee Students',
        subtitle: 'Overview of the students you advise',
        totalAdvisee: 'Total advisees',
        classAdvisee: 'Class advisees',
        internAdvisee: 'Internship advisees',
        atRisk: 'Students at risk',
        classListTitle: 'Class advisee list',
        internListTitle: 'Internship advisee list',
        searchPlaceholder: 'Search name',
        statusAll: 'All statuses',
        statusNormal: 'Normal',
        statusRisk: 'At risk',
        statusProbation: 'Probation',
        colName: 'Name',
        colYear: 'Year',
        colStatus: 'Status',
        colCompany: 'Company',
        noClassAdvisees: 'No class advisees match this filter.',
        noInternAdvisees: 'No internship advisees.',
        loading: 'Loading...',
      };

  React.useEffect(() => {
    let mounted = true;
    api.courses.lecturerSchedule()
      .then((response) => {
        if (!mounted) return;
        const lecturer = asRecord(response.lecturer);
        const mapped = asArray(lecturer.advisees).map((item) => {
          const advisee = asRecord(item);
          const user = asRecord(advisee.user);
          const internship = asRecord(advisee.internship);
          const hasInternship = Boolean(advisee.internship);
          return {
            id: asString(advisee.id),
            nameThai: asString(user.nameThai, asString(user.name, '-')),
            name: asString(user.name, '-'),
            studentId: asString(advisee.studentId),
            year: asNumber(advisee.year, 1),
            academicStatus: asString(advisee.academicStatus, 'normal'),
            internshipCompany: hasInternship ? asString(internship.companyName, '-') : null,
            internshipStatus: hasInternship ? asString(internship.status, '-') : null,
          };
        });
        setAdvisees(mapped);
      })
      .catch(() => undefined)
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const classAdvisees = advisees.filter((a) => !a.internshipCompany);
  const internAdvisees = advisees.filter((a) => a.internshipCompany);
  const atRiskAdvisees = advisees.filter((a) => a.academicStatus === 'risk' || a.academicStatus === 'probation');

  const statusBadge = (status: string) => {
    if (status === 'normal') return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-slate-300">{copy.statusNormal}</Badge>;
    if (status === 'probation') return <Badge className="bg-red-100 text-red-700 dark:bg-slate-800 dark:text-slate-300">{copy.statusProbation}</Badge>;
    return <Badge className="bg-amber-100 text-amber-700 dark:bg-slate-800 dark:text-slate-300">{copy.statusRisk}</Badge>;
  };

  const filteredClassAdvisees = classAdvisees.filter((a) => {
    if (classStatusFilter !== 'all' && a.academicStatus !== classStatusFilter) return false;
    if (classSearch.trim() && !a.nameThai.toLowerCase().includes(classSearch.trim().toLowerCase())) return false;
    return true;
  });

  const filteredInternAdvisees = internAdvisees.filter((a) => {
    if (internSearch.trim() && !a.nameThai.toLowerCase().includes(internSearch.trim().toLowerCase())) return false;
    return true;
  });

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <div>
        <motion.h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" variants={itemVariants}>
          <Users className="inline w-7 h-7 mr-2 mb-1 text-emerald-500" />
          {copy.title}
        </motion.h1>
        <motion.p className="mt-2 text-sm text-slate-500 dark:text-slate-400" variants={itemVariants}>
          {copy.subtitle}
        </motion.p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl shadow-emerald-500/20 relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm"><Users className="w-6 h-6" /></div>
              <span className="font-medium text-white/90">{copy.totalAdvisee}</span>
            </div>
            <div className="text-4xl font-bold">{isLoading ? '...' : advisees.length}</div>
          </div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-blue-600"><GraduationCap className="w-6 h-6" /></div>
            <span className="font-medium text-slate-600 dark:text-slate-400">{copy.classAdvisee}</span>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white">{isLoading ? '...' : classAdvisees.length}</div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-purple-600"><Briefcase className="w-6 h-6" /></div>
            <span className="font-medium text-slate-600 dark:text-slate-400">{copy.internAdvisee}</span>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white">{isLoading ? '...' : internAdvisees.length}</div>
        </motion.div>

        <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-red-600"><AlertCircle className="w-6 h-6" /></div>
            <span className="font-medium text-slate-600 dark:text-slate-400">{copy.atRisk}</span>
          </div>
          <div className="text-4xl font-bold text-slate-900 dark:text-white">{isLoading ? '...' : atRiskAdvisees.length}</div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
            <CardHeader>
              <CardTitle>{copy.classListTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input className="pl-9" placeholder={copy.searchPlaceholder} value={classSearch} onChange={(e) => setClassSearch(e.target.value)} />
                </div>
                <Select value={classStatusFilter} onValueChange={setClassStatusFilter}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{copy.statusAll}</SelectItem>
                    <SelectItem value="normal">{copy.statusNormal}</SelectItem>
                    <SelectItem value="risk">{copy.statusRisk}</SelectItem>
                    <SelectItem value="probation">{copy.statusProbation}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                {filteredClassAdvisees.map((advisee) => (
                  <div key={advisee.id} className="flex items-center justify-between gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{advisee.nameThai}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">{copy.colYear} {advisee.year}</div>
                    </div>
                    {statusBadge(advisee.academicStatus)}
                  </div>
                ))}
                {!isLoading && filteredClassAdvisees.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noClassAdvisees}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
            <CardHeader>
              <CardTitle>{copy.internListTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input className="pl-9" placeholder={copy.searchPlaceholder} value={internSearch} onChange={(e) => setInternSearch(e.target.value)} />
              </div>
              <div className="space-y-2">
                {filteredInternAdvisees.map((advisee) => (
                  <div key={advisee.id} className="flex items-center justify-between gap-3 p-3 border border-slate-100 dark:border-slate-800 rounded-xl">
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{advisee.nameThai}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 truncate">{advisee.internshipCompany}</div>
                    </div>
                    <Badge variant="outline">{advisee.internshipStatus}</Badge>
                  </div>
                ))}
                {!isLoading && filteredInternAdvisees.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-4 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noInternAdvisees}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  );
}
