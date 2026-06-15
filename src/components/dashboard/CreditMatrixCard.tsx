import React, { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Search, BookOpen, CheckCircle2, Clock, AlertCircle,
    BookMarked, ChevronRight, X, ListChecks, Zap,
} from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

type ColKey = 'completed' | 'inProgress' | 'remaining';
type RowKey = 'required' | 'ge' | 'free';

export interface CurriculumCourse {
    id: string;
    code: string;
    nameTH: string;
    nameEN: string;
    credits: number;
    year: number;
    semester: number;
    category: RowKey;
    status: ColKey;
    grade?: string;
    prerequisites: string[];
    description: string;
}

// Default to an empty curriculum so the UI never invents academic progress when live data is unavailable.
const CURRICULUM: CurriculumCourse[] = [];

const GPAX_VALUE = 0;

// ─── Category Colors ─────────────────────────────────────────────────────────
const STATUS_CONFIG: Record<ColKey, { labelTH: string; labelEN: string; icon: React.ReactNode; color: string; barColor: string; darkColor: string }> = {
    completed: {
        labelTH: 'สำเร็จแล้ว',
        labelEN: 'Completed',
        icon: <CheckCircle2 className="w-4 h-4" />,
        color: 'text-emerald-600 dark:text-emerald-400',
        barColor: 'bg-emerald-500 dark:bg-emerald-600',
        darkColor: 'dark:bg-emerald-950 dark:border-emerald-800',
    },
    inProgress: {
        labelTH: 'กำลังเรียน',
        labelEN: 'In Progress',
        icon: <Clock className="w-4 h-4" />,
        color: 'text-blue-600 dark:text-blue-400',
        barColor: 'bg-blue-500 dark:bg-blue-600',
        darkColor: 'dark:bg-blue-950 dark:border-blue-800',
    },
    remaining: {
        labelTH: 'ยังไม่ได้เรียน',
        labelEN: 'Remaining',
        icon: <BookOpen className="w-4 h-4" />,
        color: 'text-slate-500 dark:text-slate-400',
        barColor: 'bg-slate-400 dark:bg-slate-600',
        darkColor: 'dark:bg-slate-900 dark:border-slate-700',
    },
};

const CATEGORY_CONFIG: Record<RowKey, { labelTH: string; labelEN: string; icon: React.ReactNode; color: string; bgColor: string }> = {
    required: {
        labelTH: 'วิชาบังคับ',
        labelEN: 'Required',
        icon: <Zap className="w-5 h-5" />,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    },
    ge: {
        labelTH: 'GE คณะ',
        labelEN: 'Faculty GE',
        icon: <BookMarked className="w-5 h-5" />,
        color: 'text-purple-600 dark:text-purple-400',
        bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    },
    free: {
        labelTH: 'ตัวฟรี',
        labelEN: 'Free Elective',
        icon: <BookOpen className="w-5 h-5" />,
        color: 'text-teal-600 dark:text-teal-400',
        bgColor: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800',
    },
};

const CATEGORY_TOTALS: Record<RowKey, number> = {
    required: 72,
    ge: 9,
    free: 6,
};

interface CreditMatrixCardProps {
    courses?: CurriculumCourse[];
    categoryTotals?: Partial<Record<RowKey, number>>;
    gpax?: number;
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function CreditMatrixCard({ courses, categoryTotals, gpax }: CreditMatrixCardProps = {}) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    const curriculum = useMemo(() => (courses ? courses : CURRICULUM), [courses]);
    const totals = useMemo(() => ({ ...CATEGORY_TOTALS, ...categoryTotals }), [categoryTotals]);
    const gpaxValue = gpax ?? GPAX_VALUE;

