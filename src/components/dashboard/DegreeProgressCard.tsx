import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, BookOpen, CheckCircle, Clock } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface DegreeProgressProps {
    totalCredits: number;
    earnedCredits: number;
    registeredCredits: number;
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
            icon: <CheckCircle className="w-3.5 h-3.5 text-violet-500" />,
            label: isTH ? 'สำเร็จแล้ว' : 'Earned',
            value: earnedCredits,
            color: 'text-violet-600 dark:text-violet-400',
        },
        {
            icon: <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />,
            label: isTH ? 'ลงทะเบียน' : 'Registered',
            value: registeredCredits,
            color: 'text-blue-600 dark:text-blue-400',
        },
        {
            icon: <BookOpen className="w-3.5 h-3.5 text-slate-400" />,
            label: isTH ? 'คงเหลือ' : 'Remaining',
            value: remainingCredits,
            color: 'text-slate-700 dark:text-slate-300',
        },
    ];

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-sm h-full flex flex-col justify-between"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20">
                    <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {isTH ? 'ความก้าวหน้าของหลักสูตร' : 'Degree Progress'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {isTH ? `รวม ${requiredCredits} หน่วยกิต` : `${requiredCredits} credits total`}
                    </p>
                </div>
            </div>

            {/* Side-by-side: Ring on Left, 2 Blocks on Right */}
            <div className="flex items-center gap-4 flex-1">
                {/* Left: Circular ring (fixed width for perfect alignment) */}
                <div className="w-[120px] flex items-center justify-center shrink-0">
                    <div className="relative flex items-center justify-center">
                        <svg width="104" height="104" className="-rotate-90">
                            <circle
                                cx="52" cy="52" r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-slate-100 dark:text-slate-800/80"
                            />
                            <motion.circle
                                cx="52" cy="52" r="40"
                                fill="none"
                                stroke="url(#degreeGrad)"
                                strokeWidth="8"
                                strokeLinecap="round"
                                strokeDasharray={2 * Math.PI * 40}
                                initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                                animate={{ strokeDashoffset: (2 * Math.PI * 40) - (progressPercent / 100) * (2 * Math.PI * 40) }}
                                transition={{ duration: 1.1, ease: 'easeOut' }}
                            />
                            <defs>
                                <linearGradient id="degreeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#8b5cf6" />
                                    <stop offset="100%" stopColor="#a855f7" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 font-mono leading-none">
                                {Math.round(progressPercent)}%
                            </span>
                            <div className="text-[10px] font-mono text-slate-500 dark:text-slate-400 mt-0.5">
                                <span className="font-semibold text-slate-700 dark:text-slate-300">{earnedCredits}</span>
                                <span className="text-slate-400 mx-0.5">/</span>
                                <span>{requiredCredits}</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-sans tracking-wide">
                                {isTH ? 'หน่วยกิต' : 'credits'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: 2 Stacked Blocks (Upper: Earned, Lower: Registered + Remaining) */}
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Upper Block: Earned credits (Main highlight) */}
                    <div className="flex items-center justify-between bg-violet-50/60 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/40 rounded-xl p-2.5 transition-colors">
                        <div className="flex items-center gap-2 min-w-0">
                            <CheckCircle className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                            <div>
                                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 block leading-tight">
                                    {isTH ? 'หน่วยกิตสะสมที่ผ่าน' : 'Earned Credits'}
                                </span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                                    {isTH ? 'สำเร็จเรียบร้อยแล้ว' : 'Completed'}
                                </span>
                            </div>
                        </div>
                        <span className="text-base font-extrabold font-mono text-violet-600 dark:text-violet-400 shrink-0 ml-2">
                            {earnedCredits}
                        </span>
                    </div>

                    {/* Lower Block: 2 Sub-metrics (Registered & Remaining) */}
                    <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-2 px-2.5 transition-colors">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">{isTH ? 'ลงทะเบียน' : 'Registered'}</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-blue-600 dark:text-blue-400 shrink-0">{registeredCredits}</span>
                        </div>
                        <div className="flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/80 rounded-xl py-2 px-2.5 transition-colors">
                            <div className="flex items-center gap-1.5 min-w-0">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="text-[11px] text-slate-600 dark:text-slate-400 font-medium truncate">{isTH ? 'คงเหลือ' : 'Remaining'}</span>
                            </div>
                            <span className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 shrink-0">{remainingCredits}</span>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
