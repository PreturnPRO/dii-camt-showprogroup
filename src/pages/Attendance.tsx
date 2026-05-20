import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { CalendarCheck, Users, Save, FileSpreadsheet, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { asRecord, asString } from '@/lib/live-data';
import { mapCourse } from '@/lib/live-mappers';

type CourseRow = ReturnType<typeof mapCourse>;
type AttendanceRow = {
    enrollmentId: string;
    studentName: string;
    studentCode: string;
    status: 'present' | 'late' | 'absent' | 'leave';
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Attendance() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [courses, setCourses] = React.useState<CourseRow[]>([]);
    const [selectedCourse, setSelectedCourse] = React.useState('');
    const [date, setDate] = React.useState(new Date().toISOString().split('T')[0]);
    const [attendanceRows, setAttendanceRows] = React.useState<AttendanceRow[]>([]);

    React.useEffect(() => {
        let mounted = true;

        api.courses
            .list()
            .then((response) => {
                if (!mounted) return;
                const liveCourses = response.courses.map(mapCourse);
                setCourses(liveCourses);
                if (liveCourses[0] && !liveCourses.some(course => course.id === selectedCourse)) {
                    setSelectedCourse(liveCourses[0].id);
                }
            })
            .catch((error) => {
                console.warn('Unable to load courses for attendance', error);
            });

        return () => {
            mounted = false;
        };
    }, [selectedCourse]);

    React.useEffect(() => {
        if (!selectedCourse) return;
        let mounted = true;
        const query = `?courseId=${encodeURIComponent(selectedCourse)}`;

        Promise.allSettled([
            api.enrollments.list(query),
            api.attendance.report(query),
        ]).then(([enrollmentsResult, attendanceResult]) => {
            if (!mounted) return;
            if (enrollmentsResult.status !== 'fulfilled') return;

            const statusByEnrollment = new Map<string, AttendanceRow['status']>();
            if (attendanceResult.status === 'fulfilled') {
                attendanceResult.value.attendance.forEach((item) => {
                    const record = asRecord(item);
                    const enrollment = asRecord(record.enrollment);
                    const recordDate = record.date ? new Date(String(record.date)).toISOString().slice(0, 10) : '';
                    if (recordDate === date) {
                        statusByEnrollment.set(
                            asString(record.enrollmentId, asString(enrollment.id)),
                            asString(record.status, 'absent') as AttendanceRow['status'],
                        );
                    }
                });
            }

            setAttendanceRows(enrollmentsResult.value.enrollments.map((item) => {
                const enrollment = asRecord(item);
                const student = asRecord(enrollment.student);
                const studentUser = asRecord(student.user);
                const enrollmentId = asString(enrollment.id);
                return {
                    enrollmentId,
                    studentName: asString(studentUser.nameThai, asString(studentUser.name, 'Student')),
                    studentCode: asString(student.studentId, asString(student.id)),
                    status: statusByEnrollment.get(enrollmentId) ?? 'absent',
                };
            }));
        }).catch((error) => {
            console.warn('Unable to load attendance rows', error);
        });

        return () => {
            mounted = false;
        };
    }, [date, selectedCourse]);

    const selectedCourseInfo = courses.find(course => course.id === selectedCourse);
    const presentCount = attendanceRows.filter(row => row.status === 'present').length;
    const lateCount = attendanceRows.filter(row => row.status === 'late').length;
    const absentCount = attendanceRows.filter(row => row.status === 'absent').length;

    const updateStatus = async (row: AttendanceRow, status: AttendanceRow['status']) => {
        setAttendanceRows(current => current.map(item => item.enrollmentId === row.enrollmentId ? { ...item, status } : item));
        try {
            await api.attendance.checkIn({
                enrollmentId: row.enrollmentId,
                date,
                status,
            });
        } catch (error) {
            console.warn('Unable to save attendance status', error);
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <CalendarCheck className="w-4 h-4 text-emerald-500 dark:text-slate-400" />
                    <span>{t.attendancePage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.attendancePage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{t.attendancePage.titleHighlight}</span>
                </motion.h1>
            </div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: Users, label: t.attendancePage.totalStudents, value: String(attendanceRows.length), gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-200' },
                    { icon: CheckCircle2, label: t.attendancePage.present, value: String(presentCount), gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
                    { icon: Clock, label: t.attendancePage.late, value: String(lateCount), gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
                    { icon: XCircle, label: t.attendancePage.absent, value: String(absentCount), gradient: 'from-red-500 to-rose-500', shadow: 'shadow-red-200' },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-xl ${stat.shadow}`}>
                        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50"><stat.icon className="w-5 h-5" /></div>
                                <span className="font-medium text-white/90">{stat.label}</span>
                            </div>
                            <div className="text-4xl font-bold">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Bento Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Settings Panel */}
                <motion.div variants={itemVariants} className="lg:col-span-1 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm h-fit dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                        <CalendarCheck className="w-5 h-5 text-emerald-500 dark:text-slate-400" /> {t.attendancePage.settingsLabel}
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.attendancePage.courseLabel}</label>
                            <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t.attendancePage.selectCourse} /></SelectTrigger>
                                <SelectContent>{courses.map(c => (<SelectItem key={c.id} value={c.id}>{c.code} {c.name}</SelectItem>))}</SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.attendancePage.dateLabel}</label>
                            <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="rounded-xl" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">{t.attendancePage.periodLabel}</label>
                            <Select defaultValue="1">
                                <SelectTrigger className="rounded-xl"><SelectValue placeholder={t.attendancePage.selectPeriod} /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="1">09:00 - 12:00 (Lecture)</SelectItem>
                                    <SelectItem value="2">13:00 - 16:00 (Lab)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <Button className="w-full rounded-xl bg-emerald-600 hover:bg-emerald-700 h-11 shadow-lg shadow-emerald-200">
                            <CalendarCheck className="w-4 h-4 mr-2" /> {t.attendancePage.startChecking}
                        </Button>
                        <Button variant="outline" className="w-full rounded-xl border-dashed">
                            <FileSpreadsheet className="w-4 h-4 mr-2" /> {t.attendancePage.summaryReport}
                        </Button>
                    </div>
                </motion.div>

                {/* Student List */}
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
                    <div className="flex justify-between items-center mb-5">
                        <div>
                            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.attendancePage.studentList}</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{selectedCourseInfo ? `${selectedCourseInfo.code} ${selectedCourseInfo.name}` : t.attendancePage.selectCourse}</p>
                        </div>
                        <div className="flex gap-3 text-sm">
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 rounded-xl dark:bg-slate-800"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> {t.attendancePage.presentShort} {presentCount}</div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 rounded-xl"><div className="w-2.5 h-2.5 rounded-full bg-amber-500" /> {t.attendancePage.lateShort} {lateCount}</div>
                            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 rounded-xl dark:bg-slate-800"><div className="w-2.5 h-2.5 rounded-full bg-red-500" /> {t.attendancePage.absentShort} {absentCount}</div>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {attendanceRows.map((row, i) => (
                            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                                className="flex items-center justify-between p-3 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-sm">{row.studentName.charAt(0)}</div>
                                    <div>
                                        <div className="font-medium text-slate-800 dark:text-slate-200">{row.studentName}</div>
                                        <div className="text-xs text-slate-400">{row.studentCode}</div>
                                    </div>
                                </div>
                                <div className="flex gap-1.5">
                                    <Button size="sm" className={row.status === 'present' ? "bg-emerald-500 hover:bg-emerald-600 h-8 px-3 rounded-xl text-xs" : "bg-transparent text-slate-400 h-8 px-3 rounded-xl text-xs hover:bg-slate-50"} onClick={() => updateStatus(row, 'present')}>{t.attendancePage.presentShort}</Button>
                                    <Button size="sm" className={row.status === 'late' ? "bg-amber-500 hover:bg-amber-600 h-8 px-3 rounded-xl text-xs" : "bg-transparent text-slate-400 h-8 px-3 rounded-xl text-xs hover:bg-slate-50"} onClick={() => updateStatus(row, 'late')}>{t.attendancePage.lateShort}</Button>
                                    <Button size="sm" className={row.status === 'absent' ? "bg-red-500 hover:bg-red-600 h-8 px-3 rounded-xl text-xs" : "bg-transparent text-slate-400 h-8 px-3 rounded-xl text-xs hover:bg-slate-50 dark:bg-slate-800"} onClick={() => updateStatus(row, 'absent')}>{t.attendancePage.absentShort}</Button>
                                    <Button size="sm" className={row.status === 'leave' ? "bg-slate-500 hover:bg-slate-600 h-8 px-3 rounded-xl text-xs" : "bg-transparent text-slate-400 h-8 px-3 rounded-xl text-xs hover:bg-slate-50 dark:bg-slate-800"} onClick={() => updateStatus(row, 'leave')}>{t.attendancePage.leaveShort}</Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                    <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                        <span className="text-sm text-slate-400">{t.attendancePage.lastSaved}</span>
                        <Button className="rounded-xl bg-emerald-600 hover:bg-emerald-700 shadow-lg shadow-emerald-200">
                            <Save className="w-4 h-4 mr-2" /> {t.attendancePage.saveData}
                        </Button>
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
