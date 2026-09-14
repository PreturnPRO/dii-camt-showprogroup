import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Search, X, FileText, Send, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Application } from '@/types';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';

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
  jobPostingId: string;
  student?: {
    id: string;
    userId: string;
    nameThai: string;
    name: string;
    email: string;
    gpa: number;
    year: number;
    skills: string[];
  };
};

const STAGE_ORDER: Application['status'][] = ['pending', 'reviewed', 'shortlisted', 'interviewed', 'accepted'];

export default function Applicants() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = user?.role === 'admin';
  const isCompany = user?.role === 'company';
  const canManage = isAdmin || isCompany;

  const jobIdFilter = searchParams.get('jobId') || '';

  const [applicants, setApplicants] = useState<ApplicantRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'gpa'>('newest');

  const copy = language === 'th'
    ? {
        title: 'ผู้สมัครทั้งหมด',
        summary: (total: number, pending: number, shortlisted: number, accepted: number) =>
          `${total} คน · รอตรวจ ${pending} · คัดเลือก ${shortlisted} · รับแล้ว ${accepted}`,
        filteredBy: (title: string) => `ตำแหน่ง: ${title}`,
        searchPlaceholder: 'ค้นหาชื่อ',
        statusAll: 'สถานะทั้งหมด',
        sortNewest: 'ใหม่สุดก่อน',
        sortGpa: 'GPA สูงสุดก่อน',
        loading: 'กำลังโหลดผู้สมัคร...',
        noApplicants: 'ไม่มีผู้สมัคร',
        selectApplicant: 'เลือกผู้สมัครเพื่อดูรายละเอียด',
        skillsLabel: 'ทักษะ',
        noSkills: 'ยังไม่ได้ระบุทักษะ',
        coverLetterLabel: 'จดหมายแนะนำตัว',
        noCoverLetter: 'ไม่มีจดหมายแนะนำตัว',
        adjustStatus: 'ปรับสถานะ',
        nextStep: (label: string) => `→ เลื่อนเป็น "${label}"`,
        otherStatus: 'เปลี่ยนสถานะอื่น',
        reject: 'ปฏิเสธ',
        rejectConfirm: 'ยืนยันปฏิเสธผู้สมัครนี้?',
        openResume: 'เปิด Resume',
        noResume: 'ยังไม่มีไฟล์ Resume',
        sendMessage: 'ส่งข้อความ',
        selectedCount: (n: number) => `${n} เลือก`,
        bulkShortlist: 'คัดเลือก',
        bulkReject: 'ปฏิเสธ',
        bulkExport: 'ส่งออก CSV',
        bulkClear: 'ล้าง',
        bulkRejectConfirm: (n: number) => `ยืนยันปฏิเสธผู้สมัคร ${n} คน?`,
        updateSuccess: 'ปรับสถานะแล้ว',
        errorGeneric: 'ทำรายการไม่สำเร็จ',
        year: 'ชั้นปี',
        gpaYear: (gpa: number, year: number) => `GPA ${gpa.toFixed(2)} · ชั้นปี ${year}`,
      }
    : {
        title: 'All Applicants',
        summary: (total: number, pending: number, shortlisted: number, accepted: number) =>
          `${total} people · ${pending} pending · ${shortlisted} shortlisted · ${accepted} accepted`,
        filteredBy: (title: string) => `Position: ${title}`,
        searchPlaceholder: 'Search name',
        statusAll: 'All statuses',
        sortNewest: 'Newest first',
        sortGpa: 'Highest GPA first',
        loading: 'Loading applicants...',
        noApplicants: 'No applicants.',
        selectApplicant: 'Select an applicant to see details',
        skillsLabel: 'Skills',
        noSkills: 'No skills listed yet',
        coverLetterLabel: 'Cover letter',
        noCoverLetter: 'No cover letter',
        adjustStatus: 'Update status',
        nextStep: (label: string) => `→ Move to "${label}"`,
        otherStatus: 'Change to other status',
        reject: 'Reject',
        rejectConfirm: 'Reject this applicant?',
        openResume: 'Open Resume',
        noResume: 'No resume file',
        sendMessage: 'Send message',
        selectedCount: (n: number) => `${n} selected`,
        bulkShortlist: 'Shortlist',
        bulkReject: 'Reject',
        bulkExport: 'Export CSV',
        bulkClear: 'Clear',
        bulkRejectConfirm: (n: number) => `Reject ${n} applicants?`,
        updateSuccess: 'Status updated.',
        errorGeneric: 'Action failed.',
        year: 'Year',
        gpaYear: (gpa: number, year: number) => `GPA ${gpa.toFixed(2)} · Year ${year}`,
      };

  const statusLabel = (status: Application['status']) =>
    (t.applicants[`status${status.charAt(0).toUpperCase()}${status.slice(1)}` as keyof typeof t.applicants] as string) ?? status;

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
            student: {
              id: asString(student.id),
              userId: asString(studentUser.id),
              nameThai: asString(studentUser.nameThai, asString(studentUser.name, '-')),
              name: asString(studentUser.name, '-'),
              email: asString(studentUser.email),
              gpa: asNumber(student.gpa, 0),
              year: asNumber(student.year, 1),
              skills: asArray(student.skills).map((s) => asString(asRecord(asRecord(s).skill).name)).filter(Boolean),
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

  const jobTitleForFilter = jobIdFilter
    ? applicants.find((a) => a.jobPostingId === jobIdFilter)?.jobTitle
    : null;

  const scoped = jobIdFilter ? applicants.filter((a) => a.jobPostingId === jobIdFilter) : applicants;
  const pendingCount = scoped.filter((a) => a.status === 'pending').length;
  const shortlistedCount = scoped.filter((a) => a.status === 'shortlisted').length;
  const acceptedCount = scoped.filter((a) => a.status === 'accepted').length;

  let filtered = scoped.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (searchQuery.trim() && !(a.student?.nameThai || '').toLowerCase().includes(searchQuery.trim().toLowerCase())) return false;
    return true;
  });
  filtered = [...filtered].sort((a, b) => (
    sortBy === 'gpa'
      ? (b.student?.gpa ?? 0) - (a.student?.gpa ?? 0)
      : b.appliedAt.getTime() - a.appliedAt.getTime()
  ));

  const selected = applicants.find((a) => a.id === selectedId) || null;

  const clearJobFilter = () => {
    const next = new URLSearchParams(searchParams);
    next.delete('jobId');
    setSearchParams(next);
  };

  const reachOut = (applicant: ApplicantRow) => {
    if (!applicant.student?.userId) {
      toast.error(copy.errorGeneric);
      return;
    }
    navigate('/messages', {
      state: {
        recipient: {
          id: applicant.student.userId,
          email: applicant.student.email,
          name: applicant.student.name,
          nameThai: applicant.student.nameThai,
          role: 'student',
        },
      },
    });
  };

  const applyStatus = async (id: string, status: Application['status']) => {
    try {
      await api.applications.update(id, { status });
      setApplicants((current) => current.map((a) => (a.id === id ? { ...a, status } : a)));
      toast.success(copy.updateSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const bulkShortlist = async () => {
    await Promise.all([...selectedIds].map((id) => api.applications.update(id, { status: 'shortlisted' }).catch(() => undefined)));
    setApplicants((current) => current.map((a) => (selectedIds.has(a.id) ? { ...a, status: 'shortlisted' } : a)));
    toast.success(copy.updateSuccess);
    setSelectedIds(new Set());
  };

  const bulkReject = async () => {
    if (!confirm(copy.bulkRejectConfirm(selectedIds.size))) return;
    await Promise.all([...selectedIds].map((id) => api.applications.update(id, { status: 'rejected' }).catch(() => undefined)));
    setApplicants((current) => current.map((a) => (selectedIds.has(a.id) ? { ...a, status: 'rejected' } : a)));
    toast.success(copy.updateSuccess);
    setSelectedIds(new Set());
  };

  const bulkExport = () => {
    const rows = applicants.filter((a) => selectedIds.has(a.id));
    const header = ['Name', 'Job', 'GPA', 'Year', 'Status', 'AppliedAt'];
    const lines = rows.map((a) => [
      a.student?.nameThai || '',
      a.jobTitle,
      String(a.student?.gpa ?? ''),
      String(a.student?.year ?? ''),
      a.status,
      a.appliedAt.toISOString(),
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','));
    const csv = [header.join(','), ...lines].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'applicants.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const statusBadge = (status: Application['status']) => {
    const map: Record<Application['status'], string> = {
      pending: 'bg-orange-100 text-orange-700 dark:bg-slate-800 dark:text-slate-300',
      reviewed: 'bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-slate-300',
      shortlisted: 'bg-purple-100 text-purple-700 dark:bg-slate-800 dark:text-slate-300',
      interviewed: 'bg-cyan-100 text-cyan-700 dark:bg-slate-800 dark:text-slate-300',
      accepted: 'bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-slate-300',
      rejected: 'bg-red-100 text-red-700 dark:bg-slate-800 dark:text-slate-300',
    };
    return <Badge className={map[status]}>{statusLabel(status)}</Badge>;
  };

  const nextStageOf = (status: Application['status']) => {
    const idx = STAGE_ORDER.indexOf(status);
    if (idx === -1 || idx === STAGE_ORDER.length - 1) return null;
    return STAGE_ORDER[idx + 1];
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
                        <Users className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                        <span>{visibleApplicants.length} {t.common.person} • {pendingCount} {t.applicants.pending}</span>
                    </motion.div>
                    <motion.h1
<<<<<<< Updated upstream
                        className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
=======
                        className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight"
>>>>>>> Stashed changes
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div variants={itemVariants}>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm overflow-hidden">
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                    <th className="px-3 py-3 w-8" />
                    <th className="px-3 py-3 font-medium">{language === 'th' ? 'ผู้สมัคร' : 'Applicant'}</th>
                    <th className="px-3 py-3 font-medium">{language === 'th' ? 'ตำแหน่ง' : 'Position'}</th>
                    <th className="px-3 py-3 font-medium">GPA</th>
                    <th className="px-3 py-3 font-medium">{language === 'th' ? 'สถานะ' : 'Status'}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((applicant) => (
                    <tr
                      key={applicant.id}
                      onClick={() => setSelectedId(applicant.id)}
                      className={`border-b border-slate-100 dark:border-slate-800/60 last:border-0 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 ${selectedId === applicant.id ? 'bg-slate-50 dark:bg-slate-800/60' : ''}`}
                    >
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <Checkbox checked={selectedIds.has(applicant.id)} onCheckedChange={() => toggleSelected(applicant.id)} />
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {(applicant.student?.nameThai || '-').charAt(0)}
                          </div>
                          <span className="font-medium truncate">{applicant.student?.nameThai}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400 truncate max-w-[140px]">{applicant.jobTitle}</td>
                      <td className="px-3 py-2.5 text-slate-600 dark:text-slate-400">{applicant.student?.gpa.toFixed(2)}</td>
                      <td className="px-3 py-2.5">{statusBadge(applicant.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {isLoading && <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{copy.loading}</div>}
              {!isLoading && filtered.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{copy.noApplicants}</div>
              )}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
            <CardContent className="pt-6">
              {selected ? (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-lg shrink-0">
                      {(selected.student?.nameThai || '-').charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{selected.student?.nameThai}</div>
                      <div className="text-sm text-slate-500 dark:text-slate-400 truncate">
                        {selected.jobTitle} · {copy.gpaYear(selected.student?.gpa ?? 0, selected.student?.year ?? 1)}
                      </div>
                    </div>
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
                    <div>
                      <h4 className="text-xs font-semibold uppercase text-slate-400 mb-2">{copy.adjustStatus}</h4>
                      <div className="flex flex-wrap items-center gap-2">
                        {nextStageOf(selected.status) && (
                          <Button size="sm" onClick={() => applyStatus(selected.id, nextStageOf(selected.status)!)}>
                            {copy.nextStep(statusLabel(nextStageOf(selected.status)!))}
                          </Button>
                        )}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button size="sm" variant="outline">
                              {copy.otherStatus} <ChevronRight className="w-3.5 h-3.5 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {STAGE_ORDER.map((s) => (
                              <DropdownMenuItem key={s} disabled={s === selected.status} onClick={() => applyStatus(selected.id, s)}>
                                {statusLabel(s)}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        {selected.status !== 'rejected' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => { if (confirm(copy.rejectConfirm)) applyStatus(selected.id, 'rejected'); }}
                          >
                            {copy.reject}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => selected.resumeUrl ? window.open(selected.resumeUrl, '_blank', 'noopener,noreferrer') : toast.info(copy.noResume)}
                    >
                      <FileText className="w-4 h-4 mr-1.5" /> {copy.openResume}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => reachOut(selected)}>
                      <Send className="w-4 h-4 mr-1.5" /> {copy.sendMessage}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex items-center justify-center text-sm text-slate-400">
                  {copy.selectApplicant}
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {selectedIds.size > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 bg-slate-900 dark:bg-slate-800 text-white rounded-2xl shadow-xl px-5 py-3"
        >
          <span className="text-sm font-medium">{copy.selectedCount(selectedIds.size)}</span>
          <Button size="sm" variant="secondary" onClick={bulkShortlist}>{copy.bulkShortlist}</Button>
          <Button size="sm" variant="destructive" onClick={bulkReject}>{copy.bulkReject}</Button>
          <Button size="sm" variant="secondary" onClick={bulkExport}>{copy.bulkExport}</Button>
          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10" onClick={() => setSelectedIds(new Set())}>{copy.bulkClear}</Button>
        </motion.div>
      )}
    </motion.div>
  );
}
