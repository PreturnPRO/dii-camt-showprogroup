import { useMemo, useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { GraduationCap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

interface CourseStatusRingCardProps {
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
}: CourseStatusRingCardProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    const containerRef = useRef<HTMLDivElement>(null);
    const [isWide, setIsWide] = useState(false);

    useEffect(() => {
        const el = containerRef.current;
        if (!el) return;
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                // If container is narrower than 460px, keep ring on top and boxes on bottom
                setIsWide(entry.contentRect.width >= 460);
            }
        });
        observer.observe(el);
        return () => observer.disconnect();
    }, []);

    const totalCount = completedCount + inProgressCount + registeredCount + remainingCount;
    const totalCredits = completedCredits + inProgressCredits + registeredCredits + remainingCredits;

    const segments = useMemo(() => [
        {
            label: isTH ? 'สำเร็จแล้ว' : 'Completed',
            count: completedCount,
            credits: completedCredits,
            color: '#10b981', // emerald-500
            bgClass: 'bg-emerald-50/70 dark:bg-emerald-950/30',
            borderClass: 'border-emerald-200/60 dark:border-emerald-800/50',
            textClass: 'text-emerald-700 dark:text-emerald-300',
            dotClass: 'bg-emerald-500',
            tooltipDesc: isTH ? 'รายวิชาที่เรียนจบและได้เกรดแล้ว' : 'Courses completed and graded',
        },
        {
            label: isTH ? 'กำลังศึกษา' : 'In Progress',
            count: inProgressCount,
            credits: inProgressCredits,
            color: '#3b82f6', // blue-500
            bgClass: 'bg-blue-50/70 dark:bg-blue-950/30',
            borderClass: 'border-blue-200/60 dark:border-blue-800/50',
            textClass: 'text-blue-700 dark:text-blue-300',
            dotClass: 'bg-blue-500',
            tooltipDesc: isTH ? 'รายวิชาที่กำลังศึกษาในภาคการศึกษานี้' : 'Courses currently taking this semester',
        },
        {
            label: isTH ? 'ต้องลงทะเบียน' : 'Must Register',
            count: registeredCount,
            credits: registeredCredits,
            color: '#f59e0b', // amber-500
            bgClass: 'bg-amber-50/70 dark:bg-amber-950/30',
            borderClass: 'border-amber-200/60 dark:border-amber-800/50',
            textClass: 'text-amber-700 dark:text-amber-300',
            dotClass: 'bg-amber-500',
            tooltipDesc: isTH ? 'รายวิชาที่ต้องลงทะเบียนตามแผนหลักสูตร' : 'Mandatory courses required by curriculum',
        },
        {
            label: isTH ? 'ยังไม่สามารถลงได้' : 'Not Registered',
            count: remainingCount,
            credits: remainingCredits,
            color: '#94a3b8', // slate-400
            bgClass: 'bg-slate-50/70 dark:bg-slate-800/40',
            borderClass: 'border-slate-200/60 dark:border-slate-700/50',
            textClass: 'text-slate-700 dark:text-slate-300',
            dotClass: 'bg-slate-400',
            tooltipDesc: isTH ? 'รายวิชาที่ยังไม่ถึงเทอมหรือติดเงื่อนไขวิชาบังคับก่อน' : 'Courses locked or awaiting prerequisites',
        },
    ], [isTH, completedCount, completedCredits, inProgressCount, inProgressCredits, registeredCount, registeredCredits, remainingCount, remainingCredits]);

    // SVG donut calculations (size 140x140, r=56, circumference ~351.86)
    const radius = 56;
    const circumference = 2 * Math.PI * radius;
    const activeSegments = segments.filter(s => s.count > 0);
    const hasMultipleSegments = activeSegments.length > 1;
    const gap = hasMultipleSegments ? 4 : 0;
    const totalGaps = activeSegments.length * gap;
    const availableAngle = 360 - totalGaps;

    let currentOffset = 0;
    const ringSegments = totalCount === 0
        ? []
        : segments.map(seg => {
            if (seg.count === 0) return { ...seg, dash: 0, offset: 0, angle: 0 };
            const angle = (seg.count / totalCount) * availableAngle;
            const dash = (angle / 360) * circumference;
            const offset = circumference - (currentOffset / 360) * circumference;
            currentOffset += angle + gap;
            return { ...seg, dash, offset, angle };
        });

    const completedPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-sm h-full flex flex-col justify-between"
        >
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                    <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                        {isTH ? 'สถานะรายวิชา' : 'Course Status'}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                        {isTH ? `ทั้งหมด ${totalCount} วิชา (${totalCredits} หน่วยกิต)` : `${totalCount} courses (${totalCredits} credits)`}
                    </p>
                </div>
            </div>

            {/* Layout: When card is narrower than 460px -> Ring on top, 4 boxes on bottom! */}
            <div className={`flex items-center gap-5 sm:gap-6 flex-1 ${isWide ? 'flex-row' : 'flex-col'}`}>
                {/* Progress Ring (At least 140px, centered with comfortable spacing) */}
                <div className="w-[140px] h-[140px] flex items-center justify-center shrink-0">
                    <div className="relative w-[140px] h-[140px] flex items-center justify-center">
                        <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-90">
                            {/* Background ring */}
                            <circle
                                cx="70" cy="70" r={radius}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="10"
                                className="text-slate-100 dark:text-slate-800/80"
                            />
                            {/* Colored segments */}
                            {ringSegments.map((seg, i) => {
                                if (seg.dash <= 0) return null;
                                return (
                                    <motion.circle
                                        key={i}
                                        cx="70" cy="70" r={radius}
                                        fill="none"
                                        stroke={seg.color}
                                        strokeWidth="10"
                                        strokeLinecap="round"
                                        strokeDasharray={`${seg.dash} ${circumference - seg.dash}`}
                                        initial={{ strokeDashoffset: circumference }}
                                        animate={{ strokeDashoffset: seg.offset }}
                                        transition={{ duration: 1.2, delay: i * 0.12, ease: 'easeOut' }}
                                    />
                                );
                            })}
                        </svg>

                        {/* Center Percentage & Completed Info (Zero Text Collision) */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none px-1">
                            <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-50 font-mono leading-none">
                                {completedPct}%
                            </span>
                            <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-300 mt-1 leading-tight">
                                {completedCount}/{totalCount} {isTH ? 'วิชาสำเร็จ' : 'completed'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Status Boxes in grid-cols-2 with full width and no cramped labels */}
                <TooltipProvider delayDuration={100}>
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 flex-1 w-full min-w-0">
                        {segments.map((seg, i) => (
                            <Tooltip key={i}>
                                <TooltipTrigger asChild>
                                    <div
                                        className={`flex flex-col justify-between rounded-xl p-3 min-w-0 border ${seg.bgClass} ${seg.borderClass} hover:shadow-xs transition-all cursor-default`}
                                    >
                                        {/* Top row: Dot + Label */}
                                        <div className="flex items-center gap-2 mb-1.5 min-w-0">
                                            <div
                                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${seg.dotClass}`}
                                                style={{ backgroundColor: seg.color }}
                                            />
                                            <span className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 whitespace-normal break-words leading-tight">
                                                {seg.label}
                                            </span>
                                        </div>

                                        {/* Bottom row: Number + (credits) */}
                                        <div className="flex items-baseline gap-1.5 flex-wrap">
                                            <span className={`text-xl sm:text-2xl font-bold font-mono ${seg.textClass}`}>
                                                {seg.count}
                                            </span>
                                            <span className="text-xs text-slate-500 dark:text-slate-400 font-sans">
                                                ({seg.credits} {isTH ? 'นก.' : 'cr'})
                                            </span>
                                        </div>
                                    </div>
                                </TooltipTrigger>
                                <TooltipContent
                                    side="top"
                                    className="bg-slate-900 text-slate-100 text-xs px-3 py-1.5 rounded-lg border border-slate-700 shadow-xl"
                                >
                                    <p className="font-semibold">{seg.label}: {seg.count} วิชา ({seg.credits} หน่วยกิต)</p>
                                    <p className="text-[11px] text-slate-400 mt-0.5">{seg.tooltipDesc}</p>
                                </TooltipContent>
                            </Tooltip>
                        ))}
                    </div>
                </TooltipProvider>
            </div>
        </motion.div>
    );
}
