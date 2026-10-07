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
    const progressPercent = requiredCredits > 0 ? Math.min((earnedCredits / requiredCredits) * 100, 100) : 0;
    const remainingCredits = Math.max(requiredCredits - earnedCredits, 0);

    // SVG ring calculations (r=48, diameter=124)
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progressPercent / 100) * circumference;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm h-full flex flex-col justify-between"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/40 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                        {isTH ? 'ความก้าวหน้าของหลักสูตร' : 'Degree Progress'}
                    </h3>
                    <p data-testid="degree-source" className="text-sm leading-relaxed text-slate-500 dark:text-slate-400 mt-0.5">
                        {isTH ? `ตามทะเบียน · หลักสูตร ${requiredCredits} หน่วยกิต` : `Registrar record · ${requiredCredits}-credit curriculum`}
                    </p>
                </div>
            </div>

            {/* Content: Ring on Left, Metric cards on Right */}
            <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6 flex-1">
                {/* Left: Circular progress ring */}
                <div className="w-[130px] h-[130px] flex items-center justify-center shrink-0">
                    <div className="relative w-[124px] h-[124px] flex items-center justify-center">
                        <svg width="124" height="124" className="-rotate-90">
                            <circle
                                cx="62" cy="62" r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="9"
                                className="text-slate-100 dark:text-slate-800/80"
                            />
                            <motion.circle
                                cx="62" cy="62" r={radius}
                                fill="none"
                                stroke="url(#degreeGrad)"
                                strokeWidth="9"
                                strokeLinecap="round"
                                strokeDasharray={circumference}
                                initial={{ strokeDashoffset: circumference }}
                                animate={{ strokeDashoffset }}
                                transition={{ duration: 1.1, ease: 'easeOut' }}
                            />
                            <defs>
                                <linearGradient id="degreeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                                    <stop offset="0%" stopColor="#2563eb" />
                                    <stop offset="100%" stopColor="#3b82f6" />
                                </linearGradient>
                            </defs>
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1 select-none pointer-events-none">
                            <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-mono leading-none">
                                {Math.round(progressPercent)}%
                            </span>
                            <div className="text-xs font-mono font-medium text-slate-600 dark:text-slate-300 mt-1">
                                <span className="font-bold text-slate-800 dark:text-slate-100">{earnedCredits}</span>
                                <span className="text-slate-400 mx-0.5">/</span>
                                <span>{requiredCredits}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-sans tracking-wide">
                                {isTH ? 'หน่วยกิต' : 'credits'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: Stacked Cards (Earned on top, Registered & Remaining side-by-side without truncation) */}
                <div className="flex flex-col gap-2.5 flex-1 w-full min-w-0">
                    {/* Upper Block: Earned credits (Main highlight) */}
                    <div className="flex items-center justify-between bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-800/50 rounded-xl p-3 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0" />
                            <div>
                                <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block leading-tight">
                                    {isTH ? 'หน่วยกิตสะสมที่ผ่าน' : 'Earned Credits'}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                                    {isTH ? 'สำเร็จเรียบร้อยแล้ว' : 'Completed'}
                                </span>
                            </div>
                        </div>
                        <span className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 shrink-0 ml-2">
                            {earnedCredits}
                        </span>
                    </div>

                    {/* Lower Block: Registered & Remaining with Clean flex-col Layout (Zero Truncation!) */}
                    <div className="grid grid-cols-2 gap-2.5">
                        <div className="flex flex-col justify-between bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                                <Clock className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400 shrink-0" />
                                <span className="truncate">{isTH ? 'กำลังเรียน (ยังไม่มีเกรด)' : 'In progress (ungraded)'}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span data-testid="in-progress-credits" className="text-xl font-bold font-mono text-blue-600 dark:text-blue-400">{registeredCredits ?? '-'}</span>
                                <span className="text-xs text-slate-400 font-sans">{isTH ? 'นก.' : 'cr'}</span>
                            </div>
                        </div>

                        <div className="flex flex-col justify-between bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800 rounded-xl p-2.5 min-w-0">
                            <div className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium mb-1">
                                <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="truncate">{isTH ? 'คงเหลือ' : 'Remaining'}</span>
                            </div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold font-mono text-slate-800 dark:text-slate-200">{remainingCredits}</span>
                                <span className="text-xs text-slate-400 font-sans">{isTH ? 'นก.' : 'cr'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
