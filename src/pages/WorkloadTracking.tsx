import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart3, Users, Clock, AlertTriangle, TrendingUp, BookOpen, Plus } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import { asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type LecturerWorkloadRow = {
    id: string;
    nameThai: string;
    teachingHours: number;
    workload: number;
    advisees: string[];
};

export default function WorkloadTracking() {
    const { t } = useLanguage();
    const [lecturerData, setLecturerData] = React.useState<LecturerWorkloadRow[]>([]);
    const [lecturers, setLecturers] = React.useState<Array<{ id: string; nameThai: string }>>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isDialogOpen, setIsDialogOpen] = React.useState(false);
    const [formData, setFormData] = React.useState({
        lecturerId: '',
        academicYear: '2569',
        semester: '1',
        teachingHours: '0',
        researchHours: '0',
        advisingHours: '0',
        serviceHours: '0',
    });

    const mapWorkloadRow = React.useCallback((item: unknown, index = 0): LecturerWorkloadRow => {
        const record = asRecord(item);
        const lecturer = asRecord(record.lecturer);
        const lecturerUser = asRecord(lecturer.user);
        const advisingHours = asNumber(record.advisingHours, 0);
        const teachingHours = asNumber(record.teachingHours, 0);

        return {
            id: asString(lecturer.id, asString(record.lecturerId, `lecturer-${index}`)),
            nameThai: asString(lecturerUser.nameThai, asString(lecturerUser.name, asString(lecturer.lecturerId, '-'))),
            teachingHours,
            workload:
                teachingHours +
                asNumber(record.researchHours, 0) +
                advisingHours +
                asNumber(record.serviceHours, 0),
            advisees: Array.from({ length: Math.max(advisingHours, 0) }, (_, adviseeIndex) => `ADV-${adviseeIndex + 1}`),
        };
    }, []);

    React.useEffect(() => {
        let isMounted = true;

        Promise.allSettled([api.workload.list(), api.lecturers.list()])
            .then(([workloadResult, lecturersResult]) => {
                if (!isMounted) return;
                if (workloadResult.status === 'fulfilled') {
                    setLecturerData(workloadResult.value.workload.map(mapWorkloadRow));
                }
                if (lecturersResult.status === 'fulfilled') {
                    setLecturers(lecturersResult.value.lecturers.map((item, index) => {
                        const lecturer = asRecord(item);
                        const lecturerUser = asRecord(lecturer.user);
                        return {
                            id: asString(lecturer.id, `lecturer-${index}`),
                            nameThai: asString(lecturerUser.nameThai, asString(lecturerUser.name, asString(lecturer.lecturerId, '-'))),
                        };
                    }));
                }
            })
            .catch(() => setLecturerData([]))
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [mapWorkloadRow]);

    const createWorkload = async () => {
        if (!formData.lecturerId) {
            toast.error('กรุณาเลือกอาจารย์');
            return;
        }

        try {
            const response = await api.workload.create({
                lecturerId: formData.lecturerId,
                academicYear: formData.academicYear,
                semester: Number(formData.semester),
                teachingHours: Number(formData.teachingHours),
                researchHours: Number(formData.researchHours),
                advisingHours: Number(formData.advisingHours),
                serviceHours: Number(formData.serviceHours),
            });
            setLecturerData((current) => [mapWorkloadRow(response.workload), ...current]);
            setIsDialogOpen(false);
            toast.success('เพิ่มภาระงานแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to create workload');
        }
    };

    const avgWorkload = (lecturerData.reduce((sum, l) => sum + l.workload, 0) / Math.max(lecturerData.length, 1)).toFixed(1);
    const overloaded = lecturerData.filter(l => l.workload > 15).length;

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <BarChart3 className="w-4 h-4 text-purple-500 dark:text-slate-400" />
                    <span>{t.workloadTrackingPage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.workloadTrackingPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.workloadTrackingPage.titleHighlight}</span>
                </motion.h1>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" /> เพิ่มภาระงาน
                </Button>
            </div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: Users, label: t.workloadTrackingPage.totalLecturers, value: isLoading ? '...' : String(lecturerData.length), gradient: '', shadow: '' },
                    { icon: Clock, label: t.workloadTrackingPage.avgWorkload, value: `${avgWorkload} ${t.workloadTrackingPage.hours}`, gradient: '', shadow: '' },
                    { icon: AlertTriangle, label: t.workloadTrackingPage.overLimit, value: String(overloaded), gradient: '', shadow: '' },
                    { icon: TrendingUp, label: t.workloadTrackingPage.normalStatus, value: String(lecturerData.length - overloaded), gradient: '', shadow: '' },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-sm ${stat.shadow}`}>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10"><stat.icon className="w-4 h-4" /></div>
                                <span className="text-sm font-medium text-white/90">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Summary Panel - 2 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm h-fit space-y-6">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500 dark:text-slate-400" /> {t.workloadTrackingPage.statusOverview}
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{t.workloadTrackingPage.avgTeaching}</p>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{avgWorkload}</span>
                                <span className="text-slate-400 mb-1.5">{t.workloadTrackingPage.hoursPerWeek}</span>
                            </div>
                        </div>
                        <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div initial={{ width: 0 }} animate={{ width: `${(parseFloat(avgWorkload) / 20) * 100}%` }} transition={{ delay: 0.5, duration: 0.8 }} className="h-full bg-gradient-to-r from-purple-500 to-violet-500 rounded-full" />
                        </div>
                        <div className="p-4 rounded-2xl bg-red-50 border border-red-100 dark:bg-slate-800">
                            <div className="flex items-center gap-2 text-red-600 mb-1 dark:text-slate-300">
                                <AlertTriangle className="w-5 h-5" />
                                <span className="font-bold">{t.workloadTrackingPage.overLimitLecturers}</span>
                            </div>
                            <span className="text-3xl font-bold text-red-600 dark:text-slate-300">{overloaded} {t.workloadTrackingPage.persons}</span>
                            <p className="text-sm text-red-400 mt-1">{t.workloadTrackingPage.threshold}</p>
                        </div>
                    </div>
                </motion.div>

                {/* Lecturer List - 3 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <div className="mb-5">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.workloadTrackingPage.individualDetails}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t.workloadTrackingPage.individualDesc}</p>
                    </div>
                    <div className="space-y-3">
                        {!isLoading && lecturerData.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                {t.common?.noData || 'No workload records found'}
                            </div>
                        )}
                        {lecturerData.map((lecturer, idx) => {
                            const percentage = (lecturer.workload / 20) * 100;
                            const isOver = lecturer.workload > 15;
                            return (
                                <motion.div key={idx} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                    className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white transition-all dark:hover:bg-slate-800/70">
                                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shadow-lg ${isOver ? 'bg-gradient-to-br from-red-400 to-rose-500' : 'bg-gradient-to-br from-purple-400 to-violet-500'}`}>
                                        {lecturer.nameThai.charAt(0)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between mb-1.5">
                                            <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">{lecturer.nameThai}</h4>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-sm font-bold ${isOver ? 'text-red-500' : 'text-slate-600'} dark:text-slate-400`}>{lecturer.workload} {t.workloadTrackingPage.hours}</span>
                                                {isOver && <Badge className="bg-red-50 text-red-500 text-[10px] border-red-200 dark:text-slate-400 dark:bg-slate-800">{t.workloadTrackingPage.overLimit}</Badge>}
                                            </div>
                                        </div>
                                        <div className="h-2.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                            <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(percentage, 100)}%` }} transition={{ delay: 0.3 + idx * 0.05, duration: 0.5 }}
                                                className={`h-full rounded-full ${isOver ? 'bg-gradient-to-r from-red-400 to-rose-500' : 'bg-gradient-to-r from-emerald-400 to-teal-500'}`} />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>เพิ่มภาระงานอาจารย์</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2 md:col-span-2">
                            <Label>อาจารย์</Label>
                            <Select value={formData.lecturerId} onValueChange={(value) => setFormData({ ...formData, lecturerId: value })}>
                                <SelectTrigger><SelectValue placeholder="เลือกอาจารย์" /></SelectTrigger>
                                <SelectContent>
                                    {lecturers.map((lecturer) => (
                                        <SelectItem key={lecturer.id} value={lecturer.id}>{lecturer.nameThai}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>ปีการศึกษา</Label>
                            <Input value={formData.academicYear} onChange={(event) => setFormData({ ...formData, academicYear: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>เทอม</Label>
                            <Input type="number" value={formData.semester} onChange={(event) => setFormData({ ...formData, semester: event.target.value })} />
                        </div>
                        {[
                            ['teachingHours', 'สอน'],
                            ['researchHours', 'วิจัย'],
                            ['advisingHours', 'ที่ปรึกษา'],
                            ['serviceHours', 'บริการวิชาการ'],
                        ].map(([field, label]) => (
                            <div key={field} className="space-y-2">
                                <Label>{label} (ชั่วโมง)</Label>
                                <Input type="number" value={formData[field as keyof typeof formData]} onChange={(event) => setFormData({ ...formData, [field]: event.target.value })} />
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={createWorkload} className="bg-purple-600 hover:bg-purple-700">บันทึก</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
