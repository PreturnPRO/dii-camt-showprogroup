import React from 'react';
import { SectionsEditor } from '@/components/courses/SectionsEditor';
import { emptySection, sectionsFromCourse, sectionsPayload, sectionsProblem, type FormSection } from '@/lib/course-form';
import { enrolledSectionInfo } from '@/lib/enrolled-section';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Student } from '@/types';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  BookOpen, Users, Calendar, MapPin, Filter, Search,
  GraduationCap, Clock, AlertCircle, ChevronRight,
  MoreHorizontal, Plus, Sparkles, BookMarked, Upload, Download, Trash2, Settings
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
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { isCourseFull, openSections, seatsLeft } from '@/lib/course-seats';
import { api, ApiError, type RegistrationSummary } from '@/lib/api';
import { asNumber, asRecord, asString } from '@/lib/live-data';
import { mapCourse } from '@/lib/live-mappers';
import { CoursesLoadError, RegisterCta } from '@/components/common/RegisterCta';
// course import builds section 01 from the file's seat limits (the backend ignores top-level maxStudents)
import { downloadImportTemplate, normalizeImportCourse, parseCourseImportFile, planCourseImport, type ImportSkip } from '@/lib/course-import';
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
  description: string;
  syllabus: string;
  status: string;
  /** every section with its own seats, room and weekly classes */
  sections: FormSection[];
};

