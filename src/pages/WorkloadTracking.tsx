import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { BarChart3, Users, Clock, BookOpen, Plus } from 'lucide-react';
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
    lecturerId: string;
    nameThai: string;
    term: string;
    teachingHours: number;
    researchHours: number;
    advisingHours: number;
    serviceHours: number;
    workload: number;
    /** real count of students whose advisor is this lecturer; null when the API did not send it */
    adviseeCount: number | null;
};

export default function WorkloadTracking() {
    const { t, language } = useLanguage();
    const isTH = language !== 'en';
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
        const teachingHours = asNumber(record.teachingHours, 0);
        const researchHours = asNumber(record.researchHours, 0);
        const advisingHours = asNumber(record.advisingHours, 0);
        const serviceHours = asNumber(record.serviceHours, 0);
        const count = asRecord(lecturer._count).advisees;

        return {
            id: asString(record.id, `workload-${index}`),
            lecturerId: asString(record.lecturerId, asString(lecturer.id, `lecturer-${index}`)),
            nameThai: asString(lecturerUser.nameThai, asString(lecturerUser.name, asString(lecturer.lecturerId, '-'))),
            term: `${asNumber(record.semester, 0)}/${asString(record.academicYear, '-')}`,
            teachingHours,
            researchHours,
            advisingHours,
            serviceHours,
            workload: teachingHours + researchHours + advisingHours + serviceHours,
            adviseeCount: typeof count === 'number' ? count : null,
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

    // the faculty has no overload threshold yet, so nothing is marked as over (audit M1)
    const avgWorkload = lecturerData.length ? (lecturerData.reduce((sum, l) => sum + l.workload, 0) / lecturerData.length).toFixed(1) : '-';
    // one lecturer can have a record per term; count people, not rows
    const lecturerCount = new Set(lecturerData.map((row) => row.lecturerId)).size;
    const avgTeaching = lecturerData.length ? (lecturerData.reduce((sum, l) => sum + l.teachingHours, 0) / lecturerData.length).toFixed(1) : '-';

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <BarChart3 className="w-4 h-4 text-purple-500 dark:text-slate-400" />
                    <span>{t.workloadTrackingPage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.workloadTrackingPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.workloadTrackingPage.titleHighlight}</span>
                </motion.h1>
                </div>
                <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700">
                    <Plus className="w-4 h-4 mr-2" /> เพิ่มภาระงาน
                </Button>
            </div>

            {/* Stats */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                    { icon: Users, label: t.workloadTrackingPage.totalLecturers, value: isLoading ? '...' : String(lecturerCount), testId: 'workload-lecturers', gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-200' },
                    { icon: Clock, label: t.workloadTrackingPage.avgWorkload, value: `${avgWorkload} ${t.workloadTrackingPage.hours}`, gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-200' },
                    { icon: BookOpen, label: isTH ? 'ชั่วโมงสอนเฉลี่ย' : 'Average teaching', value: `${avgTeaching} ${t.workloadTrackingPage.hours}`, gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-xl ${stat.shadow}`}>
                        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50"><stat.icon className="w-4 h-4" /></div>
                                <span className="text-sm font-medium text-white/90">{stat.label}</span>
                            </div>
                            <div data-testid={'testId' in stat ? stat.testId : undefined} className="text-3xl font-bold">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Summary Panel - 2 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm h-fit space-y-6 dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-purple-500 dark:text-slate-400" /> {t.workloadTrackingPage.statusOverview}
                    </h3>
                    <div className="space-y-5">
                        <div>
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-1">{isTH ? 'ชั่วโมงรวมเฉลี่ยต่อรายการ (สอน + วิจัย + ที่ปรึกษา + บริการ)' : 'Average total hours per record'}</p>
                            <div className="flex items-end gap-2">
                                <span className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{avgWorkload}</span>
                                <span className="text-slate-400 mb-1.5">{t.workloadTrackingPage.hours}</span>
                            </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isTH ? 'ยังไม่มีเกณฑ์ภาระงานเกินจากคณะ จึงไม่ได้ตัดสินว่าใครเกิน' : 'There is no faculty overload threshold yet, so no one is marked as over.'}
                        </p>
                    </div>
                </motion.div>

                {/* Lecturer List - 3 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
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
                        {lecturerData.map((lecturer, idx) => (
                            <motion.div key={lecturer.id} data-testid="workload-row" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                                className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white transition-all dark:hover:bg-slate-800/70">
                                <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shadow-lg bg-gradient-to-br from-purple-400 to-violet-500 shadow-purple-200">
                                    {lecturer.nameThai.charAt(0)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between gap-2 mb-1">
                                        <h4 className="font-medium text-slate-800 dark:text-slate-200 truncate">{lecturer.nameThai}</h4>
                                        <span className="text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">{lecturer.workload} {t.workloadTrackingPage.hours}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {isTH ? 'เทอม' : 'Term'} {lecturer.term} · {isTH ? 'สอน' : 'teaching'} {lecturer.teachingHours} · {isTH ? 'วิจัย' : 'research'} {lecturer.researchHours} · {isTH ? 'ที่ปรึกษา' : 'advising'} {lecturer.advisingHours} · {isTH ? 'บริการ' : 'service'} {lecturer.serviceHours} {t.workloadTrackingPage.hours}
                                        {' · '}{isTH ? 'นักศึกษาในที่ปรึกษา' : 'advisees'} {lecturer.adviseeCount ?? '-'} {isTH ? 'คน' : ''}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
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
