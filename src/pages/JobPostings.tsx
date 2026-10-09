import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Plus, Search, MoreVertical, Copy, Ban, Trash2, Save, Send } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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

type FormState = {
  title: string;
  description: string;
  type: JobPosting['type'];
  location: string;
  salary: string;
  positions: number;
  status: JobPosting['status'];
  skills: string[];
};

const emptyForm = (): FormState => ({
  title: '',
  description: '',
  type: 'full-time',
  location: 'Chiang Mai',
  salary: '20,000+',
  positions: 1,
  status: 'draft',
  skills: [''],
});

export default function JobPostings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { language } = useLanguage();
  const isAdmin = user?.role === 'admin';
  const isCompany = user?.role === 'company';
  const canManage = isAdmin || isCompany;

  const canManageJob = React.useCallback((job: JobPosting) => {
    if (isAdmin) return true;
    const companyProfileId = (user?.raw as any)?.companyProfile?.id;
    if (isCompany && companyProfileId === job.companyId) return true;
    return false;
  }, [isAdmin, isCompany, user]);

  const companyProfile = (user?.raw as any)?.companyProfile;

  const [jobs, setJobs] = useState<JobPosting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetTab, setSheetTab] = useState('details');
  const [editingJob, setEditingJob] = useState<JobPosting | null>(null);
  const [formData, setFormData] = useState<FormState>(emptyForm());

  const isCreateMode = !editingJob;

  const copy = language === 'th'
    ? {
        titleAll: 'ตำแหน่งงานทั้งหมด',
        summary: (total: number, open: number, seats: number, applicants: number) =>
          `${total} ประกาศ · เปิดรับ ${open} · ที่นั่งฝึกงาน ${seats} · ผู้สมัคร ${applicants}`,
        addNew: '+ ประกาศงานใหม่',
        searchPlaceholder: 'ค้นหาชื่อ/สถานที่',
        statusAll: 'สถานะทั้งหมด',
        typeAll: 'ประเภททั้งหมด',
        colTitle: 'ชื่อตำแหน่ง',
        colStatus: 'สถานะ',
        colType: 'ประเภท',
        colSeats: 'ที่นั่ง (รับ/เปิด)',
        colApplicants: 'ผู้สมัคร',
        statusDraft: 'ร่าง',
        statusOpen: 'เปิดรับ',
        statusClosed: 'ปิดรับ',
        statusFilled: 'รับครบ',
        duplicate: 'ทำสำเนา',
        close: 'ปิดรับ',
        delete: 'ลบ',
        deleteConfirm: 'ยืนยันลบประกาศงานนี้?',
        noJobs: 'ยังไม่มีประกาศงาน',
        loading: 'กำลังโหลดประกาศงาน...',
        sheetCreateTitle: 'ประกาศงานใหม่',
        sheetEditTitle: 'แก้ไขประกาศงาน',
        tabDetails: 'รายละเอียด',
        tabSkills: 'ทักษะที่ต้องการ',
        tabApplicants: (n: number) => `ผู้สมัคร (${n})`,
        notPublished: '💡 ยังไม่เผยแพร่ นักศึกษายังไม่เห็น',
        cancel: 'ยกเลิก',
        saveDraft: 'บันทึกร่าง',
        publish: 'เผยแพร่ ▶',
        save: 'บันทึก',
        jobTitle: 'ชื่อตำแหน่ง',
        description: 'รายละเอียด',
        type: 'ประเภท',
        positions: 'จำนวน (ที่นั่ง)',
        location: 'สถานที่',
        salary: 'เงินเดือน',
        skillsLabel: 'ทักษะที่ต้องการ',
        addSkill: '+ เพิ่มทักษะ',
        skillPlaceholder: 'ชื่อทักษะ',
        noDeadlineHint: 'ไม่มีวันปิดรับ — รับสมัครต่อเนื่องจนกว่าจะปิดเอง',
        findMatchingStudents: 'ค้นหานักศึกษาตรงทักษะ →',
        applicantsHint: 'ดูรายละเอียดผู้สมัครทั้งหมดที่หน้าผู้สมัคร',
        viewAllApplicants: 'ดูผู้สมัครทั้งหมด →',
        noApplicants: 'ยังไม่มีผู้สมัครสำหรับตำแหน่งนี้',
        createSuccess: 'สร้างประกาศงานแล้ว',
        publishSuccess: 'เผยแพร่ประกาศงานแล้ว — นักศึกษาเห็นแล้ว',
        editSuccess: 'บันทึกการแก้ไขแล้ว',
        deleteSuccess: 'ลบประกาศงานแล้ว',
        closeSuccess: 'ปิดรับสมัครแล้ว',
        errorGeneric: 'ทำรายการไม่สำเร็จ',
        internship: 'ฝึกงาน',
        fullTime: 'เต็มเวลา',
        partTime: 'พาร์ทไทม์',
        contract: 'สัญญาจ้าง',
        person: 'คน',
        statusFieldLabel: 'สถานะ',
      }
    : {
        titleAll: 'All Job Postings',
        summary: (total: number, open: number, seats: number, applicants: number) =>
          `${total} postings · ${open} open · ${seats} internship seats · ${applicants} applicants`,
        addNew: '+ New posting',
        searchPlaceholder: 'Search title/location',
        statusAll: 'All statuses',
        typeAll: 'All types',
        colTitle: 'Title',
        colStatus: 'Status',
        colType: 'Type',
        colSeats: 'Seats (filled/open)',
        colApplicants: 'Applicants',
        statusDraft: 'Draft',
        statusOpen: 'Open',
        statusClosed: 'Closed',
        statusFilled: 'Filled',
        duplicate: 'Duplicate',
        close: 'Close',
        delete: 'Delete',
        deleteConfirm: 'Delete this job posting?',
        noJobs: 'No job postings yet.',
        loading: 'Loading job postings...',
        sheetCreateTitle: 'New job posting',
        sheetEditTitle: 'Edit job posting',
        tabDetails: 'Details',
        tabSkills: 'Required skills',
        tabApplicants: (n: number) => `Applicants (${n})`,
        notPublished: '💡 Not published yet — students can\'t see this.',
        cancel: 'Cancel',
        saveDraft: 'Save draft',
        publish: 'Publish ▶',
        save: 'Save',
        jobTitle: 'Job title',
        description: 'Description',
        type: 'Type',
        positions: 'Positions (seats)',
        location: 'Location',
        salary: 'Salary',
        skillsLabel: 'Required skills',
        addSkill: '+ Add skill',
        skillPlaceholder: 'Skill name',
        noDeadlineHint: 'No closing date — stays open until you close it.',
        findMatchingStudents: 'Find matching students →',
        applicantsHint: 'See full applicant details on the Applicants page.',
        viewAllApplicants: 'View all applicants →',
        noApplicants: 'No applicants for this posting yet.',
        createSuccess: 'Draft created.',
        publishSuccess: 'Published — students can see it now.',
        editSuccess: 'Changes saved.',
        deleteSuccess: 'Job posting deleted.',
        closeSuccess: 'Posting closed.',
        errorGeneric: 'Action failed.',
        internship: 'Internship',
        fullTime: 'Full-time',
        partTime: 'Part-time',
        contract: 'Contract',
        person: 'people',
        statusFieldLabel: 'Status',
      };

  const mapJob = React.useCallback((item: unknown, index = 0): JobPosting => mapLiveJob(item, index), []);

  const loadJobs = React.useCallback(() => {
    setIsLoading(true);
    return api.jobs.list()
      .then((response) => {
        const mapped = response.jobs
          .map(mapJob)
          .filter((j) => j.type !== 'skill_requirement');
        setJobs(mapped);
      })
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [mapJob]);

  React.useEffect(() => {
    let isMounted = true;
    loadJobs().then(() => {
      if (!isMounted) return;
    });
    return () => {
      isMounted = false;
    };
  }, [loadJobs]);

  const companyProfileId = companyProfile?.id;
  const companyJobPostings = isCompany
    ? jobs.filter((j) => j.companyId === companyProfileId)
    : jobs;

  const filteredJobs = companyJobPostings.filter((job) => {
    if (statusFilter !== 'all' && job.status !== statusFilter) return false;
    if (typeFilter !== 'all' && job.type !== typeFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      if (!job.title.toLowerCase().includes(q) && !job.location.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const openCount = companyJobPostings.filter((j) => j.status === 'open').length;
  const internshipSeats = companyJobPostings
    .filter((j) => j.type === 'internship')
    .reduce((sum, j) => sum + j.positions, 0);
  const totalApplicants = companyJobPostings.reduce((sum, j) => sum + j.applicants.length, 0);

  const filledCountFor = (job: JobPosting) => job.applicants.filter((a) => a.status === 'accepted').length;

  const openCreateSheet = (prefillFrom?: JobPosting) => {
    setEditingJob(null);
    setFormData(
      prefillFrom
        ? {
            title: prefillFrom.title,
            description: prefillFrom.description,
            type: prefillFrom.type,
            location: prefillFrom.location,
            salary: prefillFrom.salary || '',
            positions: prefillFrom.positions,
            status: 'draft',
            skills: [...new Set([...prefillFrom.preferredSkills, ...prefillFrom.requirements])].filter(Boolean).length
              ? [...new Set([...prefillFrom.preferredSkills, ...prefillFrom.requirements])].filter(Boolean)
              : [''],
          }
        : emptyForm(),
    );
    setSheetTab('details');
    setSheetOpen(true);
  };

  const openEditSheet = (job: JobPosting) => {
    setEditingJob(job);
    const combinedSkills = Array.from(new Set([...job.preferredSkills, ...job.requirements].filter(Boolean)));
    setFormData({
      title: job.title,
      description: job.description || '',
      type: job.type,
      location: job.location,
      salary: job.salary || '',
      positions: job.positions,
      status: job.status,
      skills: combinedSkills.length ? combinedSkills : [''],
    });
    setSheetTab('details');
    setSheetOpen(true);
  };

  const buildPayload = (statusOverride?: JobPosting['status']) => ({
    title: formData.title,
    type: formData.type,
    positions: formData.positions,
    description: formData.description || formData.title,
    responsibilities: [],
    requirements: formData.skills.map((s) => s.trim()).filter(Boolean),
    preferredSkills: [],
    salary: formData.salary,
    benefits: [],
    location: formData.location,
    workType: 'hybrid',
    status: statusOverride ?? formData.status,
  });

  const handleSave = async (publishNow: boolean) => {
    const statusToSend: JobPosting['status'] = publishNow ? 'open' : (isCreateMode ? 'draft' : formData.status);
    try {
      if (editingJob) {
        const response = await api.jobs.update(editingJob.id, buildPayload(statusToSend));
        setJobs((current) => current.map((j) => (j.id === editingJob.id ? mapJob(response.job) : j)));
        toast.success(publishNow ? copy.publishSuccess : copy.editSuccess);
      } else {
        const response = await api.jobs.create(buildPayload(statusToSend));
        setJobs((current) => [mapJob(response.job), ...current]);
        toast.success(publishNow ? copy.publishSuccess : copy.createSuccess);
      }
      setSheetOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    }
  };

  const handleClose = async (job: JobPosting) => {
    try {
      const response = await api.jobs.update(job.id, { status: 'closed' });
      setJobs((current) => current.map((j) => (j.id === job.id ? mapJob(response.job) : j)));
      toast.success(copy.closeSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    }
  };

  const handleDelete = async (job: JobPosting) => {
    if (!confirm(copy.deleteConfirm)) return;
    try {
      await api.jobs.remove(job.id);
      setJobs((current) => current.filter((j) => j.id !== job.id));
      toast.success(copy.deleteSuccess);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : copy.errorGeneric);
    }
  };

  const statusBadge = (status: JobPosting['status']) => {
    const map: Record<JobPosting['status'], { label: string; className: string }> = {
      draft: { label: copy.statusDraft, className: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300' },
      open: { label: copy.statusOpen, className: 'bg-emerald-100 text-emerald-700 dark:bg-slate-800 dark:text-slate-300' },
      closed: { label: copy.statusClosed, className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' },
      filled: { label: copy.statusFilled, className: 'bg-blue-100 text-blue-700 dark:bg-slate-800 dark:text-slate-300' },
    };
    const entry = map[status] ?? map.open;
    return <Badge className={entry.className}>{entry.label}</Badge>;
  };

  const typeLabel = (type: JobPosting['type']) => {
    switch (type) {
      case 'internship': return copy.internship;
      case 'full-time': return copy.fullTime;
      case 'part-time': return copy.partTime;
      case 'contract': return copy.contract;
      default: return type;
    }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6 pb-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <motion.h1 className="text-3xl md:text-4xl font-bold text-slate-900 dark:text-white leading-snug" variants={itemVariants}>
            <Briefcase className="inline w-7 h-7 mr-2 mb-1 text-orange-500" />
            {copy.titleAll}
          </motion.h1>
          <motion.p className="mt-2 text-sm text-slate-500 dark:text-slate-400" variants={itemVariants}>
            {copy.summary(companyJobPostings.length, openCount, internshipSeats, totalApplicants)}
          </motion.p>
        </div>
        {canManage && (
          <motion.div variants={itemVariants}>
            <Button onClick={() => openCreateSheet()} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
              <Plus className="w-4 h-4 mr-2" />{copy.addNew}
            </Button>
          </motion.div>
        )}
      </div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input className="pl-9" placeholder={copy.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.statusAll}</SelectItem>
            <SelectItem value="draft">{copy.statusDraft}</SelectItem>
            <SelectItem value="open">{copy.statusOpen}</SelectItem>
            <SelectItem value="closed">{copy.statusClosed}</SelectItem>
            <SelectItem value="filled">{copy.statusFilled}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-full sm:w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{copy.typeAll}</SelectItem>
            <SelectItem value="internship">{copy.internship}</SelectItem>
            <SelectItem value="full-time">{copy.fullTime}</SelectItem>
            <SelectItem value="part-time">{copy.partTime}</SelectItem>
            <SelectItem value="contract">{copy.contract}</SelectItem>
          </SelectContent>
        </Select>
      </motion.div>

      {/* Table */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/60 rounded-3xl shadow-sm overflow-hidden">
          {/* on a phone the table scrolls sideways instead of losing columns (UX-M8) */}
          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 text-left text-xs text-slate-500 dark:text-slate-400">
                  <th className="px-4 py-3 font-medium">{copy.colTitle}</th>
                  <th className="px-4 py-3 font-medium">{copy.colStatus}</th>
                  <th className="px-4 py-3 font-medium">{copy.colType}</th>
                  <th className="px-4 py-3 font-medium">{copy.colSeats}</th>
                  <th className="px-4 py-3 font-medium">{copy.colApplicants}</th>
                  <th className="px-4 py-3 font-medium w-10" />
                </tr>
              </thead>
              <tbody>
                {filteredJobs.map((job) => (
                  <tr
                    key={job.id}
                    className="border-b border-slate-100 dark:border-slate-800/60 last:border-0 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer"
                    onClick={() => canManageJob(job) && openEditSheet(job)}
                  >
                    <td className="px-4 py-3 font-medium">{job.title}</td>
                    <td className="px-4 py-3">{statusBadge(job.status)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{typeLabel(job.type)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{filledCountFor(job)}/{job.positions}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-400">{job.applicants.length}</td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      {canManageJob(job) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openCreateSheet(job)}>
                              <Copy className="w-3.5 h-3.5 mr-2" />{copy.duplicate}
                            </DropdownMenuItem>
                            {job.status !== 'closed' && (
                              <DropdownMenuItem onClick={() => handleClose(job)}>
                                <Ban className="w-3.5 h-3.5 mr-2" />{copy.close}
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => handleDelete(job)} className="text-red-600 dark:text-red-400">
                              <Trash2 className="w-3.5 h-3.5 mr-2" />{copy.delete}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {isLoading && (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{copy.loading}</div>
            )}
            {!isLoading && filteredJobs.length === 0 && (
              <div className="p-8 text-center text-sm text-slate-500 dark:text-slate-400">{copy.noJobs}</div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Slide-over */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <div className="flex items-center gap-2">
              <SheetTitle>{isCreateMode ? copy.sheetCreateTitle : copy.sheetEditTitle}</SheetTitle>
              {isCreateMode
                ? statusBadge('draft')
                : (
                  <Select value={formData.status} onValueChange={(v) => setFormData((f) => ({ ...f, status: v as JobPosting['status'] }))}>
                    <SelectTrigger className="w-32 h-7 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="draft">{copy.statusDraft}</SelectItem>
                      <SelectItem value="open">{copy.statusOpen}</SelectItem>
                      <SelectItem value="closed">{copy.statusClosed}</SelectItem>
                      <SelectItem value="filled">{copy.statusFilled}</SelectItem>
                    </SelectContent>
                  </Select>
                )}
            </div>
            <SheetDescription>{isCreateMode ? copy.notPublished : ''}</SheetDescription>
          </SheetHeader>

          <Tabs value={sheetTab} onValueChange={setSheetTab} className="mt-4">
            <TabsList>
              <TabsTrigger value="details">{copy.tabDetails}</TabsTrigger>
              <TabsTrigger value="skills">{copy.tabSkills}</TabsTrigger>
              {!isCreateMode && <TabsTrigger value="applicants">{copy.tabApplicants(editingJob?.applicants.length ?? 0)}</TabsTrigger>}
            </TabsList>

            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid gap-2">
                <Label>{copy.jobTitle}</Label>
                <Input value={formData.title} onChange={(e) => setFormData((f) => ({ ...f, title: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>{copy.description}</Label>
                <Textarea rows={3} value={formData.description} onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{copy.type}</Label>
                  <Select value={formData.type} onValueChange={(v) => setFormData((f) => ({ ...f, type: v as JobPosting['type'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="full-time">{copy.fullTime}</SelectItem>
                      <SelectItem value="part-time">{copy.partTime}</SelectItem>
                      <SelectItem value="internship">{copy.internship}</SelectItem>
                      <SelectItem value="contract">{copy.contract}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>{copy.positions}</Label>
                  <Input
                    type="number"
                    min={1}
                    value={formData.positions}
                    onChange={(e) => setFormData((f) => ({ ...f, positions: parseInt(e.target.value, 10) || 1 }))}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>{copy.location}</Label>
                  <Input value={formData.location} onChange={(e) => setFormData((f) => ({ ...f, location: e.target.value }))} />
                </div>
                <div className="grid gap-2">
                  <Label>{copy.salary}</Label>
                  <Input value={formData.salary} onChange={(e) => setFormData((f) => ({ ...f, salary: e.target.value }))} />
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500 italic">{copy.noDeadlineHint}</p>
            </TabsContent>

            <TabsContent value="skills" className="space-y-3 mt-4">
              <div className="flex items-center justify-between">
                <Label>{copy.skillsLabel}</Label>
                <Button type="button" variant="outline" size="sm" onClick={() => setFormData((f) => ({ ...f, skills: [...f.skills, ''] }))}>
                  {copy.addSkill}
                </Button>
              </div>
              <div className="space-y-2">
                {formData.skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      className="flex-1"
                      placeholder={copy.skillPlaceholder}
                      value={skill}
                      onChange={(e) => {
                        const skills = [...formData.skills];
                        skills[i] = e.target.value;
                        setFormData((f) => ({ ...f, skills }));
                      }}
                    />
                    {formData.skills.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500" onClick={() => {
                        setFormData((f) => ({ ...f, skills: f.skills.filter((_, idx) => idx !== i) }));
                      }}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              {!isCreateMode && (
                <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate(`/talent-search?jobId=${editingJob?.id}`)}>
                  {copy.findMatchingStudents}
                </Button>
              )}
            </TabsContent>

            {!isCreateMode && (
              <TabsContent value="applicants" className="space-y-3 mt-4">
                {editingJob && editingJob.applicants.length > 0 ? (
                  <>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{copy.applicantsHint}</p>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/applicants?jobId=${editingJob.id}`)}>
                      {copy.viewAllApplicants}
                    </Button>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noApplicants}
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>

          <SheetFooter className="mt-6 gap-2">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>{copy.cancel}</Button>
            {isCreateMode ? (
              <>
                <Button variant="secondary" onClick={() => handleSave(false)}>
                  <Save className="w-4 h-4 mr-2" />{copy.saveDraft}
                </Button>
                <Button onClick={() => handleSave(true)} className="bg-orange-500 hover:bg-orange-600 text-white">
                  <Send className="w-4 h-4 mr-2" />{copy.publish}
                </Button>
              </>
            ) : (
              <Button onClick={() => handleSave(false)} className="bg-orange-500 hover:bg-orange-600 text-white">
                <Save className="w-4 h-4 mr-2" />{copy.save}
              </Button>
            )}
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </motion.div>
  );
}
