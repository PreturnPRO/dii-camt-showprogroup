import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { BookOpen, ChevronDown, ChevronUp, Award } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface CourseGrade {
    courseId: string;
    courseCode: string;
    courseName: string;
    credits: number;
    letterGrade: string;
    semester: string;
    total?: number;
}

interface CourseGradesProps {
    grades: CourseGrade[];
    currentSemester: string;
}

const getGradeColor = (grade: string) => {
    if (grade === 'A') return 'bg-emerald-500 text-white';
    if (grade === 'B+') return 'bg-blue-500 text-white';
    if (grade === 'B') return 'bg-blue-400 text-white';
    if (grade === 'C+') return 'bg-orange-400 text-white';
    if (grade === 'C') return 'bg-orange-300 text-white';
    if (grade === 'D+' || grade === 'D') return 'bg-red-400 text-white';
    if (grade === 'F') return 'bg-red-600 text-white';
    return 'bg-slate-300 text-slate-700';
};

const getGradeBgColor = (grade: string) => {
    if (grade === 'A') return 'bg-emerald-50 border-emerald-100';
    if (grade.startsWith('B')) return 'bg-blue-50 border-blue-100';
    if (grade.startsWith('C')) return 'bg-orange-50 border-orange-100';
    return 'bg-slate-50 border-slate-100';
};

export function CourseGradesCard({ grades, currentSemester }: CourseGradesProps) {
    const [showAll, setShowAll] = useState(false);

    const currentSemesterGrades = grades.filter(g => g.semester === currentSemester);
    const previousSemesterGrades = grades.filter(g => g.semester !== currentSemester);

    const displayedPreviousGrades = showAll ? previousSemesterGrades : previousSemesterGrades.slice(0, 3);

    const totalAGrades = grades.filter(g => g.letterGrade === 'A').length;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                        <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">ผลการเรียนรายวิชา</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">เกรดและคะแนนสะสม</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-md">
                        <Award className="w-3.5 h-3.5 mr-1" />
                        {totalAGrades} วิชาเกรด A
                    </Badge>
                </div>
            </div>

            {/* Current Semester */}
            <div className="mb-6">
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    ภาคเรียนปัจจุบัน ({currentSemester})
                </h4>
                <div className="space-y-2">
                    {currentSemesterGrades.map((grade, index) => (
                        <motion.div
                            key={grade.courseId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`flex items-center justify-between p-4 rounded-2xl border ${getGradeBgColor(grade.letterGrade)}`}
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 text-xs border border-slate-100 dark:border-slate-700">
                                    {grade.courseCode.slice(-3)}
                                </div>
                                <div>
                                    <h5 className="font-semibold text-slate-800 dark:text-slate-200">{grade.courseCode}</h5>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 line-clamp-1">{grade.courseName}</p>
                                    <span className="text-xs text-slate-400">{grade.credits} หน่วยกิต</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                {grade.total && (
                                    <span className="text-sm text-slate-500 dark:text-slate-400">{grade.total} คะแนน</span>
                                )}
                                <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-lg font-bold shadow-sm ${getGradeColor(grade.letterGrade)}`}>
                                    {grade.letterGrade}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>

            {/* Previous Semesters */}
            {previousSemesterGrades.length > 0 && (
                <div>
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-slate-400" />
                        ภาคเรียนก่อนหน้า
                    </h4>

                    <AnimatePresence>
                        <div className="space-y-2">
                            {displayedPreviousGrades.map((grade, index) => (
                                <motion.div
                                    key={grade.courseId}
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-xs">
                                            {grade.courseCode.slice(-3)}
                                        </div>
                                        <div>
                                            <h5 className="font-medium text-slate-700 dark:text-slate-300 text-sm">{grade.courseCode}</h5>
                                            <p className="text-xs text-slate-500 dark:text-slate-400">{grade.semester} • {grade.credits} หน่วยกิต</p>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold shadow-sm ${getGradeColor(grade.letterGrade)}`}>
                                        {grade.letterGrade}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </AnimatePresence>

                    {previousSemesterGrades.length > 3 && (
                        <Button
                            variant="ghost"
                            onClick={() => setShowAll(!showAll)}
                            className="w-full mt-3 text-slate-500 dark:text-slate-400 hover:text-slate-700"
                        >
                            {showAll ? (
                                <>
                                    <ChevronUp className="w-4 h-4 mr-2" />
                                    แสดงน้อยลง
                                </>
                            ) : (
                                <>
                                    <ChevronDown className="w-4 h-4 mr-2" />
                                    ดูทั้งหมด ({previousSemesterGrades.length} วิชา)
                                </>
                            )}
                        </Button>
                    )}
                </div>
            )}
        </motion.div>
    );
}
