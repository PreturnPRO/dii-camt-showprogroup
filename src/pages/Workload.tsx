import React from 'react';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import { BarChart3, Clock, Users, BookOpen, Download, Briefcase, FlaskConical, CalendarDays } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString, pickLocalized } from '@/lib/live-data';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Workload() {
    const { t } = useLanguage();
    const emptyStats = React.useMemo(() => ({
        teachingHours: 0,
        advisees: 0,
        courses: 0,
        researchHours: 0,
        targetProgress: 0,
    }), []);
    const [workloadStats, setWorkloadStats] = React.useState(emptyStats);

    const [scheduleSlots, setScheduleSlots] = React.useState<Array<{ day: string; time: string; code: string; name: string; type: string }>>([]);

    const [otherTasks, setOtherTasks] = React.useState<Array<{ title: string; desc: string; color: string }>>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;
        const scheduleRequest = api.courses.lecturerSchedule().catch(() =>
            api.courses.list().then((response) => ({ success: true, lecturer: null, schedule: response.courses })),
        );

        Promise.allSettled([api.workload.list(), scheduleRequest])
            .then(([workloadResponse, scheduleResponse]) => {
                if (!isMounted) return;

                let nextStats = { ...emptyStats };
                if (workloadResponse.status === 'fulfilled' && workloadResponse.value.workload.length) {
                    const latest = asRecord(workloadResponse.value.workload[0]);
                    const teachingHours = asNumber(latest.teachingHours, nextStats.teachingHours);
                    const researchHours = asNumber(latest.researchHours, nextStats.researchHours);
                    const advisingHours = asNumber(latest.advisingHours, nextStats.advisees);
                    const serviceHours = asNumber(latest.serviceHours, 0);

                    nextStats = {
                        ...nextStats,
                        teachingHours,
                        researchHours,
                        advisees: advisingHours,
                        targetProgress: Math.min(Math.round((teachingHours / 15) * 100), 100),
                    };

                    setOtherTasks([
                        { title: 'Research', desc: `${researchHours} hours/week`, color: 'from-blue-500 to-cyan-500' },
                        { title: 'Advising', desc: `${advisingHours} hours/week`, color: 'from-purple-500 to-pink-500' },
                        { title: 'Service', desc: `${serviceHours} hours/week`, color: 'from-orange-500 to-amber-500' },
                    ]);
                }

                if (scheduleResponse.status === 'fulfilled') {
                    const scheduleItems = asArray(scheduleResponse.value.schedule);
                    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                    const mappedSlots = scheduleItems.flatMap((item, courseIndex) => {
                        const course = asRecord(item);
                        const sections = asArray(course.sections);
                        const sectionSource = sections.length ? sections : [course.sections?.[0] || {}];

                        return sectionSource.map((sectionItem, sectionIndex) => {
                            const section = asRecord(sectionItem);
                            const schedule = asRecord(section.schedule || course.sections?.[0]?.schedule);
                            const startTime = asString(schedule.startTime, asString(schedule.start, '09:00'));
                            const endTime = asString(schedule.endTime, asString(schedule.end, '12:00'));

                            return {
                                day: asString(schedule.day, asString(schedule.dayOfWeek, dayLabels[(courseIndex + sectionIndex) % dayLabels.length])),
                                time: asString(schedule.time, `${startTime} - ${endTime}`),
                                code: asString(course.code, `COURSE-${courseIndex + 1}`),
                                name: pickLocalized(course, 'nameThai', 'name', 'Course'),
                                type: asString(section.type, asString(course.type, 'Lecture')),
                            };
                        });
                    });

                    if (mappedSlots.length) {
                        const enrolledCount = scheduleItems.reduce<number>(
                            (sum, item) => sum + asArray(asRecord(item).enrollments).length,
                            0,
                        );
                        nextStats = {
                            ...nextStats,
                            courses: scheduleItems.length,
                            advisees: Math.max(nextStats.advisees, enrolledCount),
                        };
                        setScheduleSlots(mappedSlots.slice(0, 8));
                    }
                }

                setWorkloadStats(nextStats);
            })
            .catch(() => {
                setWorkloadStats(emptyStats);
                setScheduleSlots([]);
                setOtherTasks([]);
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [emptyStats]);

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
                    <span>{t.workloadPage.subtitle} 1/2568</span>
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
                        <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{workloadStats.teachingHours}</div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.workloadPage.hoursPerWeek}</p>
                        <div className="mt-3">
                            <div className="flex justify-between text-xs mb-1 text-slate-500 dark:text-slate-400">
                                <span>{t.workloadPage.target}</span>
                                <span>{workloadStats.targetProgress}%</span>
                            </div>
                            <Progress value={workloadStats.targetProgress} className="h-1.5" />
                        </div>
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
                        <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{workloadStats.advisees}</div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.workloadPage.adviseesDesc}</p>
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
                        <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{workloadStats.courses}</div>
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
                        <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{workloadStats.researchHours}</div>
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.workloadPage.researchDesc}</p>
                    </div>
                </motion.div>
            </motion.div>

            {/* Bento Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Weekly Schedule - spans 3 columns */}
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="lg:col-span-3 rounded-3xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-all"
                >
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2.5 rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-lg">
                            <CalendarDays className="w-5 h-5" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-slate-200">{t.workloadPage.weeklySchedule}</h3>
                            <p className="text-sm text-gray-500 dark:text-slate-400">ภาคการศึกษา 1/2568</p>
                        </div>
                    </div>
                    <div className="space-y-3">
                        {!isLoading && scheduleSlots.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                No teaching schedule found
                            </div>
                        )}
                        {scheduleSlots.map((slot, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={{ scale: 1.01, x: 4 }}
                                className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all cursor-pointer group dark:from-slate-900 dark:to-slate-950 dark:border-slate-700"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center text-white font-bold text-sm shadow-lg">
                                        {slot.day.slice(3, 5)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 dark:text-white group-hover:text-green-700 transition-colors">{slot.day}</div>
                                        <div className="text-sm text-gray-500 dark:text-slate-400">{slot.time}</div>
                                    </div>
                                </div>
                                <div className="text-right flex items-center gap-3">
                                    <div>
                                        <div className="font-bold text-green-700 dark:text-emerald-300">{slot.code}</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">{slot.name}</div>
                                    </div>
                                    <Badge className={slot.type === 'Lecture'
                                        ? 'bg-blue-100 text-blue-700 hover:bg-blue-100'
                                        : 'bg-amber-100 text-amber-700 hover:bg-amber-100'
                                    }>
                                        {slot.type}
                                    </Badge>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                {/* Other Tasks - spans 2 columns */}
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="lg:col-span-2 rounded-3xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-sm p-6 transition-all"
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
                        {!isLoading && otherTasks.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                No workload records found
                            </div>
                        )}
                        {otherTasks.map((task, idx) => (
                            <motion.div
                                key={idx}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                whileHover={{ scale: 1.02 }}
                                className="flex items-start gap-3 p-4 bg-gradient-to-r from-gray-50 to-white rounded-2xl border border-gray-100 hover:shadow-md transition-all cursor-pointer dark:from-slate-900 dark:to-slate-950 dark:border-slate-700"
                            >
                                <div className={`w-2 h-full min-h-[40px] rounded-full bg-gradient-to-b ${task.color}`} />
                                <div>
                                    <p className="font-semibold text-gray-900 dark:text-slate-200">{task.title}</p>
                                    <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">{task.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    <motion.div whileHover={{ scale: 1.02 }} className="mt-6">
                        <Button
                            variant="outline"
                            className="w-full rounded-2xl h-12 border-dashed border-2 hover:border-green-300 hover:bg-green-50 transition-all"
                        >
                            <Download className="w-4 h-4 mr-2" />
                            {t.workloadPage.downloadTOR}
                        </Button>
                    </motion.div>
                </motion.div>
            </div>
        </motion.div>
    );
}
