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
  MoreHorizontal, Plus, Sparkles, BookMarked, Upload, Download, Trash2
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
import { getRoleProfile } from '@/lib/user-profile';
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
  status: string;
  room: string;
  sectionNumber: string;
  scheduleDays: string[];
  scheduleStartTime: string;
  scheduleEndTime: string;
};

type LecturerOption = {
  id: string;
  lecturerId: string;
  name: string;
  userId: string;
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

  const [enrolledCourses, setEnrolledCourses] = React.useState<Course[]>([]);
  const [viewingCourse, setViewingCourse] = React.useState<CourseRow | null>(null);

  React.useEffect(() => {
    let mounted = true;

    if (user?.role === 'student') {
      Promise.allSettled([
        api.courses.list(),
        api.enrollments.list()
      ]).then(([coursesResult, enrollmentsResult]) => {
        if (!mounted) return;
        if (coursesResult.status === 'fulfilled') {
          setCourses(coursesResult.value.courses.map(mapCourse));
        } else {
          setCourses([]);
        }
        if (enrollmentsResult.status === 'fulfilled') {
          const mappedEnrollments = enrollmentsResult.value.enrollments.map((item, index) => {
            const enrollment = asRecord(item);
            return mapCourse(enrollment.course, index);
          });
          setEnrolledCourses(mappedEnrollments);
        } else {
          setEnrolledCourses([]);
        }
      }).catch((error) => {
        console.warn('Unable to load data from API', error);
      }).finally(() => {
        if (mounted) setIsLoading(false);
      });
    } else {
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
    }

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  React.useEffect(() => {
    if (user?.role !== 'staff' && user?.role !== 'admin' && user?.role !== 'lecturer') return;
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
            userId: asString(lecturerUser.id),
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

  const studentProfile = user?.role === 'student' ? getRoleProfile(user) : null;
  const studentSemester = String(studentProfile?.semester ?? '1');

  const visibleCourses = user?.role === 'student' 
    ? courses.filter(c => c.status === 'active' && String(c.semester) === studentSemester) 
    : courses;

  const filteredEnrolledCourses = searchQuery
    ? enrolledCourses.filter(c =>
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameThai?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : enrolledCourses;

  const filteredCourses = searchQuery
    ? visibleCourses.filter(c =>
      c.code?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.nameThai?.toLowerCase().includes(searchQuery.toLowerCase())
    )
    : visibleCourses;
  const registrationMatches = React.useMemo(() => {
    const q = registrationQuery.trim().toLowerCase();
    if (!q) return [];
    return visibleCourses.filter((course) => (
      course.enrolledStudents.length < course.maxStudents &&
      (
        course.code?.toLowerCase().includes(q) ||
        course.name?.toLowerCase().includes(q) ||
        course.nameThai?.toLowerCase().includes(q)
      )
    ));
  }, [visibleCourses, registrationQuery]);
  const totalCredits = user?.role === 'student' ? enrolledCourses.reduce((sum, course) => sum + course.credits, 0) : visibleCourses.reduce((sum, course) => sum + course.credits, 0);
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
      maxStudents: String(course.maxStudents),
      minStudents: String(course.minStudents),
      description: course.description || '',
      syllabus: course.syllabus || '',
      status: course.status || 'active',
      room: course.room || '',
      sectionNumber: course.sections?.[0]?.number || '001',
      scheduleDays: course.schedule?.map(s => s.day) || [],
      scheduleStartTime: course.schedule?.[0]?.startTime || '09:00',
      scheduleEndTime: course.schedule?.[0]?.endTime || '12:00',
    });
  };

  const openNewCourseEditor = () => {
    setEditingCourse(null);
    let defaultLecturerId = importLecturerId || lecturers[0]?.id || '';
    if (user?.role === 'lecturer') {
      const myProfile = lecturers.find(l => l.userId === user?.id);
      if (myProfile) defaultLecturerId = myProfile.id;
    }

    setCourseForm({
      code: '',
      name: '',
      nameThai: '',
      credits: '3',
      semester: '1',
      academicYear: String(new Date().getFullYear() + 543),
      year: '1',
      lecturerId: defaultLecturerId,
      maxStudents: '30',
      minStudents: '0',
      description: '',
      syllabus: '',
      status: user?.role === 'lecturer' ? 'pending' : 'active',
      room: '',
      sectionNumber: '001',
      scheduleDays: [],
      scheduleStartTime: '09:00',
      scheduleEndTime: '12:00',
    });
  };

  const updateCourseForm = <K extends keyof CourseFormState>(field: K, value: CourseFormState[K]) => {
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
        status: courseForm.status,
        room: courseForm.room.trim(),
        sections: [{
          number: courseForm.sectionNumber.trim() || '001',
          room: courseForm.room.trim(),
          maxStudents: Number(courseForm.maxStudents),
          schedule: courseForm.scheduleDays.map(day => ({
            day,
            startTime: courseForm.scheduleStartTime,
            endTime: courseForm.scheduleEndTime,
            type: 'lecture',
          }))
        }],
        schedule: courseForm.scheduleDays.map(day => ({
          day,
          startTime: courseForm.scheduleStartTime,
          endTime: courseForm.scheduleEndTime,
          type: 'lecture',
        })),
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

  const deleteCourse = async (id: string) => {
    if (!window.confirm(language === 'th' ? 'คุณแน่ใจหรือไม่ว่าต้องการลบรายวิชานี้? (ข้อมูลจะถูกลบถาวร)' : 'Are you sure you want to delete this course? (This action is permanent)')) {
      return;
    }
    try {
      await api.courses.delete(id);
      setCourses((current) => current.filter((course) => course.id !== id));
      toast.success(language === 'th' ? 'ลบรายวิชาแล้ว' : 'Course deleted');
      setEditingCourse(null);
      setCourseForm(null);
    } catch (error) {
      console.error('Unable to delete course', error);
      toast.error(language === 'th' ? 'ลบรายวิชาไม่สำเร็จ' : 'Unable to delete course');
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
      const [coursesResponse, enrollmentsResponse] = await Promise.all([
        api.courses.list(),
        api.enrollments.list()
      ]);
      setCourses(coursesResponse.courses.map(mapCourse));
      setEnrolledCourses(enrollmentsResponse.enrollments.map((item, index) => {
        const enrollment = asRecord(item);
        return mapCourse(enrollment.course, index);
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ลงทะเบียนไม่สำเร็จ' : 'Unable to register'));
    }
  };

  const dropCourse = async (courseId: string) => {
    try {
      await api.enrollments.remove(courseId);
      toast.success(language === 'th' ? 'ถอนวิชาสำเร็จ' : 'Course dropped successfully');
      const [coursesResponse, enrollmentsResponse] = await Promise.all([
        api.courses.list(),
        api.enrollments.list()
      ]);
      setCourses(coursesResponse.courses.map(mapCourse));
      setEnrolledCourses(enrollmentsResponse.enrollments.map((item, index) => {
        const enrollment = asRecord(item);
        return mapCourse(enrollment.course, index);
      }));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ถอนวิชาไม่สำเร็จ' : 'Unable to drop course'));
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
      <DialogContent className="max-w-3xl bg-white/90 backdrop-blur-2xl p-0 overflow-hidden gap-0 rounded-[2.5rem] border-white/50 shadow-2xl dark:bg-slate-900/50 dark:border-slate-800">
        <div className="p-6 md:p-8 bg-slate-900 text-white relative overflow-hidden shrink-0">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight text-white">{editingCourse ? (language === 'th' ? 'แก้ไขรายวิชา' : 'Edit course') : (language === 'th' ? 'เพิ่มรายวิชา' : 'Add course')}</DialogTitle>
            <DialogDescription className="text-slate-400">
              {editingCourse ? `${editingCourse.code} ${editingCourse.name}` : (language === 'th' ? 'กรอกรายละเอียดรายวิชาใหม่' : 'Enter the new course details')}
            </DialogDescription>
          </DialogHeader>
        </div>
        {courseForm && (
          <div className="p-6 md:p-8 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
              <Select value={String(courseForm.semester)} onValueChange={(value) => updateCourseForm('semester', value)}>
                <SelectTrigger id="course-semester">
                  <SelectValue placeholder={language === 'th' ? 'เลือกภาคเรียน' : 'Select Semester'} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Pre-school</SelectItem>
                  <SelectItem value="1">{language === 'th' ? 'เทอม 1' : 'Term 1'}</SelectItem>
                  <SelectItem value="2">{language === 'th' ? 'เทอม 2' : 'Term 2'}</SelectItem>
                  <SelectItem value="3">Summer</SelectItem>
                </SelectContent>
              </Select>
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
              <Select disabled={user?.role === 'lecturer'} value={courseForm.lecturerId} onValueChange={(value) => updateCourseForm('lecturerId', value)}>
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
            <div className="space-y-2 md:col-span-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{language === 'th' ? 'วันเวลาและสถานที่เรียน' : 'Schedule & Room'}</h3>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>{language === 'th' ? 'วันที่เรียน (เลือกได้หลายวัน หรือไม่เลือกเพื่อเป็น TBA)' : 'Days (Select multiple, or none for TBA)'}</Label>
              <div className="flex flex-wrap gap-2 mt-1">
                {[
                  { id: 'monday', th: 'จันทร์', en: 'Mon' },
                  { id: 'tuesday', th: 'อังคาร', en: 'Tue' },
                  { id: 'wednesday', th: 'พุธ', en: 'Wed' },
                  { id: 'thursday', th: 'พฤหัสฯ', en: 'Thu' },
                  { id: 'friday', th: 'ศุกร์', en: 'Fri' },
                  { id: 'saturday', th: 'เสาร์', en: 'Sat' },
                  { id: 'sunday', th: 'อาทิตย์', en: 'Sun' }
                ].map((day) => {
                  const isSelected = courseForm.scheduleDays.includes(day.id);
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        const newDays = isSelected
                          ? courseForm.scheduleDays.filter(d => d !== day.id)
                          : [...courseForm.scheduleDays, day.id];
                        updateCourseForm('scheduleDays', newDays);
                      }}
                      className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border ${
                        isSelected
                          ? 'bg-indigo-500 border-indigo-500 text-white shadow-md shadow-indigo-500/20'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800'
                      }`}
                    >
                      {language === 'th' ? day.th : day.en}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2 flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="course-time-start">{language === 'th' ? 'เวลาเริ่ม' : 'Start Time'}</Label>
                <Input id="course-time-start" type="time" value={courseForm.scheduleStartTime} onChange={(event) => updateCourseForm('scheduleStartTime', event.target.value)} />
              </div>
              <div className="flex-1 space-y-2">
                <Label htmlFor="course-time-end">{language === 'th' ? 'เวลาสิ้นสุด' : 'End Time'}</Label>
                <Input id="course-time-end" type="time" value={courseForm.scheduleEndTime} onChange={(event) => updateCourseForm('scheduleEndTime', event.target.value)} />
              </div>
            </div>
            <div className="space-y-2 flex gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="course-section">{language === 'th' ? 'ตอนเรียน (Section)' : 'Section'}</Label>
                <Input id="course-section" placeholder="Ex. 001, 801" value={courseForm.sectionNumber} onChange={(event) => updateCourseForm('sectionNumber', event.target.value)} />
              </div>
              <div className="flex-[2] space-y-2">
                <Label htmlFor="course-room">{language === 'th' ? 'ห้องเรียน' : 'Room Location'}</Label>
                <Input id="course-room" placeholder="Ex. CAMT 113" value={courseForm.room} onChange={(event) => updateCourseForm('room', event.target.value)} />
              </div>
            </div>

            <div className="md:col-span-2 space-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <Label htmlFor="course-description">{language === 'th' ? 'คำอธิบายรายวิชา' : 'Description'}</Label>
              <Textarea id="course-description" value={courseForm.description} onChange={(event) => updateCourseForm('description', event.target.value)} />
            </div>
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="course-syllabus">Syllabus</Label>
              <Textarea id="course-syllabus" value={courseForm.syllabus} onChange={(event) => updateCourseForm('syllabus', event.target.value)} />
            </div>
            {(user?.role === 'staff' || user?.role === 'admin') && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="course-status">{language === 'th' ? 'สถานะรายวิชา' : 'Course Status'}</Label>
                <Select value={courseForm.status} onValueChange={(value) => updateCourseForm('status', value)}>
                  <SelectTrigger id="course-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{language === 'th' ? 'เปิดสอน (Active)' : 'Active'}</SelectItem>
                    <SelectItem value="pending">{language === 'th' ? 'รออนุมัติ (Pending)' : 'Pending'}</SelectItem>
                    <SelectItem value="draft">{language === 'th' ? 'แบบร่าง (Draft)' : 'Draft'}</SelectItem>
                    <SelectItem value="archived">{language === 'th' ? 'ปิดรายวิชา (Archived)' : 'Archived'}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            </div>
          </div>
        )}
        <div className="p-6 md:p-8 pt-4 md:pt-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <DialogFooter className="flex justify-between sm:justify-between w-full">
          <div>
            {editingCourse && (
              <Button variant="destructive" onClick={() => deleteCourse(editingCourse.id)} disabled={isSaving}>
                {language === 'th' ? 'ลบรายวิชา' : 'Delete'}
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setEditingCourse(null); setCourseForm(null); }} disabled={isSaving}>
              {language === 'th' ? 'ยกเลิก' : 'Cancel'}
            </Button>
            <Button onClick={saveCourse} disabled={isSaving || !courseForm}>
              {isSaving ? (language === 'th' ? 'กำลังบันทึก...' : 'Saving...') : (language === 'th' ? 'บันทึก' : 'Save')}
            </Button>
          </div>
          </DialogFooter>
        </div>
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
            <motion.div variants={itemVariants} className="flex justify-between items-center bg-white/60 dark:bg-slate-900/50 backdrop-blur-md border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                  {language === 'th' ? 'ความคืบหน้าการลงทะเบียน' : 'Registration Progress'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {language === 'th' ? `คุณได้ลงทะเบียนไปแล้ว ${enrolledCourses.length} จาก ${visibleCourses.length} วิชาที่แนะนำในภาคเรียนนี้` : `You have enrolled in ${enrolledCourses.length} out of ${visibleCourses.length} recommended courses this semester`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">{enrolledCourses.length}/{visibleCourses.length}</span>
                <span className="text-sm text-slate-500 dark:text-slate-400 block">{language === 'th' ? 'วิชา' : 'Courses'}</span>
              </div>
            </motion.div>

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
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/60 hover:bg-white text-slate-600 dark:text-slate-300 dark:bg-slate-900/50" onClick={() => setSearchQuery('')}>
                <Filter className="w-4 h-4 mr-2" />
                {t.coursesPage.filter}
              </Button>
            </motion.div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEnrolledCourses.map((course, index) => (
                <motion.div
                  key={course.id}
                  variants={itemVariants}
                  whileHover={{ y: -8, scale: 1.01 }}
                  className="group relative bg-white/70 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 p-6 rounded-3xl shadow-sm hover:shadow-2xl hover:shadow-blue-500/10 transition-all duration-300 overflow-hidden dark:bg-slate-900/50 cursor-pointer"
                  onClick={() => setViewingCourse(course as unknown as CourseRow)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-blue-50/50 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <Badge variant="outline" className="bg-white/50 backdrop-blur border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1 text-xs font-bold rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 transition-colors dark:bg-slate-900/50">
                        {(user as unknown as Student).year || 3}
                      </Badge>
                      <button 
                        onClick={(e) => { e.stopPropagation(); dropCourse(course.id); }}
                        title={language === 'th' ? 'ถอนวิชา' : 'Drop Course'}
                        className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-950/30 flex items-center justify-center text-red-400 hover:bg-red-100 hover:text-red-600 transition-colors z-20"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
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
                        <span>{course.room || t.coursesPage.room}</span>
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="flex justify-between text-xs font-medium mb-2">
                        <span className="text-slate-500 dark:text-slate-400">{t.coursesPage.progress}</span>
                        <span className="text-blue-600 dark:text-slate-300">0%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: '0%' }}
                          className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {filteredEnrolledCourses.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
                  {language === 'th' ? 'ยังไม่มีวิชาที่ลงทะเบียน' : 'No enrolled courses'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="registration" className="space-y-6">
            <motion.div variants={itemVariants} className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3">
                  <BookMarked className="w-6 h-6 text-yellow-300" />
                  {language === 'th' ? 'วิชาที่ต้องเรียนในภาคเรียนนี้' : 'Required courses this semester'}
                </h2>
                <p className="text-indigo-100 mb-8 max-w-2xl">
                  {language === 'th' ? 'รายวิชาที่คุณสามารถลงทะเบียนเรียนได้ในภาคการศึกษานี้' : 'Courses you can register for in this semester'}
                </p>

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
                          <span>{course.enrolledStudents.length}/{course.maxStudents} {language === 'th' ? 'คน' : 'students'}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full bg-white dark:bg-slate-900 text-indigo-600 hover:bg-indigo-50 border-0 font-bold dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                          onClick={(e) => { e.stopPropagation(); enrollCourse(course); }}
                          disabled={enrolledCourses.some(c => c.id === course.id) || course.enrolledStudents.length >= course.maxStudents}
                        >
                          {enrolledCourses.some(c => c.id === course.id) 
                            ? (language === 'th' ? 'ลงทะเบียนแล้ว' : 'Registered') 
                            : course.enrolledStudents.length >= course.maxStudents 
                              ? (language === 'th' ? 'เต็มแล้ว' : 'Full') 
                              : t.coursesPage.addCourse}
                        </Button>
                      </div>
                    </div>
                  ))}
                  {!isLoading && visibleCourses.length === 0 && (
                    <div className="md:col-span-3 rounded-2xl border border-white/20 bg-white/10 p-6 text-center text-sm text-indigo-100">
                      {language === 'th' ? 'ไม่มีวิชาที่เปิดสอนในภาคเรียนนี้' : 'No courses available this semester'}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>

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
                  <p className="font-medium text-slate-900 dark:text-slate-200">{viewingCourse?.room || (language === 'th' ? 'ไม่ระบุ' : 'TBA')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">{language === 'th' ? 'ที่นั่งว่าง' : 'Available Seats'}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-200">
                    {viewingCourse && (viewingCourse.maxStudents - (viewingCourse.enrolledStudents?.length || 0))} / {viewingCourse?.maxStudents}
                  </p>
                </div>
              </div>
              
              {viewingCourse?.description && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{language === 'th' ? 'คำอธิบายรายวิชา' : 'Description'}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">{viewingCourse.description}</p>
                </div>
              )}

              {viewingCourse?.schedule && viewingCourse.schedule.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-200">{language === 'th' ? 'เวลาเรียน' : 'Schedule'}</p>
                  <div className="space-y-1 text-sm text-slate-600 dark:text-slate-300">
                    {viewingCourse.schedule.map((s, i) => (
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
                disabled={!viewingCourse || enrolledCourses.some(c => c.id === viewingCourse.id) || (viewingCourse.enrolledStudents?.length || 0) >= viewingCourse.maxStudents}
              >
                {viewingCourse && enrolledCourses.some(c => c.id === viewingCourse.id)
                  ? (language === 'th' ? 'ลงทะเบียนแล้ว' : 'Registered')
                  : viewingCourse && (viewingCourse.enrolledStudents?.length || 0) >= viewingCourse.maxStudents 
                    ? (language === 'th' ? 'เต็มแล้ว' : 'Full') 
                    : t.coursesPage.addCourse}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Button onClick={openNewCourseEditor} size="lg" className="rounded-2xl px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-xl shadow-blue-500/20 h-12 font-bold transform active:scale-95 transition-all">
              <Plus className="w-5 h-5 mr-2" /> {language === 'th' ? 'เสนอรายวิชาใหม่' : 'New Course Request'}
            </Button>
          </motion.div>
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
                <div className="flex gap-2">
                  <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 border-0 dark:text-slate-300 dark:bg-slate-800">{course.code}</Badge>
                  {course.status === 'pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">Pending</Badge>}
                  {course.status === 'draft' && <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">Draft</Badge>}
                </div>
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
              <div className="flex gap-2 mt-5">
                <Button className="w-full rounded-xl flex-1" variant="outline" onClick={() => openCourseEditor(course)}>
                  {language === 'th' ? 'แก้ไขรายวิชา' : 'Edit course'}
                </Button>
                <Button className="rounded-xl px-3" variant="destructive" onClick={() => deleteCourse(course.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
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
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 dark:text-slate-300 dark:bg-slate-800">{course.code}</Badge>
                      {course.status === 'pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">Pending Approval</Badge>}
                      {course.status === 'draft' && <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">Draft</Badge>}
                      {course.status === 'archived' && <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-0">Archived</Badge>}
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
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <Button variant="ghost" className="w-full text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl" onClick={() => deleteCourse(course.id)}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {language === 'th' ? 'ลบรายวิชา' : 'Delete course'}
                  </Button>
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
