import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { 
  Briefcase, Search, Filter, Clock, CheckCircle, 
  XCircle, Eye, Building, Calendar, MapPin, 
  ArrowRight, FileText, Sparkles, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { asDate, asRecord, asString } from '@/lib/live-data';
import type { Application } from '@/types';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type ApplicationRow = Application & {
    jobTitle: string;
    companyName: string;
    companyLogo?: string;
    location: string;
    jobType: string;
    updatedAt: Date;
};

export default function ApplicationHistory() {
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const isStudent = user?.role === 'student';

    const [applications, setApplications] = useState<ApplicationRow[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedApp, setSelectedApp] = useState<ApplicationRow | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    useEffect(() => {
        if (!isStudent) return;
        let isMounted = true;

        api.applications.list()
            .then((response) => {
                if (!isMounted) return;
                const mapped = response.applications.map((item, index) => {
                    const application = asRecord(item);
                    const job = asRecord(application.jobPosting);
                    const company = asRecord(job.company);
                    return {
                        id: asString(application.id, `APP${index + 1}`),
                        jobPostingId: asString(application.jobPostingId, asString(job.id)),
                        studentId: asString(application.studentId, asString(user?.id)),
                        status: asString(application.status, 'pending') as Application['status'],
                        appliedAt: asDate(application.appliedAt ?? application.createdAt),
                        updatedAt: asDate(application.updatedAt ?? application.createdAt),
                        coverLetter: asString(application.coverLetter),
                        resumeUrl: asString(application.resumeUrl),
                        notes: asString(application.notes),
                        jobTitle: asString(job.title, 'Unknown Position'),
                        companyName: asString(company.companyName, asString(job.companyName, 'Unknown Company')),
                        location: asString(job.location, 'Not specified'),
                        jobType: asString(job.type, 'internship'),
                    };
                });
                
                // Sort by applied date descending
                mapped.sort((a, b) => b.appliedAt.getTime() - a.appliedAt.getTime());
                setApplications(mapped);
            })
            .catch((err) => {
                console.error("Failed to load application history", err);
                toast.error(language === 'th' ? 'ดึงข้อมูลประวัติการสมัครงานไม่สำเร็จ' : 'Failed to load applications');
            })
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [isStudent, user?.id, language]);

    if (!isStudent) {
        return (
            <div className="flex flex-col items-center justify-center h-[60vh]">
                <XCircle className="w-16 h-16 text-slate-300 mb-4" />
                <h2 className="text-2xl font-bold text-slate-700 leading-snug">Access Denied</h2>
                <p className="text-slate-500">This page is only accessible to students.</p>
            </div>
        );
    }

    const filteredApplications = applications.filter(app => {
        const matchesSearch = 
            app.jobTitle.toLowerCase().includes(searchQuery.toLowerCase()) || 
            app.companyName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || app.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const pendingCount = applications.filter(a => ['pending', 'reviewed'].includes(a.status)).length;
    const interviewCount = applications.filter(a => a.status === 'interviewed').length;
    const acceptedCount = applications.filter(a => a.status === 'accepted').length;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: language === 'th' ? 'รอตรวจสอบ' : 'Pending', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Clock };
            case 'reviewed': return { label: language === 'th' ? 'กำลังพิจารณา' : 'Reviewed', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Eye };
            case 'shortlisted': return { label: language === 'th' ? 'ผ่านการคัดเลือกเบื้องต้น' : 'Shortlisted', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', icon: CheckCircle };
            case 'interviewed': return { label: language === 'th' ? 'นัดสัมภาษณ์' : 'Interviewed', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: Calendar };
            case 'accepted': return { label: language === 'th' ? 'ตอบรับแล้ว' : 'Accepted', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400', icon: Sparkles };
            case 'rejected': return { label: language === 'th' ? 'ไม่ผ่านการพิจารณา' : 'Rejected', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400', icon: XCircle };
            default: return { label: status, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300', icon: Clock };
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <motion.div 
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
                    >
                        <Clock className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                        <span>{language === 'th' ? 'ติดตามสถานะการสมัครงานของคุณ' : 'Track your application status'}</span>
                    </motion.div>
                    <motion.h1 
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {language === 'th' ? 'ประวัติ' : 'Application '}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{language === 'th' ? 'การสมัครงาน' : 'History'}</span>
                    </motion.h1>
                </div>
                
                <motion.div variants={itemVariants} className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[160px] border-0 bg-transparent focus:ring-0 font-medium">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{language === 'th' ? 'ทั้งหมด' : 'All Statuses'}</SelectItem>
                            <SelectItem value="pending">{language === 'th' ? 'รอตรวจสอบ' : 'Pending'}</SelectItem>
                            <SelectItem value="reviewed">{language === 'th' ? 'กำลังพิจารณา' : 'Reviewed'}</SelectItem>
                            <SelectItem value="shortlisted">{language === 'th' ? 'ผ่านรอบแรก' : 'Shortlisted'}</SelectItem>
                            <SelectItem value="interviewed">{language === 'th' ? 'นัดสัมภาษณ์' : 'Interviewed'}</SelectItem>
                            <SelectItem value="accepted">{language === 'th' ? 'ตอบรับแล้ว' : 'Accepted'}</SelectItem>
                            <SelectItem value="rejected">{language === 'th' ? 'ไม่ผ่านการพิจารณา' : 'Rejected'}</SelectItem>
                        </SelectContent>
                    </Select>
                </motion.div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                    <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-slate-500">{language === 'th' ? 'รอการพิจารณา' : 'Under Review'}</span>
                                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-500">
                                    <Clock className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-4xl font-bold text-slate-900 dark:text-white leading-snug">{pendingCount}</div>
                            <p className="text-xs text-slate-400 mt-2">{language === 'th' ? 'ตำแหน่งที่กำลังอยู่ระหว่างการตรวจสอบ' : 'Applications currently being reviewed'}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                    <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-slate-500">{language === 'th' ? 'สัมภาษณ์' : 'Interviews'}</span>
                                <div className="p-2.5 rounded-2xl bg-purple-500/10 text-purple-500">
                                    <Calendar className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-4xl font-bold text-slate-900 dark:text-white leading-snug">{interviewCount}</div>
                            <p className="text-xs text-slate-400 mt-2">{language === 'th' ? 'นัดหมายเพื่อสัมภาษณ์พูดคุย' : 'Interview appointments scheduled'}</p>
                        </CardContent>
                    </Card>
                </motion.div>

                <motion.div variants={itemVariants} whileHover={{ y: -4 }}>
                    <Card className="rounded-3xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-sm font-medium text-slate-500">{language === 'th' ? 'ตอบรับแล้ว' : 'Accepted Offers'}</span>
                                <div className="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-500">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                            </div>
                            <div className="text-4xl font-bold text-slate-900 dark:text-white leading-snug">{acceptedCount}</div>
                            <p className="text-xs text-slate-400 mt-2">{language === 'th' ? 'บริษัทตอบรับเข้าทำงานหรือฝึกงาน' : 'Job / Internship offers accepted'}</p>
                        </CardContent>
                    </Card>
                </motion.div>
            </div>

            {/* Applications List */}
            <motion.div variants={itemVariants}>
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 p-6 md:p-8 shadow-sm">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                        <div className="relative w-full md:w-96">
                            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <Input 
                                placeholder={language === 'th' ? 'ค้นหาชื่อตำแหน่ง หรือ บริษัท...' : 'Search by job title or company...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10 rounded-2xl border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-800/50"
                            />
                        </div>
                        <div className="text-sm text-slate-500">
                            {language === 'th' ? 'พบทั้งหมด' : 'Total found:'} <strong className="text-slate-900 dark:text-white">{filteredApplications.length}</strong> {language === 'th' ? 'รายการ' : 'applications'}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <AnimatePresence>
                            {isLoading ? (
                                <div className="py-12 text-center text-slate-400">Loading applications...</div>
                            ) : filteredApplications.length === 0 ? (
                                <div className="py-16 text-center">
                                    <Briefcase className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
                                    <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-1">{language === 'th' ? 'ไม่พบประวัติการสมัครงาน' : 'No applications found'}</h3>
                                    <p className="text-sm text-slate-500">{language === 'th' ? 'คุณยังไม่ได้สมัครงาน หรือลองเปลี่ยนตัวกรองค้นหา' : 'You have not applied for any jobs yet or try changing filters.'}</p>
                                </div>
                            ) : (
                                filteredApplications.map((app) => {
                                    const statusInfo = getStatusInfo(app.status);
                                    const StatusIcon = statusInfo.icon;

                                    return (
                                        <motion.div
                                            key={app.id}
                                            layout
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.95 }}
                                            className="group relative p-6 rounded-2xl bg-white dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 hover:shadow-md hover:border-slate-300 dark:hover:border-slate-600 transition-all cursor-pointer"
                                            onClick={() => setSelectedApp(app)}
                                        >
                                            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                                <div className="space-y-1.5 flex-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                            {app.jobTitle}
                                                        </span>
                                                        <Badge variant="secondary" className="rounded-lg text-xs capitalize">
                                                            {app.jobType}
                                                        </Badge>
                                                    </div>
                                                    
                                                    <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400 flex-wrap">
                                                        <div className="flex items-center gap-1">
                                                            <Building className="w-4 h-4 text-slate-400" />
                                                            <span>{app.companyName}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1">
                                                            <MapPin className="w-4 h-4 text-slate-400" />
                                                            <span>{app.location}</span>
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {language === 'th' ? 'สมัครเมื่อ: ' : 'Applied: '} {app.appliedAt.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-4 w-full md:w-auto mt-2 md:mt-0 pt-4 md:pt-0 border-t md:border-0 border-slate-100 dark:border-slate-800">
                                                    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm ${statusInfo.color}`}>
                                                        <StatusIcon className="w-4 h-4" />
                                                        {statusInfo.label}
                                                    </div>
                                                    <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 dark:group-hover:bg-blue-900/30 transition-colors ml-auto md:ml-0">
                                                        <ArrowRight className="w-5 h-5" />
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    );
                                })
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>

            {/* Application Detail Dialog */}
            <Dialog open={Boolean(selectedApp)} onOpenChange={(open) => !open && setSelectedApp(null)}>
                <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden bg-white dark:bg-slate-900 rounded-[2rem] border-slate-200 dark:border-slate-800">
                    {selectedApp && (() => {
                        const statusInfo = getStatusInfo(selectedApp.status);
                        const StatusIcon = statusInfo.icon;
                        
                        return (
                            <>
                                <div className="bg-slate-50 dark:bg-slate-950/50 p-8 border-b border-slate-100 dark:border-slate-800">
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-16 h-16 bg-white dark:bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <Building className="w-8 h-8 text-slate-400" />
                                        </div>
                                        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl font-bold text-xs ${statusInfo.color}`}>
                                            <StatusIcon className="w-4 h-4" />
                                            {statusInfo.label}
                                        </div>
                                    </div>
                                    <DialogTitle className="text-3xl font-bold text-slate-900 dark:text-white mb-2 leading-snug">{selectedApp.jobTitle}</DialogTitle>
                                    <DialogDescription className="text-lg text-slate-600 dark:text-slate-400 font-medium flex items-center gap-2">
                                        {selectedApp.companyName}
                                    </DialogDescription>
                                </div>
                                
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{language === 'th' ? 'วันที่สมัคร' : 'Applied Date'}</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{selectedApp.appliedAt.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                                            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">{language === 'th' ? 'อัปเดตล่าสุด' : 'Last Updated'}</p>
                                            <p className="font-medium text-slate-900 dark:text-white">{selectedApp.updatedAt.toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                                        </div>
                                    </div>

                                    {selectedApp.notes && (
                                        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 p-5 rounded-2xl">
                                            <h4 className="font-bold text-blue-900 dark:text-blue-300 mb-2 flex items-center gap-2">
                                                <MessageSquare className="w-4 h-4" />
                                                {language === 'th' ? 'ข้อความจากบริษัท' : 'Message from Company'}
                                            </h4>
                                            <p className="text-sm text-blue-800 dark:text-blue-200/80 leading-relaxed">
                                                {selectedApp.notes}
                                            </p>
                                        </div>
                                    )}

                                    {selectedApp.coverLetter && (
                                        <div>
                                            <h4 className="font-bold text-slate-900 dark:text-white mb-3">Cover Letter</h4>
                                            <div className="text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 leading-relaxed whitespace-pre-line">
                                                {selectedApp.coverLetter}
                                            </div>
                                        </div>
                                    )}
                                </div>
                                
                                <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 sm:justify-between items-center">
                                    <Button variant="outline" className="rounded-xl" onClick={() => setSelectedApp(null)}>
                                        {language === 'th' ? 'ปิดหน้าต่าง' : 'Close'}
                                    </Button>
                                </DialogFooter>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
