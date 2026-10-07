import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DegreeProgressProps {
    totalCredits: number;
    earnedCredits: number;
    /** ungraded credits across all terms; null when it could not be loaded */
    registeredCredits: number | null;
    requiredCredits: number;
}

export function DegreeProgressCard({
    earnedCredits,
    registeredCredits,
    requiredCredits,
}: DegreeProgressProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    const progressPercent = Math.min((earnedCredits / requiredCredits) * 100, 100);
    const remainingCredits = Math.max(requiredCredits - earnedCredits, 0);

    // SVG ring
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    const stats = [
        {
            icon: <CheckCircle className="w-4 h-4 text-violet-500" />,
            label: isTH ? 'สำเร็จแล้ว' : 'Earned',
            value: earnedCredits,
            color: 'text-violet-700',
        },
        {
            icon: <Clock className="w-4 h-4 text-blue-500 dark:text-slate-400" />,
            label: isTH ? 'กำลังเรียน (ยังไม่มีเกรด)' : 'In progress (ungraded)',
            value: registeredCredits ?? '-',
            testId: 'in-progress-credits',
            color: 'text-blue-700',
        },
        {
            icon: <BookOpen className="w-4 h-4 text-slate-400" />,
            label: isTH ? 'คงเหลือ' : 'Remaining',
            value: remainingCredits,
            color: 'text-slate-600',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-5 shadow-sm dark:bg-slate-900/50"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-5">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-lg shadow-purple-500/20">
                    <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                        {isTH ? 'ความก้าวหน้าของหลักสูตร' : 'Degree Progress'}
                    </h3>
                    <p data-testid="degree-source" className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                        {isTH ? `ตามทะเบียน · หลักสูตร ${requiredCredits} หน่วยกิต` : `Registrar record · ${requiredCredits}-credit curriculum`}
                    </p>
                </div>
            </div>

            {/* Ring + stats */}
            <div className="flex flex-col items-center gap-5">
                {/* Circular ring */}
                <div className="relative flex items-center justify-center">
                    <svg width="140" height="140" className="-rotate-90">
                        <circle
                            cx="70" cy="70" r={radius}
                            fill="none"
                            stroke="#e2e8f0"
                            strokeWidth="12"
                        />
                        <motion.circle
                            cx="70" cy="70" r={radius}
                            fill="none"
                            stroke="url(#degreeGrad)"
                            strokeWidth="12"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset }}
                            transition={{ duration: 1.4, ease: 'easeOut' }}
                        />
                        <defs>
                            <linearGradient id="degreeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" />
                                <stop offset="100%" stopColor="#a855f7" />
                            </linearGradient>
                        </defs>
                    </svg>
                    <div className="absolute flex flex-col items-center">
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-200">
                            {Math.round(progressPercent)}%
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                            {earnedCredits}/{requiredCredits}
                        </span>
                        <span className="text-[10px] text-slate-400">
                            {isTH ? 'หน่วยกิต' : 'credits'}
                        </span>
                    </div>
                </div>

                {/* Stat pills */}
                <div className="grid grid-cols-3 gap-2 w-full">
                    {stats.map((s, i) => (
                        <div key={i} className="flex flex-col items-center gap-1 bg-slate-50 dark:bg-slate-950 rounded-2xl p-3">
                            {s.icon}
                            <span className={`text-lg font-black ${s.color}`} data-testid={'testId' in s ? s.testId : undefined}>{s.value}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 text-center leading-tight">{s.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
