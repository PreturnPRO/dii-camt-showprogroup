import React from 'react';
import * as XLSX from 'xlsx';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Student } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, Users, Calendar, MapPin, Filter, Search,
  GraduationCap, Clock, AlertCircle, ChevronRight,
  MoreHorizontal, Plus, Sparkles, BookMarked, Upload, Download
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { asNumber, asRecord, asString } from '@/lib/live-data';
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
  lecturerId: string;
  maxStudents: string;
  minStudents: string;
  description: string;
  syllabus: string;
};

type LecturerOption = {
  id: string;
  lecturerId: string;
  name: string;
};

type ImportCoursePayload = {
  code: string;
  name: string;
  nameThai: string;
  credits: number;
  semester: number;
  academicYear: string;
  year: number;
  lecturerId: string;
  maxStudents: number;
  minStudents: number;
  description: string;
  syllabus: string;
};

const headerAliases: Record<string, keyof ImportCoursePayload> = {
  code: 'code',
  coursecode: 'code',
  name: 'name',
  englishname: 'name',
  coursename: 'name',
  namethai: 'nameThai',
  thainame: 'nameThai',
  coursenamethai: 'nameThai',
  credits: 'credits',
  credit: 'credits',
  semester: 'semester',
  academicyear: 'academicYear',
  year: 'year',
  yearlevel: 'year',
  lecturerid: 'lecturerId',
  instructorid: 'lecturerId',
  maxstudents: 'maxStudents',
  capacity: 'maxStudents',
  minstudents: 'minStudents',
  description: 'description',
  syllabus: 'syllabus',
};

const normalizeHeader = (value: string) => value.trim().toLowerCase().replace(/[\s_-]+/g, '');

