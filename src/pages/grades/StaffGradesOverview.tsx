import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  GraduationCap,
  BookOpen,
  Target,
  Award,
  Users,
  Search,
  Download,
  Loader2,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { asArray, asRecord, asString } from '@/lib/live-data';
import { mapCourse } from '@/lib/live-mappers';
import type { Course } from '@/types';
import { solidBg } from '@/lib/flat-color';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function StaffGradesOverview() {
  const { language } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<Array<Record<string, unknown>>>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    Promise.allSettled([api.courses.list(), api.enrollments.list()])
      .then(([coursesResult, enrollmentsResult]) => {
        if (!mounted) return;
        // either list missing would show wrong counts (e.g. "0 courses"), so treat it as a failed load
        setLoadError(coursesResult.status === 'rejected' || enrollmentsResult.status === 'rejected');

        if (coursesResult.status === 'fulfilled') {
          setCourses(coursesResult.value.courses?.map(mapCourse) || []);
        }
        if (enrollmentsResult.status === 'fulfilled') {
          setEnrollments(
            asArray(enrollmentsResult.value.enrollments).map((item) => asRecord(item)),
          );
        }
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const totalCourses = courses.length;
  const totalEnrollments = enrollments.length;
  const gradedEnrollments = enrollments.filter((e) => Boolean(e.letterGrade)).length;
  const pendingEnrollments = totalEnrollments - gradedEnrollments;
  const completionRate = totalEnrollments ? Math.round((gradedEnrollments / totalEnrollments) * 100) : 0;

  const filteredCourses = courses.filter((c) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      c.code.toLowerCase().includes(q) ||
      c.name.toLowerCase().includes(q) ||
      (c.nameThai && c.nameThai.toLowerCase().includes(q))
    );
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500 mb-3" />
        <span className="text-sm font-medium">
          {language === 'th' ? 'กำลังโหลดภาพรวมผลการเรียน...' : 'Loading grades overview...'}
        </span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-24 text-center text-sm font-medium text-rose-600 dark:text-rose-400" role="alert">
        {language === 'th'
          ? 'โหลดข้อมูลไม่สำเร็จ — กรุณารีเฟรชหน้าอีกครั้ง'
          : 'Could not load the grades overview — please refresh the page'}
      </div>
    );
  }

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      <div>
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
        >
          <GraduationCap className="w-4 h-4 text-purple-500" />
          <span>{language === 'th' ? 'ภาพรวมการตัดเกรดประจำหลักสูตร' : 'Curriculum Grading Overview'}</span>
        </motion.div>
        <motion.h1
          className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white leading-snug"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {language === 'th' ? 'ระบบติดตามผลการเรียน ' : 'Grade Monitoring '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-indigo-600">
            {language === 'th' ? '(เจ้าหน้าที่/ผู้บริหาร)' : '(Staff & Admin)'}
          </span>
        </motion.h1>
      </div>

      {/* Metric Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: BookOpen,
            label: language === 'th' ? 'รายวิชาทั้งหมด' : 'Total Courses',
            value: String(totalCourses),
            sub: language === 'th' ? 'เปิดสอนในระบบ' : 'Active in system',
            gradient: 'from-blue-500 to-indigo-500',
          },
          {
            icon: Users,
            label: language === 'th' ? 'ยอดการลงทะเบียน' : 'Total Enrollments',
            value: String(totalEnrollments),
            sub: language === 'th' ? 'นักศึกษาลงทะเบียน' : 'Enrolled students',
            gradient: 'from-purple-500 to-pink-500',
          },
          {
            icon: Award,
            label: language === 'th' ? 'ตัดเกรดเสร็จสิ้น' : 'Grades Submitted',
            value: `${gradedEnrollments} (${completionRate}%)`,
            sub: language === 'th' ? 'บันทึกคะแนนแล้ว' : 'Graded entries',
            gradient: 'from-emerald-500 to-teal-500',
          },
          {
            icon: Target,
            label: language === 'th' ? 'รอการตัดเกรด' : 'Pending Submission',
            value: String(pendingEnrollments),
            sub: language === 'th' ? 'ยังไม่ได้ตัดเกรด' : 'Awaiting grades',
            gradient: 'from-amber-500 to-orange-500',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className={`relative overflow-hidden rounded-2xl ${solidBg(stat.gradient)} p-6 text-white shadow-xl`}
          >
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20">
                <stat.icon className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90 text-xs">{stat.label}</span>
            </div>
            <div className="text-3xl font-bold font-mono">{stat.value}</div>
            <div className="text-xs text-white/80 mt-1">{stat.sub}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Courses Progress Table */}
      <motion.div
        variants={itemVariants}
        className="rounded-3xl border border-slate-200/80 bg-white dark:bg-[#0c1222] dark:border-slate-800 p-6 shadow-sm"
      >
        <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {language === 'th' ? 'สถานะการตัดเกรดรายวิชา' : 'Course Grading Progress'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'th'
                ? 'ตรวจสอบความคืบหน้าการส่งคะแนนของอาจารย์ผู้สอนในแต่ละวิชา'
                : 'Monitor grade submission status per instructor'}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder={language === 'th' ? 'ค้นหารหัสหรือชื่อวิชา...' : 'Search course code or name...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 rounded-xl text-xs h-10"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="border-y border-slate-100 dark:border-slate-800 text-slate-400 bg-slate-50/50 dark:bg-slate-900/40">
                <th className="py-3 px-4 font-semibold">{language === 'th' ? 'รหัสวิชา' : 'Code'}</th>
                <th className="py-3 px-4 font-semibold">{language === 'th' ? 'ชื่อวิชา' : 'Course Name'}</th>
                <th className="py-3 px-4 font-semibold text-center">{language === 'th' ? 'หน่วยกิต' : 'Credits'}</th>
                <th className="py-3 px-4 font-semibold text-center">{language === 'th' ? 'นศ. ลงทะเบียน' : 'Enrolled'}</th>
                <th className="py-3 px-4 font-semibold text-center">{language === 'th' ? 'ตัดเกรดแล้ว' : 'Graded'}</th>
                <th className="py-3 px-4 font-semibold text-center">{language === 'th' ? 'สถานะ' : 'Status'}</th>
                <th className="py-3 px-4 font-semibold text-right">{language === 'th' ? 'เอกสาร' : 'Export'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredCourses.map((course) => {
                const courseEnrollments = enrollments.filter((e) => asString(e.courseId) === course.id);
                const courseGraded = courseEnrollments.filter((e) => Boolean(e.letterGrade)).length;
                const isComplete = courseEnrollments.length > 0 && courseGraded === courseEnrollments.length;

                return (
                  <tr key={course.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900 dark:text-slate-100">
                      {course.code}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100">
                        {language === 'th' ? course.nameThai || course.name : course.name}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono">
                        {course.semester}/{course.academicYear}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-center font-mono">{course.credits}</td>
                    <td className="py-3 px-4 text-center font-mono">{courseEnrollments.length}</td>
                    <td className="py-3 px-4 text-center font-mono">
                      <span className={courseGraded > 0 ? 'text-emerald-600 font-bold' : 'text-slate-400'}>
                        {courseGraded}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isComplete ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px]">
                          {language === 'th' ? 'เสร็จสมบูรณ์' : 'Complete'}
                        </Badge>
                      ) : courseGraded > 0 ? (
                        <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px]">
                          {language === 'th' ? 'กำลังบันทึก' : 'In Progress'}
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-slate-400 text-[10px]">
                          {language === 'th' ? 'ยังไม่ส่ง' : 'Pending'}
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={async () => {
                          try {
                            const blob = await api.grades.exportCsv(course.id);
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${course.code}_grades.csv`;
                            a.click();
                            URL.revokeObjectURL(url);
                          } catch {
                            toast.error(language === 'th' ? 'ส่งออก CSV ไม่สำเร็จ' : 'CSV export failed');
                          }
                        }}
                        className="h-8 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />
                        CSV
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}
