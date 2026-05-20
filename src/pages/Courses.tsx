import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Student } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, Users, Calendar, MapPin, Filter, Search,
  GraduationCap, Clock, AlertCircle, ChevronRight,
  MoreHorizontal, Plus, Sparkles, BookMarked
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { mapCourse } from '@/lib/live-mappers';
import type { Course } from '@/types';

type CourseRow = Course;
type CourseFormState = {
  code: string;
  name: string;
  nameThai: string;
  credits: string;
  semester: string;
  academicYear: string;
  year: string;
  maxStudents: string;
  minStudents: string;
  description: string;
  syllabus: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Courses() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [courses, setCourses] = React.useState<CourseRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingCourse, setEditingCourse] = React.useState<CourseRow | null>(null);
  const [courseForm, setCourseForm] = React.useState<CourseFormState | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;

    const coursesRequest = user?.role === 'lecturer'
      ? api.courses.lecturerSchedule().then((response) => ({ courses: response.schedule }))
      : api.courses.list();

    coursesRequest
      .then((response) => {
        if (!mounted) return;
        setCourses(response.courses.map(mapCourse));
      })
      .catch((error) => {
        console.warn('Unable to load courses from API', error);
        setCourses([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  const filteredCourses = searchQuery
    ? courses.filter(c =>
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameThai?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : courses;
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
  const creditProgress = Math.min((totalCredits / 22) * 100, 100);

  const openCourseEditor = (course: CourseRow) => {
    setEditingCourse(course);
    setCourseForm({
      code: course.code,
      name: course.name,
      nameThai: course.nameThai,
      credits: String(course.credits),
      semester: String(course.semester),
      academicYear: course.academicYear,
      year: String(course.year),
      maxStudents: String(course.maxStudents),
      minStudents: String(course.minStudents),
      description: course.description || '',
      syllabus: course.syllabus || '',
    });
  };

  const openNewCourseEditor = () => {
    setEditingCourse(null);
    setCourseForm({
      code: '',
      name: '',
      nameThai: '',
      credits: '3',
      semester: '1',
      academicYear: String(new Date().getFullYear() + 543),
      year: '1',
      maxStudents: '30',
      minStudents: '0',
      description: '',
      syllabus: '',
    });
  };

  const updateCourseForm = (field: keyof CourseFormState, value: string) => {
    setCourseForm((current) => current ? { ...current, [field]: value } : current);
  };

  const saveCourse = async () => {
    if (!courseForm) return;
    setIsSaving(true);
    try {
      const payload = {
        code: courseForm.code.trim(),
        name: courseForm.name.trim(),
        nameThai: courseForm.nameThai.trim(),
        credits: Number(courseForm.credits),
        semester: Number(courseForm.semester),
        academicYear: courseForm.academicYear.trim(),
        year: Number(courseForm.year),
        maxStudents: Number(courseForm.maxStudents),
        minStudents: Number(courseForm.minStudents),
        description: courseForm.description.trim(),
        syllabus: courseForm.syllabus.trim(),
      };
      const response = editingCourse
        ? await api.courses.update(editingCourse.id, payload)
        : await api.courses.create(payload);
      const savedCourse = mapCourse(response.course);
      setCourses((current) => editingCourse
        ? current.map((course) => course.id === savedCourse.id ? savedCourse : course)
        : [savedCourse, ...current]);
      toast.success(language === 'th' ? 'บันทึกรายวิชาแล้ว' : 'Course saved');
      setEditingCourse(null);
      setCourseForm(null);
    } catch (error) {
      console.error('Unable to save course', error);
      toast.error(language === 'th' ? 'บันทึกรายวิชาไม่สำเร็จ' : 'Unable to save course');
    } finally {
      setIsSaving(false);
    }
  };

  const enrollCourse = async (course: CourseRow) => {
    try {
      const sectionId = course.sections[0]?.id;
      await api.enrollments.create({
        courseId: course.id,
        ...(sectionId ? { sectionId } : {}),
      });
      toast.success(language === 'th' ? 'ลงทะเบียนรายวิชาแล้ว' : 'Course registered');
      const response = await api.courses.list();
      setCourses(response.courses.map(mapCourse));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ลงทะเบียนไม่สำเร็จ' : 'Unable to register'));
    }
  };

  const courseEditorDialog = (
    <Dialog open={Boolean(courseForm)} onOpenChange={(open) => {
      if (!open) {
        setEditingCourse(null);
        setCourseForm(null);
      }
    }}>
      <DialogContent className="max-w-2xl dark:border-slate-800">
        <DialogHeader>
          <DialogTitle>{editingCourse ? (language === 'th' ? 'แก้ไขรายวิชา' : 'Edit course') : (language === 'th' ? 'เพิ่มรายวิชา' : 'Add course')}</DialogTitle>
          <DialogDescription>
            {editingCourse ? `${editingCourse.code} ${editingCourse.name}` : (language === 'th' ? 'กรอกรายละเอียดรายวิชาใหม่' : 'Enter the new course details')}
          </DialogDescription>
        </DialogHeader>
        {courseForm && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="course-code">{language === 'th' ? 'รหัสวิชา' : 'Code'}</Label>
              <Input id="course-code" value={courseForm.code} onChange={(event) => updateCourseForm('code', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-credits">{language === 'th' ? 'หน่วยกิต' : 'Credits'}</Label>
              <Input id="course-credits" type="number" min="1" value={courseForm.credits} onChange={(event) => updateCourseForm('credits', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-name">{language === 'th' ? 'ชื่ออังกฤษ' : 'English name'}</Label>
              <Input id="course-name" value={courseForm.name} onChange={(event) => updateCourseForm('name', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-name-th">{language === 'th' ? 'ชื่อไทย' : 'Thai name'}</Label>
              <Input id="course-name-th" value={courseForm.nameThai} onChange={(event) => updateCourseForm('nameThai', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-semester">{language === 'th' ? 'ภาคเรียน' : 'Semester'}</Label>
              <Input id="course-semester" type="number" min="1" value={courseForm.semester} onChange={(event) => updateCourseForm('semester', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-year">{language === 'th' ? 'ปีการศึกษา' : 'Academic year'}</Label>
              <Input id="course-year" value={courseForm.academicYear} onChange={(event) => updateCourseForm('academicYear', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-level">{language === 'th' ? 'ชั้นปี' : 'Year level'}</Label>
              <Input id="course-level" type="number" min="1" value={courseForm.year} onChange={(event) => updateCourseForm('year', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-max">{language === 'th' ? 'จำนวนนักศึกษาสูงสุด' : 'Max students'}</Label>
              <Input id="course-max" type="number" min="1" value={courseForm.maxStudents} onChange={(event) => updateCourseForm('maxStudents', event.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="course-description">{language === 'th' ? 'คำอธิบายรายวิชา' : 'Description'}</Label>
              <Textarea id="course-description" value={courseForm.description} onChange={(event) => updateCourseForm('description', event.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="course-syllabus">Syllabus</Label>
              <Textarea id="course-syllabus" value={courseForm.syllabus} onChange={(event) => updateCourseForm('syllabus', event.target.value)} />
            </div>
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => { setEditingCourse(null); setCourseForm(null); }} disabled={isSaving}>
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button onClick={saveCourse} disabled={isSaving || !courseForm}>
            {isSaving ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึก' : 'Save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  if (user?.role === 'student') {
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
              <BookOpen className="w-4 h-4 text-blue-500 dark:text-slate-400" />
              <span>{t.coursesPage.semester}</span>
            </motion.div>
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.coursesPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t.coursesPage.titleHighlight}</span>
            </motion.h1>
          </div>
          <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
            <Button
              className="h-12 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-900/20 border border-slate-700"
              onClick={() => {
                const firstAvailable = courses.find((course) => course.enrolledStudents.length < course.maxStudents);
                if (firstAvailable) void enrollCourse(firstAvailable);
              }}
              disabled={!courses.some((course) => course.enrolledStudents.length < course.maxStudents)}
            >
              <Plus className="w-4 h-4 mr-2" />
              {t.coursesPage.addCourse}
            </Button>
          </motion.div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                  <BookMarked className="w-6 h-6" />
                </div>
                <span className="font-medium text-white/90">{t.coursesPage.registeredCourses}</span>
              </div>
              <div className="text-4xl font-bold">{courses.length}</div>
              <div className="mt-2 text-sm text-blue-100 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> {t.coursesPage.regularSemester}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-6 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/20 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="font-medium text-white/90">{t.coursesPage.totalCredits}</span>
              </div>
              <div className="text-4xl font-bold">{totalCredits}</div>
              <div className="mt-2 text-sm text-purple-100">
                {t.coursesPage.maxCredits}
              </div>
              {/* Mini Progress Bar */}
              <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                <div className="h-full bg-white/90 dark:bg-slate-900/50" style={{ width: `${creditProgress}%` }} />
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Calendar className="w-6 h-6" />
                </div>
                <span className="font-medium text-slate-600 dark:text-slate-300">{t.coursesPage.registrationStatus}</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">{t.coursesPage.confirmed}</div>
              <div className="mt-2 text-sm text-green-600 flex items-center gap-1 bg-green-50 w-fit px-2 py-1 rounded-lg">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                {t.coursesPage.paid}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="my-courses" className="space-y-8">
          <TabsList className="bg-white/40 backdrop-blur-xl border border-white/40 p-1.5 h-auto rounded-2xl shadow-sm w-full md:w-auto flex overflow-x-auto dark:bg-slate-900/50">
            <TabsTrigger value="my-courses" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              {t.coursesPage.myCourses}
            </TabsTrigger>
            <TabsTrigger value="registration" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              {t.coursesPage.registerTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-courses" className="space-y-6">
            {/* Search Bar */}
            <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder={t.coursesPage.searchCourses}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/60 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-blue-100 dark:bg-slate-900/50"
                />
              </div>
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/60 hover:bg-white text-slate-600 dark:text-slate-300 dark:bg-slate-900/50">
                <Filter className="w-4 h-4 mr-2" />
                {t.coursesPage.filter}
              </Button>
            </motion.div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.slice(0, 6).map((course, index) => (
                <motion.div
                  key={course.id}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.01 }}
                  className="group relative bg-white/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 p-6 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 cursor-pointer overflow-hidden dark:bg-slate-900/50"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <Badge variant="outline" className="bg-white/50 backdrop-blur border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1 text-xs font-bold rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors dark:bg-slate-900/50">
                        {(user as unknown as Student).year || 3}
                      </Badge>
                      <div className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors dark:text-slate-300">
                        <MoreHorizontal className="w-5 h-5" />
                      </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-1 group-hover:text-blue-600 transition-colors line-clamp-1">{course.name}</h3>
                    <p className="text-slate-500 text-sm mb-6 line-clamp-1 dark:text-slate-400">{course.nameThai}</p>

                    <div className="space-y-3 mb-6">
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <Users className="w-4 h-4 text-slate-400" />
                        <span className="truncate">{course.lecturerName || t.coursesPage.instructorTBA}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{t.coursesPage.lecturerSchedule}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{t.coursesPage.room}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between text-xs font-medium mb-2">
                        <span className="text-slate-500 dark:text-slate-400">{t.coursesPage.progress}</span>
                        <span className="text-blue-600 dark:text-slate-300">85%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '85%' }}
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="registration" className="space-y-6">
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-yellow-300" />
                  {t.coursesPage.recommended}
                </h2>
                <p className="text-indigo-100 mb-8 max-w-2xl">
                  {t.coursesPage.recommendedDesc}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {courses.filter((course) => course.enrolledStudents.length < course.maxStudents).slice(0, 3).map((rec) => (
                    <div key={rec.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl hover:bg-white/20 transition-colors cursor-pointer dark:bg-slate-900/50">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur dark:bg-slate-900/50">{rec.code}</Badge>
                        <span className="text-xs font-medium text-indigo-100 bg-indigo-500/30 px-2 py-1 rounded-lg">{rec.lecturerName || t.coursesPage.instructorTBA}</span>
                      </div>
                      <h3 className="font-bold text-lg mb-1">{rec.name}</h3>
                      <p className="text-sm text-indigo-200">{rec.credits} {t.coursesPage.credits}</p>
                      <Button size="sm" className="w-full mt-4 bg-white dark:bg-slate-900 text-indigo-600 hover:bg-indigo-50 border-0 font-bold dark:text-slate-200" onClick={() => enrollCourse(rec)}>
                        {t.coursesPage.addCourse}
                      </Button>
                    </div>
                  ))}
                  {!isLoading && courses.filter((course) => course.enrolledStudents.length < course.maxStudents).length === 0 && (
                    <div className="md:col-span-3 rounded-2xl border border-white/20 bg-white/10 p-6 text-center text-sm text-indigo-100">
                      {t.coursesPage.registrationClosed}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* General Search Placeholder */}
            <motion.div variants={itemVariants} className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl p-12 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 dark:bg-slate-900/50">
              <Search className="w-12 h-12 mb-4 opacity-50" />
              <h3 className="text-lg font-bold text-slate-600 dark:text-slate-300">{t.coursesPage.searchOther}</h3>
              <p className="text-sm mb-6">{t.coursesPage.searchDesc}</p>
              <div className="flex gap-2 w-full max-w-md">
                <Input placeholder={t.coursesPage.searchPlaceholder} className="bg-white dark:bg-slate-900" />
                <Button>{t.coursesPage.searchButton}</Button>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    );
  }

  if (user?.role === 'lecturer') {
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
              <BookOpen className="w-4 h-4 text-blue-500 dark:text-slate-400" />
              <span>{t.coursesPage.semesterLabel}</span>
            </motion.div>
            <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {t.coursesPage.manageCourses}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t.coursesPage.manageCoursesHighlight}</span>
            </motion.h1>
          </div>
        </div>

        {isLoading && (
          <div className="rounded-3xl border border-slate-200 bg-white/70 p-8 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400">
            Loading courses...
          </div>
        )}

        {!isLoading && filteredCourses.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            No courses assigned to this lecturer.
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredCourses.map((course) => (
            <motion.div variants={itemVariants} key={course.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-lg transition-all dark:bg-slate-900">
              <div className="flex justify-between items-start mb-4">
                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 dark:text-slate-300 dark:bg-slate-800">{course.code}</Badge>
                <Button variant="ghost" size="icon" className="-mr-2 -mt-2" onClick={() => openCourseEditor(course)}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{course.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{course.nameThai}</p>
              <div className="flex items-center justify-between text-sm py-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">{t.coursesPage.studentsRegistered}</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{course.enrolledStudents.length} {t.coursesPage.studentsCount}</span>
              </div>
              <Button className="mt-5 w-full rounded-xl" variant="outline" onClick={() => openCourseEditor(course)}>
                {language === 'th' ? 'แก้ไขรายวิชา' : 'Edit course'}
              </Button>
            </motion.div>
          ))}
        </div>
        {courseEditorDialog}
      </motion.div>
    );
  }

  // Staff/Admin View (Course administration)
  if (user?.role === 'staff' || user?.role === 'admin') {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-8 pb-10"
      >
        <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-4">
          <div>
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
              <BookOpen className="w-4 h-4 text-purple-500 dark:text-slate-400" />
              <span>{t.coursesPage.semesterLabel}</span>
            </motion.div>
            <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {t.coursesPage.manageCourses}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-fuchsia-600">
                {t.coursesPage.manageCoursesHighlight}
              </span>
            </motion.h1>
            <p className="text-slate-500 mt-2 text-sm dark:text-slate-400">
              {language === 'th'
                ? 'จัดการรายวิชาจากข้อมูลระบบจริง เพิ่มและแก้ไขผ่าน API ได้'
                : 'Course administration — add/edit/disable courses via live system data'}
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              className="h-11 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white"
              onClick={openNewCourseEditor}
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'th' ? 'เพิ่มรายวิชา' : 'Add course'}
            </Button>
          </div>
        </div>

        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder={t.coursesPage.searchCourses}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/80 focus:bg-white transition-all shadow-sm focus:ring-2 focus:ring-purple-100 dark:bg-slate-900/50"
            />
          </div>
          <Button
            variant="outline"
            className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/80 hover:bg-white text-slate-700 dark:text-slate-300 dark:bg-slate-900/50"
            onClick={() => setSearchQuery('')}
          >
            <Filter className="w-4 h-4 mr-2" />
            {t.coursesPage.filter}
          </Button>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredCourses.map((course) => (
            <motion.div
              variants={itemVariants}
              key={course.id}
              className="group bg-white/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm hover:shadow-xl hover:shadow-purple-500/10 transition-all overflow-hidden dark:bg-slate-900/50"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 dark:text-slate-300 dark:bg-slate-800">{course.code}</Badge>
                      <Badge variant="outline" className="border-slate-200 text-slate-600 dark:text-slate-400 bg-white/60 dark:border-slate-700 dark:bg-slate-900/50">
                        {language === 'th' ? `${course.credits} หน่วยกิต` : `${course.credits} credits`}
                      </Badge>
                    </div>
                    <div className="font-bold text-lg text-slate-900 dark:text-white truncate">{course.name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{course.nameThai}</div>
                  </div>

                  <div className="flex gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => openCourseEditor(course)}
                    >
                      {t.common.viewAll}
                      <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      onClick={() => openCourseEditor(course)}
                    >
                      <MoreHorizontal className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                    </Button>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'th' ? 'ผู้สอน' : 'Instructor'}</div>
                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{course.lecturerName || t.coursesPage.instructorTBA}</div>
                  </div>
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{language === 'th' ? 'สถานะ' : 'Status'}</div>
                    <div className="font-semibold text-emerald-700 dark:text-slate-300">{language === 'th' ? 'เปิดใช้งาน' : 'Active'}</div>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
        {courseEditorDialog}
      </motion.div>
    );
  }

  // Company/Other roles: show a friendly "not applicable" screen
  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
      <motion.div variants={itemVariants} className="bg-white/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm p-10 text-center dark:bg-slate-900/50">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-slate-500 dark:text-slate-400" />
        </div>
        <div className="text-xl font-bold text-slate-900 dark:text-slate-200">
          {language === 'th' ? 'หน้านี้ไม่รองรับสำหรับบทบาทของคุณ' : 'This page is not available for your role'}
        </div>
        <div className="text-slate-500 mt-2 dark:text-slate-400">
          {language === 'th'
            ? 'ระบบรายวิชาจะแสดงเฉพาะบทบาทที่เกี่ยวข้อง (นักศึกษา/อาจารย์/เจ้าหน้าที่/ผู้ดูแลระบบ)'
            : 'Courses are shown only for relevant roles (student/lecturer/staff/admin).'}
        </div>
      </motion.div>
    </motion.div>
  );
}