const csvEscape = (value: string | number) => {
  const text = String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
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
  const [registrationQuery, setRegistrationQuery] = React.useState('');
  const [courses, setCourses] = React.useState<CourseRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [editingCourse, setEditingCourse] = React.useState<CourseRow | null>(null);
  const [courseForm, setCourseForm] = React.useState<CourseFormState | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lecturers, setLecturers] = React.useState<LecturerOption[]>([]);
  const [importLecturerId, setImportLecturerId] = React.useState('');
  const [isImporting, setIsImporting] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement | null>(null);

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

  React.useEffect(() => {
    if (user?.role !== 'staff' && user?.role !== 'admin') return;
    let mounted = true;

    api.lecturers
      .list()
      .then((response) => {
        if (!mounted) return;
        const nextLecturers = response.lecturers.map((item) => {
          const source = asRecord(item);
          const lecturerUser = asRecord(source.user);
          return {
            id: asString(source.id),
            lecturerId: asString(source.lecturerId),
            name: asString(lecturerUser.nameThai, asString(lecturerUser.name, asString(source.lecturerId))),
          };
        }).filter((lecturer) => lecturer.id);
        setLecturers(nextLecturers);
        setImportLecturerId((current) => current || nextLecturers[0]?.id || '');
      })
      .catch((error) => {
        console.warn('Unable to load lecturers for course import', error);
        setLecturers([]);
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
  const registrationMatches = React.useMemo(() => {
    const q = registrationQuery.trim().toLowerCase();
    if (!q) return [];
<<<<<<< Updated upstream
    return visibleCourses.filter((course) => (
=======
    return courses.filter((course) => (
>>>>>>> Stashed changes
      course.enrolledStudents.length < course.maxStudents &&
      (
        course.code?.toLowerCase().includes(q) ||
        course.name?.toLowerCase().includes(q) ||
        course.nameThai?.toLowerCase().includes(q)
      )
    ));
  }, [visibleCourses, registrationQuery]);
  const totalCredits = user?.role === 'student' ? enrolledCourses.reduce((sum, course) => sum + course.credits, 0) : visibleCourses.reduce((sum, course) => sum + course.credits, 0);
=======
  }, [courses, registrationQuery]);
  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);
>>>>>>> Stashed changes
  const creditProgress = Math.min((totalCredits / 22) * 100, 100);

  const handleRegistrationSearch = () => {
    const query = registrationQuery.trim();
    if (!query) {
      toast.info(language === 'th' ? 'กรอกรหัสหรือชื่อรายวิชาก่อนค้นหา' : 'Enter a course code or name first');
      return;
    }
    toast.info(language === 'th' ? `พบ ${registrationMatches.length} รายวิชา` : `${registrationMatches.length} courses found`);
  };

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
      lecturerId: course.lecturerId,
      maxStudents: String(course.sections?.[0]?.maxStudents || 60),
      minStudents: String(course.sections?.[0]?.minStudents || 0),
      description: course.description || '',
      syllabus: course.syllabus || '',
<<<<<<< Updated upstream
      status: course.status || 'active',
      room: course.room || '',
      sectionNumber: course.sections?.[0]?.sectionNumber || '001',
      scheduleDays: course.schedule?.map(s => s.day) || [],
      scheduleStartTime: course.schedule?.[0]?.startTime || '09:00',
      scheduleEndTime: course.schedule?.[0]?.endTime || '12:00',
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
      lecturerId: importLecturerId || lecturers[0]?.id || '',
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
    if (!courseForm.lecturerId) {
      toast.error(language === 'th' ? 'กรุณาเลือกผู้สอนก่อนบันทึกรายวิชา' : 'Please choose an instructor before saving');
      return;
    }
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
        lecturerId: courseForm.lecturerId,
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

  const parseCourseImportFile = async (file: File) => {
    const isCsv = file.name.toLowerCase().endsWith('.csv');
    const workbook = isCsv
      ? XLSX.read(await file.text(), { type: 'string' })
      : XLSX.read(await file.arrayBuffer(), { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return [];
    return XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
      defval: '',
      raw: false,
    });
  };

  const normalizeImportCourse = (row: Record<string, unknown>, fallbackLecturerId: string): ImportCoursePayload => {
    const normalized: Partial<Record<keyof ImportCoursePayload, string>> = {};
    Object.entries(row).forEach(([header, value]) => {
      const field = headerAliases[normalizeHeader(header)];
      if (field) normalized[field] = String(value ?? '').trim();
    });

    return {
      code: normalized.code || '',
      name: normalized.name || '',
      nameThai: normalized.nameThai || normalized.name || '',
      credits: asNumber(normalized.credits, 3),
      semester: asNumber(normalized.semester, 1),
      academicYear: normalized.academicYear || String(new Date().getFullYear() + 543),
      year: asNumber(normalized.year, 1),
      lecturerId: normalized.lecturerId || fallbackLecturerId,
      maxStudents: asNumber(normalized.maxStudents, 60),
      minStudents: asNumber(normalized.minStudents, 1),
      description: normalized.description || '',
      syllabus: normalized.syllabus || '',
    };
  };

  const importCoursesFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const fallbackLecturerId = importLecturerId || lecturers[0]?.id || '';
    if (!fallbackLecturerId) {
      toast.error(language === 'th' ? 'กรุณาเลือกผู้สอนเริ่มต้นก่อนนำเข้าไฟล์' : 'Choose a default instructor before importing');
      return;
    }

    setIsImporting(true);
    try {
      const rows = await parseCourseImportFile(file);
      if (!rows.length) {
        toast.error(language === 'th' ? 'ไม่พบข้อมูลรายวิชาในไฟล์' : 'No course rows found in the file');
        return;
      }

      const existingCodes = new Set(courses.map((course) => course.code.toLowerCase()));
      const payloads = rows.map((row) => normalizeImportCourse(row, fallbackLecturerId));
      const validPayloads = payloads.filter((course) => course.code && course.name && course.nameThai && !existingCodes.has(course.code.toLowerCase()));
      const skippedCount = payloads.length - validPayloads.length;

      if (!validPayloads.length) {
        toast.error(language === 'th' ? 'ไม่มีรายวิชาใหม่ที่พร้อมนำเข้า ตรวจรหัสวิชา/ชื่อวิชา/ข้อมูลซ้ำ' : 'No new valid courses to import. Check required fields and duplicates.');
        return;
      }

      const createdCourses: CourseRow[] = [];
      for (const payload of validPayloads) {
        const response = await api.courses.create(payload);
        createdCourses.push(mapCourse(response.course));
      }

      setCourses((current) => [...createdCourses, ...current]);
      toast.success(
        language === 'th'
          ? `นำเข้า ${createdCourses.length} รายวิชาแล้ว${skippedCount ? ` (ข้าม ${skippedCount} แถว)` : ''}`
          : `Imported ${createdCourses.length} courses${skippedCount ? ` (${skippedCount} rows skipped)` : ''}`,
      );
    } catch (error) {
      console.error('Unable to import courses', error);
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'นำเข้ารายวิชาไม่สำเร็จ' : 'Unable to import courses'));
    } finally {
      setIsImporting(false);
    }
  };

  const downloadImportTemplate = () => {
    const headers = ['code', 'name', 'nameThai', 'credits', 'semester', 'academicYear', 'year', 'lecturerId', 'maxStudents', 'minStudents', 'description', 'syllabus'];
    const sample = [
      'DII101',
      'Digital Industry Fundamentals',
      'พื้นฐานอุตสาหกรรมดิจิทัล',
      3,
      1,
      new Date().getFullYear() + 543,
      1,
      importLecturerId || lecturers[0]?.id || 'paste-lecturer-profile-id-here',
      60,
      1,
      'Introductory course',
      'Course outline',
    ];
    const csv = `${headers.join(',')}\n${sample.map(csvEscape).join(',')}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'course-import-template.csv';
    anchor.click();
    URL.revokeObjectURL(url);
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
            <div className="space-y-2">
              <Label htmlFor="course-lecturer">{language === 'th' ? 'ผู้สอน' : 'Instructor'}</Label>
              <Select value={courseForm.lecturerId} onValueChange={(value) => updateCourseForm('lecturerId', value)}>
                <SelectTrigger id="course-lecturer">
                  <SelectValue placeholder={language === 'th' ? 'เลือกผู้สอน' : 'Choose instructor'} />
                </SelectTrigger>
                <SelectContent>
                  {lecturers.map((lecturer) => (
                    <SelectItem key={lecturer.id} value={lecturer.id}>
                      {lecturer.name} ({lecturer.lecturerId || lecturer.id})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5"
            >
              <BookOpen className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
              <span>{t.coursesPage.semester}</span>
            </motion.div>
            <motion.h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
            >
              {t.coursesPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 font-extrabold">{t.coursesPage.titleHighlight}</span>
            </motion.h1>
          </div>
          <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full sm:w-auto">
            <Button
              className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 text-xs font-semibold w-full sm:w-auto transition-all"
              onClick={() => {
                const firstAvailable = courses.find((course) => course.enrolledStudents.length < course.maxStudents);
                if (firstAvailable) void enrollCourse(firstAvailable);
              }}
              disabled={!courses.some((course) => course.enrolledStudents.length < course.maxStudents)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              {t.coursesPage.addCourse}
            </Button>
          </motion.div>
        </div>

        {/* Stats Grid — Restrained SaaS Accent Colors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4">
          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.coursesPage.registeredCourses}</span>
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/15">
                <BookMarked className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">{courses.length}</div>
            <div className="mt-2 text-[11px] text-blue-600 dark:text-blue-400 font-medium flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" /> {t.coursesPage.regularSemester}
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.coursesPage.totalCredits}</span>
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/15">
                <GraduationCap className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">{totalCredits}</div>
            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span>{t.coursesPage.maxCredits}</span>
              <span className="font-mono">{creditProgress}%</span>
            </div>
            {/* Mini Progress Bar */}
            <div className="mt-2 h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
              <div className="h-full bg-purple-600 dark:bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${creditProgress}%` }} />
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -2 }}
            transition={{ duration: 0.15 }}
            className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{t.coursesPage.registrationStatus}</span>
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/15">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">{t.coursesPage.confirmed}</div>
            <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              {t.coursesPage.paid}
            </div>
          </motion.div>
        </div>

        {/* Content Tabs */}
        <Tabs defaultValue="my-courses" className="space-y-6">
          {/* Compact Segmented Control (Do NOT stretch across full width) */}
          <div className="flex items-center justify-between">
            <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
              <TabsTrigger
                value="my-courses"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
              >
                <BookOpen className="w-3.5 h-3.5 mr-1.5 inline-block" />
                {t.coursesPage.myCourses}
              </TabsTrigger>
              <TabsTrigger
                value="registration"
                className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer select-none"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 inline-block" />
                {t.coursesPage.registerTab}
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="my-courses" className="space-y-5">
            {/* Search Bar + Filter using full available width */}
            <motion.div variants={itemVariants} className="flex gap-2.5 sm:gap-3 items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder={t.coursesPage.searchCourses}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-xs sm:text-sm focus:bg-white transition-all shadow-xs"
                />
              </div>
              <Button
                variant="outline"
                className="h-10 px-4 rounded-xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium shrink-0 transition-colors"
                onClick={() => setSearchQuery('')}
              >
                <Filter className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                {t.coursesPage.filter}
              </Button>
            </motion.div>

            {/* Courses Grid — Full Available Width 2-Column Desktop Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 w-full">
              {filteredCourses.map((course, index) => {
                const firstSchedule = course.schedule?.[0];
                const scheduleText = firstSchedule
                  ? `${firstSchedule.dayThai || firstSchedule.day} ${firstSchedule.startTime}–${firstSchedule.endTime}`
                  : t.coursesPage.lecturerSchedule;
                const roomText = firstSchedule?.room || course.sections?.[0]?.room || t.coursesPage.room;

                return (
                  <motion.div
                    key={course.id || index}
                    variants={itemVariants}
                    whileHover={{ y: -2 }}
                    transition={{ duration: 0.15 }}
                    className="group flex flex-col justify-between bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 p-5 rounded-2xl shadow-xs hover:border-blue-300 dark:hover:border-blue-800/60 hover:shadow-md transition-all duration-200 cursor-pointer"
                  >
                    <div>
                      {/* Top Header: Course Code & Year Badge + Action Menu */}
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/50 px-2 py-0.5 rounded-md border border-blue-200/50 dark:border-blue-800/50">
                            {course.code}
                          </span>
                          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                            {course.credits} {t.coursesPage.credits}
                          </span>
                        </div>
                        <div className="w-7 h-7 rounded-lg bg-slate-50 dark:bg-slate-800/70 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                          <MoreHorizontal className="w-4 h-4" />
                        </div>
                      </div>
