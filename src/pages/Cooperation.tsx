import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Handshake, FileText, CheckCircle, Clock, Calendar, Download, Shield, Users, Phone, Mail } from 'lucide-react';
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
    const { t, language } = useLanguage();
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
                    const companyName = asString(company.companyNameThai, asString(company.companyName, '-'));
                    return {
                        id: asString(source.id, 'cooperation'),
                        title: asString(source.title, t.cooperationPage.mouTitle),
                        type: asString(source.type, 'MOU'),
                        // no details: name the record's own company, never an invented one
                        details: asString(source.details, companyName === '-' ? '-' : `ระหว่างมหาวิทยาลัยเชียงใหม่ และ ${companyName}`),
                        status: asString(source.status, 'active'),
                        companyName,
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
    }, [t.cooperationPage.mouTitle]);

    const hasMou = records.length > 0;
    const currentMou = records.find((record) => record.status === 'active') ?? records[0] ?? {
        id: '-',
        title: t.cooperationPage.mouTitle,
        type: 'MOU',
        details: t.common.noData,
        status: 'none',
        companyName: '-',
        createdAt: new Date(),
        expiryDate: undefined as Date | undefined,
    };
    // dates come from the cooperation record only; a missing expiry is hidden, never "today" (audit F9)
    const expiryDate = currentMou.expiryDate;
    const remainingDays = expiryDate ? Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))) : null;
    const thaiDate = (date: Date) => date.toLocaleDateString('th-TH', { dateStyle: 'medium' });
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
                <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.cooperationPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{t.cooperationPage.titleHighlight}</span>
                </motion.h1>
            </div>

            {/* MOU Status Card - Full Width */}
            <motion.div variants={itemVariants} whileHover={{ scale: 1.005 }}
                className="bg-emerald-600 relative overflow-hidden rounded-3xl p-8 text-white shadow-sm">
                <div className="relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2.5 rounded-xl bg-white/20"><Shield className="w-6 h-6" /></div>
                                <div>
                                    <h2 className="text-2xl font-bold leading-snug">{t.cooperationPage.mouStatus}</h2>
                                    <p className="text-emerald-100 text-sm mt-0.5">{currentMou.title}</p>
                                </div>
                            </div>
                            <p className="text-emerald-100 text-sm max-w-2xl">
                                {currentMou.details}
                            </p>
                        </div>
                        <Badge className="bg-white/20 text-white border-white/30 text-base px-4 py-1.5 self-start">{currentMou.status}</Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                        {[
                            { label: t.cooperationPage.contractNo, value: currentMou.id },
                            ...(hasMou ? [{ label: t.cooperationPage.startDate, value: thaiDate(currentMou.createdAt) }] : []),
                            ...(hasMou && expiryDate
                                ? [{ label: t.cooperationPage.endDate, value: thaiDate(expiryDate), sub: `${t.cooperationPage.timeRemaining} ${remainingDays} วัน` }]
                                : []),
                        ].map((item, i) => (
                            <div key={i} className="p-4 rounded-2xl bg-white/10">
                                <p className="text-sm text-emerald-200">{item.label}</p>
                                <p className="font-bold text-lg mt-1">{item.value}</p>
                                {'sub' in item && item.sub && <p className="text-xs text-amber-200 mt-1">{item.sub}</p>}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-3 mt-6">
                        <Button disabled={!hasMou || isLoading} onClick={handleDownload} className="bg-white/20 hover:bg-white/25 text-white rounded-xl border border-white/20">
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
                    {/* the system stores no coordinator for an MOU, so none is shown (audit F9) */}
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-5">
                        {language === 'th' ? 'ติดต่อเจ้าหน้าที่ประสานงานความร่วมมือผ่านระบบข้อความ' : 'Contact the cooperation office through messages'}
                    </p>
                    <Button onClick={() => navigate('/messages')} className="w-full rounded-xl bg-blue-600 hover:bg-blue-700 shadow-sm h-11">
                        {t.cooperationPage.sendMessage}
                    </Button>
                </motion.div>
            </div>
        </motion.div>
    );
}
