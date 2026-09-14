import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase, Building, MapPin, CheckCircle,
  DollarSign, Search, ExternalLink, Bookmark,
  ChevronRight, Globe, ArrowUpRight, Sparkles,
  TrendingUp, Users, Share2, Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api, ApiError } from '@/lib/api';
import type { JobPosting } from '@/types';
import { mapJob } from '@/lib/live-mappers';
import { useToast } from '@/hooks/use-toast';
<<<<<<< Updated upstream
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
=======
>>>>>>> Stashed changes

// Postings created without an explicit deadline (the norm since Job Postings
// dropped the deadline field for "continuous hiring") get a server-side
// placeholder ~5 years out so the DB column's NOT NULL constraint is
// satisfied. That placeholder must never render as a real date here.
const FAR_FUTURE_THRESHOLD_MS = 2 * 365 * 24 * 60 * 60 * 1000; // 2 years
const isOngoingDeadline = (deadline: Date | string) =>
  new Date(deadline).getTime() - Date.now() > FAR_FUTURE_THRESHOLD_MS;

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
  const { t } = useLanguage();
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
    accentColor: string;
    iconBg: string;
  };

  const StatCard = ({ icon: Icon, label, value, accentColor, iconBg }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative overflow-hidden rounded-2xl p-4 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center gap-3.5"
    >
      <div className={`p-2.5 rounded-xl ${iconBg} ${accentColor} border border-current/15 shrink-0`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium truncate">{label}</p>
        <h3 className="text-xl sm:text-2xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-5 pb-6"
    >
      {/* Page Header — Compact and aligned with ShowPro Standard */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-3">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1"
          >
            <Briefcase className="w-3.5 h-3.5 text-blue-500 dark:text-blue-400" />
            <span>{t.internshipsPage.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            {t.internshipsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 font-extrabold">{t.internshipsPage.titleHighlight}</span>
          </motion.h1>
        </div>
      </div>

      {/* Summary Stat Cards — Reduced height, restrained surfaces */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-3.5">
        <StatCard
          icon={TrendingUp}
          label={t.internshipsPage.totalPositions}
          value={jobs.length}
          accentColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10"
        />
        <StatCard
          icon={Building}
          label={t.internshipsPage.partnerCompanies}
          value={new Set(jobs.map((job) => job.companyId)).size}
          accentColor="text-purple-600 dark:text-purple-400"
          iconBg="bg-purple-500/10"
        />
        <StatCard
          icon={Users}
          label={t.internshipsPage.studentsPlaced}
          value={jobs.reduce((sum, job) => sum + job.applicants.length, 0)}
          accentColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          icon={Sparkles}
          label={t.internshipsPage.matchedForYou}
          value={filteredJobs.length}
          accentColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
      </div>

      {/* Flexible Search + Filter Segmented Control */}
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder={t.internshipsPage.searchPlaceholder}
            className="pl-10 h-10 text-xs sm:text-sm bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-xl font-medium focus-visible:ring-1 focus-visible:ring-blue-500"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        {/* Compact Segmented Control */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl border border-slate-200/70 dark:border-slate-700/60 w-full sm:w-auto shrink-0">
          {[
            { id: 'all', label: t.internshipsPage.allTab },
            { id: 'internship', label: t.internshipsPage.internshipTab },
            { id: 'coop', label: t.internshipsPage.coopTab }
          ].map(opt => (
            <Button
              key={opt.id}
              variant="ghost"
              size="sm"
              onClick={() => setFilterType(opt.id)}
              className={`rounded-lg h-8 px-3.5 text-xs font-semibold flex-1 sm:flex-none transition-all cursor-pointer ${
                filterType === opt.id
                  ? 'bg-white text-blue-600 dark:bg-slate-900 dark:text-blue-400 shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              {opt.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Main Content: 2-Column Job Board Layout (42% Left : 58% Right on Desktop) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Job List (~42% => 5 of 12 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3 max-h-[calc(100vh-18rem)] overflow-y-auto pr-1">
          {filteredJobs.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-[#0c1222] p-8 text-center">
              <Briefcase className="w-8 h-8 mx-auto text-slate-400 mb-2.5 opacity-60" />
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100">ยังไม่มีตำแหน่งฝึกงาน</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">เมื่อบริษัทเปิดรับสมัคร ตำแหน่งจาก backend จะแสดงที่นี่</p>
            </div>
          )}
          {filteredJobs.map((job) => {
            const isSelected = selectedJob?.id === job.id;

<<<<<<< Updated upstream
              <h3 className="text-xl font-bold mb-1 tracking-tight text-slate-900 dark:text-white line-clamp-1">{job.title}</h3>
              <p className="text-sm mb-5 font-medium text-slate-500 dark:text-slate-400 line-clamp-1">{job.companyName}</p>

              <div className="flex flex-col gap-2 mb-4 text-sm mt-auto">
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <MapPin className="w-4 h-4 shrink-0" />
                  <span className="truncate">{job.location}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {isOngoingDeadline(job.deadline)
                      ? (language === 'th' ? 'รับสมัครต่อเนื่อง' : 'Ongoing')
                      : new Date(job.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
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
=======
            return (
>>>>>>> Stashed changes
              <motion.div
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                whileHover={{ y: -1 }}
                transition={{ duration: 0.12 }}
                className={`p-4 rounded-2xl border transition-all duration-150 relative cursor-pointer ${
                  isSelected
                    ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-500/70 dark:border-blue-500/60 shadow-xs'
                    : 'bg-white dark:bg-[#0c1222] border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                {/* Active Indicator Strip */}
                {isSelected && (
                  <div className="absolute left-0 top-3 bottom-3 w-1 bg-blue-600 dark:bg-blue-500 rounded-r-full" />
                )}

                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-center shrink-0">
                      <Building className="w-4 h-4 text-slate-700 dark:text-slate-300" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 truncate tracking-tight">
                        {job.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                        {job.companyName}
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => toggleSaveJob(e, job.id)}
                    className="w-7 h-7 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 shrink-0"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved(job.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                  </Button>
                </div>

                <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10.5px] font-medium px-2 py-0.5 rounded-md border-0">
                      {job.type === 'internship' ? t.internshipsPage.internshipTab : t.internshipsPage.coopTab}
                    </Badge>
                    <span className="text-slate-400 text-[11px] truncate max-w-[110px] sm:max-w-none">
                      {job.location}
                    </span>
                  </div>

                  <div className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400 shrink-0">
                    {job.salary || t.internshipsPage.negotiable}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Right Column: Selected Job Detail Preview (~58% => 7 of 12 cols) */}
        <div className="lg:col-span-7 bg-white dark:bg-[#0c1222] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden flex flex-col min-h-[520px]">
          <AnimatePresence mode="wait">
            {selectedJob ? (
              <motion.div
                key={selectedJob.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.15 }}
                className="flex flex-col h-full"
              >
                {/* Hero Banner Header: 120px height with clean gradient */}
                <div className="relative h-28 bg-slate-900 overflow-hidden shrink-0">
                  <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80')] bg-cover bg-center opacity-35" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  <div className="absolute top-3 right-3 flex gap-2 z-10">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="w-8 h-8 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-white border border-slate-700/60 backdrop-blur-sm"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      onClick={(e) => toggleSaveJob(e, selectedJob.id)}
                      className="w-8 h-8 rounded-lg bg-slate-900/70 hover:bg-slate-900 text-white border border-slate-700/60 backdrop-blur-sm"
                    >
                      <Bookmark className={`w-3.5 h-3.5 ${isSaved(selectedJob.id) ? 'fill-amber-400 text-amber-400' : ''}`} />
                    </Button>
                  </div>
                </div>

                {/* Job Info Body: Logo and Title placed cleanly on the white surface */}
                <div className="p-5 relative z-10 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Logo & Title Header Container */}
                    <div className="flex items-center gap-3.5 -mt-10 mb-4">
                      {/* Compact Company Logo: elevated above banner */}
                      <div className="w-16 h-16 bg-white dark:bg-[#0c1222] rounded-xl p-3 shadow-md flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shrink-0 z-20">
                        <Building className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>

                      {/* Title & Company Info: Purely on card surface, 100% visible in dark & light mode */}
                      <div className="min-w-0 pt-7">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug">
                          {selectedJob.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                          <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedJob.companyName}</span>
                          <span>•</span>
                          <span className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {selectedJob.location}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Compact Metadata Strip (4 Columns) */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4">
                      {[
<<<<<<< Updated upstream
                        { label: t.internshipsPage.jobType, value: selectedJob.type === 'internship' ? t.internshipsPage.internshipTab : t.internshipsPage.coopTab, icon: Briefcase, color: 'text-blue-600', bg: 'bg-blue-50' },
                        { label: t.internshipsPage.locationLabel, value: selectedJob.workType || 'On-site', icon: MapPin, color: 'text-purple-600', bg: 'bg-purple-50' },
                        { label: t.internshipsPage.salary, value: selectedJob.salary || 'N/A', icon: DollarSign, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                        { label: 'Positions', value: selectedJob.positions?.toString() || '1', icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                        { label: 'Deadline', value: new Date(selectedJob.deadline).toLocaleDateString(), icon: Clock, color: 'text-rose-600', bg: 'bg-rose-50' }
=======
                        { label: t.internshipsPage.jobType, value: selectedJob.type === 'internship' ? t.internshipsPage.internshipTab : t.internshipsPage.coopTab, icon: Briefcase, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-500/10' },
                        { label: t.internshipsPage.locationLabel, value: selectedJob.workType || 'On-site', icon: MapPin, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-500/10' },
                        { label: t.internshipsPage.salary, value: selectedJob.salary || 'N/A', icon: DollarSign, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-500/10' },
                        { label: t.internshipsPage.duration, value: t.internshipsPage.durationValue, icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-500/10' }
>>>>>>> Stashed changes
                      ].map((stat, i) => (
                        <div key={i} className="p-2.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/70">
                          <div className="flex items-center gap-1.5 mb-1">
                            <div className={`w-5 h-5 rounded-md ${stat.bg} ${stat.color} flex items-center justify-center shrink-0`}>
                              <stat.icon className="w-3 h-3" />
                            </div>
                            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider">{stat.label}</span>
                          </div>
                          <div className="font-bold text-xs text-slate-900 dark:text-slate-100 truncate pl-0.5">{stat.value}</div>
                        </div>
                      ))}
                    </div>

                    {/* Job Description & Requirements */}
                    <div className="space-y-4 pt-2">
                      <section>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          {t.internshipsPage.jobDescription}
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed bg-slate-50/60 dark:bg-slate-900/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800/70">
                          {selectedJob.description}
                        </p>
                      </section>

                      {selectedJob.requirements && selectedJob.requirements.length > 0 && (
                        <section>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            {t.internshipsPage.requirements}
                          </h4>
                          <div className="grid gap-1.5">
                            {selectedJob.requirements.map((req, i) => (
                              <div key={i} className="flex items-start gap-2.5 p-2 rounded-lg bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/60 text-xs text-slate-700 dark:text-slate-300">
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                                <span>{req}</span>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}
                    </div>
                  </div>

                  {/* Actions Bar at bottom of detail panel: Primary CTA vs Secondary Website */}
                  <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-3">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl h-10 px-4 border-slate-200/80 dark:border-slate-800 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors shrink-0"
                    >
                      <Globe className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
                      {t.internshipsPage.website}
                    </Button>

                    <Button
                      size="sm"
                      onClick={handleApply}
                      disabled={user?.role !== 'student'}
                      className="rounded-xl h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition-all flex items-center gap-1.5"
                    >
                      <span>{t.internshipsPage.applyNow}</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
                <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800/60 rounded-2xl flex items-center justify-center mb-3 border border-slate-200/60 dark:border-slate-700/60">
                  <Briefcase className="w-8 h-8 opacity-40 text-slate-400" />
                </div>
                <p className="font-bold text-sm text-slate-700 dark:text-slate-200">{t.internshipsPage.selectToView}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{t.internshipsPage.findYourFuture}</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
