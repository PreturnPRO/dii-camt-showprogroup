import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, Filter, Eye, Mail, CheckCircle, XCircle, Clock, Star, FileText, MoreHorizontal, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Application } from '@/types';
import { api } from '@/lib/api';
import { asDate, asNumber, asRecord, asString } from '@/lib/live-data';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type ApplicantRow = Application & {
    jobTitle: string;
    companyId: string;
    student?: {
        id: string;
        studentId: string;
        name: string;
        nameThai: string;
        email: string;
        gpa: number;
        gpax: number;
        year: number;
        skills: Array<{ name: string }>;
    };
};

export default function Applicants() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const isAdmin = user?.role === 'admin';
    const isCompany = user?.role === 'company';
    const canManage = isAdmin || isCompany;

    const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedApplicant, setSelectedApplicant] = useState<ApplicantRow | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    React.useEffect(() => {
        let isMounted = true;

        api.applications.list()
            .then((response) => {
                if (!isMounted) return;
                const mapped = response.applications.map((item, index) => {
                    const application = asRecord(item);
                    const student = asRecord(application.student);
                    const studentUser = asRecord(student.user);
                    const job = asRecord(application.jobPosting);
                    const company = asRecord(job.company);
                    return {
                        id: asString(application.id, `APP${index + 1}`),
                        jobPostingId: asString(application.jobPostingId, asString(job.id)),
                        studentId: asString(application.studentId, asString(student.id)),
                        status: asString(application.status, 'pending') as Application['status'],
                        appliedAt: asDate(application.appliedAt),
                        coverLetter: asString(application.coverLetter),
                        resumeUrl: asString(application.resumeUrl),
                        notes: asString(application.notes),
                        jobTitle: asString(job.title, '-'),
                        companyId: asString(job.companyId, asString(company.id)),
                        student: {
                            id: asString(student.id),
                            studentId: asString(student.studentId),
                            name: asString(studentUser.name),
                            nameThai: asString(studentUser.nameThai, asString(studentUser.name, '-')),
                            email: asString(studentUser.email),
                            gpa: asNumber(student.gpa, 0),
                            gpax: asNumber(student.gpax, 0),
                            year: asNumber(student.year, 1),
                            skills: [],
                        },
                    };
                });
                setApplicants(mapped);
            })
            .catch(() => undefined)
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, []);

    // Backend already scopes company/student results by authenticated role.
    const visibleApplicants = applicants.filter(app => {
        return true;
    });

    const pendingCount = visibleApplicants.filter(a => a.status === 'pending').length;
    const shortlistedCount = visibleApplicants.filter(a => a.status === 'shortlisted').length;

    const handleStatusChange = async (id: string, newStatus: Application['status']) => {
        try {
            await api.applications.update(id, { status: newStatus });
            setApplicants(current => current.map(app => app.id === id ? { ...app, status: newStatus } : app));
            setSelectedApplicant(current => current?.id === id ? { ...current, status: newStatus } : current);

            const statusMap: Record<string, string> = {
                'shortlisted': t.applicants.shortlistAction,
                'interviewed': t.applicants.interviewAction,
                'accepted': t.applicants.acceptAction,
                'rejected': t.applicants.rejectAction
            };

            toast.success(`${t.applicants.updateSuccess}: "${statusMap[newStatus]}"`);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.applicants.updateSuccess);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge className="bg-orange-100 text-orange-700 dark:text-slate-300">{t.applicants.statusPending}</Badge>;
            case 'reviewed': return <Badge className="bg-blue-100 text-blue-700 dark:text-slate-300 dark:bg-slate-800">{t.applicants.statusReviewed}</Badge>;
            case 'shortlisted': return <Badge className="bg-purple-100 text-purple-700 dark:text-slate-300 dark:bg-slate-800">{t.applicants.statusShortlisted}</Badge>;
            case 'interviewed': return <Badge className="bg-cyan-100 text-cyan-700">{t.applicants.statusInterviewed}</Badge>;
            case 'accepted': return <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">{t.applicants.statusAccepted}</Badge>;
            case 'rejected': return <Badge className="bg-red-100 text-red-700 dark:text-slate-300 dark:bg-slate-800">{t.applicants.statusRejected}</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const filteredApplicants = visibleApplicants.filter(app => {
        const matchesSearch = app.student?.nameThai.includes(searchQuery) || app.jobTitle.includes(searchQuery);
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header Section - Bento Grid Style */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
                    >
                        <Users className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                        <span>{visibleApplicants.length} {t.common.person} • {pendingCount} {t.applicants.pending}</span>
                    </motion.div>
                    <motion.h1
                        className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {t.applicants.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-indigo-500">{t.applicants.titleHighlight}</span>
                    </motion.h1>
                </div>
            </div>

            {/* Stats Grid - Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-white/90">{t.applicants.totalLabel}</span>
                        </div>
                        <div className="text-5xl font-bold tracking-tight">{visibleApplicants.length}</div>
                        <div className="mt-3 text-sm text-blue-100 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            {t.applicants.inSystem}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.applicants.pending}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">{pendingCount}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.applicants.pendingDesc}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                <Star className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.applicants.shortlisted}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">{shortlistedCount}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.applicants.shortlistedDesc}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.applicants.accepted}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{visibleApplicants.filter(a => a.status === 'accepted').length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.applicants.acceptedDesc}</div>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder={t.common.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-40"><SelectValue placeholder={t.common.status} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.common.all}</SelectItem>
                            <SelectItem value="pending">{t.applicants.statusPending}</SelectItem>
                            <SelectItem value="shortlisted">{t.applicants.statusShortlisted}</SelectItem>
                            <SelectItem value="accepted">{t.applicants.statusAccepted}</SelectItem>
                            <SelectItem value="rejected">{t.applicants.statusRejected}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            <AnimatePresence>
                                {filteredApplicants.map((applicant, index) => (
                                    <motion.div
                                        layout
                                        key={applicant.id}
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.03 }}
                                        className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all bg-white dark:bg-slate-900"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                                                {applicant.student?.nameThai.charAt(0) || 'N'}
                                            </div>
                                            <div>
                                                <div className="font-semibold">{applicant.student?.nameThai || 'Unknown'}</div>
                                                <div className="text-sm text-gray-600 dark:text-slate-300">{applicant.jobTitle}</div>
                                                <div className="text-xs text-gray-400 mt-1">
                                                    {t.applicants.appliedOn} {new Date(applicant.appliedAt).toLocaleDateString('th-TH')}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="text-right hidden sm:block">
                                                <div className="text-sm font-semibold">GPA {applicant.student?.gpa.toFixed(2)}</div>
                                                <div className="text-xs text-gray-500 dark:text-slate-400">{t.studentProfiles.yearPrefix} {applicant.student?.year}</div>
                                            </div>
                                            {getStatusBadge(applicant.status)}

                                            <div className="flex gap-1">
                                                <Button size="sm" variant="ghost" onClick={() => setSelectedApplicant(applicant)}><Eye className="w-4 h-4" /></Button>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => applicant.resumeUrl ? window.open(applicant.resumeUrl, '_blank', 'noopener,noreferrer') : toast.info(language === 'th' ? 'ยังไม่มีไฟล์ Resume' : 'No resume file')}
                                                >
                                                    <FileText className="w-4 h-4" />
                                                </Button>
                                            </div>

                                            {canManage && (
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button size="sm" variant="ghost"><MoreHorizontal className="w-4 h-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>{t.applicants.manageStatus}</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(applicant.id, 'shortlisted')}>
                                                            <Star className="w-4 h-4 mr-2" /> {t.applicants.shortlistAction}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(applicant.id, 'interviewed')}>
                                                            <Users className="w-4 h-4 mr-2" /> {t.applicants.interviewAction}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => handleStatusChange(applicant.id, 'accepted')} className="text-green-600">
                                                            <CheckCircle className="w-4 h-4 mr-2" /> {t.applicants.acceptAction}
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleStatusChange(applicant.id, 'rejected')} className="text-red-600 dark:text-slate-300">
                                                            <XCircle className="w-4 h-4 mr-2" /> {t.applicants.rejectAction}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {isLoading && (
                                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                    {language === 'th' ? 'กำลังโหลดผู้สมัคร...' : 'Loading applicants...'}
                                </div>
                            )}
                            {!isLoading && filteredApplicants.length === 0 && (
                                <div className="text-center py-8 text-gray-500 dark:text-slate-400">
                                    {t.common.noData}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            <Dialog open={Boolean(selectedApplicant)} onOpenChange={(open) => !open && setSelectedApplicant(null)}>
                <DialogContent className="sm:max-w-[640px]">
                    {selectedApplicant && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedApplicant.student?.nameThai || selectedApplicant.student?.name || '-'}</DialogTitle>
                                <DialogDescription>{selectedApplicant.jobTitle} / {t.applicants.appliedOn} {new Date(selectedApplicant.appliedAt).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">GPA</div><div className="font-bold">{selectedApplicant.student?.gpa.toFixed(2) ?? '-'}</div></div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">{t.studentProfiles.yearPrefix}</div><div className="font-bold">{selectedApplicant.student?.year ?? '-'}</div></div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">{t.common.status}</div><div className="font-bold">{getStatusBadge(selectedApplicant.status)}</div></div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">Email</div><div className="font-bold truncate">{selectedApplicant.student?.email || '-'}</div></div>
                                </div>
                                <div>
                                    <div className="font-semibold mb-1">{language === 'th' ? 'จดหมายสมัครงาน' : 'Cover letter'}</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{selectedApplicant.coverLetter || '-'}</p>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {(['reviewed', 'shortlisted', 'interviewed', 'accepted', 'rejected'] as Application['status'][]).map((status) => (
                                        <Button key={status} size="sm" variant={selectedApplicant.status === status ? 'default' : 'outline'} onClick={() => handleStatusChange(selectedApplicant.id, status)}>
                                            {status}
                                        </Button>
                                    ))}
                                    <Button size="sm" variant="outline" onClick={() => selectedApplicant.resumeUrl ? window.open(selectedApplicant.resumeUrl, '_blank', 'noopener,noreferrer') : toast.info(language === 'th' ? 'ยังไม่มีไฟล์ Resume' : 'No resume file')}>
                                        <FileText className="w-4 h-4 mr-1" /> Resume
                                    </Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
