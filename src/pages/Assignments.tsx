import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    ClipboardList, Plus, Calendar, CheckCircle, Clock, AlertCircle,
    FileText, Users, Filter, Search, Upload, ChevronRight
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type AssignmentRow = {
    id: string;
    title: string;
    courseName: string;
    courseCode: string;
    dueDate: Date;
    type: 'group' | 'individual' | string;
    maxScore: number;
    submissionCount: number;
    totalStudents: number;
    status: 'active' | 'completed' | 'draft';
    submissions?: {
        id: string;
        name: string;
        studentId: string;
        submittedAt: Date;
        score: number | null;
    }[];
};

export default function Assignments() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    const [assignments, setAssignments] = React.useState<AssignmentRow[]>([]);
    const [selectedAssignment, setSelectedAssignment] = React.useState<AssignmentRow | null>(null);
    const [viewMode, setViewMode] = React.useState<'view' | 'grade'>('view');
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;

        setIsLoading(true);
        api.assignments.list('?includeSubmissions=true')
            .then((response) => {
                if (!isMounted) return;
                const mapped = response.assignments.map((item, index) => {
                    const assignment = asRecord(item);
                    const course = asRecord(assignment.course);
                    const submissions = asArray(assignment.submissions).map((submissionItem, submissionIndex) => {
                        const submission = asRecord(submissionItem);
                        const student = asRecord(submission.student);
                        const studentUser = asRecord(student.user);
                        return {
                            id: asString(submission.id, `S${submissionIndex + 1}`),
                            name: asString(studentUser.nameThai, asString(studentUser.name, `Student ${submissionIndex + 1}`)),
                            studentId: asString(student.studentId, `STU${submissionIndex + 1}`),
                            submittedAt: asDate(submission.submittedAt),
                            score: submission.score === null || typeof submission.score === 'undefined'
                                ? null
                                : asNumber(submission.score, 0),
                        };
                    });
                    const dueDate = asDate(assignment.dueDate);
                    const isPublished = Boolean(assignment.isPublished);
                    return {
                        id: asString(assignment.id, `assignment-${index}`),
                        title: asString(assignment.title, 'Untitled assignment'),
                        courseName: asString(course.nameThai, asString(course.name, '')),
                        courseCode: asString(course.code, ''),
                        dueDate,
                        type: asString(assignment.type, 'individual') as AssignmentRow['type'],
                        maxScore: asNumber(assignment.maxScore, 100),
                        submissionCount: submissions.length,
                        totalStudents: Math.max(asNumber(course.maxStudents, submissions.length), submissions.length),
                        status: (!isPublished ? 'draft' : dueDate < new Date() ? 'completed' : 'active') as AssignmentRow['status'],
                        submissions,
                    };
                });
                setAssignments(mapped);
            })
            .catch(() => setAssignments([]))
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    const activeAssignments = assignments.filter(a => a.status === 'active').length;
    const completedAssignments = assignments.filter(a => a.status === 'completed').length;
    const draftAssignments = assignments.filter(a => a.status === 'draft').length;

    const filterAssignments = (items: AssignmentRow[], status?: string) => {
        let result = items;
        if (status && status !== 'all') result = result.filter(a => a.status === status);
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            result = result.filter(a =>
                a.title.toLowerCase().includes(q) ||
                a.courseName.toLowerCase().includes(q) ||
                a.courseCode.toLowerCase().includes(q)
            );
        }
        return result;
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-blue-100 text-blue-700 dark:text-slate-300 dark:bg-slate-800">{t.assignmentsPage.inProgressTab}</Badge>;
            case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">{t.assignmentsPage.completedTab}</Badge>;
            case 'draft': return <Badge className="bg-gray-100 text-gray-700 dark:text-slate-300 dark:bg-slate-800">{t.assignmentsPage.draftTab}</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    // Detail / Grade view
    if (selectedAssignment) {
        const submissions = selectedAssignment.submissions ?? [];

        return (
            <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
                <motion.div variants={itemVariants}>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedAssignment(null)} className="gap-2">
                        <ChevronRight className="w-4 h-4 rotate-180" /> {t.assignmentsPage.allTab}
                    </Button>
                </motion.div>

                <motion.div variants={itemVariants} className="p-6 rounded-3xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]" />
                    <div className="relative z-10 flex items-start justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">{selectedAssignment.title}</h1>
                            <p className="text-white/80">{selectedAssignment.courseCode} โ€ข {selectedAssignment.courseName}</p>
                            <div className="flex gap-3 mt-3">
                                <Badge className="bg-white/20 text-white border-white/20 dark:bg-slate-900/50">{selectedAssignment.type === 'group' ? t.assignmentsPage.group : t.assignmentsPage.individual}</Badge>
                                <Badge className="bg-white/20 text-white border-white/20 dark:bg-slate-900/50">{t.assignmentsPage.deadline} {selectedAssignment.dueDate.toLocaleDateString('th-TH')}</Badge>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-white/70">{t.assignmentsPage.submitted}</div>
                            <div className="text-3xl font-bold">{selectedAssignment.submissionCount}/{selectedAssignment.totalStudents}</div>
                        </div>
                    </div>
                </motion.div>

                <motion.div variants={itemVariants} className="flex gap-2">
                    <Button variant={viewMode === 'view' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('view')}>{t.assignmentsPage.viewAssignment}</Button>
                    <Button variant={viewMode === 'grade' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('grade')}>{t.assignmentsPage.gradeAssignment}</Button>
                </motion.div>

                <motion.div variants={itemVariants}>
                    <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-500 dark:text-slate-400" />
                                {viewMode === 'grade' ? t.assignmentsPage.gradeAssignment : t.assignmentsPage.viewAssignment}
                                <span className="ml-auto text-sm font-normal text-gray-500 dark:text-slate-400">{submissions.length} {t.assignmentsPage.people}</span>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {submissions.length === 0 ? (
                                <div className="text-center py-8 text-gray-400">เธขเธฑเธเนเธกเนเธกเธตเธเธฑเธเธจเธถเธเธฉเธฒเธชเนเธเธเธฒเธ</div>
                            ) : submissions.map((sub) => (
                                <div key={sub.id} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-colors dark:bg-slate-800">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center font-bold text-blue-600 text-sm dark:text-slate-300 dark:bg-slate-800">
                                        {sub.studentId.slice(-2)}
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-sm">{sub.name}</div>
                                        <div className="text-xs text-gray-500 dark:text-slate-400">{sub.studentId} โ€ข เธชเนเธเน€เธกเธทเนเธญ {sub.submittedAt.toLocaleDateString('th-TH')}</div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {viewMode === 'grade' ? (
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    defaultValue={sub.score ?? ''}
                                                    placeholder="0"
                                                    min={0}
                                                    max={selectedAssignment.maxScore}
                                                    className="w-20 h-8 text-center rounded-lg text-sm"
                                                />
                                                <span className="text-xs text-gray-400">/ {selectedAssignment.maxScore}</span>
                                            </div>
                                        ) : (
                                            sub.score !== null ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">{sub.score}/{selectedAssignment.maxScore}</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-gray-500 dark:text-slate-400">เธฃเธญเธ•เธฃเธงเธ</Badge>
                                            )
                                        )}
                                        <Button size="sm" variant="ghost" className="text-xs text-blue-500 hover:bg-blue-50 dark:text-slate-400 dark:bg-slate-800">
                                            <Upload className="w-3.5 h-3.5 mr-1" /> เธ”เธนเนเธเธฅเน
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            {viewMode === 'grade' && submissions.length > 0 && (
                                <div className="pt-4 flex justify-end">
                                    <Button className="bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-lg shadow-blue-200"
                                        onClick={() => { setSelectedAssignment(null); }}>
                                        <CheckCircle className="w-4 h-4 mr-2" /> เธเธฑเธเธ—เธถเธเธเธฐเนเธเธ
                                    </Button>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </motion.div>
            </motion.div>
        );
    }

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-6"
        >
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <ClipboardList className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                        <span>{`${assignments.length} ${t.assignmentsPage.titleHighlight} โ€ข ${activeAssignments} ${t.assignmentsPage.subtitle}`}</span>
                    </motion.div>
                    <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.assignmentsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">{t.assignmentsPage.titleHighlight}</span>
                    </motion.h1>
                </div>
                <Button className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 shadow-lg">
                    <Plus className="w-4 h-4 mr-2" />
                    {t.assignmentsPage.createNew}
                </Button>
            </div>

            {/* Stats Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-500 p-6 text-white shadow-xl shadow-blue-200"
                >
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <Clock className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-white/90">{t.assignmentsPage.inProgressTab}</span>
                        </div>
                        <div className="text-4xl font-bold">{activeAssignments}</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white shadow-xl shadow-emerald-200"
                >
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <CheckCircle className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-white/90">{t.assignmentsPage.completedTab}</span>
                        </div>
                        <div className="text-4xl font-bold">{completedAssignments}</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 p-6 text-white shadow-xl shadow-orange-200"
                >
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <FileText className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-white/90">{t.assignmentsPage.draftTab}</span>
                        </div>
                        <div className="text-4xl font-bold">{draftAssignments}</div>
                    </div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-rose-500 p-6 text-white shadow-xl shadow-purple-200"
                >
                    <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <ClipboardList className="w-5 h-5" />
                            </div>
                            <span className="font-medium text-white/90">{t.assignmentsPage.allTab}</span>
                        </div>
                        <div className="text-4xl font-bold">{assignments.length}</div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Tabs */}
            <motion.div variants={itemVariants}>
                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="bg-white/80 backdrop-blur-sm border shadow-sm dark:bg-slate-900/50">
                        <TabsTrigger value="all">{t.assignmentsPage.allTab}</TabsTrigger>
                        <TabsTrigger value="active">{t.assignmentsPage.inProgressTab}</TabsTrigger>
                        <TabsTrigger value="completed">{t.assignmentsPage.completedTab}</TabsTrigger>
                        <TabsTrigger value="draft">{t.assignmentsPage.draftTab}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all" className="space-y-4">
                        <div className="flex gap-4">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                <Input
                                    placeholder={t.assignmentsPage.searchAssignment}
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-10"
                                />
                            </div>
                        </div>

                        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {isLoading ? (
                                        <div className="text-center py-8 text-gray-400">{t.common.loading}</div>
                                    ) : filterAssignments(assignments).length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">เนเธกเนเธเธเธเธฒเธเธ—เธตเนเธเนเธเธซเธฒ</div>
                                    ) : filterAssignments(assignments).map((assignment, index) => (
                                        <motion.div
                                            key={assignment.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            whileHover={{ scale: 1.01, x: 4 }}
                                            className="p-5 border rounded-xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group bg-gradient-to-r from-gray-50/50 to-white"
                                            onClick={() => { setSelectedAssignment(assignment); setViewMode('view'); }}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                                                            {assignment.title}
                                                        </h3>
                                                        {getStatusBadge(assignment.status)}
                                                        <Badge variant="outline">
                                                            {assignment.type === 'group' ? <Users className="w-3 h-3 mr-1" /> : null}
                                                            {assignment.type === 'group' ? t.assignmentsPage.group : t.assignmentsPage.individual}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-sm text-gray-600 dark:text-slate-300">
                                                        {assignment.courseCode} โ€ข {assignment.courseName}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm font-semibold text-gray-700 dark:text-slate-300">
                                                        {assignment.maxScore} {t.assignmentsPage.score}
                                                    </div>
                                                    <div className="text-xs text-gray-500 dark:text-slate-400 flex items-center justify-end gap-1">
                                                        <Calendar className="w-3 h-3" />
                                                        {t.assignmentsPage.deadline} {assignment.dueDate.toLocaleDateString('th-TH')}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 mr-6">
                                                    <div className="flex items-center justify-between text-sm mb-2">
                                                        <span className="text-gray-600 dark:text-slate-300">{t.assignmentsPage.submitted}</span>
                                                        <span className="font-semibold">{assignment.submissionCount}/{assignment.totalStudents} {t.assignmentsPage.people}</span>
                                                    </div>
                                                    <Progress
                                                        value={(assignment.submissionCount / assignment.totalStudents) * 100}
                                                        className="h-2"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedAssignment(assignment); setViewMode('view'); }}>{t.assignmentsPage.viewAssignment}</Button>
                                                    <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setSelectedAssignment(assignment); setViewMode('grade'); }}>{t.assignmentsPage.gradeAssignment}</Button>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="active">
                        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {filterAssignments(assignments, 'active').map((assignment, index) => (
                                        <motion.div
                                            key={assignment.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                            className="p-5 border rounded-xl hover:border-primary/30 hover:shadow-md transition-all cursor-pointer group bg-gradient-to-r from-blue-50/50 to-white"
                                            onClick={() => { setSelectedAssignment(assignment); setViewMode('view'); }}
                                        >
                                            <div className="flex items-start justify-between mb-4">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{assignment.title}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-slate-300">{assignment.courseCode} โ€ข {assignment.courseName}</p>
                                                </div>
                                                {getStatusBadge(assignment.status)}
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <div className="flex-1 mr-6">
                                                    <Progress value={(assignment.submissionCount / assignment.totalStudents) * 100} className="h-2" />
                                                    <div className="text-sm text-gray-600 dark:text-slate-400 mt-1">{assignment.submissionCount}/{assignment.totalStudents} {t.assignmentsPage.submitted}</div>
                                                </div>
                                                <Button size="sm" onClick={(e) => { e.stopPropagation(); setSelectedAssignment(assignment); setViewMode('grade'); }}>{t.assignmentsPage.gradeAssignment}</Button>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="completed">
                        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {filterAssignments(assignments, 'completed').map((assignment) => (
                                        <div key={assignment.id} className="p-5 border rounded-xl bg-emerald-50/50 hover:shadow-md transition-all cursor-pointer"
                                            onClick={() => { setSelectedAssignment(assignment); setViewMode('view'); }}>
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{assignment.title}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-slate-300">{assignment.courseCode}</p>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-slate-300" />
                                                    <span className="text-sm text-emerald-700 dark:text-slate-300">{t.assignmentsPage.gradedDone} {assignment.submissionCount} {t.assignmentsPage.people}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="draft">
                        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                            <CardContent className="pt-6">
                                <div className="space-y-4">
                                    {filterAssignments(assignments, 'draft').map((assignment) => (
                                        <div key={assignment.id} className="p-5 border rounded-xl bg-gray-50/50 dark:bg-slate-900/50">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold text-lg">{assignment.title}</h3>
                                                    <p className="text-sm text-gray-600 dark:text-slate-300">{assignment.courseCode}</p>
                                                </div>
                                                <div className="flex gap-2">
                                                    <Button size="sm" variant="outline" onClick={() => { setSelectedAssignment(assignment); setViewMode('view'); }}>{t.assignmentsPage.edit}</Button>
                                                    <Button size="sm">{t.assignmentsPage.publish}</Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </motion.div>
        </motion.div>
    );
}
