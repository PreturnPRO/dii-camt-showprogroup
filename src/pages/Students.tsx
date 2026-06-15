import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Users, Search, Filter, GraduationCap, AlertTriangle, 
  Eye, Mail, TrendingUp, ChevronRight, Award, BookOpen
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { mapStudent } from '@/lib/live-mappers';
import { asRecord, asString } from '@/lib/live-data';
import type { Student } from '@/types';
import { toast } from 'sonner';

type StudentRow = Student & { userId?: string };

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Students() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [yearFilter, setYearFilter] = React.useState('all');
  const [statusFilter, setStatusFilter] = React.useState('all');
  const [students, setStudents] = React.useState<StudentRow[]>([]);
  const [selectedStudent, setSelectedStudent] = React.useState<StudentRow | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;

    api.students
      .list()
      .then((response) => {
        if (!mounted) return;
        setStudents(response.students.map((item, index) => {
          const source = asRecord(item);
          const user = asRecord(source.user);
          return {
            ...mapStudent(item, index),
            userId: asString(source.userId, asString(user.id)),
          };
        }));
      })
      .catch((error) => {
        console.warn('Unable to load students from API', error);
        if (mounted) setStudents([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.nameThai.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.studentId.includes(searchQuery);
    const matchesYear = yearFilter === 'all' || student.year.toString() === yearFilter;
    const matchesStatus = statusFilter === 'all' || student.academicStatus === statusFilter;
    return matchesSearch && matchesYear && matchesStatus;
  });

  const atRiskCount = students.filter(s => s.academicStatus === 'probation' || s.academicStatus === 'risk').length;
  const avgGPA = (students.reduce((sum, s) => sum + s.gpa, 0) / Math.max(students.length, 1)).toFixed(2);

  const handleMessageStudent = (student: StudentRow) => {
    const recipientId = student.userId || student.id;
    navigate('/messages', {
      state: {
        recipient: {
          id: recipientId,
          email: student.email,
          name: student.name,
          nameThai: student.nameThai,
          role: student.role,
        },
      },
    });
    toast.info(`เปิดแชทกับ ${student.nameThai || student.name}`);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'normal': return <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">{t.studentsPage.normal}</Badge>;
      case 'probation': return <Badge className="bg-orange-100 text-orange-700 dark:text-slate-300">{t.studentsPage.probation}</Badge>;
      case 'risk': return <Badge className="bg-red-100 text-red-700 dark:text-slate-300 dark:bg-slate-800">{t.studentsPage.risk}</Badge>;
      case 'dropped': return <Badge className="bg-gray-100 text-gray-700 dark:text-slate-300 dark:bg-slate-800">{t.studentsPage.dismissed}</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedStudent?.nameThai || selectedStudent?.name}</DialogTitle>
            <DialogDescription>
              {selectedStudent?.studentId} · {selectedStudent?.major}
            </DialogDescription>
          </DialogHeader>
          {selectedStudent && (
            <div className="grid gap-3 text-sm sm:grid-cols-2">
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">GPA</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedStudent.gpa.toFixed(2)}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">{t.studentsPage.credits}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedStudent.earnedCredits}/{selectedStudent.totalCredits}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">{t.studentsPage.year}</div>
                <div className="text-lg font-bold text-slate-900 dark:text-white">{selectedStudent.year}</div>
              </div>
              <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-800">
                <div className="text-slate-500 dark:text-slate-400">{t.common.status}</div>
                <div className="mt-1">{getStatusBadge(selectedStudent.academicStatus)}</div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedStudent(null)}>ปิด</Button>
            {selectedStudent && (
              <Button onClick={() => handleMessageStudent(selectedStudent)}>
                <Mail className="mr-2 h-4 w-4" />
                ส่งข้อความ
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div>
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
              <Users className="w-4 h-4 text-blue-500 dark:text-slate-400" />
              <span>{`${t.studentsPage.totalStudents} ${students.length} • ${t.studentsPage.atRisk} ${atRiskCount}`}</span>
          </motion.div>
          <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {t.studentsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t.studentsPage.titleHighlight}</span>
          </motion.h1>
      </div>

      {/* Stats Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-6 text-white shadow-xl shadow-blue-200"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <Users className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.studentsPage.totalStudents}</span>
            </div>
            <div className="text-4xl font-bold">{students.length}</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white shadow-xl shadow-emerald-200"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <TrendingUp className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.studentsPage.avgGPA}</span>
            </div>
            <div className="text-4xl font-bold">{avgGPA}</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-6 text-white shadow-xl shadow-orange-200"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.studentsPage.atRisk}</span>
            </div>
            <div className="text-4xl font-bold">{atRiskCount}</div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-6 text-white shadow-xl shadow-purple-200"
        >
          <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                <Award className="w-5 h-5" />
              </div>
              <span className="font-medium text-white/90">{t.studentsPage.normalStatus}</span>
            </div>
            <div className="text-4xl font-bold">{students.filter(s => s.academicStatus === 'normal').length}</div>
          </div>
        </motion.div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder={t.studentsPage.searchPlaceholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t.studentsPage.yearFilter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.studentsPage.allYears}</SelectItem>
            <SelectItem value="1">{t.studentsPage.year} 1</SelectItem>
            <SelectItem value="2">{t.studentsPage.year} 2</SelectItem>
            <SelectItem value="3">{t.studentsPage.year} 3</SelectItem>
            <SelectItem value="4">{t.studentsPage.year} 4</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t.studentsPage.statusFilter} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.studentsPage.allStatus}</SelectItem>
            <SelectItem value="normal">{t.studentsPage.normal}</SelectItem>
            <SelectItem value="probation">{t.studentsPage.probation}</SelectItem>
            <SelectItem value="risk">{t.studentsPage.risk}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Student List */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5" />
              {t.studentsPage.studentList}
            </CardTitle>
            <CardDescription>{t.studentsPage.showing} {filteredStudents.length} {t.studentsPage.fromTotal} {students.length}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {isLoading && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  กำลังโหลดข้อมูลนักศึกษาจริงจากระบบ...
                </div>
              )}
              {!isLoading && filteredStudents.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                  ไม่พบข้อมูลนักศึกษาจากระบบ
                </div>
              )}
              {!isLoading && filteredStudents.map((student, index) => (
                <motion.div
                  key={student.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01, x: 4 }}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-white rounded-xl border border-gray-100 hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group dark:border-slate-700"
                  onClick={() => setSelectedStudent(student)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shadow-lg">
                      {student.nameThai.charAt(0)}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 dark:text-white group-hover:text-primary transition-colors">
                        {student.nameThai}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-slate-300">{student.studentId}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{t.studentsPage.year} {student.year}</Badge>
                        <span className="text-xs text-gray-500 dark:text-slate-400">{student.major}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <div className="text-sm font-semibold">GPA {student.gpa.toFixed(2)}</div>
                      <div className="text-xs text-gray-500 dark:text-slate-400">{student.earnedCredits}/{student.totalCredits} {t.studentsPage.credits}</div>
                    </div>
                    {getStatusBadge(student.academicStatus)}
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={(event) => {
                        event.stopPropagation();
                        setSelectedStudent(student);
                      }}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={(event) => {
                        event.stopPropagation();
                        handleMessageStudent(student);
                      }}>
                        <Mail className="w-4 h-4" />
                      </Button>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                  </div>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
