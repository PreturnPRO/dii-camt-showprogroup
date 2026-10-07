import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Users, BookOpen, Briefcase, FlaskConical, CalendarDays } from 'lucide-react';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString, pickLocalized } from '@/lib/live-data';
import { DAY_KEYS, DAY_LABELS, type DayKey } from '@/lib/timetable';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Workload() {
    const { t, language } = useLanguage();
    const isTH = language !== 'en';
    // every number comes from the lecturer's latest WorkloadRecord, their courses and their advisees; null = no data (audit M1)
    type Stats = { term: string | null; teachingHours: number | null; researchHours: number | null; advisingHours: number | null; serviceHours: number | null; advisees: number | null; courses: number | null };
    const emptyStats: Stats = { term: null, teachingHours: null, researchHours: null, advisingHours: null, serviceHours: null, advisees: null, courses: null };
    const [workloadStats, setWorkloadStats] = React.useState<Stats>(emptyStats);
    const [scheduleSlots, setScheduleSlots] = React.useState<Array<{ key: string; day: DayKey; time: string; code: string; name: string }>>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const show = (value: number | null) => (value === null ? '-' : String(value));

    React.useEffect(() => {
        let isMounted = true;
        Promise.allSettled([api.workload.list(), api.courses.lecturerSchedule()])
            .then(([workloadResponse, scheduleResponse]) => {
                if (!isMounted) return;
                const next: Stats = { ...emptyStats };
                const latest = workloadResponse.status === 'fulfilled' && workloadResponse.value.workload.length
                    ? asRecord(workloadResponse.value.workload[0])
                    : null;
                if (latest) {
                    next.term = `${asNumber(latest.semester, 0)}/${asString(latest.academicYear, '-')}`;
                    next.teachingHours = asNumber(latest.teachingHours, 0);
                    next.researchHours = asNumber(latest.researchHours, 0);
                    next.advisingHours = asNumber(latest.advisingHours, 0);
                    next.serviceHours = asNumber(latest.serviceHours, 0);
                }
                if (scheduleResponse.status === 'fulfilled') {
                    const lecturer = scheduleResponse.value.lecturer ? asRecord(scheduleResponse.value.lecturer) : null;
                    if (lecturer) next.advisees = asArray(lecturer.advisees).length;
                    const courses = asArray(scheduleResponse.value.schedule).map(asRecord);
                    // the term shown: the workload record's, else the newest term the lecturer teaches
                    const termOf = (c: Record<string, unknown>) => `${asNumber(c.semester, 0)}/${asString(c.academicYear, '')}`;
                    const newest = [...courses].sort((a, b) =>
                        asString(b.academicYear, '').localeCompare(asString(a.academicYear, '')) || asNumber(b.semester, 0) - asNumber(a.semester, 0))[0];
                    next.term = next.term ?? (newest ? termOf(newest) : null);
                    const termCourses = courses.filter((c) => termOf(c) === next.term);
                    next.courses = termCourses.length;
                    const slots = termCourses.flatMap((course) => asArray(course.sections).flatMap((sectionItem) => {
                        const section = asRecord(sectionItem);
                        return asArray(section.schedule).map(asRecord)
                            // a slot without a real day and time is left out, never filled in
                            .filter((slot) => (DAY_KEYS as readonly string[]).includes(asString(slot.day).toLowerCase()) && asString(slot.startTime) && asString(slot.endTime))
                            .map((slot) => ({
                                key: `${asString(section.id)}-${asString(slot.day)}-${asString(slot.startTime)}`,
                                day: asString(slot.day).toLowerCase() as DayKey,
                                time: `${asString(slot.startTime)}–${asString(slot.endTime)}`,
                                code: `${asString(course.code)} ${isTH ? 'ตอน' : 'sec'} ${asString(section.number)}`,
                                name: pickLocalized(course, 'nameThai', 'name', ''),
                            }));
                    }));
                    slots.sort((a, b) => DAY_KEYS.indexOf(a.day) - DAY_KEYS.indexOf(b.day) || a.time.localeCompare(b.time));
                    setScheduleSlots(slots);
                }
                setWorkloadStats(next);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });
        return () => {
            isMounted = false;
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isTH]);

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <BarChart3 className="w-4 h-4 text-emerald-500 dark:text-slate-400" />
                    <span data-testid="workload-term">{t.workloadPage.subtitle} {workloadStats.term ?? '-'}</span>
                </motion.div>
                <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.workloadPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">{t.workloadPage.titleHighlight}</span>
                </motion.h1>
            </div>

            {/* Bento Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5"
                >

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t.workloadPage.teachingHours}</span>
                        </div>
                        <div data-testid="workload-teaching" className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{show(workloadStats.teachingHours)}</div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{isTH ? 'ชั่วโมง (จากบันทึกภาระงาน)' : 'hours (workload record)'}</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5"
                >

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                                <Users className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t.workloadPage.advisees}</span>
                        </div>
                        <div data-testid="workload-advisees" className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{show(workloadStats.advisees)}</div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{isTH ? 'คน · นักศึกษาในความดูแล' : 'students advised'}</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5"
                >

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                                <BookOpen className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t.workloadPage.coursesLabel}</span>
                        </div>
                        <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{show(workloadStats.courses)}</div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.workloadPage.coursesDesc}</p>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5"
                >

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10">
                                <FlaskConical className="w-5 h-5" />
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t.workloadPage.research}</span>
                        </div>
                        <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{show(workloadStats.researchHours)}</div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{isTH ? 'ชั่วโมง (จากบันทึกภาระงาน)' : 'hours (workload record)'}</p>
                    </div>
                </motion.div>
            </motion.div>

            {/* Bento Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Weekly Schedule - spans 3 columns */}
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="lg:col-span-3 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-all"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-200">{t.workloadPage.weeklySchedule}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{isTH ? 'ภาคการศึกษา' : 'Term'} {workloadStats.term ?? '-'}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {!isLoading && scheduleSlots.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                {isTH ? 'ไม่มีคาบสอนในเทอมนี้' : 'No teaching schedule this term'}
                            </div>
                        )}
                        {scheduleSlots.map((slot, idx) => (
                            <motion.div
                                key={slot.key}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 dark:from-slate-900 dark:to-slate-950 dark:border-slate-700"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                        {DAY_LABELS[slot.day].short}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white">{isTH ? DAY_LABELS[slot.day].th : DAY_LABELS[slot.day].en}</div>
                                        <div className="text-sm text-gray-500 dark:text-slate-400">{slot.time}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="font-bold text-green-700 dark:text-emerald-300">{slot.code}</div>
                                    <div className="text-xs text-gray-500 dark:text-slate-400">{slot.name}</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Other Tasks - spans 2 columns */}
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="lg:col-span-2 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-all"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg">
                            <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-200">{t.workloadPage.otherWork}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">{t.workloadPage.otherWorkDesc}</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {!isLoading && workloadStats.teachingHours === null && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                {isTH ? 'ยังไม่มีบันทึกภาระงาน' : 'No workload records found'}
                            </div>
                        )}
                        {workloadStats.teachingHours !== null && [
                            { title: isTH ? 'วิจัย' : 'Research', hours: workloadStats.researchHours, color: 'from-blue-500 to-cyan-500' },
                            { title: isTH ? 'ให้คำปรึกษา' : 'Advising', hours: workloadStats.advisingHours, color: 'from-purple-500 to-pink-500' },
                            { title: isTH ? 'บริการวิชาการ' : 'Service', hours: workloadStats.serviceHours, color: 'from-orange-500 to-amber-500' },
                        ].map((task) => (
                            <div key={task.title} className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 dark:from-slate-900 dark:to-slate-950 dark:border-slate-700">
                                <div className={`w-2 h-full min-h-[40px] rounded-full bg-gradient-to-b ${task.color}`} />
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-slate-200">{task.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{show(task.hours)} {isTH ? 'ชั่วโมง' : 'hours'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
