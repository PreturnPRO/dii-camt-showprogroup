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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type ActivityRow = {
    id: string;
    title: string;
    org: string;
    date: string;
    participants: number;
    status: string;
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

export default function ActivitiesManagement() {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [activities, setActivities] = React.useState<ActivityRow[]>([]);

    const mapActivityRow = React.useCallback((item: unknown): ActivityRow => {
        const activity = asRecord(item);
        return {
            id: asString(activity.id),
            title: asString(activity.titleThai, asString(activity.title, '-')),
            org: asString(activity.organizer, '-'),
            date: asDate(activity.startDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }),
            participants: asArray(activity.enrollments).length || asNumber(activity.maxParticipants, 0),
            status: asString(activity.status, 'upcoming'),
        };
    }, []);

    React.useEffect(() => {
        let isMounted = true;
        api.activities.list()
            .then((response) => {
                if (!isMounted) return;
                setActivities(response.activities.map(mapActivityRow));
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, [mapActivityRow]);

    const filteredActivities = activities.filter((activity) =>
        activity.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.org.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    const pendingActivities = filteredActivities.filter((activity) => activity.status === 'pending' || activity.status === 'draft');
    const approvedActivities = filteredActivities.filter((activity) => activity.status !== 'pending' && activity.status !== 'draft');

    const handleActivityStatus = async (id: string, status: string) => {
        try {
            await api.activities.update(id, { status });
            setActivities((current) => current.map((item) => item.id === id ? { ...item, status } : item));
            toast.success(`อัปเดตสถานะเป็น ${statusLabel(status)} แล้ว`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to update activity');
        }
    };

    const handleDeleteActivity = async (id: string) => {
        if (!confirm('ลบกิจกรรมนี้?')) return;
        try {
            await api.activities.remove(id);
            setActivities((current) => current.filter((item) => item.id !== id));
            toast.success('ลบกิจกรรมแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to delete activity');
        }
    };

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
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <Activity className="w-4 h-4 text-purple-500 dark:text-slate-400" />
                        <span>{t.activitiesManagementPage.subtitle}</span>
                    </motion.div>
                    <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.activitiesManagementPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.activitiesManagementPage.titleHighlight}</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
                        {t.activitiesManagementPage.desc}
                    </motion.p>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder={t.activitiesManagementPage.searchPlaceholder} className="pl-10 rounded-xl bg-white/80 border-slate-200 dark:border-slate-700" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { icon: Clock, label: t.activitiesManagementPage.pendingTab, value: String(activities.filter((activity) => activity.status === 'pending' || activity.status === 'draft').length), gradient: '', shadow: '' },
                    { icon: CheckCircle, label: t.activitiesManagementPage.approvedTab, value: String(activities.filter((activity) => activity.status === 'upcoming' || activity.status === 'active').length), gradient: '', shadow: '' },
                    { icon: Calendar, label: t.activitiesManagementPage.inProgressTab, value: String(activities.filter((activity) => activity.status === 'active' || activity.status === 'ongoing').length), gradient: '', shadow: '' },
                    { icon: Star, label: t.activitiesManagementPage.completedTab, value: String(activities.filter((activity) => activity.status === 'completed').length), gradient: '', shadow: '' },
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

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
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
                            <motion.div key={act.id} whileHover={{ x: 4 }} className="p-5 rounded-2xl border border-slate-100 dark:border-slate-800 bg-white/80 hover:shadow-md transition-all">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg">
                                            <Activity className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">{act.title}</h4>
                                            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{act.org} • {act.date}</p>
                                            <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                                                <Users className="w-3.5 h-3.5" /> {t.activitiesManagementPage.participants} {act.participants} {t.activitiesManagementPage.people}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Button className="bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-sm" onClick={() => handleActivityStatus(act.id, 'upcoming')}>
                                            <CheckCircle className="w-4 h-4 mr-2" /> {t.activitiesManagementPage.approveBtn}
                                        </Button>
                                        <Button variant="outline" className="text-red-500 border-red-200 hover:bg-red-50 rounded-xl dark:text-slate-400 dark:bg-slate-800" onClick={() => handleActivityStatus(act.id, 'cancelled')}>
                                            <XCircle className="w-4 h-4 mr-2" /> {t.activitiesManagementPage.rejectBtn}
                                        </Button>
                                        <Button variant="ghost" className="text-slate-500 rounded-xl" onClick={() => handleDeleteActivity(act.id)}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500 dark:text-slate-400" /> {t.activitiesManagementPage.approvedActivities}
                    </h3>
                    <div className="space-y-3">
                        {approvedActivities.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                ไม่มีกิจกรรมที่อนุมัติแล้ว
                            </div>
                        )}
                        {approvedActivities.map((act, idx) => (
                            <motion.div key={act.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + idx * 0.1 }}
                                className="p-3.5 rounded-2xl hover:bg-white transition-all dark:bg-slate-900">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${act.status === 'completed' ? 'bg-slate-100 text-slate-400' : 'bg-emerald-50 text-emerald-500'}`}>
                                            {act.status === 'completed' ? <Star className="w-5 h-5" /> : <Activity className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <p className="font-medium text-slate-800 dark:text-slate-200">{act.title}</p>
                                            <p className="text-xs text-slate-400">{act.date}</p>
                                        </div>
                                    </div>
                                    {renderStatusBadge(act.status)}
                                </div>
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {act.status !== 'active' && act.status !== 'ongoing' && act.status !== 'completed' && (
                                        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => handleActivityStatus(act.id, 'active')}>
                                            <PlayCircle className="w-3.5 h-3.5 mr-1.5" /> เริ่ม
                                        </Button>
                                    )}
                                    {act.status !== 'completed' && (
                                        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => handleActivityStatus(act.id, 'completed')}>
                                            <CheckCircle className="w-3.5 h-3.5 mr-1.5" /> ปิดกิจกรรม
                                        </Button>
                                    )}
                                    {act.status === 'cancelled' && (
                                        <Button size="sm" variant="outline" className="rounded-xl text-xs" onClick={() => handleActivityStatus(act.id, 'upcoming')}>
                                            <RotateCcw className="w-3.5 h-3.5 mr-1.5" /> เปิดใหม่
                                        </Button>
                                    )}
                                    {act.status !== 'cancelled' && (
                                        <Button size="sm" variant="outline" className="rounded-xl text-xs text-red-500" onClick={() => handleActivityStatus(act.id, 'cancelled')}>
                                            <XCircle className="w-3.5 h-3.5 mr-1.5" /> ยกเลิก
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="rounded-xl text-xs text-red-500" onClick={() => handleDeleteActivity(act.id)}>
                                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> ลบ
                                    </Button>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </div>
        </motion.div>
    );
}
