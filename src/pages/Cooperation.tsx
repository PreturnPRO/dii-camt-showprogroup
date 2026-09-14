import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Handshake, FileText, CheckCircle, Clock, Calendar, Download, Shield, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asDate, asRecord, asString } from '@/lib/live-data';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Cooperation() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [records, setRecords] = React.useState<Array<{ id: string; title: string; type: string; details: string; status: string; companyName: string; createdAt: Date; expiryDate?: Date }>>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        let mounted = true;

        api.cooperation
            .list()
            .then((response) => {
                if (!mounted) return;
                const mapped = response.cooperation.map((item) => {
                    const source = asRecord(item);
                    const company = asRecord(source.company);
                    return {
                        id: asString(source.id, 'cooperation'),
                        title: asString(source.title, t.cooperationPage.mouTitle),
                        type: asString(source.type, 'MOU'),
                        details: asString(source.details, t.cooperationPage.mouParties),
                        status: asString(source.status, 'active'),
                        companyName: asString(company.companyNameThai, asString(company.companyName, 'Partner')),
                        createdAt: asDate(source.createdAt),
                        expiryDate: source.expiryDate ? asDate(source.expiryDate) : undefined,
                    };
                });
                setRecords(mapped);
            })
            .catch((error) => {
                console.warn('Unable to load cooperation records from API', error);
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [t.cooperationPage.mouParties, t.cooperationPage.mouTitle]);

    const hasMou = records.length > 0;
    const currentMou = records.find((record) => record.status === 'active') ?? records[0] ?? {
        id: '-',
        title: t.cooperationPage.mouTitle,
        type: 'MOU',
        details: t.common.noData,
        status: 'none',
        companyName: '-',
        createdAt: new Date(),
        expiryDate: new Date(),
    };
    const expiryDate = currentMou.expiryDate ?? new Date();
    const remainingDays = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const activityRows = records.slice(0, 3).map((record) => ({
        title: record.title,
        date: record.createdAt.toLocaleDateString('th-TH', { dateStyle: 'medium' as const }),
        desc: record.details,
        icon: record.type.toLowerCase().includes('mou') ? Handshake : Calendar,
    }));

    const handleDownload = async () => {
        if (!hasMou || !currentMou?.id) return;
        const blob = await api.documents.cooperationSummary(currentMou.id);
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(url), 5000);
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div>
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <Handshake className="w-4 h-4 text-orange-500 dark:text-slate-400" />
                    <span>{t.cooperationPage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.cooperationPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{t.cooperationPage.titleHighlight}</span>
                </motion.h1>
            </div>

            {/* MOU Status Card - Full Width */}
            <motion.div variants={itemVariants} whileHover={{ scale: 1.005 }}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-white shadow-sm">
                <div className="absolute -top-20 -right-20 w-60 h-60 bg-white/10 rounded-full blur-3xl" />
                <div className="absolute bottom-0 left-0 w-40 h-40 bg-white/5 rounded-full blur-2xl" />
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm"><Shield className="w-6 h-6" /></div>
                                <div>
                                    <h2 className="text-2xl font-bold">{t.cooperationPage.mouStatus}</h2>
                                    <p className="text-emerald-100 text-sm mt-0.5">{currentMou.title}</p>
                                </div>
                            </div>
                            <p className="text-emerald-100 text-sm max-w-2xl">
                                {currentMou.details}
                            </p>
                        </div>
                        <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-1.5 backdrop-blur-sm self-start">{currentMou.status}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        {[
                            { label: t.cooperationPage.contractNo, value: currentMou.id },
                            { label: t.cooperationPage.startDate, value: '1 มกราคม 2567' },
                            { label: t.cooperationPage.endDate, value: '31 ธันวาคม 2569', sub: `${t.cooperationPage.timeRemaining} 1 ปี 9 เดือน` },
                        ].map((item, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white/10 backdrop-blur-sm">
                                <p className="text-sm text-emerald-200">{item.label}</p>
                                <p className="font-bold text-lg mt-1">
                                    {i === 1 ? currentMou.createdAt.toLocaleDateString('th-TH', { dateStyle: 'medium' }) : i === 2 ? expiryDate.toLocaleDateString('th-TH', { dateStyle: 'medium' }) : item.value}
                                </p>
                                {i === 2 && <p className="text-xs text-amber-200 mt-1">{t.cooperationPage.timeRemaining} {remainingDays} วัน</p>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button disabled={!hasMou || isLoading} onClick={handleDownload} className="bg-white/20 hover:bg-white/30 text-white backdrop-blur-sm rounded-xl border border-white/20">
                            <Download className="w-4 h-4 mr-2" /> {t.cooperationPage.downloadMOU}
                        </Button>
                        <Button onClick={() => navigate('/messages')} className="bg-white text-emerald-700 hover:bg-emerald-50 rounded-xl shadow-lg dark:text-slate-300 dark:bg-slate-900 dark:bg-slate-800">
                            {t.cooperationPage.renewContract}
                        </Button>
                    </div>
                </div>
            </motion.div>

            {/* Bento Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Activity History - 3 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                        <Clock className="w-5 h-5 text-orange-500 dark:text-slate-400" /> {t.cooperationPage.activityHistory}
                    </h3>
                    <div className="space-y-3">
                        {activityRows.map((row, idx) => (
                            <motion.div key={idx} whileHover={{ x: 4 }} className="flex items-start gap-4 p-4 rounded-2xl hover:bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all dark:bg-slate-900 dark:border-slate-700">
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center text-white flex-shrink-0 shadow-lg">
                                    <row.icon className="w-5 h-5" />
                                </div>
                                <div>
                                    <h4 className="font-semibold text-slate-800 dark:text-slate-200">{row.title}</h4>
                                    <p className="text-xs text-slate-400 mb-1">{row.date}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{row.desc}</p>
                                </div>
                            </motion.div>
                        ))}
                        {activityRows.length === 0 && (
                            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                                {isLoading ? 'กำลังโหลดข้อมูลความร่วมมือ...' : t.common.noData}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Contact Person - 2 cols */}
                <motion.div variants={itemVariants} className="lg:col-span-2 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500 dark:text-slate-400" /> {t.cooperationPage.coordinator}
                    </h3>
                    <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 mb-5">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white text-2xl font-bold shadow-sm">
                                อ
                            </div>
                            <div>
                                <p className="font-bold text-lg text-slate-800 dark:text-slate-200">{t.cooperationPage.coordinatorName}</p>
                                <p className="text-sm text-slate-500 dark:text-slate-400">{t.cooperationPage.coordinatorPosition}</p>
                            </div>
                        </div>
                        <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
                            <p>📞 053-942-xxx</p>
                            <p>✉️ somchai@cmu.ac.th</p>
                        </div>
                    </div>
                    <Button onClick={() => navigate('/messages')} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm h-11">
                        {t.cooperationPage.sendMessage}
                    </Button>
                </motion.div>
            </div>
        </motion.div>
    );
}