<<<<<<< Updated upstream
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <span>{t.coursesPage.lecturerSchedule}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span>{course.room || t.coursesPage.room}</span>
                      </div>
                    </div>

                    {/* Progress Bar naturally sitting at bottom */}
                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                      <div className="flex justify-between items-center text-xs mb-1.5">
                        <span className="text-slate-500 dark:text-slate-400 text-[11.5px] font-medium">{t.coursesPage.progress}</span>
                        <span className="font-mono font-semibold text-blue-600 dark:text-blue-400 text-xs">85%</span>
                      </div>
                      <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '85%' }}
                          transition={{ delay: 0.2 + (index * 0.05), duration: 0.8 }}
                          className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
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

<<<<<<< Updated upstream
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleCourses.map((course) => (
                    <div key={course.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl hover:bg-white/20 transition-colors cursor-pointer dark:bg-slate-900/50 flex flex-col justify-between" onClick={() => setViewingCourse(course)}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur dark:bg-slate-900/50">{course.code}</Badge>
                          <span className="text-xs font-medium text-indigo-100 bg-indigo-500/30 px-2 py-1 rounded-lg">{course.lecturerName || t.coursesPage.instructorTBA}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{course.name}</h3>
                        <div className="text-sm text-indigo-200 mb-3">{course.nameThai}</div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-4 text-sm text-indigo-100">
                          <span>{course.credits} {t.coursesPage.credits}</span>
                          <span>{course.enrolledStudents.length}/{course.sections?.[0]?.maxStudents || 60} {language === 'th' ? 'คน' : 'students'}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full bg-white dark:bg-slate-900 text-indigo-600 hover:bg-indigo-50 border-0 font-bold dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={(e) => { e.stopPropagation(); enrollCourse(course); }}
                          disabled={enrolledCourses.some(c => c.id === course.id) || course.enrolledStudents.length >= (course.sections?.[0]?.maxStudents || 60)}
                        >
                          {enrolledCourses.some(c => c.id === course.id) 
                            ? (language === 'th' ? 'ลงทะเบียนแล้ว' : 'Registered') 
                            : course.enrolledStudents.length >= (course.sections?.[0]?.maxStudents || 60) 
                              ? (language === 'th' ? 'เต็มแล้ว' : 'Full') 
                              : t.coursesPage.addCourse}
                        </Button>
=======
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {courses.filter((course) => course.enrolledStudents.length < course.maxStudents).slice(0, 3).map((rec) => (
                    <div key={rec.id} className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl hover:bg-white/20 transition-colors cursor-pointer dark:bg-slate-900/50">
                      <div className="flex justify-between items-start mb-3">
                        <Badge className="bg-white/20 hover:bg-white/30 text-white border-0 backdrop-blur dark:bg-slate-900/50">{rec.code}</Badge>
                        <span className="text-xs font-medium text-indigo-100 bg-indigo-500/30 px-2 py-1 rounded-lg">{rec.lecturerName || t.coursesPage.instructorTBA}</span>
>>>>>>> Stashed changes
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
                <Input
                  placeholder={t.coursesPage.searchPlaceholder}
                  value={registrationQuery}
                  onChange={(event) => setRegistrationQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') handleRegistrationSearch();
                  }}
                  className="bg-white dark:bg-slate-900"
                />
                <Button onClick={handleRegistrationSearch}>{t.coursesPage.searchButton}</Button>
              </div>
              {registrationQuery.trim() && (
                <div className="mt-6 w-full max-w-2xl space-y-3">
                  {registrationMatches.slice(0, 5).map((course) => (
                    <div key={course.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="font-bold text-slate-900 dark:text-white">{course.code} · {course.name}</div>
                        <div className="text-sm text-slate-500 dark:text-slate-400">{course.nameThai}</div>
                      </div>
                      <Button size="sm" onClick={() => enrollCourse(course)}>{t.coursesPage.addCourse}</Button>
                    </div>
                  ))}
                  {registrationMatches.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                      {language === 'th' ? 'ไม่พบรายวิชาที่เปิดลงทะเบียน' : 'No open courses found'}
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </TabsContent>
        </Tabs>
<<<<<<< Updated upstream

        {/* Course Details Dialog */}
        <Dialog open={!!viewingCourse} onOpenChange={(open) => !open && setViewingCourse(null)}>
          <DialogContent className="sm:max-w-[600px] bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800">
                  {viewingCourse?.code}
                </Badge>
                <span className="dark:text-slate-100">{language === 'th' ? viewingCourse?.nameThai : viewingCourse?.name}</span>
              </DialogTitle>
              <DialogDescription className="text-slate-500 dark:text-slate-400">
                {language === 'en' ? viewingCourse?.nameThai : viewingCourse?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 pt-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">{language === 'th' ? 'อาจารย์ผู้สอน' : 'Instructor'}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{viewingCourse?.lecturerName || (language === 'th' ? 'อ.ไม่ระบุ' : 'TBA')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">{language === 'th' ? 'หน่วยกิต' : 'Credits'}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{viewingCourse?.credits} {t.coursesPage.credits}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">{language === 'th' ? 'สถานที่เรียน' : 'Room Location'}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-200">{viewingCourse?.sections?.[0]?.room || (language === 'th' ? 'ไม่ระบุ' : 'TBA')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">{language === 'th' ? 'ที่นั่งว่าง' : 'Available Seats'}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-200">
                    {viewingCourse && ((viewingCourse.sections?.[0]?.maxStudents || 60) - (viewingCourse.enrolledStudents?.length || 0))} / {viewingCourse?.sections?.[0]?.maxStudents || 60}
                  </p>
                </div>
              </div>
              
              {viewingCourse?.description && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{language === 'th' ? 'คำอธิบายรายวิชา' : 'Description'}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{viewingCourse.description}</p>
                </div>
              )}

              {viewingCourse?.sections?.[0]?.schedule && viewingCourse.sections[0].schedule.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{language === 'th' ? 'เวลาเรียน' : 'Schedule'}</p>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {viewingCourse.sections[0].schedule.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="capitalize">{s.day}</span>
                        <span>{s.startTime} - {s.endTime}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800 mt-4">
              <Button 
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 rounded-xl"
                onClick={() => {
                  if (viewingCourse) {
                    enrollCourse(viewingCourse);
                    setViewingCourse(null);
                  }
                }}
                disabled={!viewingCourse || enrolledCourses.some(c => c.id === viewingCourse.id) || (viewingCourse.enrolledStudents?.length || 0) >= (viewingCourse.sections?.[0]?.maxStudents || 60)}
              >
                {viewingCourse && enrolledCourses.some(c => c.id === viewingCourse.id)
                  ? (language === 'th' ? 'ลงทะเบียนแล้ว' : 'Registered')
                  : viewingCourse && (viewingCourse.enrolledStudents?.length || 0) >= (viewingCourse.sections?.[0]?.maxStudents || 60) 
                    ? (language === 'th' ? 'เต็มแล้ว' : 'Full') 
                    : t.coursesPage.addCourse}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
=======
>>>>>>> Stashed changes
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

          <div className="flex flex-wrap gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={importCoursesFromFile}
            />
            <Button
              variant="outline"
              className="h-11 px-5 rounded-2xl"
              onClick={() => importInputRef.current?.click()}
              disabled={isImporting}
            >
              <Upload className="w-4 h-4 mr-2" />
              {isImporting ? (language === 'th' ? 'กำลังนำเข้า...' : 'Importing...') : (language === 'th' ? 'นำเข้า CSV/Excel' : 'Import CSV/Excel')}
            </Button>
            <Button
              variant="outline"
              className="h-11 px-5 rounded-2xl"
              onClick={downloadImportTemplate}
            >
              <Download className="w-4 h-4 mr-2" />
              {language === 'th' ? 'Template' : 'Template'}
            </Button>
            <Button
              className="h-11 px-5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white"
              onClick={openNewCourseEditor}
            >
              <Plus className="w-4 h-4 mr-2" />
              {language === 'th' ? 'เพิ่มรายวิชา' : 'Add course'}
            </Button>
          </div>
        </div>

        <motion.div variants={itemVariants}>
          <Card className="rounded-2xl border-purple-100 bg-purple-50/70 dark:border-purple-900/50 dark:bg-purple-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-slate-900 dark:text-white">
                {language === 'th' ? 'Walkthrough: นำเข้ารายวิชาจาก CSV/Excel' : 'Walkthrough: Import Courses from CSV/Excel'}
              </CardTitle>
              <CardDescription>
                {language === 'th'
                  ? 'ใช้ไฟล์ .csv, .xlsx หรือ .xls โดยแถวแรกต้องเป็น header ตาม template'
                  : 'Use .csv, .xlsx, or .xls. The first row must contain headers from the template.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-[1fr_260px]">
              <ol className="list-decimal space-y-2 pl-5">
                <li>{language === 'th' ? 'กด Template แล้วเปิดไฟล์ด้วย Excel หรือ Google Sheets' : 'Download the template and open it in Excel or Google Sheets.'}</li>
                <li>{language === 'th' ? 'กรอกอย่างน้อย code, name, nameThai, credits, semester, academicYear, year' : 'Fill at least code, name, nameThai, credits, semester, academicYear, and year.'}</li>
                <li>{language === 'th' ? 'ถ้าไม่ใส่ lecturerId ระบบจะใช้ผู้สอนเริ่มต้นด้านขวา' : 'If lecturerId is blank, the default instructor on the right will be used.'}</li>
                <li>{language === 'th' ? 'กดนำเข้า CSV/Excel ระบบจะข้ามรหัสวิชาที่ซ้ำกับข้อมูลเดิม' : 'Click Import CSV/Excel. Existing duplicate course codes will be skipped.'}</li>
              </ol>
              <div className="space-y-2">
                <Label>{language === 'th' ? 'ผู้สอนเริ่มต้นสำหรับไฟล์นำเข้า' : 'Default import instructor'}</Label>
                <Select value={importLecturerId} onValueChange={setImportLecturerId}>
                  <SelectTrigger className="bg-white dark:bg-slate-900">
                    <SelectValue placeholder={language === 'th' ? 'เลือกผู้สอน' : 'Choose instructor'} />
                  </SelectTrigger>
                  <SelectContent>
                    {lecturers.map((lecturer) => (
                      <SelectItem key={lecturer.id} value={lecturer.id}>
                        {lecturer.name} ({lecturer.lecturerId || lecturer.id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

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
