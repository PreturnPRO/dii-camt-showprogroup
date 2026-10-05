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
        <Badge
            variant="outline"
            className={`rounded-xl text-xs px-2.5 py-1 ${
                status === 'completed'
                    ? 'border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-950/40 dark:text-purple-300'
                    : status === 'cancelled'
                    ? 'border-red-200 text-red-600 bg-red-50 dark:bg-red-950/40 dark:text-red-300'
                    : status === 'active' || status === 'ongoing'
                    ? 'border-blue-200 text-blue-600 bg-blue-50 dark:bg-blue-950/40 dark:text-blue-300'
                    : status === 'pending' || status === 'draft'
                    ? 'border-amber-200 text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-300'
                    : 'border-emerald-200 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300'
            }`}
        >
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
                    <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.activitiesManagementPage.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.activitiesManagementPage.titleHighlight}</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
                        {t.activitiesManagementPage.desc}
                    </motion.p>
                </div>

                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <Input
                            placeholder={t.activitiesManagementPage.searchPlaceholder}
                            className="pl-10 rounded-2xl bg-white/80 border-slate-200 dark:border-slate-800 dark:bg-slate-900/50"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <Button
                        onClick={handleOpenCreate}
                        className="rounded-2xl bg-gradient-to-r from-purple-600 to-violet-600 hover:from-purple-700 hover:to-violet-700 text-white shadow-lg shadow-purple-500/20"
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        {t.activitiesManagementPage.createBtn}
                    </Button>
                </motion.div>
            </div>

            {/* Stat Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                    { key: 'all', icon: Activity, label: t.activitiesManagementPage.allTab, value: String(activities.length), gradient: 'from-slate-700 to-slate-900', shadow: 'shadow-slate-200' },
                    { key: 'pending', icon: Clock, label: t.activitiesManagementPage.pendingTab, value: String(pendingCount), gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
                    { key: 'approved', icon: CheckCircle, label: t.activitiesManagementPage.approvedTab, value: String(approvedCount), gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
                    { key: 'active', icon: Calendar, label: t.activitiesManagementPage.inProgressTab, value: String(activeCount), gradient: 'from-blue-500 to-indigo-500', shadow: 'shadow-blue-200' },
                    { key: 'completed', icon: Star, label: t.activitiesManagementPage.completedTab, value: String(completedCount), gradient: 'from-purple-500 to-violet-500', shadow: 'shadow-purple-200' },
                ].map((stat) => (
                    <motion.div
                        key={stat.key}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedTab(stat.key)}
                        className={`cursor-pointer relative overflow-hidden rounded-3xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-xl ${stat.shadow} ${
                            selectedTab === stat.key ? 'ring-4 ring-purple-400 ring-offset-2 dark:ring-offset-slate-950' : ''
                        }`}
                    >
                        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                    <stat.icon className="w-4 h-4" />
                                </div>
                                <span className="text-sm font-medium text-white/90">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {[
                    { id: 'all', label: `${t.activitiesManagementPage.allTab} (${activities.length})` },
                    { id: 'pending', label: `${t.activitiesManagementPage.pendingTab} (${pendingCount})` },
                    { id: 'approved', label: `${t.activitiesManagementPage.approvedTab} (${approvedCount})` },
                    { id: 'active', label: `${t.activitiesManagementPage.inProgressTab} (${activeCount})` },
                    { id: 'completed', label: `${t.activitiesManagementPage.completedTab} (${completedCount})` },
                    { id: 'cancelled', label: `${t.activitiesManagementPage.cancelledTab} (${cancelledCount})` },
                ].map((tab) => (
                    <Button
                        key={tab.id}
                        variant={selectedTab === tab.id ? 'default' : 'outline'}
                        onClick={() => setSelectedTab(tab.id)}
                        className={`rounded-2xl px-5 text-sm transition-all ${
                            selectedTab === tab.id
                                ? 'bg-purple-600 text-white shadow-md shadow-purple-500/20'
                                : 'bg-white/70 dark:bg-slate-900/50 dark:border-slate-800'
                        }`}
                    >
                        {tab.label}
                    </Button>
                ))}
            </div>

            {/* Activities Main List */}
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50 space-y-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        รายการกิจกรรม ({filteredActivities.length})
                    </h3>
                </div>

                {isLoading ? (
                    <div className="p-12 text-center text-slate-400">กำลังโหลดข้อมูลกิจกรรม...</div>
                ) : filteredActivities.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/70 p-12 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400">
                        ไม่พบข้อมูลกิจกรรมตามเงื่อนไขที่เลือก
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredActivities.map((act) => (
                            <motion.div
                                key={act.id}
                                whileHover={{ y: -2 }}
                                className="p-6 rounded-3xl border border-slate-100 dark:border-slate-800/80 bg-white/90 hover:shadow-lg transition-all dark:bg-slate-900/80"
                            >
                                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                                    <div className="flex items-start gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-500/20 shrink-0 mt-1">
                                            <Activity className="w-7 h-7" />
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

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2 border-t lg:border-t-0 pt-4 lg:pt-0 border-slate-100 dark:border-slate-800 justify-end">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="rounded-xl text-slate-700 dark:text-slate-300"
                                            onClick={() => setViewingActivity(act)}
                                        >
                                            <Eye className="w-4 h-4 mr-1.5" />
                                            {t.activitiesManagementPage.viewDetailsBtn}
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

            {/* Create / Edit Activity Modal */}
            <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto rounded-3xl p-6 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                            <Activity className="w-6 h-6 text-purple-600" />
                            {editingId ? t.activitiesManagementPage.editModalTitle : t.activitiesManagementPage.createModalTitle}
                        </DialogTitle>
                        <DialogDescription className="text-slate-500">
                            กรอกรายละเอียดกิจกรรมที่ต้องการ{editingId ? 'แก้ไข' : 'สร้างใหม่'}ในระบบ
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleSaveForm} className="space-y-4 py-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="titleThai">{t.activitiesManagementPage.titleThaiLabel} *</Label>
                                <Input
                                    id="titleThai"
                                    required
                                    placeholder="เช่น เวิร์กชอปการพัฒนา AI สำหรับอนาคต"
                                    value={formData.titleThai}
                                    onChange={(e) => setFormData({ ...formData, titleThai: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="title">{t.activitiesManagementPage.titleEngLabel} *</Label>
                                <Input
                                    id="title"
                                    required
                                    placeholder="e.g. AI Development Workshop"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">{t.activitiesManagementPage.descriptionLabel} *</Label>
                            <Textarea
                                id="description"
                                required
                                rows={3}
                                placeholder="รายละเอียดวัตถุประสงค์ และกิจกรรม..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                className="rounded-xl"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="type">{t.activitiesManagementPage.typeLabel}</Label>
                                <Select
                                    value={formData.type}
                                    onValueChange={(val) => setFormData({ ...formData, type: val })}
                                >
                                    <SelectTrigger id="type" className="rounded-xl">
                                        <SelectValue placeholder="เลือกประเภท" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="workshop">Workshop / การอบรม</SelectItem>
                                        <SelectItem value="seminar">Seminar / สัมมนา</SelectItem>
                                        <SelectItem value="competition">Competition / การแข่งขันทักษะ</SelectItem>
                                        <SelectItem value="volunteering">Volunteering / จิตอาสา</SelectItem>
                                        <SelectItem value="academic">Academic / วิชาการ</SelectItem>
                                        <SelectItem value="general">General / กิจกรรมทั่วไป</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="organizer">{t.activitiesManagementPage.organizerLabel}</Label>
                                <Input
                                    id="organizer"
                                    required
                                    value={formData.organizer}
                                    onChange={(e) => setFormData({ ...formData, organizer: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="location">{t.activitiesManagementPage.locationLabel}</Label>
                                <Input
                                    id="location"
                                    required
                                    value={formData.location}
                                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="startDate">{t.activitiesManagementPage.startDateLabel}</Label>
                                <Input
                                    id="startDate"
                                    type="datetime-local"
                                    required
                                    value={formData.startDate}
                                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="endDate">{t.activitiesManagementPage.endDateLabel}</Label>
                                <Input
                                    id="endDate"
                                    type="datetime-local"
                                    required
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="activityHours">{t.activitiesManagementPage.hoursLabel}</Label>
                                <Input
                                    id="activityHours"
                                    type="number"
                                    min={0}
                                    value={formData.activityHours}
                                    onChange={(e) => setFormData({ ...formData, activityHours: Number(e.target.value) })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="gamificationPoints">{t.activitiesManagementPage.pointsLabel}</Label>
                                <Input
                                    id="gamificationPoints"
                                    type="number"
                                    min={0}
                                    value={formData.gamificationPoints}
                                    onChange={(e) => setFormData({ ...formData, gamificationPoints: Number(e.target.value) })}
                                    className="rounded-xl"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="maxParticipants">{t.activitiesManagementPage.maxParticipantsLabel}</Label>
                                <Input
                                    id="maxParticipants"
                                    type="number"
                                    min={1}
                                    value={formData.maxParticipants}
                                    onChange={(e) => setFormData({ ...formData, maxParticipants: Number(e.target.value) })}
                                    className="rounded-xl"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="status">{t.activitiesManagementPage.statusLabel}</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(val) => setFormData({ ...formData, status: val })}
                                >
                                    <SelectTrigger id="status" className="rounded-xl">
                                        <SelectValue placeholder="เลือกสถานะ" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">รออนุมัติ (Pending)</SelectItem>
                                        <SelectItem value="upcoming">อนุมัติแล้ว (Upcoming)</SelectItem>
                                        <SelectItem value="active">กำลังดำเนินการ (Active)</SelectItem>
                                        <SelectItem value="completed">เสร็จสิ้น (Completed)</SelectItem>
                                        <SelectItem value="cancelled">ยกเลิก (Cancelled)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="registrationStatus">{t.activitiesManagementPage.regStatusLabel}</Label>
                                <Select
                                    value={formData.registrationStatus}
                                    onValueChange={(val) => setFormData({ ...formData, registrationStatus: val })}
                                >
                                    <SelectTrigger id="registrationStatus" className="rounded-xl">
                                        <SelectValue placeholder="สถานะรับสมัคร" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="open">เปิดรับสมัคร (Open)</SelectItem>
                                        <SelectItem value="closed">ปิดรับสมัคร (Closed)</SelectItem>
                                    </SelectContent>
                                </Select>
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
