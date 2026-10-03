import React from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Check, Shield, Zap, Star, Crown, Sparkles, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Subscription() {
    const { t } = useLanguage();

    const [plans, setPlans] = React.useState([
        {
            name: 'Basic', price: 'ฟรี', description: 'สำหรับเริ่มต้นใช้งาน', icon: Zap, current: false,
            gradient: 'from-slate-50 to-slate-100', border: 'border-slate-200 dark:border-slate-800', text: 'text-slate-800 dark:text-slate-200', btnClass: '',
            features: ['ลงประกาศงานฟรี 1 ตำแหน่ง', 'ดูโปรไฟล์นักศึกษา (จำกัดข้อมูล)', 'ไม่มีตราสัญลักษณ์ Verified'],
        },
        {
            name: 'Professional', price: '฿5,000 / ปี', description: 'สำหรับบริษัทที่ต้องการหาบุคลากร', icon: Crown, current: true,
            gradient: 'from-orange-500 to-amber-500', border: 'border-orange-300', text: 'text-white', btnClass: 'bg-white dark:bg-slate-900 text-orange-600 hover:bg-orange-50',
            features: ['ลงประกาศงานได้ 5 ตำแหน่ง', 'ดูโปรไฟล์นักศึกษาได้ไม่จำกัด', 'ตราสัญลักษณ์ Verified', 'แนะนำผู้สมัครที่ตรงเงื่อนไข'],
        },
        {
            name: 'Enterprise / VIP', price: '฿25,000 / ปี', description: 'สำหรับองค์กรขนาดใหญ่ และผู้ใช้ Enterprise', icon: Sparkles, current: false,
            gradient: 'from-violet-50 to-purple-100', border: 'border-purple-200', text: 'text-slate-800 dark:text-slate-200', btnClass: 'bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/30',
            features: [
                'ลงประกาศงานไม่จำกัด', 
                'ระบบคัดกรองผู้สมัคร AI', 
                'Unlimited Talent Matching (จับคู่ทาเลนต์ไม่จำกัด)',
                'Long-term Tracking (ติดตามผลระยะยาว)',
                'Threshold Notifications (แจ้งเตือนอัจฉริยะ)',
                'Priority Support', 
                'เข้าร่วม Job Fair ฟรี', 
            ],
        },
    ]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [payments, setPayments] = React.useState<Array<{ id: string; date: string; item: string; amount: string; status: string; receiptUrl: string }>>([]);

    React.useEffect(() => {
        let isMounted = true;

        Promise.allSettled([api.subscription.plans(), api.subscription.payments()])
            .then(([plansResponse, paymentsResponse]) => {
                if (!isMounted) return;

                if (plansResponse.status === 'fulfilled') {
                    const mappedPlans = plansResponse.value.plans.map((item, index) => {
                        const plan = asRecord(item);
                        const fallback = {
                            name: asString(plan.name, 'Plan'),
                            price: '',
                            description: '',
                            icon: [Zap, Crown, Sparkles][index % 3],
                            current: false,
                            gradient: 'from-slate-50 to-slate-100',
                            border: 'border-slate-200 dark:border-slate-800',
                            text: 'text-slate-800 dark:text-slate-200',
                            btnClass: '',
                            features: [] as string[],
                        };
                        const name = asString(plan.name, fallback.name);
                        const price = asNumber(plan.price, 0);
                        return {
                            ...fallback,
                            name: name === 'pro' ? 'Professional' : name.charAt(0).toUpperCase() + name.slice(1),
                            price: price === 0 ? 'ฟรี' : `฿${price.toLocaleString()} / ปี`,
                            description: asString(plan.description, fallback.description),
                            features: asArray<string>(plan.features).length ? asArray<string>(plan.features) : fallback.features,
                        };
                    });
                    setPlans(mappedPlans);
                } else {
                    setPlans([]);
                }

                if (paymentsResponse.status === 'fulfilled') {
                    const mappedPayments = paymentsResponse.value.payments.map((item, index) => {
                        const payment = asRecord(item);
                        return {
                            id: asString(payment.id, `payment-${index}`),
                            date: asDate(payment.date).toLocaleDateString('th-TH'),
                            item: asString(payment.planName, '-'),
                            amount: `฿${asNumber(payment.amount, 0).toLocaleString()}`,
                            status: asString(payment.status, 'pending'),
                            receiptUrl: asString(payment.receiptUrl),
                        };
                    });
                    setPayments(mappedPayments);
                } else {
                    setPayments([]);
                }
            })
            .catch(() => {
                if (isMounted) {
                    setPlans([]);
                    setPayments([]);
                }
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const parsePlanAmount = (price: string) => {
        const match = price.replace(/,/g, '').match(/\d+/);
        return match ? Number(match[0]) : 0;
    };

    const handleSelectPlan = async (plan: typeof plans[number]) => {
        const amount = parsePlanAmount(plan.price);
        try {
            const response = await api.subscription.createPayment({
                amount: Math.max(amount, 1),
                planName: plan.name,
                status: amount === 0 ? 'paid' : 'pending',
                referenceNumber: `SUB-${Date.now()}`,
            });
            const payment = asRecord(response.payment);
            setPayments(current => [{
                id: asString(payment.id, `payment-${Date.now()}`),
                date: asDate(payment.date).toLocaleDateString('th-TH'),
                item: asString(payment.planName, plan.name),
                amount: `฿${asNumber(payment.amount, amount).toLocaleString()}`,
                status: asString(payment.status, amount === 0 ? 'paid' : 'pending'),
                receiptUrl: asString(payment.receiptUrl),
            }, ...current]);
            toast.success(t.subscriptionPage.selectPlan);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.subscriptionPage.selectPlan);
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div className="text-center">
                <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="inline-flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                    <CreditCard className="w-4 h-4 text-orange-500 dark:text-slate-400" />
                    <span>{t.subscriptionPage.subtitle}</span>
                </motion.div>
                <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                    {t.subscriptionPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{t.subscriptionPage.titleHighlight}</span>
                </motion.h1>
                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 dark:text-slate-400 mt-3 max-w-lg mx-auto">
                    {t.subscriptionPage.desc}
                </motion.p>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {!isLoading && plans.map((plan, index) => (
                    <motion.div key={index} variants={itemVariants} whileHover={{ y: -8 }}
                        className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${plan.gradient} border ${plan.border} p-7 shadow-sm hover:shadow-xl transition-all flex flex-col ${plan.current ? 'ring-2 ring-orange-400 shadow-xl shadow-orange-200 scale-[1.02]' : ''}`}>
                        {plan.current && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white px-5 py-1.5 rounded-full text-sm font-bold shadow-lg shadow-orange-200">
                                {t.subscriptionPage.currentPlan}
                            </div>
                        )}
                        <div className={`${plan.text} mt-${plan.current ? '4' : '0'}`}>
                            <div className="flex items-center gap-2 mb-1">
                                <plan.icon className="w-5 h-5" />
                                <h3 className="text-xl font-bold">{plan.name}</h3>
                            </div>
                            <p className={`text-sm ${plan.current ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'} mb-5`}>{plan.description}</p>
                            <div className="mb-6">
                                <span className="text-4xl font-bold">{plan.price}</span>
                            </div>
                            <ul className="space-y-3 mb-8 flex-1">
                                {plan.features.map((feature, i) => (
                                    <li key={i} className="flex items-start gap-2.5 text-sm">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${plan.current ? 'bg-white/2 dark:bg-slate-900/20 dark:bg-slate-900/20' : 'bg-emerald-100'}`}>
                                            <Check className={`w-3 h-3 ${plan.current ? 'text-white' : 'text-emerald-500'}`} />
                                        </div>
                                        <span className={plan.current ? 'text-white/90' : 'text-slate-600 dark:text-slate-400'}>{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                        <Button onClick={() => handleSelectPlan(plan)} className={`w-full rounded-xl h-12 text-sm font-semibold ${plan.btnClass || ''}`} variant={plan.current || plan.btnClass ? 'default' : 'outline'} disabled={plan.current}>
                            {plan.current ? t.subscriptionPage.inUse : t.subscriptionPage.selectPlan}
                        </Button>
                    </motion.div>
                ))}
                {isLoading && (
                    <div className="md:col-span-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        กำลังโหลดแพ็กเกจ...
                    </div>
                )}
                {!isLoading && plans.length === 0 && (
                    <div className="md:col-span-3 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                        {t.common.noData}
                    </div>
                )}
            </div>

            {/* Payment History */}
            <motion.div variants={itemVariants} className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm max-w-5xl mx-auto">
                <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 mb-5 flex items-center gap-2">
                    <Receipt className="w-5 h-5 text-slate-500 dark:text-slate-400" /> {t.subscriptionPage.paymentHistory}
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border border-slate-200 dark:border-slate-800-b border-slate-100 dark:border-slate-800">
                                <th className="pb-3 text-left font-medium text-slate-500 dark:text-slate-400">{t.subscriptionPage.date}</th>
                                <th className="pb-3 text-left font-medium text-slate-500 dark:text-slate-400">{t.subscriptionPage.item}</th>
                                <th className="pb-3 text-left font-medium text-slate-500 dark:text-slate-400">{t.subscriptionPage.amount}</th>
                                <th className="pb-3 text-left font-medium text-slate-500 dark:text-slate-400">{t.subscriptionPage.status}</th>
                                <th className="pb-3 text-right font-medium text-slate-500 dark:text-slate-400">{t.subscriptionPage.receipt}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {payments.map((payment) => (
                                <tr key={payment.id}>
                                    <td className="py-4 text-slate-700 dark:text-slate-300">{payment.date}</td>
                                    <td className="text-slate-700 dark:text-slate-300">{payment.item}</td>
                                    <td className="font-semibold text-slate-800 dark:text-slate-200">{payment.amount}</td>
                                    <td><Badge className="bg-emerald-50 text-emerald-600 border-emerald-200 rounded-lg dark:text-slate-300 dark:bg-slate-800">{payment.status === 'paid' ? t.subscriptionPage.paid : payment.status}</Badge></td>
                                    <td className="text-right">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => payment.receiptUrl ? window.open(payment.receiptUrl, '_blank', 'noopener,noreferrer') : toast.info('ยังไม่มีใบเสร็จ')}
                                            className="text-blue-500 hover:text-blue-600 rounded-xl text-xs dark:text-slate-300"
                                        >
                                            {t.subscriptionPage.downloadReceipt}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {payments.length === 0 && (
                            <tr>
                                <td colSpan={5} className="py-6 text-center text-slate-500 dark:text-slate-400">
                                    {isLoading ? 'กำลังโหลดประวัติการชำระเงิน...' : t.common.noData}
                                </td>
                            </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </motion.div>
        </motion.div>
    );
}