    const [sheetOpen, setSheetOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<RowKey | null>(null);
    const [search, setSearch] = useState('');
    const [yearFilter, setYearFilter] = useState<number | 'all'>('all');
    const [listTab, setListTab] = useState<'all' | 'completed' | 'inProgress' | 'remaining'>('all');
    const [planned, setPlanned] = useState<Set<string>>(() => new Set());

    // Calculate matrix data
    const matrix = useMemo(() => {
        const counts = {} as Record<RowKey, Record<ColKey, number>>;
        (Object.keys(totals) as RowKey[]).forEach(cat => {
            counts[cat] = { completed: 0, inProgress: 0, remaining: 0 };
        });
        curriculum.forEach(c => {
            counts[c.category][c.status] += c.credits;
        });
        return counts;
    }, [curriculum, totals]);

    const totalEarned = curriculum.filter(c => c.status === 'completed').reduce((s, c) => s + c.credits, 0);
    const totalOngoing = curriculum.filter(c => c.status === 'inProgress').reduce((s, c) => s + c.credits, 0);
    const totalRequired = Object.values(totals).reduce((s, v) => s + v, 0);
    const totalRemaining = Math.max(0, totalRequired - totalEarned - totalOngoing);
    const completionPct = totalRequired > 0 ? Math.round((totalEarned / totalRequired) * 100) : 0;

    // Sheet course filtering
    const sheetCourses = useMemo(() => {
        let filtered = selectedCategory
            ? curriculum.filter(c => c.category === selectedCategory)
            : curriculum;

        if (yearFilter !== 'all') {
            filtered = filtered.filter(c => c.year === yearFilter);
        }

        if (search.trim()) {
            const q = search.toLowerCase();
            filtered = filtered.filter(c =>
                c.code.toLowerCase().includes(q) ||
                c.nameTH.toLowerCase().includes(q) ||
                c.nameEN.toLowerCase().includes(q)
            );
        }

        if (listTab === 'completed') {
            filtered = filtered.filter(c => c.status === 'completed');
        } else if (listTab === 'inProgress') {
            filtered = filtered.filter(c => c.status === 'inProgress');
        } else if (listTab === 'remaining') {
            filtered = filtered.filter(c => c.status === 'remaining');
        }

        return filtered;
    }, [curriculum, selectedCategory, yearFilter, search, listTab]);

    const sheetCredits = sheetCourses.reduce((s, c) => s + c.credits, 0);

    const coursesByYearAndSemester = useMemo(() => {
        const map: Record<number, Record<number, typeof sheetCourses>> = {};
        sheetCourses.forEach(c => {
            if (!map[c.year]) map[c.year] = {};
            if (!map[c.year][c.semester]) map[c.year][c.semester] = [];
            map[c.year][c.semester].push(c);
        });
        return Object.entries(map)
            .sort(([a], [b]) => Number(a) - Number(b))
            .map(([year, semestersMap]) => ({
                year: Number(year),
                semesters: Object.entries(semestersMap)
                    .sort(([a], [b]) => Number(a) - Number(b))
                    .map(([semester, courses]) => ({
                        semester: Number(semester),
                        courses
                    }))
            }));
    }, [sheetCourses]);

    const openCategory = useCallback((category: RowKey) => {
        setSelectedCategory(category);
        setSearch('');
        setYearFilter('all');
        setListTab('all');
        setSheetOpen(true);
    }, []);

    const togglePlanned = useCallback((id: string) => {
        setPlanned(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) {
                newSet.delete(id);
            } else {
                newSet.add(id);
            }
            return newSet;
        });
    }, []);

    // Simple progress bar component
    const ProgressBar = ({ completed, inProgress, remaining, total }: { completed: number; inProgress: number; remaining: number; total: number }) => {
        const completedPct = (completed / total) * 100;
        const inProgressPct = (inProgress / total) * 100;
        return (
            <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 dark:bg-slate-700 gap-0">
                {completedPct > 0 && (
                    <div
                        className="bg-emerald-500 dark:bg-emerald-600 transition-all duration-500"
                        style={{ width: `${completedPct}%` }}
                    />
                )}
                {inProgressPct > 0 && (
                    <div
                        className="bg-blue-500 dark:bg-blue-600 transition-all duration-500"
                        style={{ width: `${inProgressPct}%` }}
                    />
                )}
                {completedPct + inProgressPct < 100 && (
                    <div className="bg-slate-300 dark:bg-slate-600 flex-1" />
                )}
            </div>
        );
    };

    return (
        <>
            {/* ═══ MAIN CARD ══════════════════════════════════════════════════════════════ */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full bg-white dark:bg-slate-900 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 dark:border-slate-800 rounded-2xl shadow-sm dark:shadow-xl p-6 md:p-8"
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between gap-4 mb-8">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">
                            {isTH ? 'ความก้าวหน้าหลักสูตร' : 'Curriculum Progress'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isTH ? 'ติดตามความก้าวหน้าหน่วยกิตของคุณ' : 'Track your credit progress'}
                        </p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => {
                            setSelectedCategory(null);
                            setSearch('');
                            setYearFilter('all');
                            setListTab('all');
                            setSheetOpen(true);
                        }}
                        className="shrink-0 gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white"
                    >
                        <ListChecks className="w-4 h-4" />
                        <span className="hidden sm:inline">{isTH ? 'ดูรายวิชาทั้งหมด' : 'View All Courses'}</span>
                    </Button>
                </div>

                {/* ── Overall Stats ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
                    {[
                        {
                            label: isTH ? 'สำเร็จแล้ว' : 'Completed',
                            value: totalEarned,
                            color: 'text-emerald-600 dark:text-emerald-400',
                            bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
                            icon: <CheckCircle2 className="w-5 h-5" />,
                        },
                        {
                            label: isTH ? 'กำลังเรียน' : 'In Progress',
                            value: totalOngoing,
                            color: 'text-blue-600 dark:text-blue-400',
                            bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
                            icon: <Clock className="w-5 h-5" />,
                        },
                        {
                            label: isTH ? 'คงเหลือ' : 'Remaining',
                            value: totalRemaining,
                            color: 'text-slate-600 dark:text-slate-400',
                            bg: 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700 dark:border-slate-700',
                            icon: <BookOpen className="w-5 h-5" />,
                        },
                        {
                            label: isTH ? 'ความสำเร็จ' : 'Completion',
                            value: `${completionPct}%`,
                            color: 'text-indigo-600 dark:text-indigo-400',
                            bg: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
                            icon: <Zap className="w-5 h-5" />,
                        },
                    ].map((stat, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.1 }}
                            className={`${stat.bg} border rounded-xl p-4 flex flex-col items-start gap-2`}
                        >
                            <div className={`${stat.color}`}>{stat.icon}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{stat.label}</div>
                            <div className={`text-xl font-bold ${stat.color}`}>{stat.value}</div>
                        </motion.div>
                    ))}
                </div>

                {/* ── Category Cards ── */}
                <div className="space-y-4">
                    {(Object.keys(totals) as RowKey[]).map((category, idx) => {
                        const total = totals[category];
                        const completed = matrix[category].completed;
                        const inProgress = matrix[category].inProgress;
                        const remaining = matrix[category].remaining;
                        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                        const config = CATEGORY_CONFIG[category];

                        return (
                            <motion.button
                                key={category}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + idx * 0.1 }}
                                onClick={() => openCategory(category)}
                                className={`${config.bgColor} border w-full rounded-xl p-5 text-left transition-all hover:shadow-md hover:-translate-y-1`}
                            >
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3 mb-4">
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className={`p-2.5 rounded-lg ${config.color} bg-white dark:bg-slate-900 dark:bg-slate-800/50`}>
                                            {config.icon}
                                        </div>
                                        <div>
                                            <h3 className="font-semibold text-slate-900 dark:text-white dark:text-white">
                                                {isTH ? config.labelTH : config.labelEN}
                                            </h3>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                {isTH ? `${total} หน่วยกิต` : `${total} credits`}
                                            </p>
                                        </div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-slate-400 dark:text-slate-600 shrink-0" />
                                </div>

                                {/* Progress bar */}
                                <div className="mb-4">
                                    <ProgressBar completed={completed} inProgress={inProgress} remaining={remaining} total={total} />
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">{completed}</span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{isTH ? 'สำเร็จ' : 'Done'}</span>
                                    </div>
                                    <div className="flex flex-col border-l border-r border-slate-200 dark:border-slate-700 px-2">
                                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{inProgress}</span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{isTH ? 'เรียน' : 'Progress'}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">{remaining}</span>
                                        <span className="text-[11px] text-slate-500 dark:text-slate-400">{isTH ? 'เหลือ' : 'Left'}</span>
                                    </div>
                                </div>
                            </motion.button>
                        );
                    })}
                </div>

                {/* ── GPAX Section ── */}
                <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{isTH ? 'คะแนนเฉลี่ย' : 'GPA'}</p>
                            <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">{gpaxValue.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                            <Badge className="bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800">
                                {gpaxValue >= 3.5 ? '🏆 Distinction' : gpaxValue >= 3.0 ? '⭐ Excellent' : '✅ Good'}
                            </Badge>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">/ 4.00</p>
                        </div>
                    </div>
                </div>
            </motion.div>

            {/* ═══ DETAIL SHEET ═══════════════════════════════════════════════════════════ */}
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 bg-white dark:bg-slate-900 dark:bg-slate-950 border-l border-slate-200 dark:border-slate-700 dark:border-slate-800">
                    {/* Sheet Header */}
                    <SheetHeader className="px-6 py-5 border-b border-slate-200 dark:border-slate-700 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 dark:bg-slate-950">
                        <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white dark:text-white">
                            {selectedCategory ? (isTH ? CATEGORY_CONFIG[selectedCategory].labelTH : CATEGORY_CONFIG[selectedCategory].labelEN) : (isTH ? 'หลักสูตรทั้งหมด' : 'Full Curriculum')}
                        </SheetTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {sheetCourses.length} {isTH ? 'วิชา' : 'courses'} · {sheetCredits} {isTH ? 'หน่วยกิต' : 'credits'}
                        </p>
                    </SheetHeader>

                    {/* Filters */}
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 dark:bg-slate-950 space-y-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder={isTH ? 'ค้นหารหัส / ชื่อวิชา...' : 'Search code / name...'}
                                className="pl-10 rounded-lg bg-slate-50 dark:bg-slate-950 dark:bg-slate-900 border-slate-200 dark:border-slate-700 dark:border-slate-800 focus:bg-white dark:focus:bg-slate-800"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 dark:text-slate-300"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>

                        {/* Year Filter */}
                        <div className="flex gap-2 flex-wrap">
                            {(['all', 1, 2, 3, 4] as const).map(year => (
                                <button
                                    key={year}
                                    onClick={() => setYearFilter(year)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                        yearFilter === year
                                            ? 'bg-blue-600 dark:bg-blue-700 text-white'
                                            : 'bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-blue-50 dark:hover:bg-blue-950 hover:text-blue-600 dark:hover:text-blue-400'
                                    }`}
                                >
                                    {year === 'all' ? (isTH ? 'ทั้งหมด' : 'All') : (isTH ? `ปีที่ ${year}` : `Year ${year}`)}
                                </button>
                            ))}
                        </div>

                        {/* Status Filter */}
                        <Tabs value={listTab} onValueChange={v => setListTab(v as typeof listTab)}>
                            <TabsList className="w-full grid grid-cols-4 p-1 bg-slate-100 dark:bg-slate-800 dark:bg-slate-900 h-9 rounded-lg">
                                <TabsTrigger value="all" className="text-xs rounded data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:bg-slate-900">
                                    {isTH ? 'ทั้งหมด' : 'All'}
                                </TabsTrigger>
                                <TabsTrigger value="completed" className="text-xs rounded data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:bg-slate-900">
                                    {isTH ? 'สำเร็จ' : 'Done'}
                                </TabsTrigger>
                                <TabsTrigger value="inProgress" className="text-xs rounded data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:bg-slate-900">
                                    {isTH ? 'เรียน' : 'Progress'}
                                </TabsTrigger>
                                <TabsTrigger value="remaining" className="text-xs rounded data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 dark:bg-slate-900">
                                    {isTH ? 'เหลือ' : 'Left'}
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>

                    {/* Course List */}
                    <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-950 dark:bg-slate-900/50">
                        {sheetCourses.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600 gap-3">
                                <BookOpen className="w-12 h-12 opacity-20" />
                                <p className="text-sm">{isTH ? 'ไม่พบรายวิชา' : 'No courses found'}</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {coursesByYearAndSemester.map(({ year, semesters }) => {
                                    const yearCompleted = semesters.flatMap(s => s.courses).filter(c => c.status === 'completed').reduce((s, c) => s + c.credits, 0);
                                    const yearTotal = semesters.flatMap(s => s.courses).reduce((s, c) => s + c.credits, 0);

                                    return (
                                        <div key={year} className="mb-6 bg-slate-100/30 dark:bg-slate-800/20 rounded-xl p-4 sm:p-5 border border-slate-200/60 dark:border-slate-800/60 backdrop-blur-sm shadow-sm relative">
                                            {/* Year Header */}
                                            <div className="flex items-center justify-between gap-3 mb-5 border-b border-slate-200/80 dark:border-slate-700/50 pb-3">
                                                <div className="flex items-center gap-3">
                                                    <Badge className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-sm font-bold shadow-sm px-3 py-1">
                                                        {isTH ? `ปีที่ ${year}` : `Year ${year}`}
                                                    </Badge>
                                                    <span className="text-sm font-medium text-slate-500 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 px-2 py-0.5 rounded-md">
                                                        {yearCompleted} / {yearTotal} {isTH ? 'หน่วยกิต' : 'cr.'}
                                                    </span>
                                                </div>
                                                <span className="text-xs font-semibold text-slate-400 dark:text-slate-500">
                                                    {semesters.flatMap(s => s.courses).length} {isTH ? 'วิชา' : 'courses'}
                                                </span>
                                            </div>

                                            {/* Semesters */}
                                            <div className="space-y-6">
                                                {semesters.map(({ semester, courses }) => (
                                                    <div key={semester} className="space-y-3 pl-1 sm:pl-2">
                                                        {/* Semester Header */}
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="h-4 w-1 bg-indigo-500/70 dark:bg-indigo-400/70 rounded-full" />
                                                            <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                                                {isTH ? `ภาคการศึกษาที่ ${semester}` : `Semester ${semester}`}
                                                            </h5>
                                                        </div>

                                                        {/* Courses */}
                                                        <div className="grid gap-3 pl-3 border-l-2 border-indigo-500/10 dark:border-indigo-400/10">
                                                            {courses.map((course, idx) => {
                                                                const statusConfig = STATUS_CONFIG[course.status];

                                                                return (
                                                                    <motion.div
                                                                        key={course.id}
                                                                        initial={{ opacity: 0, x: -10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: idx * 0.05 }}
                                                                        className={`bg-white dark:bg-slate-900 border-l-4 border border-slate-100 dark:border-slate-800 rounded-xl p-4 transition-all hover:shadow-md cursor-pointer group`}
                                                                        style={{
                                                                            borderLeftColor:
                                                                                course.status === 'completed'
                                                                                    ? '#10b981'
                                                                                    : course.status === 'inProgress'
                                                                                        ? '#3b82f6'
                                                                                        : '#cbd5e1',
                                                                        }}
                                                                    >
                                                                        <div className="flex items-start justify-between gap-3 mb-3">
                                                                            <div className="flex-1">
                                                                                <div className="flex items-center gap-2 mb-1.5">
                                                                                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-100 dark:border-indigo-900/50">
                                                                                        {course.code}
                                                                                    </span>
                                                                                    {course.grade && (
                                                                                        <Badge className={`text-xs font-bold ${course.grade.startsWith('A') ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800'}`}>
                                                                                            {course.grade}
                                                                                        </Badge>
                                                                                    )}
                                                                                </div>
                                                                                <h4 className="font-semibold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                                                    {isTH ? course.nameTH : course.nameEN}
                                                                                </h4>
                                                                            </div>
                                                                            <div className="text-right shrink-0 bg-slate-50 dark:bg-slate-800 rounded-lg p-2 border border-slate-100 dark:border-slate-700/50">
                                                                                <div className="text-sm font-bold text-slate-900 dark:text-white leading-none mb-1">
                                                                                    {course.credits}
                                                                                </div>
                                                                                <div className="text-[10px] uppercase font-bold text-slate-400 dark:text-slate-500 leading-none">
                                                                                    {isTH ? 'หน่วยกิต' : 'CR.'}
                                                                                </div>
                                                                            </div>
                                                                        </div>

                                                                        {/* Status and Category Badges */}
                                                                        <div className="flex flex-wrap items-center gap-2 mt-2">
                                                                            <Badge className={`text-[10px] px-1.5 py-0 ${statusConfig.color.includes('emerald') ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50' : statusConfig.color.includes('blue') ? 'bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800/50' : 'bg-slate-50 dark:bg-slate-800/50 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700'} font-medium`}>
                                                                                {statusConfig.icon}
                                                                                <span className="ml-1">{isTH ? statusConfig.labelTH : statusConfig.labelEN}</span>
                                                                            </Badge>
                                                                            {selectedCategory || (
                                                                                <Badge className="text-[10px] px-1.5 py-0 bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-medium">
                                                                                    {isTH ? CATEGORY_CONFIG[course.category].labelTH : CATEGORY_CONFIG[course.category].labelEN}
                                                                                </Badge>
                                                                            )}
                                                                        </div>

                                                                        {/* Description */}
                                                                        {course.description && (
                                                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 line-clamp-1 border-t border-slate-100 dark:border-slate-800 pt-2">
                                                                                {course.description}
                                                                            </p>
                                                                        )}
                                                                    </motion.div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </ScrollArea>

                    {/* Sheet Footer */}
                    <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 dark:border-slate-800 bg-white dark:bg-slate-900 dark:bg-slate-950 shrink-0">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">
                                {sheetCourses.length} {isTH ? 'วิชา' : 'courses'}
                            </span>
                            <span className="font-semibold text-slate-900 dark:text-white dark:text-white">
                                {sheetCredits} {isTH ? 'หน่วยกิต' : 'credits'}
                            </span>
                        </div>
                    </div>
                </SheetContent>
            </Sheet>
        </>
    );
}
