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

  const selectedJob = jobs.find(j => j.id === selectedJobId) || filteredJobs[0];

  const toggleSaveJob = (e: React.MouseEvent, jobId: string) => {
    e.stopPropagation();
    setSavedJobs(prev =>
      prev.includes(jobId) ? prev.filter(id => id !== jobId) : [...prev, jobId]
    );
  };

  const isSaved = (jobId: string) => savedJobs.includes(jobId);

  const handleApply = async () => {
    if (!selectedJob || user?.role !== 'student') return;

    try {
      await api.applications.create({ jobPostingId: selectedJob.id });
      toast({
        title: 'ส่งใบสมัครแล้ว',
        description: selectedJob.title,
      });
    } catch (error) {
      toast({
        title: 'ส่งใบสมัครไม่สำเร็จ',
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

      <div className="flex-1 min-h-0 grid grid-cols-12 gap-6 pb-2 overflow-hidden">
        {/* Job List */}
        <div className="col-span-12 lg:col-span-5 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
          {filteredJobs.length === 0 && (
            <div className="rounded-[2rem] border border-dashed border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-8 text-center">
              <Briefcase className="w-10 h-10 mx-auto text-slate-400 mb-3" />
              <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีตำแหน่งฝึกงาน</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เมื่อบริษัทเปิดรับสมัคร ตำแหน่งจาก backend จะแสดงที่นี่</p>
            </div>
          )}
          {filteredJobs.map((job) => (
            <motion.div
              key={job.id}
              onClick={() => setSelectedJobId(job.id)}
              whileHover={{ scale: 1.01, y: -2 }}
              className={`p-5 rounded-[2rem] border transition-all duration-300 relative overflow-hidden group ${selectedJob?.id === job.id
                ? 'bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10'
                : 'bg-white/70 backdrop-blur-sm border-white/60 dark:border-slate-800/60 hover:border-indigo-200 hover:shadow-xl'
                } dark:bg-slate-900/50`}
            >
              {selectedJob?.id === job.id && (
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              )}
              <div className="flex justify-between items-start mb-4 relative z-10">
                <div className={`p-3 rounded-2xl transition-colors ${selectedJob?.id === job.id ? 'bg-white/10 shadow-inner' : 'bg-indigo-50'} dark:bg-slate-900/50`}>
                  <Building className={`w-8 h-8 ${selectedJob?.id === job.id ? 'text-white' : 'text-indigo-600'}`} />
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => toggleSaveJob(e, job.id)} className={`rounded-xl transition-colors ${selectedJob?.id === job.id ? 'hover:bg-white/20' : 'hover:bg-slate-100'} dark:bg-slate-900/50`}>
                  <Bookmark className={`w-5 h-5 ${isSaved(job.id) ? 'fill-yellow-400 text-yellow-400' : selectedJob?.id === job.id ? 'text-white/50' : 'text-slate-300'}`} />
                </Button>
              </div>

              <h3 className={`text-xl font-bold mb-1 tracking-tight relative z-10 ${selectedJob?.id === job.id ? 'text-white' : 'text-slate-900'}`}>{job.title}</h3>
              <p className={`text-sm mb-5 font-medium relative z-10 ${selectedJob?.id === job.id ? 'text-white/70' : 'text-slate-500'} dark:text-slate-400`}>{job.companyName}</p>

              <div className="flex items-center gap-4 mb-3 relative z-10 text-sm">
                <div className={`flex items-center gap-1 ${selectedJob?.id === job.id ? 'text-white/80' : 'text-slate-500'} dark:text-slate-400`}>
                  <MapPin className="w-4 h-4" />
                  <span className="truncate max-w-[120px]">{job.location}</span>
                </div>
                <div className={`flex items-center gap-1 ${selectedJob?.id === job.id ? 'text-white/80' : 'text-slate-500'} dark:text-slate-400`}>
                  <Clock className="w-4 h-4" />
                  <span>{new Date(job.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 relative z-10 items-center">
                <Badge variant="secondary" className={`rounded-lg px-2.5 py-0.5 border-0 ${selectedJob?.id === job.id ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-600'} dark:text-slate-400 dark:bg-slate-900/50`}>
                  {job.type === 'internship' ? t.internshipsPage.internshipTab : t.internshipsPage.coopTab}
                </Badge>
                <div className={`ml-auto text-lg font-black tracking-tight ${selectedJob?.id === job.id ? 'text-emerald-400' : 'text-emerald-600'}`}>
                  {job.salary || t.internshipsPage.negotiable}
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Job Details Panel */}
        <div className={`lg:col-span-7 bg-white/70 backdrop-blur-xl rounded-[2.5rem] border border-white/80 shadow-sm overflow-hidden flex flex-col h-full relative dark:bg-slate-900/50 ${selectedJobId ? 'fixed inset-4 z-50 lg:static lg:inset-auto shadow-2xl' : 'hidden lg:flex'}`}>
          <AnimatePresence mode="wait">
            {selectedJob ? (
              <motion.div
                key={selectedJob.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col h-full"
              >
                <ScrollArea className="flex-1">
                  <div className="relative h-56 bg-slate-900">
                    <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    <div className="absolute top-6 right-6 flex gap-3">
                      <Button variant="secondary" size="icon" className="rounded-xl bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-md dark:bg-slate-900/50">
                        <Share2 className="w-5 h-5" />
                      </Button>
                      <Button variant="secondary" size="icon" onClick={(e) => toggleSaveJob(e, selectedJob.id)} className="rounded-xl bg-white/10 text-white hover:bg-white/20 border-0 backdrop-blur-md dark:bg-slate-900/50">
                        <Bookmark className={`w-5 h-5 ${isSaved(selectedJob.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                    </div>
                  </div>

                  <div className="px-10 -mt-20 pb-10 relative">
                    <div className="w-36 h-36 bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-2xl mb-8 flex items-center justify-center border border-slate-100 dark:border-slate-700">
                      <Building className="w-16 h-16 text-slate-800 dark:text-slate-200" />
                    </div>

                    <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2 tracking-tight">{selectedJob.title}</h1>
                    <div className="flex items-center gap-2 text-xl text-slate-600 dark:text-slate-400 mb-10 font-bold">
                      {selectedJob.companyName}
                      <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-800" />
                      <span className="text-indigo-600 dark:text-slate-300">{selectedJob.location}</span>
                    </div>

                    <Button className="lg:hidden absolute top-10 right-10 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md rounded-full shadow-lg border border-slate-200 dark:border-slate-700" variant="outline" size="icon" onClick={() => setSelectedJobId(null)}>
                       <X className="w-5 h-5 text-slate-700 dark:text-slate-300" />
                    </Button>
                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-12">
                      {[
                        { label: t.internshipsPage.jobType, value: selectedJob.type === 'internship' ? t.internshipsPage.internshipTab : t.internshipsPage.coopTab, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: t.internshipsPage.locationLabel, value: selectedJob.workType || 'On-site', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: t.internshipsPage.salary, value: selectedJob.salary || 'N/A', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Positions', value: selectedJob.positions?.toString() || '1', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Deadline', value: new Date(selectedJob.deadline).toLocaleDateString(), icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' }
                      ].map((stat, i) => (
                        <div key={i} className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center text-center">
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
                        <div className="text-slate-700 leading-relaxed whitespace-pre-line text-base bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm dark:text-slate-300 font-medium">
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
                            <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-emerald-200 transition-colors shadow-sm">
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
                <div className="absolute bottom-0 left-0 right-0 p-8 bg-white/60 backdrop-blur-2xl border-t border-white/60 dark:border-slate-800/60 flex justify-between items-center z-20 dark:bg-slate-900/50">
                  <Button variant="outline" size="lg" className="rounded-2xl h-14 px-8 border-slate-200 dark:border-slate-700 font-bold hover:bg-slate-50 dark:bg-slate-800">
                    <Globe className="w-5 h-5 mr-3" /> {t.internshipsPage.website}
                  </Button>
                  {(() => {
                    const hasApplied = selectedJob.applicants?.some(app => (app as any).studentId === user?.id || (app as any).userId === user?.id);
                    return (
                      <Button size="lg" onClick={handleApply} disabled={user?.role !== 'student' || hasApplied} className={`rounded-2xl h-14 px-16 text-lg shadow-2xl font-bold tracking-tight transform active:scale-95 transition-all ${hasApplied ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/40' : 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/40'}`}>
                        {hasApplied ? (language === 'th' ? 'สมัครแล้ว' : 'Applied') : t.internshipsPage.applyNow}
                        {!hasApplied && <ChevronRight className="w-5 h-5 ml-2" />}
                        {hasApplied && <CheckCircle className="w-5 h-5 ml-2" />}
                      </Button>
                    );
                  })()}
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
                <div className="w-24 h-24 bg-slate-50 dark:bg-slate-950 rounded-full flex items-center justify-center mb-6 border-2 border-dashed border-slate-200 dark:border-slate-700 shadow-inner">
                  <Briefcase className="w-12 h-12 opacity-20" />
                </div>
                <p className="font-bold text-lg">{t.internshipsPage.selectToView}</p>
                <p className="text-sm">{t.internshipsPage.findYourFuture}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
