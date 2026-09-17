import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Plus, MapPin, Clock, Users, Edit, Trash2, Eye, Calendar, DollarSign, Save, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { JobPosting } from '@/types';
import { api } from '@/lib/api';
import { mapJob as mapLiveJob } from '@/lib/live-mappers';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function JobPostings() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { t, language } = useLanguage();
    const isAdmin = user?.role === 'admin';
    const isCompany = user?.role === 'company';
    const canManage = isAdmin || isCompany;

    const [jobs, setJobs] = useState<JobPosting[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
    const [selectedJob, setSelectedJob] = useState<JobPosting | null>(null);
    const [formData, setFormData] = useState<{
        title: string;
        type: JobPosting['type'];
        location: string;
        salary: string;
        positions: number;
        deadline: string; // yyyy-mm-dd
    }>({ title: '', type: 'full-time', location: '', salary: '', positions: 1, deadline: '' });

    const mapJob = React.useCallback((item: unknown, index = 0): JobPosting => mapLiveJob(item, index), []);

    React.useEffect(() => {
        let isMounted = true;
        api.jobs.list()
            .then((response) => {
                if (!isMounted) return;
                const mapped = response.jobs.map(mapJob);
                setJobs(mapped);
            })
            .catch(() => undefined)
            .finally(() => {
                if (isMounted) setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [mapJob]);

    const companyJobPostings = jobs;
    const openJobs = companyJobPostings.filter(j => j.status === 'open').length;
    const totalApplicants = companyJobPostings.reduce((sum, j) => sum + j.applicants.length, 0);

    const handleAdd = () => {
        setEditingJob(null);
        setFormData({ title: '', type: 'full-time', location: 'Chiang Mai', salary: '20,000+', positions: 1, deadline: new Date().toISOString().split('T')[0] });
        setIsDialogOpen(true);
    };

    const handleEdit = (job: JobPosting) => {
        setEditingJob(job);
        setFormData({
            title: job.title,
            type: job.type,
            location: job.location,
            salary: job.salary || '',
            positions: job.positions,
            deadline: new Date(job.deadline).toISOString().split('T')[0]
        });
        setIsDialogOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (confirm(t.jobPostings.deleteConfirm)) {
            try {
                await api.jobs.remove(id);
                setJobs(jobs.filter(j => j.id !== id));
                toast.success(t.jobPostings.deleteSuccess);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t.jobPostings.deleteConfirm);
            }
        }
    };

    const buildJobPayload = () => ({
        title: formData.title,
        type: formData.type,
        positions: formData.positions,
        description: formData.title,
        responsibilities: [],
        requirements: [],
        preferredSkills: [],
        salary: formData.salary,
        benefits: [],
        location: formData.location,
        workType: 'hybrid',
        deadline: new Date(formData.deadline).toISOString(),
        status: 'open',
    });

    const handleSave = async () => {
        if (editingJob) {
            try {
                const response = await api.jobs.update(editingJob.id, buildJobPayload());
                setJobs(jobs.map(j => j.id === editingJob.id ? mapJob(response.job) : j));
                toast.success(t.jobPostings.editSuccess);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t.jobPostings.editJob);
                return;
            }
        } else {
            try {
                const response = await api.jobs.create(buildJobPayload());
                setJobs([mapJob(response.job), ...jobs]);
                toast.success(t.jobPostings.createSuccess);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t.jobPostings.addNew);
                return;
            }
        }
        setIsDialogOpen(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'open': return <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">{t.jobPostings.statusOpen}</Badge>;
            case 'closed': return <Badge className="bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">{t.jobPostings.statusClosed}</Badge>;
            case 'filled': return <Badge className="bg-blue-100 text-blue-700 dark:text-slate-300 dark:bg-slate-800">{t.jobPostings.statusFilled}</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'internship': return <Badge variant="outline" className="text-purple-700 border-purple-300 dark:text-slate-300">{t.jobPostings.internship}</Badge>;
            case 'full-time': return <Badge variant="outline" className="text-blue-700 border-blue-300 dark:text-slate-300">{t.jobPostings.fullTimeType}</Badge>;
            case 'part-time': return <Badge variant="outline" className="text-orange-700 border-orange-300 dark:text-slate-300">{t.jobPostings.partTime}</Badge>;
            default: return <Badge variant="outline">{type}</Badge>;
        }
    };

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
                        <Briefcase className="w-4 h-4 text-orange-500 dark:text-slate-400" />
                        <span>{companyJobPostings.length} {t.jobPostings.positionsCount} • {openJobs} {t.jobPostings.statusOpen}</span>
                    </motion.div>
                    <motion.h1
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {t.jobPostings.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{t.jobPostings.titleHighlight}</span>
                    </motion.h1>
                </div>

                {canManage && (
                    <motion.div className="flex gap-3" variants={itemVariants}>
                        <Button onClick={handleAdd} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                            <Plus className="w-4 h-4 mr-2" />{t.jobPostings.addNew}
                        </Button>
                    </motion.div>
                )}
            </div>

            {/* Stats Grid - Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-sm relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/20 backdrop-blur-sm">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{t.jobPostings.allPositions}</span>
                        </div>
                        <div className="text-5xl font-bold tracking-tight">{companyJobPostings.length}</div>
                        <div className="mt-3 text-sm text-orange-100 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            {t.jobPostings.inSystem}
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
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">{t.jobPostings.openLabel}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{openJobs}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.jobPostings.openDesc}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Users className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">{t.jobPostings.totalApplicants}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{totalApplicants}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.jobPostings.applicantsDesc}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-400">{t.jobPostings.closingSoon}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">{companyJobPostings.filter(j => new Date(j.deadline) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.jobPostings.within7Days}</div>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                    <CardHeader><CardTitle>{t.jobPostings.jobList}</CardTitle></CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <AnimatePresence>
                                {companyJobPostings.map((job, index) => (
                                    <motion.div
                                        key={job.id}
                                        layout
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        transition={{ delay: index * 0.05 }}
                                        className="p-5 border border-slate-200 dark:border-slate-800 rounded-xl hover:shadow-md transition-all bg-gradient-to-r from-gray-50/50 to-white dark:from-slate-900/70 dark:to-slate-950/70"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h3 className="font-semibold text-lg">{job.title}</h3>
                                                    {getStatusBadge(job.status)}
                                                    {getTypeBadge(job.type)}
                                                </div>
                                                <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">{job.companyName}</p>
                                                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" />{job.location}</span>
                                                    <span className="flex items-center gap-1"><DollarSign className="w-4 h-4" />{job.salary}</span>
                                                    <span className="flex items-center gap-1"><Users className="w-4 h-4" />{job.positions} {t.jobPostings.positionsUnit}</span>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-sm text-gray-600 dark:text-slate-400 mb-1">{t.jobPostings.closeDateLabel}</div>
                                                <div className="font-semibold">{new Date(job.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short' })}</div>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between pt-4 border-t">
                                            <div className="flex-1 mr-6">
                                                <div className="flex items-center justify-between text-sm mb-2">
                                                    <span className="text-gray-600 dark:text-gray-400">{t.jobPostings.applicantsCount}</span>
                                                    <span className="font-semibold">{job.applicants.length} {t.common.person}</span>
                                                </div>
                                                <Progress value={job.maxApplicants ? (job.applicants.length / job.maxApplicants) * 100 : 50} className="h-2" />
                                            </div>
                                            <div className="flex gap-2">
                                                <Button size="sm" variant="outline" onClick={() => setSelectedJob(job)}><Eye className="w-4 h-4 mr-1" />{language === 'th' ? 'รายละเอียด' : 'Details'}</Button>
                                                <Button size="sm" variant="outline" onClick={() => navigate('/applicants')}>{t.jobPostings.viewApplicants}</Button>
                                                {canManage && (
                                                    <>
                                                        <Button size="sm" variant="ghost" onClick={() => handleEdit(job)}><Edit className="w-4 h-4" /></Button>
                                                        <Button size="sm" variant="ghost" className="text-red-600 dark:text-slate-300" onClick={() => handleDelete(job.id)}><Trash2 className="w-4 h-4" /></Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </AnimatePresence>
                            {isLoading && (
                                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                    {language === 'th' ? 'กำลังโหลดประกาศงาน...' : 'Loading job postings...'}
                                </div>
                            )}
                            {!isLoading && companyJobPostings.length === 0 && (
                                <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                                    {language === 'th' ? 'ยังไม่มีประกาศงานจาก API' : 'No job postings from API yet.'}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Job Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>{editingJob ? t.jobPostings.editJob : t.jobPostings.addNew}</DialogTitle>
                        <DialogDescription>{t.jobPostings.fillDetails}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t.jobPostings.jobTitle}</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.jobPostings.type}</Label>
                                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as JobPosting['type'] })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="full-time">Full-time</SelectItem>
                                        <SelectItem value="part-time">Part-time</SelectItem>
                                        <SelectItem value="internship">Internship</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.jobPostings.positions} ({t.jobPostings.positionsUnit})</Label>
                                <Input type="number" value={formData.positions} onChange={e => setFormData({ ...formData, positions: parseInt(e.target.value) })} />
                            </div>
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.jobPostings.location}</Label>
                            <Input value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.jobPostings.salary}</Label>
                            <Input value={formData.salary} onChange={e => setFormData({ ...formData, salary: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.jobPostings.deadline}</Label>
                            <Input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t.common.cancel}</Button>
                        <Button onClick={handleSave} className="bg-orange-500 hover:bg-orange-600">
                            <Save className="w-4 h-4 mr-2" />{t.common.save}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={Boolean(selectedJob)} onOpenChange={(open) => !open && setSelectedJob(null)}>
                <DialogContent className="sm:max-w-[640px]">
                    {selectedJob && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedJob.title}</DialogTitle>
                                <DialogDescription>{selectedJob.companyName} / {selectedJob.location} / {selectedJob.workType}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
                                        <div className="text-slate-500 dark:text-slate-400">{t.jobPostings.positions}</div>
                                        <div className="font-bold">{selectedJob.positions}</div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
                                        <div className="text-slate-500 dark:text-slate-400">{t.jobPostings.applicantsCount}</div>
                                        <div className="font-bold">{selectedJob.applicants.length}</div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
                                        <div className="text-slate-500 dark:text-slate-400">{t.jobPostings.salary}</div>
                                        <div className="font-bold">{selectedJob.salary || '-'}</div>
                                    </div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3">
                                        <div className="text-slate-500 dark:text-slate-400">{t.jobPostings.closeDateLabel}</div>
                                        <div className="font-bold">{new Date(selectedJob.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US')}</div>
                                    </div>
                                </div>
                                <div>
                                    <div className="font-semibold mb-1">{language === 'th' ? 'รายละเอียดงาน' : 'Description'}</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{selectedJob.description || '-'}</p>
                                </div>
                                <div>
                                    <div className="font-semibold mb-2">{language === 'th' ? 'ทักษะและเงื่อนไข' : 'Skills & requirements'}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {[...selectedJob.preferredSkills, ...selectedJob.requirements].filter(Boolean).map((skill) => (
                                            <Badge key={skill} variant="secondary">{skill}</Badge>
                                        ))}
                                        {[...selectedJob.preferredSkills, ...selectedJob.requirements].filter(Boolean).length === 0 && <span className="text-sm text-slate-500">-</span>}
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => navigate('/applicants')}>{t.jobPostings.viewApplicants}</Button>
                                {canManage && <Button onClick={() => { handleEdit(selectedJob); setSelectedJob(null); }}>{t.jobPostings.editJob}</Button>}
                            </DialogFooter>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
