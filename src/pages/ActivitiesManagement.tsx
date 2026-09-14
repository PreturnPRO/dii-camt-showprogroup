import React from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Activity,
    CheckCircle,
    XCircle,
    Search,
    Calendar,
    Users,
    Star,
    Clock,
    PlayCircle,
    Trash2,
    RotateCcw,
    Plus,
    Edit,
    Eye,
    MapPin,
    Building2,
    Award,
    Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: { opacity: 1, y: 0 },
};

type EnrollmentRecord = {
    id: string;
    studentName: string;
    email: string;
    status: string;
    checkedInAt: string | null;
};

type FullActivity = {
    id: string;
    title: string;
    titleThai: string;
    description: string;
    type: string;
    startDate: string;
    endDate: string;
    location: string;
    organizer: string;
    activityHours: number;
    gamificationPoints: number;
    maxParticipants: number;
    status: string;
    registrationStatus: string;
    enrollmentsCount: number;
    enrollmentsList: EnrollmentRecord[];
    rawDateStart: Date;
    rawDateEnd: Date;
};

type ActivityFormData = {
    title: string;
    titleThai: string;
    description: string;
    type: string;
    startDate: string;
    endDate: string;
    location: string;
    organizer: string;
    activityHours: number;
    gamificationPoints: number;
    maxParticipants: number;
    status: string;
    registrationStatus: string;
};

const initialFormData: ActivityFormData = {
    title: '',
    titleThai: '',
    description: '',
    type: 'workshop',
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    location: 'CAMT Building',
    organizer: 'DII CAMT',
    activityHours: 3,
    gamificationPoints: 50,
    maxParticipants: 50,
    status: 'upcoming',
    registrationStatus: 'open',
};

const statusLabel = (status: string) => {
    switch (status) {
        case 'draft':
        case 'pending':
            return 'รออนุมัติ';
        case 'upcoming':
            return 'อนุมัติแล้ว';
        case 'active':
        case 'ongoing':
            return 'กำลังดำเนินการ';
        case 'completed':
            return 'เสร็จสิ้น';
        case 'cancelled':
            return 'ยกเลิก';
        default:
            return status;
    }
};

const formatIsoForInput = (dateStr: string | Date) => {
    try {
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return new Date().toISOString().slice(0, 16);
        const pad = (n: number) => (n < 10 ? '0' + n : n);
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } catch {
        return new Date().toISOString().slice(0, 16);
    }
};

