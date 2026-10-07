import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import {
  GraduationCap,
  BookOpen,
  Target,
  Award,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api, ApiError } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapCourse } from '@/lib/live-mappers';
import type { Course } from '@/types';

type EnrollmentRow = {
  id: string;
  studentId: string;
  studentCode: string;
  studentName: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  criteria: Array<{ id: string; name: string; maxScore: number }>;
  scores: Array<{ criteriaId: string; score: number }>;
  total?: number;
  letterGrade?: string;
  remarks?: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export function LecturerGradingView() {
  const { user } = useAuth();
  const { t, language } = useLanguage();

  const [courses, setCourses] = useState<Course[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // rows the server rejected on the last save (the whole batch is saved or none of it)
  const [gradeRowErrors, setGradeRowErrors] = useState<Array<{ studentCode: string; message: string }>>([]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);

    const coursesRequest = api.courses.lecturerSchedule().then((response) => response.schedule || []);

    Promise.allSettled([coursesRequest, api.enrollments.list()])
      .then(([coursesResult, enrollmentsResult]) => {
        if (!mounted) return;

        const loadedCourses = coursesResult.status === 'fulfilled' ? coursesResult.value.map(mapCourse) : [];
        setCourses(loadedCourses);

        if (enrollmentsResult.status === 'fulfilled') {
          const mappedEnrollments: EnrollmentRow[] = enrollmentsResult.value.enrollments.map((item) => {
            const enrollment = asRecord(item);
            const studentRecord = asRecord(enrollment.student);
            const studentUser = asRecord(studentRecord.user);
            const course = asRecord(enrollment.course);
            const total =
              enrollment.total === null || typeof enrollment.total === 'undefined'
                ? undefined
                : asNumber(enrollment.total, 0);

            const courseMatch = loadedCourses.find((c) => c.id === asString(enrollment.courseId));
            const criteria = (courseMatch?.gradingCriteria ?? []).map((criterion, index) => ({
              id: criterion.id,
              name: criterion.name || `Criteria ${index + 1}`,
              maxScore: criterion.maxScore,
            }));

            return {
              id: asString(enrollment.id),
              studentId: asString(enrollment.studentId),
              studentCode: asString(studentRecord.studentId, asString(enrollment.studentId)),
              studentName: asString(studentUser.nameThai, asString(studentUser.name, 'Student')),
              courseId: asString(enrollment.courseId),
              courseCode: asString(course.code),
              courseName: asString(course.nameThai, asString(course.name)),
              criteria,
              scores: asArray(enrollment.scores).map((s) => {
                const scoreRec = asRecord(s);
                return { criteriaId: asString(scoreRec.criteriaId), score: asNumber(scoreRec.score, 0) };
              }),
              total,
              letterGrade: asString(enrollment.letterGrade),
              remarks: asString(enrollment.remarks),
            };
          });
          setEnrollments(mappedEnrollments);
        } else {
          setEnrollments([]);
        }
      })
      .catch((error) => {
        console.warn('Unable to load lecturer courses from API', error);
        setCourses([]);
        setEnrollments([]);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [user?.role]);

  const updateEnrollmentScore = (id: string, criteriaId: string, value: string) => {
    setEnrollments((current) =>
      current.map((item) => {
        if (item.id !== id) return item;
        if (value === '') return item;
        const scores = item.scores.filter((score) => score.criteriaId !== criteriaId);
        scores.push({ criteriaId, score: Number(value) });
        return { ...item, scores };
      }),
    );
  };

  const updateEnrollmentDraft = (id: string, field: 'total' | 'letterGrade' | 'remarks', value: string) => {
    setEnrollments((current) =>
      current.map((item) =>
        item.id !== id
          ? item
          : {
              ...item,
              [field]: field === 'total' ? (value === '' ? undefined : Number(value)) : value,
            },
      ),
    );
  };

  const saveLecturerGrades = async () => {
    const targetEnrollments =
      selectedCourseId === 'all' ? enrollments : enrollments.filter((item) => item.courseId === selectedCourseId);

    const payloadGrades = targetEnrollments.map((item) => ({
      enrollmentId: item.id,
      scores: item.scores,
      total: item.total,
      letterGrade: item.letterGrade || undefined,
      remarks: item.remarks || undefined,
    }));

    if (payloadGrades.length === 0) {
      toast.info(language === 'th' ? 'ไม่มีรายการคะแนนที่ต้องบันทึก' : 'No grades to save');
      return;
    }

    setIsSaving(true);
    setGradeRowErrors([]);
    try {
      const response = await api.grades.bulkUpdate({ grades: payloadGrades });
      const updatedMap = new Map(
        (response.grades || []).map((item) => {
          const record = asRecord(item);
          return [asString(record.id), record] as const;
        }),
      );

      setEnrollments((current) =>
        current.map((item) => {
          const updated = updatedMap.get(item.id);
          if (!updated) return item;
          return {
            ...item,
            total: updated.total === null ? undefined : asNumber(updated.total, item.total ?? 0),
            letterGrade: asString(updated.letterGrade, item.letterGrade),
            remarks: asString(updated.remarks, item.remarks),
            scores: asArray(updated.scores).length
              ? asArray(updated.scores).map((score) => {
                  const scoreRec = asRecord(score);
                  return { criteriaId: asString(scoreRec.criteriaId), score: asNumber(scoreRec.score, 0) };
                })
              : item.scores,
          };
        }),
      );
      toast.success(language === 'th' ? 'บันทึกคะแนนแล้ว' : 'Grades saved');
    } catch (error) {
      console.warn('Unable to save grades', error);
      // ApiError.details is the whole error payload: { message, details: { rows } }
      const rows = error instanceof ApiError ? asArray(asRecord(asRecord(error.details).details).rows) : [];
      setGradeRowErrors(rows.map((item) => {
        const row = asRecord(item);
        const sent = targetEnrollments[asNumber(row.index, -1)];
        return { studentCode: sent ? `${sent.studentCode} ${sent.studentName}` : asString(row.studentId), message: asString(row.message) };
      }));
      toast.error(language === 'th' ? 'ไม่สามารถบันทึกคะแนนได้ — ไม่มีแถวไหนถูกบันทึก ดูรายการที่ต้องแก้ด้านล่าง' : 'Unable to save grades — nothing was saved, see the rows to fix below');
    } finally {
      setIsSaving(false);
    }
  };

  const filteredEnrollments =
    selectedCourseId === 'all' ? enrollments : enrollments.filter((item) => item.courseId === selectedCourseId);

  const saveableEnrollments = filteredEnrollments.filter(
    (item) => item.scores.length > 0 || item.total !== undefined || Boolean(item.letterGrade) || Boolean(item.remarks),
  );

  const gradedCount = enrollments.filter((item) => item.letterGrade).length;
  const pendingCount = enrollments.length - gradedCount;
  const maxCriteriaCount = Math.max(0, ...filteredEnrollments.map((row) => row.criteria.length));

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-24 text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mb-3" />
        <span className="text-sm font-medium">
          {language === 'th' ? 'กำลังโหลดข้อมูลการตัดเกรด...' : 'Loading grading data...'}
        </span>
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
          <GraduationCap className="w-4 h-4 text-emerald-500 dark:text-slate-400" />
          <span>{t.grades.lecturerSubtitle}</span>
        </motion.div>
        <motion.h1
          className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {t.grades.lecturerTitle}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
            {t.grades.lecturerTitleHighlight}
          </span>
        </motion.h1>
      </div>

      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            icon: BookOpen,
            label: t.grades.coursesTaught,
            value: courses.length.toString(),
            gradient: 'from-blue-500 to-indigo-500',
            shadow: 'shadow-blue-200',
          },
          {
            icon: Target,
            label: t.grades.pendingGrading,
            value: String(pendingCount),
            gradient: 'from-orange-500 to-amber-500',
            shadow: 'shadow-orange-200',
          },
          {
            icon: Award,
            label: t.grades.gradingCompleted,
            value: String(gradedCount),
            gradient: 'from-emerald-500 to-teal-500',
            shadow: 'shadow-emerald-200',
          },
          {
            icon: GraduationCap,
            label: t.grades.totalStudents,
            value: String(new Set(enrollments.map((item) => item.studentId)).size),
            gradient: 'from-purple-500 to-pink-500',
            shadow: 'shadow-purple-200',
          },
        ].map((stat, i) => (
          <motion.div
            key={i}
            whileHover={{ scale: 1.02 }}
            className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-xl ${stat.shadow}`}
          >
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                  <stat.icon className="w-5 h-5" />
                </div>
                <span className="font-medium text-white/90">{stat.label}</span>
              </div>
              <div className="text-4xl font-bold">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="rounded-3xl border border-white/60 bg-white/60 p-6 shadow-sm backdrop-blur-xl dark:border-slate-800/60 dark:bg-slate-900/50"
      >
        <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {language === 'th' ? 'จัดการคะแนนรายวิชา' : 'Course grade entry'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {language === 'th'
                ? 'ดึงรายชื่อนักศึกษาจากการลงทะเบียนจริง และบันทึกผ่าน API'
                : 'Loaded from live enrollments and saved through the grade API.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <select
              value={selectedCourseId}
              onChange={(event) => setSelectedCourseId(event.target.value)}
              className="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
            >
              <option value="all">{language === 'th' ? 'ทุกวิชา' : 'All courses'}</option>
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </option>
              ))}
            </select>
            <Button
              onClick={saveLecturerGrades}
              disabled={isSaving || saveableEnrollments.length === 0}
              className="h-11 rounded-2xl"
            >
              {isSaving
                ? language === 'th'
                  ? 'กำลังบันทึก...'
                  : 'Saving...'
                : language === 'th'
                ? 'บันทึกคะแนน'
                : 'Save grades'}
            </Button>
          </div>
        </div>

        {gradeRowErrors.length > 0 && (
          <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            <p className="font-bold mb-2">{language === 'th' ? 'แถวที่ต้องแก้ก่อนบันทึก' : 'Rows to fix before saving'}</p>
            <ul className="space-y-1 leading-relaxed">
              {gradeRowErrors.map((item, index) => (
                <li key={index}>{item.studentCode}: {item.message}</li>
              ))}
            </ul>
          </div>
        )}

        {filteredEnrollments.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
            {language === 'th'
              ? 'ยังไม่มีนักศึกษาลงทะเบียนในรายวิชาที่เลือก'
              : 'No enrollments found for the selected course.'}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[980px] space-y-2">
              <div
                className="grid gap-2 px-3 text-xs font-bold uppercase tracking-wide text-slate-400"
                style={{
                  gridTemplateColumns: `minmax(180px,1.3fr) minmax(120px,1fr) repeat(${maxCriteriaCount},88px) 88px 80px minmax(140px,1.2fr)`,
                }}
              >
                <span>{language === 'th' ? 'นักศึกษา' : 'Student'}</span>
                <span>{language === 'th' ? 'วิชา' : 'Course'}</span>
                {Array.from({ length: maxCriteriaCount }, (_, index) => (
                  <span key={index}>Score {index + 1}</span>
                ))}
                <span>Total</span>
                <span>Grade</span>
                <span>{language === 'th' ? 'หมายเหตุ' : 'Remarks'}</span>
              </div>
              {filteredEnrollments.map((row) => (
                <div
                  key={row.id}
                  className="grid items-center gap-2 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70"
                  style={{
                    gridTemplateColumns: `minmax(180px,1.3fr) minmax(120px,1fr) repeat(${maxCriteriaCount},88px) 88px 80px minmax(140px,1.2fr)`,
                  }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">
                      {row.studentName}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{row.studentCode}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-emerald-700 dark:text-emerald-300">
                      {row.courseCode}
                    </div>
                    <div className="truncate text-xs text-slate-500 dark:text-slate-400">{row.courseName}</div>
                  </div>
                  {row.criteria.map((criterion) => (
                    <Input
                      key={criterion.id}
                      type="number"
                      min="0"
                      max={criterion.maxScore}
                      title={`${criterion.name} (max ${criterion.maxScore})`}
                      value={row.scores.find((score) => score.criteriaId === criterion.id)?.score ?? ''}
                      onChange={(event) => updateEnrollmentScore(row.id, criterion.id, event.target.value)}
                      className="h-10 rounded-xl border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900"
                    />
                  ))}
                  {Array.from({ length: maxCriteriaCount - row.criteria.length }, (_, index) => (
                    <span key={`empty-${index}`} />
                  ))}
                  <Input
                    type="number"
                    min="0"
                    value={row.total ?? ''}
                    onChange={(event) => updateEnrollmentDraft(row.id, 'total', event.target.value)}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-center dark:border-slate-700 dark:bg-slate-900"
                  />
                  <Input
                    value={row.letterGrade ?? ''}
                    onChange={(event) =>
                      updateEnrollmentDraft(row.id, 'letterGrade', event.target.value.toUpperCase())
                    }
                    placeholder="A"
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 text-center font-bold dark:border-slate-700 dark:bg-slate-900"
                  />
                  <Input
                    value={row.remarks ?? ''}
                    onChange={(event) => updateEnrollmentDraft(row.id, 'remarks', event.target.value)}
                    placeholder={language === 'th' ? 'หมายเหตุ' : 'Remarks'}
                    className="h-10 rounded-xl border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-900"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
