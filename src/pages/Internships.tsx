import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Building, MapPin, CheckCircle,
  DollarSign, Search, ExternalLink, Bookmark,
  ChevronRight, Globe, ArrowUpRight, Sparkles,
  TrendingUp, Users, Share2, Clock, X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api, ApiError } from '@/lib/api';
import type { JobPosting } from '@/types';
import { mapJob } from '@/lib/live-mappers';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Internships() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedJobId, setSelectedJobId] = React.useState<string | null>(null);
  const [savedJobs, setSavedJobs] = React.useState<string[]>([]);
  const [filterType, setFilterType] = React.useState('all');
  const [jobs, setJobs] = React.useState<JobPosting[]>([]);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const navigate = useNavigate();

  const studentProfile = (user?.raw as any)?.studentProfile;
  const portfolio = studentProfile?.portfolio;
  const hasCV = Boolean(studentProfile?.cvUrl);
  const hasProjects = Boolean(portfolio?.projects?.length > 0);
  const hasSummary = Boolean(portfolio?.summary || portfolio?.summaryThai);
  const isPublic = portfolio?.isPublic !== false;
  const hasPortfolio = hasCV || (isPublic && hasProjects);

  React.useEffect(() => {
    let mounted = true;

    api.jobs
      .list()
      .then((response) => {
        if (!mounted) return;
        setJobs(response.jobs.map(mapJob).filter((job) => job.isActive && job.status === 'open'));
      })
      .catch((error) => {
        console.warn('Unable to load internship jobs from API', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const filteredJobs = jobs.filter(job => {
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'all' || job.type === filterType;
    return matchesSearch && matchesType;
  });

  const selectedJob = jobs.find(j => j.id === selectedJobId) || null;

  const toggleSaveJob = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setSavedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const isSaved = (jobId: string) => savedJobs.includes(jobId);

  const handleApplyClick = () => {
    if (!hasPortfolio) return;
    setIsPreviewOpen(true);
  };

  const handleConfirmApply = async () => {
    if (!selectedJob || user?.role !== 'student') return;

    try {
      await api.applications.create({ jobPostingId: selectedJob.id });
      toast({
        title: language === 'th' ? 'ส่งใบสมัครแล้ว' : 'Application Sent',
        description: selectedJob.title,
      });
      
      setJobs(prevJobs => prevJobs.map(j => 
        j.id === selectedJob.id 
          ? { ...j, applicants: [...j.applicants, { studentId: user.id, status: 'pending' } as any] } 
          : j
      ));
      
      setIsPreviewOpen(false);
    } catch (error) {
      toast({
        title: language === 'th' ? 'ส่งใบสมัครไม่สำเร็จ' : 'Failed to apply',
        description: error instanceof ApiError ? error.message : 'ไม่สามารถเชื่อมต่อระบบสมัครงานได้',
        variant: 'destructive',
      });
    }
  };

  type StatCardProps = {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    gradient: string;
  };

  const StatCard = ({ icon: Icon, label, value, gradient }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden rounded-3xl p-6 shadow-lg border border-white/20 ${gradient}`}
    >
      <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
      <div className="relative z-10 flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md border border-white/10 dark:bg-slate-900/50">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-white/70 text-xs font-medium">{label}</p>
          <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
        </div>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6 flex flex-col h-[calc(100vh-6rem)]"
    >
      <div className="flex-shrink-0">
        {/* Header Section - Matching Dashboard/Courses/Schedule Style */}
        <div className="flex flex-col md:flex-row justify-between items-end gap-6">
          <div>
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
            >
              <Briefcase className="w-4 h-4 text-blue-500 dark:text-slate-400" />
              <span>{t.internshipsPage.subtitle}</span>
            </motion.div>
            <motion.h1
              className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              {t.internshipsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t.internshipsPage.titleHighlight}</span>
            </motion.h1>
          </div>
        </div>

        {/* Bento Stats for Internships */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
          <StatCard icon={TrendingUp} label={t.internshipsPage.totalPositions} value={jobs.length} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
          <StatCard icon={Building} label={t.internshipsPage.partnerCompanies} value={new Set(jobs.map((job) => job.companyId)).size} gradient="bg-gradient-to-br from-violet-500 to-purple-600" />
          <StatCard icon={Users} label={t.internshipsPage.studentsPlaced} value={jobs.reduce((sum, job) => sum + job.applicants.length, 0)} gradient="bg-gradient-to-br from-emerald-400 to-teal-600" />
          <StatCard icon={Sparkles} label={t.internshipsPage.matchedForYou} value={filteredJobs.length} gradient="bg-gradient-to-br from-amber-400 to-orange-500" />
        </div>
      </div>

      <div className="flex-shrink-0 flex flex-col sm:flex-row gap-4 items-center bg-white/60 backdrop-blur-xl p-4 rounded-[2rem] shadow-sm border border-white/60 dark:border-slate-800/60 mt-2 dark:bg-slate-900/50">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <Input
            placeholder={t.internshipsPage.searchPlaceholder}
            className="pl-11 h-12 text-base border-none bg-slate-50/50 focus-visible:ring-0 rounded-2xl font-medium dark:bg-slate-900/50"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl w-full sm:w-auto">
          {[
            { id: 'all', label: t.internshipsPage.allTab },
            { id: 'internship', label: t.internshipsPage.internshipTab },
            { id: 'coop', label: t.internshipsPage.coopTab }
          ].map(opt => (
            <Button
              key={opt.id}
              variant="ghost"
              onClick={() => setFilterType(opt.id)}
              className={`rounded-xl h-10 px-6 flex-1 sm:flex-none font-bold transition-all ${filterType === opt.id ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-500'} dark:text-slate-400 dark:bg-slate-900/50`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-2 custom-scrollbar pb-6 relative z-0">
        {filteredJobs.length === 0 && (
          <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-8 text-center max-w-xl mx-auto mt-10">
            <Briefcase className="w-10 h-10 mx-auto text-slate-400 mb-3" />
            <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีตำแหน่งฝึกงาน</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เมื่อบริษัทเปิดรับสมัคร ตำแหน่งจาก backend จะแสดงที่นี่</p>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredJobs.map((job) => (
            <motion.div
              layoutId={`job-card-${job.id}`}
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              whileHover={{ scale: 1.02, y: -4 }}
              className="p-6 rounded-[2rem] border bg-white/70 backdrop-blur-sm border-white/60 dark:border-slate-800/60 hover:border-indigo-200 hover:shadow-xl dark:bg-slate-900/50 cursor-pointer flex flex-col group transition-colors duration-300 relative overflow-hidden"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-2xl bg-indigo-50 dark:bg-slate-900/50 transition-colors">
                  <Building className="w-8 h-8 text-indigo-600" />
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => toggleSaveJob(e, job.id)} className="rounded-xl hover:bg-slate-100 dark:bg-slate-900/50 z-10">
                  <Bookmark className={`w-5 h-5 ${isSaved(job.id) ? 'fill-yellow-400 text-yellow-400' : 'text-slate-300'}`} />
                </Button>
              </div>

              <h3 className="text-xl font-bold mb-1 tracking-tight text-slate-900 dark:text-white line-clamp-1">{job.title}</h3>
              <p className="text-sm mb-5 font-medium text-slate-500 dark:text-slate-400 line-clamp-1">{job.companyName}</p>

              <div className="flex flex-col gap-2 mb-4 text-sm mt-auto">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>{new Date(job.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 items-center mt-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Badge variant="secondary" className="rounded-lg px-2.5 py-0.5 border-0 bg-slate-100 text-slate-600 dark:text-slate-400 dark:bg-slate-900/50">
                  {job.type === 'internship' ? t.internshipsPage.internshipTab : t.internshipsPage.coopTab}
                </Badge>
                <div className="ml-auto text-lg font-black tracking-tight text-emerald-600">
                  {job.salary || t.internshipsPage.negotiable}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {selectedJob && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40" 
              onClick={() => setSelectedJobId(null)}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 pointer-events-none">
              <motion.div
                layoutId={`job-card-${selectedJob.id}`}
                className="bg-white/95 backdrop-blur-2xl rounded-[2.5rem] border border-white/80 shadow-2xl overflow-hidden flex flex-col w-full max-w-4xl h-[90vh] sm:h-[85vh] pointer-events-auto dark:bg-slate-900/95 dark:border-slate-700 relative"
              >
                <ScrollArea className="flex-1">
                  <div className="relative h-56 bg-slate-900">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <Button 
                      className="absolute top-6 right-6 z-50 bg-white/20 backdrop-blur-md rounded-full hover:bg-white/40 text-white border-0" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setSelectedJobId(null)}
                    >
                      <X className="w-5 h-5" />
                    </Button>
                    
                    <div className="absolute top-6 right-20 flex gap-3 z-50">
                      <Button variant="secondary" size="icon" className="rounded-xl bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-md dark:bg-slate-900/50">
                        <Share2 className="w-5 h-5" />
                      </Button>
                      <Button variant="secondary" size="icon" onClick={(e) => toggleSaveJob(e, selectedJob.id)} className="rounded-xl bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-md dark:bg-slate-900/50">
                        <Bookmark className={`w-5 h-5 ${isSaved(selectedJob.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  <div className="px-6 sm:px-10 -mt-20 pb-10 relative z-10">
                    <div className="w-28 h-28 sm:w-36 sm:h-36 bg-white dark:bg-slate-900 rounded-[2rem] p-6 sm:p-8 shadow-2xl mb-6 sm:mb-8 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                      <Building className="w-12 h-12 sm:w-16 sm:h-16 text-slate-800 dark:text-slate-200" />
                    </div>

                    <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{selectedJob.title}</h1>
                    <div className="flex items-center gap-2 text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 font-bold">
                      {selectedJob.companyName}
                      <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <span className="text-indigo-600 dark:text-slate-300">{selectedJob.location}</span>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-12">
                      {[
                        { label: t.internshipsPage.jobType, value: selectedJob.type === 'internship' ? t.internshipsPage.internshipTab : t.internshipsPage.coopTab, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: t.internshipsPage.locationLabel, value: selectedJob.workType || 'On-site', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: t.internshipsPage.salary, value: selectedJob.salary || 'N/A', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Positions', value: selectedJob.positions?.toString() || '1', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Deadline', value: new Date(selectedJob.deadline).toLocaleDateString(), icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' }
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col items-center text-center">
                          <div className={`w-8 h-8 rounded-lg ${stat.bg} ${stat.color} flex items-center justify-center mb-2`}>
                            <stat.icon className="w-4 h-4" />
                          </div>
                          <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">{stat.label}</div>
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-12">
                      <section>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-5 tracking-tight flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-indigo-600 rounded-full" />
                          {t.internshipsPage.jobDescription}
                        </h3>
                        <div className="text-slate-700 leading-relaxed whitespace-pre-line text-base bg-slate-50/50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:text-slate-300 font-medium">
                          {selectedJob.description || '-'}
                        </div>
                      </section>

                      <section>
                        <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-6 tracking-tight flex items-center gap-3">
                          <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                          {t.internshipsPage.requirements} / Skills
                        </h3>
                        <div className="grid gap-3">
                          {[...(selectedJob.preferredSkills || []), ...(selectedJob.requirements || [])].filter(Boolean).map((req, i) => (
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-slate-50/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 transition-colors shadow-sm">
                              <CheckCircle className="w-6 h-6 text-emerald-500 shrink-0 mt-0.5 dark:text-slate-400" />
                              <span className="text-slate-700 font-medium dark:text-slate-300">{req}</span>
                            </div>
                          ))}
                          {[...(selectedJob.preferredSkills || []), ...(selectedJob.requirements || [])].filter(Boolean).length === 0 && (
                             <div className="text-slate-500 italic p-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">No specific skills required.</div>
                          )}
                        </div>
                      </section>
                    </div>

                    <div className="h-28" /> {/* Spacer */}
                  </div>
                </ScrollArea>

                {/* Sticky Footer Action */}
                <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8 bg-white/80 backdrop-blur-2xl border-t border-slate-200/60 dark:border-slate-800/60 flex flex-col sm:flex-row gap-4 justify-between items-center z-20 dark:bg-slate-900/80">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto rounded-2xl h-14 px-8 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:bg-slate-800">
                    <Globe className="w-5 h-5 mr-3" /> {t.internshipsPage.website}
                  </Button>
                  {(() => {
                    const hasApplied = selectedJob.applicants?.some(app => (app as any).studentId === user?.id || (app as any).userId === user?.id);
                    return (
                      <div className="relative group w-full sm:w-auto flex-1 sm:flex-none">
                        <Button 
                          size="lg" 
                          onClick={handleApplyClick} 
                          disabled={user?.role !== 'student' || hasApplied || !hasPortfolio} 
                          className={`w-full rounded-2xl h-14 px-8 sm:px-16 text-lg shadow-xl font-bold tracking-tight transform active:scale-95 transition-all ${hasApplied ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/40' : (!hasPortfolio ? 'bg-slate-300 dark:bg-slate-800 text-slate-500 dark:text-slate-600 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/40')}`}
                        >
                          {hasApplied ? (language === 'th' ? 'สมัครแล้ว' : 'Applied') : t.internshipsPage.applyNow}
                          {!hasApplied && !hasPortfolio && (language === 'th' ? ' (รอ Portfolio)' : ' (Needs Portfolio)')}
                          {!hasApplied && hasPortfolio && <ChevronRight className="w-5 h-5 ml-2" />}
                          {hasApplied && <CheckCircle className="w-5 h-5 ml-2" />}
                        </Button>
                        {!hasApplied && !hasPortfolio && (
                          <div className="absolute -top-12 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-xs py-2 px-3 rounded-lg whitespace-nowrap pointer-events-none z-50">
                            {!isPublic && !hasCV && hasProjects 
                              ? (language === 'th' ? 'กรุณาตั้งค่า Portfolio เป็น Public ก่อนกดสมัคร' : 'Please set your Portfolio to Public before applying') 
                              : (language === 'th' ? 'คุณต้องมีอย่างน้อย 1 โปรเจกต์ หรือแนบ CV ก่อนกดสมัคร' : 'You must have at least 1 project or a CV before applying')}
                            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </motion.div>
            </div>
          </>
        )}
      </AnimatePresence>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{language === 'th' ? 'ยืนยันการส่งใบสมัคร' : 'Confirm Application'}</DialogTitle>
            <DialogDescription>
              {language === 'th' 
                ? `ตรวจสอบข้อมูลของคุณก่อนส่งใบสมัครไปที่ ${selectedJob?.companyName}`
                : `Review your profile before submitting to ${selectedJob?.companyName}`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-slate-200 dark:border-slate-800">
                <span className="text-sm font-medium text-slate-500">{language === 'th' ? 'ตำแหน่งที่สมัคร' : 'Applying for'}</span>
                <span className="font-bold text-slate-900 dark:text-white">{selectedJob?.title}</span>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{language === 'th' ? 'ข้อมูลที่จะส่งให้บริษัทพิจารณา' : 'Information to be shared'}</h4>
                
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className={`w-4 h-4 ${hasCV ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={hasCV ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
                    {hasCV ? (language === 'th' ? 'แนบลิงก์ CV แล้ว' : 'CV Link Attached') : (language === 'th' ? 'ไม่ได้แนบ CV' : 'No CV Attached')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className={`w-4 h-4 ${hasProjects ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={hasProjects ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
                    {portfolio?.projects?.length > 0 
                      ? (language === 'th' ? `ผลงานโปรเจกต์ ${portfolio.projects.length} ชิ้น` : `${portfolio.projects.length} Projects included`)
                      : (language === 'th' ? 'ไม่มีผลงานโปรเจกต์' : 'No Projects included')}
                  </span>
                </div>
                
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle className={`w-4 h-4 ${hasSummary ? 'text-emerald-500' : 'text-slate-300'}`} />
                  <span className={hasSummary ? 'text-slate-700 dark:text-slate-300' : 'text-slate-400'}>
                    {hasSummary ? (language === 'th' ? 'มีข้อมูลแนะนำตัว (Summary)' : 'Profile Summary included') : (language === 'th' ? 'ไม่มีข้อมูลแนะนำตัว' : 'No Profile Summary')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <DialogFooter className="flex gap-2 sm:justify-between">
            <Button variant="outline" onClick={() => navigate('/portfolio')} className="w-full sm:w-auto">
              {language === 'th' ? 'แก้ไข Portfolio' : 'Edit Portfolio'}
            </Button>
            <div className="flex gap-2 w-full sm:w-auto mt-2 sm:mt-0">
              <Button variant="ghost" onClick={() => setIsPreviewOpen(false)}>
                {language === 'th' ? 'ยกเลิก' : 'Cancel'}
              </Button>
              <Button onClick={handleConfirmApply} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                {language === 'th' ? 'ยืนยันการสมัคร' : 'Confirm & Apply'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