export default function ActivitiesManagement() {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [selectedTab, setSelectedTab] = React.useState<string>('all');
    const [activities, setActivities] = React.useState<FullActivity[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    // Modal states
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [formData, setFormData] = React.useState<ActivityFormData>(initialFormData);
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // View Details Modal state
    const [viewingActivity, setViewingActivity] = React.useState<FullActivity | null>(null);

    const mapActivity = React.useCallback((item: unknown): FullActivity => {
        const act = asRecord(item);
        const enrollmentsArr = asArray(act.enrollments);

        const enrollmentsList: EnrollmentRecord[] = enrollmentsArr.map((e) => {
            const rec = asRecord(e);
            const studentRec = asRecord(rec.student);
            const userRec = asRecord(studentRec.user);
            return {
                id: asString(rec.id),
                studentName: asString(userRec.nameThai, asString(userRec.name, 'ไม่ระบุชื่อ')),
                email: asString(userRec.email, '-'),
                status: asString(rec.status, 'registered'),
                checkedInAt: rec.checkedInAt ? asDate(rec.checkedInAt).toLocaleString('th-TH') : null,
            };
        });

        const dStart = asDate(act.startDate);
        const dEnd = asDate(act.endDate);

        return {
            id: asString(act.id),
            title: asString(act.title, '-'),
            titleThai: asString(act.titleThai, asString(act.title, '-')),
            description: asString(act.description, ''),
            type: asString(act.type, 'general'),
            startDate: dStart.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            endDate: dEnd.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
            location: asString(act.location, '-'),
            organizer: asString(act.organizer, '-'),
            activityHours: asNumber(act.activityHours, 0),
            gamificationPoints: asNumber(act.gamificationPoints, 0),
            maxParticipants: asNumber(act.maxParticipants, 0),
            status: asString(act.status, 'upcoming'),
            registrationStatus: asString(act.registrationStatus, 'open'),
            enrollmentsCount: enrollmentsArr.length,
            enrollmentsList,
            rawDateStart: dStart,
            rawDateEnd: dEnd,
        };
    }, []);

    const fetchActivities = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const response = await api.activities.list();
            setActivities(response.activities.map(mapActivity));
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'ไม่สามารถโหลดข้อมูลกิจกรรมได้');
        } finally {
            setIsLoading(false);
        }
    }, [mapActivity]);

    React.useEffect(() => {
        fetchActivities();
    }, [fetchActivities]);

    // Handle Open Create Modal
    const handleOpenCreate = () => {
        setEditingId(null);
        setFormData({
            ...initialFormData,
            startDate: new Date().toISOString().slice(0, 16),
            endDate: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
        });
        setIsFormOpen(true);
    };

    // Handle Open Edit Modal
    const handleOpenEdit = (act: FullActivity) => {
        setEditingId(act.id);
        setFormData({
            title: act.title,
            titleThai: act.titleThai,
            description: act.description,
            type: act.type,
            startDate: formatIsoForInput(act.rawDateStart),
            endDate: formatIsoForInput(act.rawDateEnd),
            location: act.location,
            organizer: act.organizer,
            activityHours: act.activityHours,
            gamificationPoints: act.gamificationPoints,
            maxParticipants: act.maxParticipants,
            status: act.status,
            registrationStatus: act.registrationStatus,
        });
        setIsFormOpen(true);
    };

    // Handle Save Form (Create or Update)
    const handleSaveForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title || !formData.titleThai || !formData.description) {
            toast.error('กรุณากรอกข้อมูลสำคัญให้ครบถ้วน');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                ...formData,
                startDate: new Date(formData.startDate).toISOString(),
                endDate: new Date(formData.endDate).toISOString(),
                activityHours: Number(formData.activityHours),
                gamificationPoints: Number(formData.gamificationPoints),
                maxParticipants: Number(formData.maxParticipants) || 0,
            };

            if (editingId) {
                await api.activities.update(editingId, payload);
                toast.success('อัปเดตข้อมูลกิจกรรมเรียบร้อยแล้ว');
            } else {
                await api.activities.create(payload);
                toast.success('สร้างกิจกรรมใหม่เรียบร้อยแล้ว');
            }

            setIsFormOpen(false);
            fetchActivities();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'เกิดข้อผิดพลาดในการบันทึกกิจกรรม');
        } finally {
            setIsSubmitting(false);
        }
    };

    // Quick Status Update
    const handleActivityStatus = async (id: string, newStatus: string) => {
        try {
            await api.activities.update(id, { status: newStatus });
            setActivities((current) =>
                current.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
            );
            toast.success(`อัปเดตสถานะเป็น ${statusLabel(newStatus)} เรียบร้อย`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถอัปเดตสถานะได้');
        }
    };

    // Delete Activity
    const handleDeleteActivity = async (id: string) => {
        if (!confirm(t.activitiesManagementPage.confirmDelete || 'คุณแน่ใจหรือว่าต้องการลบกิจกรรมนี้?')) return;
        try {
            await api.activities.remove(id);
            setActivities((current) => current.filter((item) => item.id !== id));
            toast.success('ลบกิจกรรมเรียบร้อยแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'ไม่สามารถลบกิจกรรมได้');
        }
    };

    // Filter Logic
    const filteredActivities = activities.filter((act) => {
        const matchesSearch =
            act.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            act.titleThai.toLowerCase().includes(searchQuery.toLowerCase()) ||
            act.organizer.toLowerCase().includes(searchQuery.toLowerCase()) ||
            act.location.toLowerCase().includes(searchQuery.toLowerCase());

        if (!matchesSearch) return false;

        if (selectedTab === 'pending') return act.status === 'pending' || act.status === 'draft';
        if (selectedTab === 'approved') return act.status === 'upcoming';
        if (selectedTab === 'active') return act.status === 'active' || act.status === 'ongoing';
        if (selectedTab === 'completed') return act.status === 'completed';
        if (selectedTab === 'cancelled') return act.status === 'cancelled';

        return true;
    });

    const pendingCount = activities.filter((a) => a.status === 'pending' || a.status === 'draft').length;
    const approvedCount = activities.filter((a) => a.status === 'upcoming').length;
    const activeCount = activities.filter((a) => a.status === 'active' || a.status === 'ongoing').length;
    const completedCount = activities.filter((a) => a.status === 'completed').length;
    const cancelledCount = activities.filter((a) => a.status === 'cancelled').length;

    const renderStatusBadge = (status: string) => (
        <Badge variant="outline" className={`rounded-xl text-xs ${status === 'completed'
            ? 'border-slate-200 text-slate-500 bg-slate-50'
            : status === 'cancelled'
                ? 'border-red-200 text-red-600 bg-red-50'
                : 'border-emerald-200 text-emerald-600 bg-emerald-50'
<<<<<<< Updated upstream
            } dark:bg-slate-900/50 dark:text-slate-300`}>
=======
            } dark:text-slate-300`}>
>>>>>>> Stashed changes
            {statusLabel(status)}
        </Badge>
    );

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-12">
            {/* Top Bar Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <Activity className="w-4 h-4 text-purple-500" />
                        <span>{t.activitiesManagementPage.subtitle}</span>
                    </motion.div>
<<<<<<< Updated upstream
                    <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.activitiesManagementPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.activitiesManagementPage.titleHighlight}</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
                        {t.activitiesManagementPage.desc}
                    </motion.p>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder={t.activitiesManagementPage.searchPlaceholder} className="pl-10 rounded-xl bg-white/80 border-slate-200 dark:border-slate-700 dark:bg-slate-900/50" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </motion.div>
            </div>

            {/* Stat Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { icon: Clock, label: t.activitiesManagementPage.pendingTab, value: String(activities.filter((activity) => activity.status === 'pending' || activity.status === 'draft').length), gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
                    { icon: CheckCircle, label: t.activitiesManagementPage.approvedTab, value: String(activities.filter((activity) => activity.status === 'upcoming' || activity.status === 'active').length), gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
                    { icon: Calendar, label: t.activitiesManagementPage.inProgressTab, value: String(activities.filter((activity) => activity.status === 'active' || activity.status === 'ongoing').length), gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-200' },
                    { icon: Star, label: t.activitiesManagementPage.completedTab, value: String(activities.filter((activity) => activity.status === 'completed').length), gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-200' },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-xl ${stat.shadow}`}>
                        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50"><stat.icon className="w-4 h-4" /></div>
                                <span className="text-sm font-medium text-white/90">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
                    <div className="mb-5">
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-500" /> {t.activitiesManagementPage.newActivityRequests}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t.activitiesManagementPage.pendingDesc}</p>
                    </div>
                    <div className="space-y-3">
                        {pendingActivities.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                ไม่มีกิจกรรมรออนุมัติ
                            </div>
                        )}
                        {pendingActivities.map((act) => (
                            <motion.div key={act.id} whileHover={{ x: 4 }} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/80 hover:shadow-md transition-all dark:bg-slate-900/50">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg shadow-amber-200">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <h4 className="font-bold text-xl text-slate-900 dark:text-white">{act.titleThai}</h4>
                                                {renderStatusBadge(act.status)}
                                                <Badge variant="outline" className="rounded-xl text-xs bg-slate-50 dark:bg-slate-800">
                                                    {act.type}
                                                </Badge>
                                            </div>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">
                                                {act.title}
                                            </p>
                                            <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-500 dark:text-slate-400 pt-1">
                                                <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5 text-purple-500" /> {act.organizer}</span>
                                                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-red-500" /> {act.location}</span>
                                                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-blue-500" /> {act.startDate} - {act.endDate}</span>
                                                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-amber-500" /> {act.activityHours} ชม.</span>
                                                <span className="flex items-center gap-1"><Sparkles className="w-3.5 h-3.5 text-emerald-500" /> {act.gamificationPoints} pts</span>
                                                <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-indigo-500" /> {act.enrollmentsCount} / {act.maxParticipants || 'ไม่จำกัด'} คน</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200" onClick={() => handleActivityStatus(act.id, 'upcoming')}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> {t.activitiesManagementPage.approveBtn}
                                        </Button>

                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl text-purple-600 border-purple-200 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-300 dark:hover:bg-purple-950/50"
                                            onClick={() => handleOpenEdit(act)}
                                        >
                                            <Edit className="w-4 h-4 mr-1.5" />
                                            {t.activitiesManagementPage.editBtn}
                                        </Button>

                                        {/* Status Control Actions */}
                                        {(act.status === 'pending' || act.status === 'draft') && (
                                            <Button
                                                size="sm"
                                                className="bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-md shadow-emerald-500/20"
                                                onClick={() => handleActivityStatus(act.id, 'upcoming')}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                                {t.activitiesManagementPage.approveBtn}
                                            </Button>
                                        )}

                                        {act.status === 'upcoming' && (
                                            <Button
                                                size="sm"
                                                className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-md shadow-blue-500/20"
                                                onClick={() => handleActivityStatus(act.id, 'active')}
                                            >
                                                <PlayCircle className="w-4 h-4 mr-1.5" />
                                                เริ่มกิจกรรม
                                            </Button>
                                        )}

                                        {(act.status === 'active' || act.status === 'ongoing' || act.status === 'upcoming') && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-purple-600 border-purple-200 hover:bg-purple-50 rounded-xl"
                                                onClick={() => handleActivityStatus(act.id, 'completed')}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1.5" />
                                                ปิดกิจกรรม
                                            </Button>
                                        )}

                                        {act.status === 'cancelled' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="rounded-xl"
                                                onClick={() => handleActivityStatus(act.id, 'upcoming')}
                                            >
                                                <RotateCcw className="w-4 h-4 mr-1.5" />
                                                เปิดใหม่
                                            </Button>
                                        )}

                                        {act.status !== 'cancelled' && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="text-red-500 border-red-200 hover:bg-red-50 rounded-xl"
                                                onClick={() => handleActivityStatus(act.id, 'cancelled')}
                                            >
                                                <XCircle className="w-4 h-4 mr-1.5" />
                                                ยกเลิก
                                            </Button>
                                        )}

                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
                                            onClick={() => handleDeleteActivity(act.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                )}
            </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-slate-400" /> {t.activitiesManagementPage.approvedActivities}
                    </h3>
                    <div className="space-y-3">
                        {approvedActivities.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                ไม่มีกิจกรรมที่อนุมัติแล้ว
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsFormOpen(false)}
                                className="rounded-xl"
                            >
                                {t.activitiesManagementPage.cancelBtn}
                            </Button>
                            <Button
                                type="submit"
                                disabled={isSubmitting}
                                className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white"
                            >
                                {isSubmitting ? 'กำลังบันทึก...' : t.activitiesManagementPage.saveBtn}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Activity Details Modal */}
            <Dialog open={Boolean(viewingActivity)} onOpenChange={(open) => !open && setViewingActivity(null)}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    {viewingActivity && (
                        <>
                            <DialogHeader>
                                <div className="flex items-center gap-2 mb-1">
                                    {renderStatusBadge(viewingActivity.status)}
                                    <Badge variant="outline" className="rounded-xl text-xs">
                                        {viewingActivity.type}
                                    </Badge>
                                </div>
                                <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white">
                                    {viewingActivity.titleThai}
                                </DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium">
                                    {viewingActivity.title}
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-6 py-4">
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 space-y-2 text-sm">
                                    <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                                        {viewingActivity.description}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <p className="text-xs text-slate-400 font-medium mb-1">ผู้จัดกิจกรรม</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <Building2 className="w-4 h-4 text-purple-500" />
                                            {viewingActivity.organizer}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <p className="text-xs text-slate-400 font-medium mb-1">สถานที่</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <MapPin className="w-4 h-4 text-red-500" />
                                            {viewingActivity.location}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <p className="text-xs text-slate-400 font-medium mb-1">ชั่วโมงกิจกรรม</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <Clock className="w-4 h-4 text-amber-500" />
                                            {viewingActivity.activityHours} ชม.
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <p className="text-xs text-slate-400 font-medium mb-1">คะแนน Points</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <Award className="w-4 h-4 text-emerald-500" />
                                            {viewingActivity.gamificationPoints} pts
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <p className="text-xs text-slate-400 font-medium mb-1">สถานะรับสมัคร</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200">
                                            {viewingActivity.registrationStatus === 'open' ? '🟢 เปิดรับสมัคร' : '🔴 ปิดรับสมัคร'}
                                        </p>
                                    </div>
                                    <div className="p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                                        <p className="text-xs text-slate-400 font-medium mb-1">จำนวนผู้สมัคร</p>
                                        <p className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                                            <Users className="w-4 h-4 text-indigo-500" />
                                            {viewingActivity.enrollmentsCount} / {viewingActivity.maxParticipants || 'ไม่จำกัด'}
                                        </p>
                                    </div>
                                </div>

                                {/* Enrolled Students List */}
                                <div className="space-y-3">
                                    <h4 className="font-bold text-base text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-500" />
                                        {t.activitiesManagementPage.enrolledStudents} ({viewingActivity.enrollmentsList.length})
                                    </h4>
                                    {viewingActivity.enrollmentsList.length === 0 ? (
                                        <p className="text-sm text-slate-400 py-4 text-center border border-dashed rounded-2xl">
                                            {t.activitiesManagementPage.noEnrolledStudents}
                                        </p>
                                    ) : (
                                        <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                                            {viewingActivity.enrollmentsList.map((st) => (
                                                <div
                                                    key={st.id}
                                                    className="flex items-center justify-between p-3 rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 text-xs"
                                                >
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{st.studentName}</p>
                                                        <p className="text-slate-400">{st.email}</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <Badge variant="outline" className="rounded-xl text-[10px]">
                                                            {st.status}
                                                        </Badge>
                                                        {st.checkedInAt && (
                                                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">
                                                                Check-in: {st.checkedInAt}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <DialogFooter>
                                <Button variant="outline" onClick={() => setViewingActivity(null)} className="rounded-xl">
                                    ปิดหน้าต่าง
                                </Button>
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
