import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, Clock, ListChecks, Search, X, Zap } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { creditProgress } from '@/lib/credit-progress';

/** server statuses from /students/stats curriculumProgress.courses */
export type CurriculumStatus = 'completed' | 'failed' | 'withdrawn' | 'incomplete' | 'inProgress' | 'notGraded';

export interface CurriculumCourse {
    id: string;
    code: string;
    nameTH: string;
    nameEN: string;
    credits: number;
    year: number;
    semester: number;
    status: CurriculumStatus;
    grade?: string;
}

const STATUS_LABEL: Record<CurriculumStatus, { th: string; en: string; className: string }> = {
    completed: { th: 'ผ่านแล้ว', en: 'Passed', className: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800' },
    inProgress: { th: 'กำลังเรียน', en: 'In progress', className: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800' },
    failed: { th: 'ไม่ผ่าน', en: 'Failed', className: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-800' },
    withdrawn: { th: 'ถอน (W)', en: 'Withdrawn (W)', className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
    incomplete: { th: 'ไม่สมบูรณ์ (I)', en: 'Incomplete (I)', className: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800' },
    notGraded: { th: 'ยังไม่มีเกรด', en: 'Not graded', className: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700' },
};

interface CreditMatrixCardProps {
    courses: CurriculumCourse[];
    /** null while stats are unavailable: shown as "-" */
    requiredCredits: number | null;
    completedCredits: number | null;
    inProgressCredits: number | null;
    /** the registrar figure stored on the profile (may include credits from before the system or transfers) */
    registrarEarnedCredits: number | null;
    gpax?: number;
}

/** credit progress against the whole curriculum; courses carry no category, so none is shown (audit M1) */
export function CreditMatrixCard({ courses, requiredCredits, completedCredits, inProgressCredits, registrarEarnedCredits, gpax }: CreditMatrixCardProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    const [sheetOpen, setSheetOpen] = useState(false);
    const [search, setSearch] = useState('');

    const progress = completedCredits !== null && inProgressCredits !== null
        ? creditProgress({ requiredCredits, completedCredits, inProgressCredits })
        : null;
    const unit = isTH ? 'หน่วยกิต' : 'credits';
    const show = (value: number | null | undefined) => (value === null || value === undefined ? '-' : String(value));

    const filtered = useMemo(() => {
        const q = search.trim().toLowerCase();
        return q ? courses.filter((c) => [c.code, c.nameTH, c.nameEN].some((v) => v.toLowerCase().includes(q))) : courses;
    }, [courses, search]);

    const byTerm = useMemo(() => {
        const map = new Map<string, { year: number; semester: number; courses: CurriculumCourse[] }>();
        for (const c of filtered) {
            const key = `${c.year}-${c.semester}`;
            if (!map.has(key)) map.set(key, { year: c.year, semester: c.semester, courses: [] });
            map.get(key)!.courses.push(c);
        }
        return Array.from(map.values()).sort((a, b) => a.year - b.year || a.semester - b.semester);
    }, [filtered]);

    const stats = [
        { id: 'completed', label: isTH ? 'ผ่านแล้ว' : 'Passed', value: show(progress?.completed), withUnit: true, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800', icon: <CheckCircle2 className="w-5 h-5" /> },
        { id: 'in-progress', label: isTH ? 'กำลังเรียน' : 'In progress', value: show(progress?.inProgress), withUnit: true, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800', icon: <Clock className="w-5 h-5" /> },
        { id: 'remaining', label: isTH ? 'คงเหลือ' : 'Remaining', value: show(progress?.remaining), withUnit: true, color: 'text-slate-600 dark:text-slate-300', bg: 'bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-700', icon: <BookOpen className="w-5 h-5" /> },
        { id: 'percent', label: isTH ? 'ผ่านแล้ว (ร้อยละ)' : 'Passed (%)', value: progress?.percent == null ? '-' : `${progress.percent}%`, withUnit: false, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800', icon: <Zap className="w-5 h-5" /> },
    ];

    return (
        <>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-6 md:p-8"
            >
                <div className="flex items-center justify-between gap-4 mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-1">{isTH ? 'ความก้าวหน้าหลักสูตร' : 'Curriculum Progress'}</h2>
                        <p data-testid="credits-required" className="text-sm text-slate-500 dark:text-slate-400">
                            {isTH ? `จากหลักสูตร ${show(requiredCredits)} หน่วยกิต` : `Out of a ${show(requiredCredits)}-credit curriculum`}
                        </p>
                        <p data-testid="credits-source" className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                            {isTH ? 'ตัวเลขด้านล่างนับจากรายวิชาในระบบ' : 'The figures below are counted from courses in the system'}
                        </p>
                    </div>
                    <Button size="sm" onClick={() => setSheetOpen(true)} className="shrink-0 gap-2 rounded-lg bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white">
                        <ListChecks className="w-4 h-4" />
                        <span className="hidden sm:inline">{isTH ? 'รายวิชาที่ลง' : 'My courses'}</span>
                    </Button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                    {stats.map((stat) => (
                        <div key={stat.id} data-testid={`credits-${stat.id}`} className={`${stat.bg} border rounded-xl p-4 flex flex-col items-start gap-2`}>
                            <div className={stat.color}>{stat.icon}</div>
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-medium">{stat.label}</div>
                            <div className={`text-xl font-bold ${stat.color}`}>
                                {stat.value}
                                {stat.withUnit && stat.value !== '-' && <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">{unit}</span>}
                            </div>
                        </div>
                    ))}
                </div>

                {progress && progress.percent !== null && requiredCredits && (
                    <div className="flex h-3 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800 mb-6" aria-hidden>
                        <div className="bg-emerald-500 dark:bg-emerald-600" style={{ width: `${progress.percent}%` }} />
                        <div className="bg-blue-500 dark:bg-blue-600" style={{ width: `${Math.min(100 - progress.percent, (progress.inProgress / requiredCredits) * 100)}%` }} />
                    </div>
                )}

                <p data-testid="credits-registrar" className="mb-6 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                    {isTH
                        ? `ตามทะเบียน: ผ่านแล้ว ${show(registrarEarnedCredits)} / ${show(requiredCredits)} หน่วยกิต (รวมหน่วยกิตที่ไม่ได้อยู่ในระบบ เช่น เทียบโอน)`
                        : `Registrar record: ${show(registrarEarnedCredits)} / ${show(requiredCredits)} credits passed (includes credits not in the system, such as transfers)`}
                </p>

                <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                    <p className="text-sm font-medium text-slate-600 dark:text-slate-400">GPAX</p>
                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                        {/* a stored 0 means no graded course yet, not a real 0.00 */}
                        {gpax === undefined || gpax <= 0 ? '-' : gpax.toFixed(2)}
                        <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">/ 4.00</span>
                    </p>
                </div>
            </motion.div>

            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
                <SheetContent side="right" className="w-full sm:max-w-2xl flex flex-col p-0 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800">
                    <SheetHeader className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <SheetTitle className="text-lg font-bold text-slate-900 dark:text-white">{isTH ? 'รายวิชาที่ลง' : 'My courses'}</SheetTitle>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            {filtered.length} {isTH ? 'วิชา' : 'courses'} · {filtered.reduce((s, c) => s + c.credits, 0)} {unit}
                        </p>
                    </SheetHeader>
                    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 shrink-0">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={isTH ? 'ค้นหารหัส / ชื่อวิชา...' : 'Search code / name...'} className="pl-10 rounded-lg" />
                            {search && (
                                <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" aria-label={isTH ? 'ล้าง' : 'Clear'}>
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    </div>
                    <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900/50">
                        {byTerm.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-3">
                                <BookOpen className="w-12 h-12 opacity-20" />
                                <p className="text-sm">{isTH ? 'ไม่พบรายวิชา' : 'No courses found'}</p>
                            </div>
                        ) : (
                            <div className="p-6 space-y-6">
                                {byTerm.map(({ year, semester, courses: termCourses }) => (
                                    <div key={`${year}-${semester}`} className="space-y-3">
                                        <h5 className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                            {isTH ? `ปีที่ ${year} ภาคการศึกษาที่ ${semester}` : `Year ${year}, semester ${semester}`}
                                        </h5>
                                        {termCourses.map((course) => {
                                            const label = STATUS_LABEL[course.status];
                                            return (
                                                <div key={course.id} className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-4">
                                                    <div className="min-w-0">
                                                        <div className="font-semibold text-slate-900 dark:text-white">{course.code}</div>
                                                        <div className="text-sm text-slate-500 dark:text-slate-400 truncate">{isTH ? course.nameTH : course.nameEN}</div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">{course.credits} {unit}</span>
                                                        {course.grade && <Badge variant="outline">{course.grade}</Badge>}
                                                        <Badge variant="outline" className={label.className}>{isTH ? label.th : label.en}</Badge>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </SheetContent>
            </Sheet>
        </>
    );
}
