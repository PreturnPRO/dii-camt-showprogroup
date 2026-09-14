import React from 'react';
import { motion } from 'framer-motion';
import { GraduationCap, CheckCircle2, Clock, BookOpen, AlertCircle } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

interface CourseStatusRingProps {
    completedCount: number;
    inProgressCount: number;
    registeredCount: number;
    remainingCount: number;
    completedCredits: number;
    inProgressCredits: number;
    registeredCredits: number;
    remainingCredits: number;
}

export function CourseStatusRingCard({
    completedCount,
    inProgressCount,
    registeredCount,
    remainingCount,
    completedCredits,
    inProgressCredits,
    registeredCredits,
    remainingCredits,
}: CourseStatusRingProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';

    const totalCount = completedCount + inProgressCount + registeredCount + remainingCount;
    const totalCredits = completedCredits + inProgressCredits + registeredCredits + remainingCredits;

    // Segments for multi-ring chart
    const segments = [
        {
            label: isTH ? 'เก็บเกรดแล้ว' : 'Graded',
            count: completedCount,
            credits: completedCredits,
            color: '#10b981', // emerald-500
            icon: <CheckCircle2 className="w-3.5 h-3.5" />,
            bgClass: 'bg-emerald-50 dark:bg-emerald-950/40',
            textClass: 'text-emerald-600 dark:text-emerald-400',
            borderClass: 'border-emerald-200/60 dark:border-emerald-800/60',
        },
        {
            label: isTH ? 'กำลังเก็บเกรด' : 'In Progress',
            count: inProgressCount,
            credits: inProgressCredits,
            color: '#3b82f6', // blue-500
            icon: <Clock className="w-3.5 h-3.5" />,
            bgClass: 'bg-blue-50 dark:bg-blue-950/40',
            textClass: 'text-blue-600 dark:text-blue-400',
            borderClass: 'border-blue-200/60 dark:border-blue-800/60',
        },
        {
            label: isTH ? 'ต้องลงทะเบียน' : 'Must Register',
            count: registeredCount,
            credits: registeredCredits,
            color: '#f59e0b', // amber-500
            icon: <AlertCircle className="w-3.5 h-3.5" />,
            bgClass: 'bg-amber-50 dark:bg-amber-950/40',
            textClass: 'text-amber-600 dark:text-amber-400',
            borderClass: 'border-amber-200/60 dark:border-amber-800/60',
        },
        {
            label: isTH ? 'ยังไม่ลงทะเบียน' : 'Not Registered',
            count: remainingCount,
            credits: remainingCredits,
            color: '#94a3b8', // slate-400
            icon: <BookOpen className="w-3.5 h-3.5" />,
            bgClass: 'bg-slate-50 dark:bg-slate-800/60',
            textClass: 'text-slate-500 dark:text-slate-400',
            borderClass: 'border-slate-200/60 dark:border-slate-700/60',
        },
    ];

    // SVG donut ring with multiple segments
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const gap = totalCount > 0 ? 4 : 0; // gap between segments in degrees
    const totalGap = gap * segments.filter(s => s.count > 0).length;
    const availableAngle = 360 - totalGap;

    // Build segments with offsets
    let currentOffset = 0;
    const ringSegments = segments
        .filter(s => s.count > 0)
        .map((seg) => {
            const angle = (seg.count / totalCount) * availableAngle;
            const dash = (angle / 360) * circumference;
            const offset = circumference - (currentOffset / 360) * circumference;
            currentOffset += angle + gap;
            return { ...seg, dash, offset };
        });

    const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-4 shadow-sm h-full flex flex-col justify-between"
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                    <GraduationCap className="w-3.5 h-3.5" />
                </div>
                <div>
                    <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {isTH ? 'สถานะรายวิชา' : 'Course Status'}
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-mono">
                        {isTH ? `ทั้งหมด ${totalCount} วิชา (${totalCredits} หน่วยกิต)` : `${totalCount} courses (${totalCredits} credits)`}
                    </p>
                </div>
            </div>

            {/* Side-by-side: Ring on Left, 2 Blocks on Right */}
            <div className="flex items-center gap-4 flex-1">
                {/* Left: Ring (fixed width for perfect vertical alignment) */}
                <div className="w-[120px] flex items-center justify-center shrink-0">
                    <div className="relative flex items-center justify-center">
                        <svg width="104" height="104" className="-rotate-90">
                            {/* Background ring */}
                            <circle
                                cx="52" cy="52" r="40"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="8"
                                className="text-slate-100 dark:text-slate-800"
                            />
                            {/* Colored segments */}
                            {ringSegments.map((seg, i) => {
                                const segCircumference = 2 * Math.PI * 40;
                                const scaledDash = (seg.dash / circumference) * segCircumference;
                                const scaledOffset = (seg.offset / circumference) * segCircumference;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx="52" cy="52" r="40"
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        strokeDasharray={`${scaledDash} ${segCircumference - scaledDash}`}
                                        initial={{ strokeDashoffset: segCircumference }}
                                        animate={{ strokeDashoffset: scaledOffset }}
                                        transition={{ duration: 1.2, delay: i * 0.12, ease: 'easeOut' }}
                                    />
                                );
                            })}
                        </svg>
                        <div className="absolute flex flex-col items-center justify-center text-center">
                            <span className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 font-mono leading-none">
                                {completedPct}%
                            </span>
                            <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 mt-0.5">
                                {completedCount}/{totalCount}
                            </span>
                            <span className="text-[9px] text-slate-400 font-sans">
                                {isTH ? 'วิชาสำเร็จ' : 'completed'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Right: 2 Stacked Rows (Upper 2 items, Lower 2 items) */}
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                    {/* Row 1 (Upper Block): เก็บเกรดแล้ว & กำลังเก็บเกรด */}
                    <div className="grid grid-cols-2 gap-2">
                        {segments.slice(0, 2).map((seg, i) => (
                            <div
                                key={i}
                                className={`flex items-center justify-between rounded-xl py-2 px-2.5 border ${seg.bgClass} ${seg.borderClass} transition-colors`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: seg.color }}
                                    />
                                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate">
                                        {seg.label}
                                    </span>
                                </div>
                                <span className={`text-xs font-bold font-mono ${seg.textClass} shrink-0 ml-1.5`}>
                                    {seg.count} <span className="text-[9px] font-normal text-slate-400 font-sans">({seg.credits})</span>
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Row 2 (Lower Block): ต้องลงทะเบียน & ยังไม่ลงทะเบียน */}
                    <div className="grid grid-cols-2 gap-2">
                        {segments.slice(2, 4).map((seg, i) => (
                            <div
                                key={i + 2}
                                className={`flex items-center justify-between rounded-xl py-2 px-2.5 border ${seg.bgClass} ${seg.borderClass} transition-colors`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <div
                                        className="w-1.5 h-1.5 rounded-full shrink-0"
                                        style={{ backgroundColor: seg.color }}
                                    />
                                    <span className="text-[11px] text-slate-700 dark:text-slate-300 font-medium truncate">
                                        {seg.label}
                                    </span>
                                </div>
                                <span className={`text-xs font-bold font-mono ${seg.textClass} shrink-0 ml-1.5`}>
                                    {seg.count} <span className="text-[9px] font-normal text-slate-400 font-sans">({seg.credits})</span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