type LecturerOption = {
  id: string;
  lecturerId: string;
  name: string;
  userId: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

/** the course's real status (a pending course is not "active") */
const courseStatusLabel = (status: Course['status'], th: boolean) => {
  switch (status) {
    case 'pending': return th ? 'รออนุมัติ' : 'Pending approval';
    case 'draft': return th ? 'ฉบับร่าง' : 'Draft';
    case 'archived': return th ? 'ปิดแล้ว' : 'Archived';
    default: return th ? 'เปิดใช้งาน' : 'Active';
  }
};

export default function Courses() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [registrationQuery, setRegistrationQuery] = React.useState('');
  const [courses, setCourses] = React.useState<CourseRow[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [enrollmentsFailed, setEnrollmentsFailed] = React.useState(false);
  const [editingCourse, setEditingCourse] = React.useState<CourseRow | null>(null);
  const [courseForm, setCourseForm] = React.useState<CourseFormState | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const [lecturers, setLecturers] = React.useState<LecturerOption[]>([]);
  const [importLecturerId, setImportLecturerId] = React.useState('');
  // rows of the last import that did not become courses, with the reason
  const [importProblems, setImportProblems] = React.useState<ImportSkip[]>([]);
  const [isImporting, setIsImporting] = React.useState(false);
  const importInputRef = React.useRef<HTMLInputElement | null>(null);

  const [enrolledCourses, setEnrolledCourses] = React.useState<Course[]>([]);
  // the student's own section per course (times, room), from the enrollment rows
  const [enrolledSections, setEnrolledSections] = React.useState<Record<string, unknown>>({});
  const [viewingCourse, setViewingCourse] = React.useState<CourseRow | null>(null);
  // tabs live in ?tab= so other pages can deep-link straight to registration (design.md §4.10)
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') === 'registration' ? 'registration' : 'my-courses';
  const setActiveTab = (tab: string) => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('tab', tab); return p; }, { replace: true });
  const [summary, setSummary] = React.useState<RegistrationSummary | null>(null);
  const [pendingEnroll, setPendingEnroll] = React.useState<CourseRow | null>(null);
  const [pendingSectionId, setPendingSectionId] = React.useState('');
  const [pendingDrop, setPendingDrop] = React.useState<Course | null>(null);

  const reloadStudentData = React.useCallback(async () => {
    const [coursesResponse, enrollmentsResponse, summaryResponse] = await Promise.all([
      api.courses.list(),
      api.enrollments.list(),
      api.enrollments.summary(),
    ]);
    setCourses(coursesResponse.courses.map(mapCourse));
    setEnrolledCourses(enrollmentsResponse.enrollments.map((item, index) => mapCourse(asRecord(item).course, index)));
    setEnrolledSections(Object.fromEntries(enrollmentsResponse.enrollments.map((item) => [asString(asRecord(item).courseId), item])));
    setSummary(summaryResponse.summary);
  }, []);

  React.useEffect(() => {
    let mounted = true;

    if (user?.role === 'student') {
      Promise.allSettled([
        api.courses.list(),
        api.enrollments.list(),
        api.enrollments.summary(),
      ]).then(([coursesResult, enrollmentsResult, summaryResult]) => {
        if (!mounted) return;
        setSummary(summaryResult.status === 'fulfilled' ? summaryResult.value.summary : null);
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
          setEnrolledSections(Object.fromEntries(enrollmentsResult.value.enrollments.map((item) => [asString(asRecord(item).courseId), item])));
          setEnrollmentsFailed(false);
        } else {
          setEnrolledCourses([]);
          setEnrollmentsFailed(true);
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
      })
      .catch((error) => {
        console.warn('Unable to load lecturers for course import', error);
        setLecturers([]);
      });

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  // the term comes from the API summary (the same term the backend enforces), not from the cached login profile
  const visibleCourses = user?.role === 'student'
    ? courses.filter(c => !!summary && c.status === 'active' && c.semester === summary.semester && String(c.academicYear) === summary.academicYear)
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
    return visibleCourses.filter((course) => {
      return !isCourseFull(course) &&
      (
        course.code?.toLowerCase().includes(q) ||
        course.name?.toLowerCase().includes(q) ||
        course.nameThai?.toLowerCase().includes(q)
      )
    });
  }, [visibleCourses, registrationQuery]);
  const totalCredits = visibleCourses.reduce((sum, course) => sum + course.credits, 0);
  const creditProgress = summary ? Math.min((summary.termCredits / summary.maxCredits) * 100, 100) : 0;

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
      description: course.description || '',
      syllabus: course.syllabus || '',
      status: course.status || 'active',
      sections: sectionsFromCourse(course),
    });
  };

  const openNewCourseEditor = () => {
    setEditingCourse(null);
    // staff choose the instructor; nobody is filled in for them
    let defaultLecturerId = importLecturerId;
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
      description: '',
      syllabus: '',
      status: user?.role === 'lecturer' ? 'pending' : 'active',
      sections: [emptySection([])],
    });
  };

  // owner decision 9/10/69: a lecturer may not change the shape of their open (active) course
  const shapeLocked = user?.role === 'lecturer' && editingCourse?.status === 'active';

  const updateCourseForm = <K extends keyof CourseFormState>(field: K, value: CourseFormState[K]) => {
    setCourseForm((current) => current ? { ...current, [field]: value } : current);
  };

  const saveCourse = async () => {
    if (!courseForm) return;
    if (!courseForm.lecturerId) {
      toast.error(language === 'th' ? 'กรุณาเลือกผู้สอนก่อนบันทึกรายวิชา' : 'Please choose an instructor before saving');
      return;
    }
    const problem = shapeLocked ? null : sectionsProblem(courseForm.sections);
    if (problem) {
      toast.error(language === 'th' ? problem.th : problem.en);
      return;
    }
    setIsSaving(true);
    try {
      const payload = {
        name: courseForm.name.trim(),
        nameThai: courseForm.nameThai.trim(),
        year: Number(courseForm.year),
        lecturerId: courseForm.lecturerId,
        description: courseForm.description.trim(),
        syllabus: courseForm.syllabus.trim(),
        status: courseForm.status,
        // an open course's shape is staff's to change (owner decision 9/10/69): a lecturer does not send it
        ...(shapeLocked ? {} : {
          code: courseForm.code.trim(),
          credits: Number(courseForm.credits),
          semester: Number(courseForm.semester),
          academicYear: courseForm.academicYear.trim(),
          sections: sectionsPayload(courseForm.sections),
        }),
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
      const status = error instanceof ApiError ? error.status : 0;
      toast.error(
        status === 409
          ? (language === 'th' ? `บันทึกไม่ได้: ${error instanceof Error ? error.message : 'ข้อมูลซ้ำ'}` : `Not saved: ${error instanceof Error ? error.message : 'duplicate'}`)
          : status === 403
            ? (language === 'th' ? 'ไม่มีสิทธิ์แก้ส่วนนี้ของรายวิชา' : 'You may not change this part of the course')
            : (language === 'th' ? 'บันทึกรายวิชาไม่สำเร็จ' : 'Unable to save course'),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCourse = async (id: string) => {
    if (!window.confirm(language === 'th'
      ? 'ลบรายวิชานี้? ถ้าเคยมีนักศึกษาลงทะเบียน ระบบจะปิดรายวิชา (Archived) แทนการลบ เพื่อเก็บประวัติ'
      : 'Delete this course? If anyone ever enrolled, it is archived instead, to keep the history.')) {
      return;
    }
    try {
      const result = await api.courses.delete(id);
      // a course with enrollment history is archived by the server, not deleted (owner decision 9/10/69)
      if (result.archived) {
        setCourses((current) => current.map((course) => course.id === id ? { ...course, status: 'archived' } : course));
        toast.success(language === 'th' ? 'รายวิชานี้มีประวัติการลงทะเบียน จึงปิดรายวิชาแทนการลบ' : 'The course has enrollment history, so it was archived instead');
      } else {
        setCourses((current) => current.filter((course) => course.id !== id));
        toast.success(language === 'th' ? 'ลบรายวิชาแล้ว' : 'Course deleted');
      }
      setEditingCourse(null);
      setCourseForm(null);
    } catch (error) {
      console.error('Unable to delete course', error);
      toast.error(error instanceof ApiError && error.status === 403
        ? (language === 'th' ? 'รายวิชาที่เปิดสอนแล้วปิดได้โดยเจ้าหน้าที่' : 'An open course is closed by staff')
        : (language === 'th' ? 'ลบรายวิชาไม่สำเร็จ' : 'Unable to delete course'));
    }
  };

  const enrollCourse = async (course: CourseRow, sectionId?: string) => {
    try {
      await api.enrollments.create({
        courseId: course.id,
        ...(sectionId ? { sectionId } : {}),
      });
      toast.success(language === 'th' ? 'ลงทะเบียนรายวิชาแล้ว' : 'Course registered');
      await reloadStudentData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ลงทะเบียนไม่สำเร็จ' : 'Unable to register'));
    }
  };

  const dropCourse = async (courseId: string) => {
    try {
      await api.enrollments.remove(courseId);
      toast.success(language === 'th' ? 'ถอนวิชาสำเร็จ' : 'Course dropped successfully');
      await reloadStudentData();
    } catch (error) {
      // 409 = the course has a grade (published or a draft); the message never says which, or what grade
      if (error instanceof ApiError && error.status === 409) {
        toast.error(language === 'th' ? 'ถอนวิชานี้ไม่ได้แล้ว กรุณาติดต่ออาจารย์ผู้สอน' : 'This course can no longer be dropped. Please contact the lecturer.');
        return;
      }
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ถอนวิชาไม่สำเร็จ' : 'Unable to drop course'));
    }
  };

  const askToEnroll = (course: CourseRow) => {
    setPendingEnroll(course);
    setPendingSectionId(openSections(course)[0]?.id ?? '');
  };

  /** free seats over all sections; a course without sections has no limit */
  const seatLabel = (course: Course) => {
    if (course.sections.length === 0) return language === 'th' ? 'ไม่จำกัดที่นั่ง' : 'No seat limit';
    const free = course.sections.reduce((n, s) => n + seatsLeft(s), 0);
    const total = course.sections.reduce((n, s) => n + s.maxStudents, 0);
    return language === 'th' ? `ที่นั่งว่าง ${free}/${total}` : `${free}/${total} seats free`;
  };

  const importCoursesFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    // no silent default: a row without an instructor needs one chosen here (audit M-N7)
    const fallbackLecturerId = importLecturerId;

    setIsImporting(true);
    try {
      const rows = await parseCourseImportFile(file);
      if (!rows.length) {
        toast.error(language === 'th' ? 'ไม่พบข้อมูลรายวิชาในไฟล์' : 'No course rows found in the file');
        return;
      }

      const payloads = rows.map((row) => normalizeImportCourse(row, fallbackLecturerId));
      const plan = planCourseImport(payloads, courses);
      const failures: ImportSkip[] = [...plan.skipped];
      const createdCourses: CourseRow[] = [];
      // one row at a time, so a failing row is reported and the others still go in
      for (const payload of plan.toCreate) {
        try {
          const response = await api.courses.create(payload);
          createdCourses.push(mapCourse(response.course));
        } catch (error) {
          failures.push({
            row: payloads.indexOf(payload) + 2,
            code: payload.code,
            reason: { th: error instanceof Error ? error.message : 'บันทึกไม่สำเร็จ', en: error instanceof Error ? error.message : 'not saved' },
          });
        }
      }

      if (createdCourses.length) setCourses((current) => [...createdCourses, ...current]);
      setImportProblems(failures.sort((a, b) => a.row - b.row));
      const summary = language === 'th'
        ? `นำเข้า ${createdCourses.length} รายวิชา${failures.length ? ` · ไม่ได้นำเข้า ${failures.length} แถว (ดูรายการด้านล่าง)` : ''}`
        : `Imported ${createdCourses.length} courses${failures.length ? ` · ${failures.length} rows not imported (see the list)` : ''}`;
      if (createdCourses.length) toast.success(summary);
      else toast.error(summary);
    } catch (error) {
      console.error('Unable to import courses', error);
      toast.error(language === 'th' ? 'อ่านไฟล์ไม่สำเร็จ ตรวจว่าเป็น CSV หรือ Excel' : 'Could not read the file; check it is CSV or Excel');
    } finally {
      setIsImporting(false);
    }
  };

  const courseEditorDialog = (
    <Dialog open={Boolean(courseForm)} onOpenChange={(open) => {
      if (!open) {
        setEditingCourse(null);
        setCourseForm(null);
      }
    }}>
      <DialogContent className="max-w-3xl bg-white p-0 overflow-hidden gap-0 rounded-[2.5rem] border-slate-200/80 shadow-2xl dark:bg-slate-900 dark:border-slate-800">
        <div className="p-6 md:p-8 bg-slate-900 text-white relative overflow-hidden shrink-0">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-white leading-snug">{editingCourse ? (language === 'th' ? 'แก้ไขรายวิชา' : 'Edit course') : (language === 'th' ? 'เพิ่มรายวิชา' : 'Add course')}</DialogTitle>
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
              <Input id="course-code" disabled={shapeLocked} value={courseForm.code} onChange={(event) => updateCourseForm('code', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-credits">{language === 'th' ? 'หน่วยกิต' : 'Credits'}</Label>
              <Input id="course-credits" type="number" min="1" disabled={shapeLocked} value={courseForm.credits} onChange={(event) => updateCourseForm('credits', event.target.value)} />
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
              <Select disabled={shapeLocked} value={String(courseForm.semester)} onValueChange={(value) => updateCourseForm('semester', value)}>
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
              <Input id="course-year" disabled={shapeLocked} value={courseForm.academicYear} onChange={(event) => updateCourseForm('academicYear', event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-level">{language === 'th' ? 'ชั้นปี' : 'Year level'}</Label>
              <Input id="course-level" type="number" min="1" value={courseForm.year} onChange={(event) => updateCourseForm('year', event.target.value)} />
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
              <h3 className="font-semibold text-slate-800 dark:text-slate-200">{language === 'th' ? 'ตอนเรียน วันเวลา และห้อง' : 'Sections, times and rooms'}</h3>
              {shapeLocked && (
                <p data-testid="course-shape-locked" className="text-sm leading-relaxed text-amber-700 dark:text-amber-400">
                  {language === 'th'
                    ? 'รายวิชานี้เปิดสอนแล้ว — รหัส หน่วยกิต ภาคเรียน ตอน วันเวลา และห้อง แก้ได้โดยเจ้าหน้าที่ (ย้ายคาบรายครั้งใช้เมนูย้ายคาบ)'
                    : 'This course is open — code, credits, term, sections, times and rooms are changed by staff (use class moves for one-off changes)'}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <SectionsEditor sections={courseForm.sections} onChange={(sections) => updateCourseForm('sections', sections)} disabled={shapeLocked} language={language === 'th' ? 'th' : 'en'} />
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
              <span>{t.coursesPage.semester} {summary ? `${summary.semester}/${summary.academicYear}` : '-'}</span>
            </motion.div>
            <motion.h1
              className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug"
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
              onClick={() => setActiveTab('registration')}
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
            className="bg-blue-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                  <BookMarked className="w-6 h-6" />
                </div>
                <span className="text-xs text-white/85">{t.coursesPage.registeredCourses}</span>
              </div>
              <div className="text-3xl font-extrabold font-mono tracking-tight text-white">{enrolledCourses.length}</div>{/* D-24: นับวิชาที่ลงทะเบียนจริง */}
              <div className="mt-2 text-sm text-blue-100 flex items-center gap-1">
                <Sparkles className="w-4 h-4" /> {t.coursesPage.regularSemester}
              </div>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            whileHover={{ y: -5 }}
            className="bg-purple-600 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <span className="text-xs text-white/85">{t.coursesPage.totalCredits}</span>
              </div>
              {user?.role === 'student' ? (
                <>
                  <div className="text-4xl font-bold leading-snug" data-testid="term-credits">{summary ? `${summary.termCredits}/${summary.maxCredits}` : '-'}</div>
                  {summary && (
                    <div className="mt-2 text-sm text-purple-100">
                      {language === 'th'
                        ? `หน่วยกิตเทอม ${summary.semester}/${summary.academicYear} (สูงสุด ${summary.maxCredits})`
                        : `Credits in term ${summary.semester}/${summary.academicYear} (max ${summary.maxCredits})`}
                    </div>
                  )}
                  {/* Mini Progress Bar */}
                  <div className="mt-4 h-1.5 w-full bg-black/20 rounded-full overflow-hidden">
                    <div className="h-full bg-white/90" style={{ width: `${creditProgress}%` }} />
                  </div>
                </>
              ) : (
                <div className="text-3xl font-extrabold font-mono tracking-tight text-white">{totalCredits}</div>
              )}
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
              {/* what the system knows: the courses registered this term; it has no payment records */}
              <div data-testid="registration-status" className="text-2xl font-bold text-slate-800 dark:text-slate-200 leading-snug">
                {enrollmentsFailed ? '-' : language === 'th' ? `ลงทะเบียนแล้ว ${enrolledCourses.length} วิชา` : `${enrolledCourses.length} course(s) registered`}
              </div>
              <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                {language === 'th' ? 'ระบบนี้ไม่มีข้อมูลการชำระเงิน' : 'Payment is not tracked here'}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-8">
          <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 shadow-xs w-full md:w-auto flex overflow-x-auto">
            <TabsTrigger value="my-courses" data-value="my-courses" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              {t.coursesPage.myCourses}
            </TabsTrigger>
            <TabsTrigger value="registration" data-value="registration" className="rounded-xl px-6 py-2.5 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-md font-medium text-slate-600 dark:text-slate-400 flex-1 md:flex-none dark:bg-slate-900">
              {t.coursesPage.registerTab}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="my-courses" className="space-y-6">
            <motion.div variants={itemVariants} className="flex justify-between items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-2xl">
              <div>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                  {language === 'th' ? 'ความคืบหน้าการลงทะเบียน' : 'Registration Progress'}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {/* the term's open courses, not a recommendation list (nothing recommends them) */}
                  {language === 'th' ? `ลงทะเบียนแล้ว ${enrolledCourses.length} วิชา จากวิชาที่เปิดในภาคเรียนนี้ ${visibleCourses.length} วิชา` : `Registered in ${enrolledCourses.length} of the ${visibleCourses.length} courses open this term`}
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400 leading-snug">{enrolledCourses.length}/{visibleCourses.length}</span>
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
                  className="pl-12 h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm focus:ring-2 focus:ring-blue-100"
                />
              </div>
              <Button variant="outline" className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300" onClick={() => setSearchQuery('')}>
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
                  className="group relative bg-white border border-slate-200/80 dark:border-slate-800/60 p-6 rounded-3xl shadow-sm hover:shadow-2xl transition-all duration-300 overflow-hidden dark:bg-slate-900 cursor-pointer"
                  onClick={() => setViewingCourse(course as unknown as CourseRow)}
                >
                  <div className="bg-white dark:bg-slate-900 absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <Badge variant="outline" className="bg-white dark:bg-[#0c1222] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 px-3 py-1 text-xs font-bold rounded-lg group-hover:bg-blue-50 group-hover:text-blue-600 group-hover:border-blue-100 dark:group-hover:bg-blue-950/30 dark:group-hover:text-blue-400 dark:group-hover:border-blue-900/30 transition-colors">
                        {/* the year the course is meant for, not a guessed year of the student */}
                        {language === 'th' ? `ปี ${course.year}` : `Year ${course.year}`}
                      </Badge>
                      <button 
                        data-testid={`drop-${course.code}`}
                        onClick={(e) => { e.stopPropagation(); setPendingDrop(course); }}
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
                        <span data-testid="course-card-schedule">{enrolledSectionInfo(enrolledSections[course.id], language === 'th' ? 'th' : 'en').schedule}</span>
                      </div>
                      <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                        <MapPin className="w-4 h-4 text-slate-400" />
                        <span data-testid="course-card-room">{enrolledSectionInfo(enrolledSections[course.id], language === 'th' ? 'th' : 'en').room}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
              {isLoading ? null : enrollmentsFailed ? (
                <div className="col-span-full"><CoursesLoadError /></div>
              ) : enrolledCourses.length === 0 ? (
                <div className="col-span-full"><RegisterCta onClick={() => setActiveTab('registration')} /></div>
              ) : filteredEnrolledCourses.length === 0 && (
                <div className="col-span-full py-12 text-center text-slate-500 dark:text-slate-400">
                  {language === 'th' ? 'ไม่พบวิชาที่ค้นหา' : 'No matching courses'}
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="registration" className="space-y-6">
            <motion.div variants={itemVariants} className="bg-indigo-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-2xl font-bold mb-2 flex items-center gap-3 leading-snug">
                  <BookMarked className="w-6 h-6 text-yellow-300" />
                  {language === 'th' ? 'วิชาที่ต้องเรียนในภาคเรียนนี้' : 'Required courses this semester'}
                </h2>
                <p className="text-indigo-100 mb-8 max-w-2xl">
                  {language === 'th' ? 'รายวิชาที่คุณสามารถลงทะเบียนเรียนได้ในภาคการศึกษานี้' : 'Courses you can register for in this semester'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {visibleCourses.map((course) => (
                    <div key={course.id} className="bg-white/10 border border-white/20 p-5 rounded-2xl hover:bg-white/25 transition-colors cursor-pointer dark:bg-slate-900 flex flex-col justify-between" onClick={() => setViewingCourse(course)}>
                      <div>
                        <div className="flex justify-between items-start mb-3">
                          <Badge className="bg-white/20 hover:bg-white/25 text-white border-0">{course.code}</Badge>
                          <span className="text-xs font-medium text-indigo-100 bg-indigo-500/30 px-2 py-1 rounded-lg">{course.lecturerName || t.coursesPage.instructorTBA}</span>
                        </div>
                        <h3 className="font-bold text-lg mb-1">{course.name}</h3>
                        <div className="text-sm text-indigo-200 mb-3">{course.nameThai}</div>
                      </div>
                      <div>
                        <div className="flex justify-between items-center mb-4 text-sm text-indigo-100">
                          <span>{course.credits} {t.coursesPage.credits}</span>
                          <span>{seatLabel(course)}</span>
                        </div>
                        <Button 
                          size="sm" 
                          className="w-full bg-white dark:bg-slate-900 text-indigo-600 hover:bg-indigo-50 border-0 font-bold dark:text-slate-200 disabled:opacity-50 disabled:cursor-not-allowed" 
                          data-testid={`enroll-${course.code}`}
                          onClick={(e) => { e.stopPropagation(); askToEnroll(course); }}
                          disabled={enrolledCourses.some(c => c.id === course.id) || isCourseFull(course)}
                        >
                          {enrolledCourses.some(c => c.id === course.id) 
                            ? (language === 'th' ? 'ลงทะเบียนแล้ว' : 'Registered') 
                            : isCourseFull(course) 
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
                  <p className="font-medium text-slate-900 dark:text-slate-200">{viewingCourse?.sections?.[0]?.room || (language === 'th' ? 'ไม่ระบุ' : 'TBA')}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider dark:text-slate-400">{language === 'th' ? 'ที่นั่งว่าง' : 'Available Seats'}</p>
                  <p className="font-medium text-slate-900 dark:text-slate-200">
                    {viewingCourse && seatLabel(viewingCourse)}
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
                    askToEnroll(viewingCourse);
                    setViewingCourse(null);
                  }
                }}
                disabled={!viewingCourse || enrolledCourses.some(c => c.id === viewingCourse.id) || isCourseFull(viewingCourse)}
              >
                {viewingCourse && enrolledCourses.some(c => c.id === viewingCourse.id)
                  ? (language === 'th' ? 'ลงทะเบียนแล้ว' : 'Registered')
                  : viewingCourse && isCourseFull(viewingCourse) 
                    ? (language === 'th' ? 'เต็มแล้ว' : 'Full') 
                    : t.coursesPage.addCourse}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={!!pendingEnroll} onOpenChange={(open) => { if (!open) setPendingEnroll(null); }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{language === 'th' ? `ลงทะเบียน ${pendingEnroll?.code}` : `Register ${pendingEnroll?.code}`}</DialogTitle>
              <DialogDescription>
                {pendingEnroll && summary && (language === 'th'
                  ? `${pendingEnroll.credits} หน่วยกิต · หลังลงจะมี ${summary.termCredits + pendingEnroll.credits}/${summary.maxCredits} หน่วยกิตในเทอมนี้`
                  : `${pendingEnroll.credits} credits · ${summary.termCredits + pendingEnroll.credits}/${summary.maxCredits} credits this term after registering`)}
              </DialogDescription>
            </DialogHeader>
            {pendingEnroll && pendingEnroll.sections.length > 0 && (
              <RadioGroup value={pendingSectionId} onValueChange={setPendingSectionId}>
                {pendingEnroll.sections.map((s) => (
                  <Label key={s.id} data-testid={`section-${s.sectionNumber}`} className="flex items-center gap-3 rounded-xl border p-3">
                    <RadioGroupItem value={s.id} disabled={seatsLeft(s) === 0} />
                    <span className="font-medium">{language === 'th' ? `ตอน ${s.sectionNumber}` : `Section ${s.sectionNumber}`}</span>
                    <span className="text-sm text-slate-500 dark:text-slate-400">{s.schedule.map((slot) => `${(language === 'th' && slot.dayThai) || slot.day} ${slot.startTime}–${slot.endTime}`).join(', ')}</span>
                    <span className="ml-auto text-sm">{language === 'th' ? `ว่าง ${seatsLeft(s)}/${s.maxStudents}` : `${seatsLeft(s)}/${s.maxStudents} free`}</span>
                  </Label>
                ))}
              </RadioGroup>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setPendingEnroll(null)}>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</Button>
              <Button
                data-testid="confirm-enroll"
                disabled={!pendingEnroll || (pendingEnroll.sections.length > 0 && !pendingSectionId)}
                onClick={() => { if (pendingEnroll) void enrollCourse(pendingEnroll, pendingSectionId || undefined); setPendingEnroll(null); }}
              >
                {language === 'th' ? 'ยืนยันลงทะเบียน' : 'Confirm'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!pendingDrop} onOpenChange={(open) => { if (!open) setPendingDrop(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>{language === 'th' ? `ถอนวิชา ${pendingDrop?.code}?` : `Drop ${pendingDrop?.code}?`}</AlertDialogTitle>
              <AlertDialogDescription>
                {language === 'th'
                  ? `${pendingDrop?.nameThai || pendingDrop?.name} จะถูกเอาออกจากรายวิชาของเทอมนี้ และหน่วยกิตจะคืนมา ${pendingDrop?.credits} หน่วยกิต`
                  : `${pendingDrop?.name} will be removed from this term and ${pendingDrop?.credits} credits freed.`}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{language === 'th' ? 'ยกเลิก' : 'Cancel'}</AlertDialogCancel>
              <AlertDialogAction data-testid="confirm-drop" onClick={() => { if (pendingDrop) void dropCourse(pendingDrop.id); setPendingDrop(null); }}>
                {language === 'th' ? 'ถอนวิชา' : 'Drop'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
            <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              {t.coursesPage.manageCourses}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t.coursesPage.manageCoursesHighlight}</span>
            </motion.h1>
          </div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
            <Button onClick={openNewCourseEditor} size="lg" className="rounded-2xl px-8 bg-blue-600 hover:bg-blue-700 text-white shadow-xl h-12 font-bold transform active:scale-95 transition-all">
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
                <Button variant="ghost" size="icon" className="-mr-2 -mt-2" data-testid={`edit-course-${course.code}`} onClick={() => openCourseEditor(course)}>
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">{course.name}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">{course.nameThai}</p>
              <div className="flex items-center justify-between text-sm py-3 border-t border-slate-100 dark:border-slate-700">
                <span className="text-slate-500 dark:text-slate-400">{t.coursesPage.studentsRegistered}</span>
                <span className="font-bold text-slate-900 dark:text-slate-200">{(course.enrolledCount ?? course.enrolledStudents.length)} {t.coursesPage.studentsCount}</span>
              </div>
              <div className="flex gap-2 mt-5">
                <Button className="w-full rounded-xl flex-1" variant="outline" data-testid={`edit-course-${course.code}`} onClick={() => openCourseEditor(course)}>
                  {language === 'th' ? 'แก้ไข' : 'Edit'}
                </Button>
                <Button className="w-full rounded-xl flex-1" variant="outline" onClick={() => navigate(`/courses/${course.id}/grading`)}>
                  <Settings className="w-4 h-4 mr-1" />
                  {language === 'th' ? 'เกณฑ์ให้คะแนน' : 'Grading'}
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
            <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
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
              onClick={() => downloadImportTemplate(importLecturerId || undefined)}
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
                <li>{language === 'th' ? 'กดนำเข้า CSV/Excel ระบบจะข้ามรายวิชาที่มีรหัสเดียวกันในภาคเรียนเดียวกันอยู่แล้ว และแถวที่ไม่ระบุผู้สอน (ถ้าไม่ได้เลือกผู้สอนเริ่มต้น)' : 'Click Import CSV/Excel. A course already in the same term, and a row without an instructor (when no default is chosen), are skipped.'}</li>
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
              {importProblems.length > 0 && (
                <div role="alert" data-testid="import-problems" className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  <p className="mb-2 font-semibold">{language === 'th' ? `แถวที่ไม่ได้นำเข้า (${importProblems.length})` : `Rows not imported (${importProblems.length})`}</p>
                  <ul className="space-y-1 leading-relaxed">
                    {importProblems.map((problem) => (
                      <li key={`${problem.row}-${problem.code}`}>
                        {language === 'th' ? `แถว ${problem.row}` : `Row ${problem.row}`}{problem.code ? ` (${problem.code})` : ''}: {language === 'th' ? problem.reason.th : problem.reason.en}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
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
              className="pl-12 h-12 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 focus:bg-white dark:focus:bg-slate-900 transition-all shadow-sm focus:ring-2 focus:ring-purple-100"
            />
          </div>
          <Button
            variant="outline"
            className="h-12 px-6 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-900/60 hover:bg-white dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
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
              className="group bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm hover:shadow-xl transition-all overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-200 border-0 dark:text-slate-300 dark:bg-slate-800">{course.code}</Badge>
                      {course.status === 'pending' && <Badge variant="secondary" className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-0">Pending Approval</Badge>}
                      {course.status === 'draft' && <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-200 border-0">Draft</Badge>}
                      {course.status === 'archived' && <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-200 border-0">Archived</Badge>}
                      <Badge variant="outline" className="border-slate-200 text-slate-600 dark:text-slate-400 bg-white/60 dark:bg-slate-900/60 dark:border-slate-700">
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
                      data-testid={`edit-course-${course.code}`} onClick={() => openCourseEditor(course)}
                    >
                      {language === 'th' ? 'แก้ไข' : 'Edit'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => navigate(`/courses/${course.id}/grading`)}
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="rounded-xl"
                      data-testid={`edit-course-${course.code}`} onClick={() => openCourseEditor(course)}
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
                    <div data-testid="course-card-status" className="font-semibold text-emerald-700 dark:text-slate-300">{courseStatusLabel(course.status, language === 'th')}</div>
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
      <motion.div variants={itemVariants} className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm p-10 text-center">
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
