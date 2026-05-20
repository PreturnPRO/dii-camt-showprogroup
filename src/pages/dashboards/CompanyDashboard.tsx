import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Briefcase, Users, FileText, Building, Send, Sparkles, BrainCircuit, Bookmark, PlusCircle, CheckCircle2, TrendingUp, BellRing, Target, Trophy, Flame } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { asArray, asDate, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapCompany, mapJob, mapStudent } from '@/lib/live-mappers';
import { toast } from 'sonner';
import type { Company, JobPosting, Student } from '@/types';


type RequirementRow = {
  id: string;
  title: string;
  skills: string[];
  type: string;
  status: string;
  matchCount: number;
};

type RecruitingNotification = {
  id: string;
  type: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
};

type MatchedStudent = Student & {
  matchScore: number;
  matchedSkills: string[];
  interested: boolean;
  exclusiveAccess: boolean;
};
type FollowedStudent = MatchedStudent & {
  followDate: string;
  thresholdMet: boolean;
};

const makeFallbackMatches = (): MatchedStudent[] => [];

const makeFallbackFollowed = (): FollowedStudent[] => [];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function CompanyDashboard() {
  const navigate = useNavigate();
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [company, setCompany] = useState<Company | null>(null);
  const [companyJobPostings, setCompanyJobPostings] = useState<JobPosting[]>([]);
  const [accessibleStudents, setAccessibleStudents] = useState<Student[]>([]);
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [notifications, setNotifications] = useState<RecruitingNotification[]>([]);
  const [followedStudents, setFollowedStudents] = useState<FollowedStudent[]>(makeFallbackFollowed);
  const [aiMatchedStudents, setAiMatchedStudents] = useState<MatchedStudent[]>(makeFallbackMatches);
  const [isLoading, setIsLoading] = useState(true);
  const [isRequirementOpen, setIsRequirementOpen] = useState(false);
  const [isSubmittingRequirement, setIsSubmittingRequirement] = useState(false);
  const [requirementForm, setRequirementForm] = useState({ title: '', skills: '', description: '' });
  const totalApplications = companyJobPostings.reduce((sum, job) => sum + job.applicants.length, 0);
  const companyName = language === 'th'
    ? (company?.companyNameThai || company?.companyName || user?.name || '')
    : (company?.companyName || company?.companyNameThai || user?.name || '');
  const copy = language === 'th'
    ? {
        submitRequirement: 'เธชเนเธ Requirement เนเธซเธกเน',
        submitRequirementTitle: 'เธชเนเธ Requirement เนเธซเธกเน',
        submitRequirementDesc: 'เธฃเธฐเธเธธเธเธ—เธเธฒเธ— เธ—เธฑเธเธฉเธฐ เนเธฅเธฐเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”เธเธฒเธเน€เธเธทเนเธญเนเธซเนเธฃเธฐเธเธเธเนเธงเธขเธเธฑเธเธเธนเนเธเธฑเธเธเธฑเธเธจเธถเธเธฉเธฒ',
        role: 'เนเธเธฃเน€เธเธเธ•เน/เธ•เธณเนเธซเธเนเธ',
        skills: 'เธ—เธฑเธเธฉเธฐเธซเธฅเธฑเธ',
        details: 'เธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”',
        submitToAi: 'เธชเนเธเนเธซเน AI Matching',
        liveAlerts: 'เนเธเนเธเน€เธ•เธทเธญเธเธเธฒเธฃเธชเธฃเธฃเธซเธฒ',
        new: 'เนเธซเธกเน',
        viewDetails: 'เธ”เธนเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”',
        requirements: 'Requirements เนเธฅเธฐ AI Matches',
        followed: 'Talent เธ—เธตเนเธ•เธดเธ”เธ•เธฒเธก',
        activeRequirements: 'Requirements เธ—เธตเนเน€เธเธดเธ”เธญเธขเธนเน',
        total: 'เธ—เธฑเนเธเธซเธกเธ”',
        postedCriteria: 'เน€เธเธทเนเธญเธเนเธเธ—เธตเนเธเธฃเธฐเธเธฒเธจเนเธงเนเธชเธณเธซเธฃเธฑเธเธเธฑเธเธเธนเนเธเธฑเธเธจเธถเธเธฉเธฒ',
        matches: 'Matches',
        aiTalentMatching: 'AI Talent Matching',
        bestMatches: 'เธเธฑเธเธจเธถเธเธฉเธฒเธ—เธตเนเน€เธซเธกเธฒเธฐเธเธฑเธ Requirement เธเธญเธเธเธธเธ“เธ—เธตเนเธชเธธเธ”',
        exclusiveAccess: 'เธชเธดเธ—เธเธดเนเน€เธเนเธฒเธ–เธถเธเธเธดเน€เธจเธฉ',
        fastTrackOffer: 'เธชเนเธเธเนเธญเน€เธชเธเธญเน€เธฃเนเธง',
        follow: 'เธ•เธดเธ”เธ•เธฒเธก',
        viewProfile: 'เธ”เธนเนเธเธฃเนเธเธฅเน',
        trackedProgress: 'เธ•เธดเธ”เธ•เธฒเธกเธเธงเธฒเธกเธเธทเธเธซเธเนเธฒเธเธญเธเธเธฑเธเธจเธถเธเธฉเธฒเธ—เธตเนเธชเธเนเธ',
        followedDate: 'เธ•เธดเธ”เธ•เธฒเธกเน€เธกเธทเนเธญ',
        currentGpa: 'GPA เธเธฑเธเธเธธเธเธฑเธ',
        profileOverview: 'เธ”เธนเนเธเธฃเนเธเธฅเน',
        noJobs: 'เธขเธฑเธเนเธกเนเธกเธตเธเธฃเธฐเธเธฒเธจเธเธฒเธเธเธฒเธ API',
        noStudents: 'เธขเธฑเธเนเธกเนเธกเธตเธเธฑเธเธจเธถเธเธฉเธฒเธ—เธตเนเน€เธเธดเธ”เธชเธดเธ—เธเธดเนเนเธซเนเธ”เธน',
        noRequirements: 'เธขเธฑเธเนเธกเนเธกเธต Requirement',
        noMatches: 'เธขเธฑเธเนเธกเนเธกเธตเธเธฅเธเธฑเธเธเธนเนเธเธฒเธ AI',
        noFollowed: 'เธขเธฑเธเนเธกเนเธกเธต Talent เธ—เธตเนเธ•เธดเธ”เธ•เธฒเธก',
        noAlerts: 'เธขเธฑเธเนเธกเนเธกเธตเนเธเนเธเน€เธ•เธทเธญเธเธเธฒเธฃเธชเธฃเธฃเธซเธฒ',
      }
    : {
        submitRequirement: 'Submit Requirement',
        submitRequirementTitle: 'Submit New Requirement',
        submitRequirementDesc: 'Post a role, skills, and details so AI can match you with students.',
        role: 'Project/Role',
        skills: 'Key Skills',
        details: 'Details',
        submitToAi: 'Submit to AI Match',
        liveAlerts: 'Live Recruiting Alerts',
        new: 'New',
        viewDetails: 'View Details',
        requirements: 'Requirements & AI Matches',
        followed: 'Followed Talents',
        activeRequirements: 'Active Requirements',
        total: 'Total',
        postedCriteria: 'Your posted criteria for talent matching.',
        matches: 'Matches',
        aiTalentMatching: 'AI Talent Matching',
        bestMatches: 'Best matching students based on your active requirements.',
        exclusiveAccess: 'Exclusive Access',
        fastTrackOffer: 'Fast-track Offer',
        follow: 'Follow',
        viewProfile: 'View Profile',
        trackedProgress: 'Track the long-term progress of promising students.',
        followedDate: 'Followed',
        currentGpa: 'Current GPA',
        profileOverview: 'Profile Overview',
        noJobs: 'No job postings from API yet.',
        noStudents: 'No students have granted access yet.',
        noRequirements: 'No requirements yet.',
        noMatches: 'No AI matches yet.',
        noFollowed: 'No followed talents yet.',
        noAlerts: 'No recruiting alerts yet.',
      };

  React.useEffect(() => {
    let isMounted = true;
    setIsLoading(true);

    Promise.allSettled([api.auth.me(), api.jobs.list(), api.talent.search(), api.notifications.list(), api.students.profiles()])
      .then(([profileResponse, jobsResponse, talentsResponse, notificationsResponse, studentProfilesResponse]) => {
        if (!isMounted) return;

        if (profileResponse.status === 'fulfilled') {
          const profile = asRecord(profileResponse.value.user.companyProfile);
          const profileUser = asRecord(profileResponse.value.user);
          setCompany(mapCompany({
            ...profile,
            companyName: asString(profile.companyName, asString(profileUser.name, user?.name || '-')),
            companyNameThai: asString(profile.companyNameThai, asString(profileUser.nameThai, asString(profileUser.name, user?.name || '-'))),
            industry: asString(profile.industry, '-'),
            size: asString(profile.size, 'medium'),
            internshipSlots: asNumber(profile.internshipSlots, 0),
            currentInterns: asNumber(profile.currentInterns, 0),
            studentViewConsent: asArray(profile.studentViewConsent),
            user: profileResponse.value.user,
          }));
        }

        if (jobsResponse.status === 'fulfilled') {
          const mappedJobs = jobsResponse.value.jobs.map(mapJob);
          setCompanyJobPostings(mappedJobs);

          const mappedRequirements = mappedJobs.map((job) => {
            const skills = [...job.preferredSkills, ...job.requirements].filter(Boolean);

            return {
              id: job.id,
              title: job.title,
              skills: skills.slice(0, 5),
              type: job.type,
              status: job.status,
              matchCount: job.applicants.length,
            };
          });

          setRequirements(mappedRequirements);
        }

        if (studentProfilesResponse.status === 'fulfilled') {
          const visibleStudents = studentProfilesResponse.value.profiles.map(mapStudent);
          setAccessibleStudents(visibleStudents);
        }

        if (talentsResponse.status === 'fulfilled') {
          const mappedTalents = talentsResponse.value.talents.map((item, index) => {
            const talent = asRecord(item);
            const mappedStudent = mapStudent(item, index);
            const skills = asArray<string>(talent.matchedSkills).length ? asArray<string>(talent.matchedSkills) : asArray<string>(talent.skills);

            return {
              ...mappedStudent,
              id: asString(talent.id, mappedStudent.id),
              name: asString(talent.name, mappedStudent.name),
              nameThai: asString(talent.nameThai, asString(talent.name, mappedStudent.nameThai)),
              studentId: asString(talent.studentId, mappedStudent.studentId),
              year: asNumber(talent.year, mappedStudent.year),
              gpa: asNumber(talent.gpa, asNumber(talent.gpax, mappedStudent.gpa)),
              gpax: asNumber(talent.gpax, mappedStudent.gpax),
              major: asString(talent.major, mappedStudent.major),
              matchScore: asNumber(talent.matchScore, 0),
              matchedSkills: skills.slice(0, 5),
              interested: Boolean(talent.interested),
              exclusiveAccess: index === 0,
            };
          });

          setAiMatchedStudents(mappedTalents);
          setFollowedStudents(mappedTalents.slice(0, 2).map((student) => ({
            ...student,
            followDate: new Date().toISOString().slice(0, 10),
            thresholdMet: student.gpa >= 3.5,
          })));
        }

        if (notificationsResponse.status === 'fulfilled') {
          const mappedNotifications = notificationsResponse.value.notifications.slice(0, 3).map((item) => {
            const source = asRecord(item);

            return {
              id: asString(source.id),
              type: asString(source.type, 'info'),
              message: language === 'th'
                ? asString(source.messageThai, asString(source.message, '-'))
                : asString(source.message, asString(source.messageThai, '-')),
              time: asDate(source.createdAt).toLocaleString(language === 'th' ? 'th-TH' : 'en-US'),
              read: Boolean(source.isRead),
              actionUrl: asString(source.actionUrl),
            };
          });

          setNotifications(mappedNotifications);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [language, user?.id, user?.name]);

  const handleSubmitRequirement = async () => {
    const skills = requirementForm.skills.split(',').map(skill => skill.trim()).filter(Boolean);
    if (!requirementForm.title.trim() || !requirementForm.description.trim()) {
      toast.error(language === 'th' ? 'เธเธฃเธธเธ“เธฒเธเธฃเธญเธเธ•เธณเนเธซเธเนเธเนเธฅเธฐเธฃเธฒเธขเธฅเธฐเน€เธญเธตเธขเธ”' : 'Please enter a role and details.');
      return;
    }

    setIsSubmittingRequirement(true);
    try {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      const response = await api.jobs.create({
        title: requirementForm.title.trim(),
        type: 'internship',
        positions: 1,
        description: requirementForm.description.trim(),
        responsibilities: [],
        requirements: skills,
        preferredSkills: skills,
        salary: '',
        benefits: [],
        location: company?.address || 'Hybrid',
        workType: 'hybrid',
        deadline: deadline.toISOString(),
        status: 'open',
      });
      const createdJob = mapJob(response.job);
      setCompanyJobPostings(current => [createdJob, ...current]);
      setRequirements(current => [{
        id: createdJob.id,
        title: createdJob.title,
        skills: [...createdJob.preferredSkills, ...createdJob.requirements].filter(Boolean).slice(0, 5),
        type: createdJob.type,
        status: createdJob.status,
        matchCount: createdJob.applicants.length,
      }, ...current]);
      setRequirementForm({ title: '', skills: '', description: '' });
      setIsRequirementOpen(false);
      toast.success(language === 'th' ? 'เธชเนเธ Requirement เนเธฅเนเธง' : 'Requirement submitted.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : (language === 'th' ? 'เธชเนเธ Requirement เนเธกเนเธชเธณเน€เธฃเนเธ' : 'Unable to submit requirement.'));
    } finally {
      setIsSubmittingRequirement(false);
    }
  };

  const handleOpenAlert = async (notification: RecruitingNotification) => {
    setNotifications(current => current.map(item => item.id === notification.id ? { ...item, read: true } : item));
    if (notification.id) {
      api.notifications.markRead(notification.id).catch(() => undefined);
    }
    navigate(notification.actionUrl || '/notifications');
  };

  if (isLoading) {
    return (
      <div className="space-y-8 pb-10">
        <div className="h-28 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[0, 1, 2, 3].map(item => <div key={item} className="h-40 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />)}
        </div>
        <div className="h-96 rounded-3xl bg-slate-100 dark:bg-slate-900 animate-pulse" />
      </div>
    );
  }

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
            <Building className="w-4 h-4 text-orange-500 dark:text-slate-400" />
            <span>{company?.industry || '-'} / {company?.size || '-'}</span>
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            {t.companyDashboard.hello} <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-amber-500">{companyName || '-'}</span>
          </motion.h1>
        </div>

        <motion.div className="flex gap-3" variants={itemVariants}>
          <Dialog open={isRequirementOpen} onOpenChange={setIsRequirementOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 dark:border-orange-900 dark:text-orange-400 dark:hover:bg-orange-950">
                <PlusCircle className="w-4 h-4 mr-2" />
                {copy.submitRequirement}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{copy.submitRequirementTitle}</DialogTitle>
                <DialogDescription>
                  {copy.submitRequirementDesc}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="title" className="text-right">{copy.role}</Label>
                  <Input id="title" value={requirementForm.title} onChange={(event) => setRequirementForm(current => ({ ...current, title: event.target.value }))} placeholder="e.g. Frontend Intern" className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="skills" className="text-right">{copy.skills}</Label>
                  <Input id="skills" value={requirementForm.skills} onChange={(event) => setRequirementForm(current => ({ ...current, skills: event.target.value }))} placeholder="React, Node, etc." className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="desc" className="text-right">{copy.details}</Label>
                  <Textarea id="desc" value={requirementForm.description} onChange={(event) => setRequirementForm(current => ({ ...current, description: event.target.value }))} placeholder="Briefly describe what you are looking for..." className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" disabled={isSubmittingRequirement} onClick={handleSubmitRequirement} className="bg-orange-500 hover:bg-orange-600 text-white">{copy.submitToAi}</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Link to="/job-postings">
            <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
              <Send className="w-4 h-4 mr-2" />{t.companyDashboard.postJob}
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* Stats Grid - Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => navigate('/job-postings')}
          className="p-6 rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-xl shadow-orange-500/20 relative overflow-hidden cursor-pointer"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white dark:bg-slate-900/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900/20 backdrop-blur-sm">
                <Briefcase className="w-6 h-6" />
              </div>
              <span className="font-medium text-white/90">{t.companyDashboard.jobPositions}</span>
            </div>
            <div className="text-5xl font-bold tracking-tight">{companyJobPostings.length}</div>
            <div className="mt-3 text-sm text-orange-100 flex items-center gap-1">
              <Sparkles className="w-4 h-4" />
              {t.companyDashboard.openPositions}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => navigate('/applicants')}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group cursor-pointer"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Users className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-400">{t.companyDashboard.applicantsLabel}</span>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{totalApplications}</div>
            <div className="mt-3 text-sm text-slate-400">
              {t.companyDashboard.totalApplicants}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => navigate('/student-profiles')}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group cursor-pointer"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                <FileText className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-400">{t.companyDashboard.accessibleStudents}</span>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">{accessibleStudents.length}</div>
            <div className="mt-3 text-sm text-slate-400">
              {t.companyDashboard.byConsent}
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={itemVariants}
          whileHover={{ y: -5 }}
          onClick={() => navigate('/intern-tracking')}
          className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group cursor-pointer"
        >
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                <Building className="w-6 h-6" />
              </div>
              <span className="font-medium text-slate-600 dark:text-slate-400">{t.companyDashboard.interns}</span>
            </div>
            <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{company?.currentInterns ?? 0}/{company?.internshipSlots ?? 0}</div>
            <div className="mt-3 text-sm text-slate-400">
              {t.companyDashboard.current}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Threshold Notifications & Alerts Section */}
      <motion.div variants={itemVariants} className="bg-slate-900/5 dark:bg-slate-900/40 rounded-3xl p-6 border border-slate-200/50 dark:border-slate-800/50 backdrop-blur-xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BellRing className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{copy.liveAlerts}</h3>
            <Badge variant="secondary" className="bg-rose-100 text-rose-700 hover:bg-rose-100 dark:bg-rose-900/30 dark:text-rose-400">{notifications.filter(n => !n.read).length} {copy.new}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {notifications.map(notification => (
            <div key={notification.id} className={`relative p-4 border rounded-2xl ${notification.read ? 'bg-white/40 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800' : 'bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800/50 shadow-sm'} ${notification.type === 'threshold' ? 'ring-1 ring-emerald-400/50' : ''}`}>
              {!notification.read && <div className="absolute top-4 right-4 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />}
              <div className="flex gap-3 mb-2">
                 {notification.type === 'interest' ? <Target className="w-5 h-5 text-blue-500" /> : notification.type === 'threshold' ? <Trophy className="w-5 h-5 text-emerald-500" /> : <Flame className="w-5 h-5 text-orange-500" />}
                 <span className={`text-xs font-semibold uppercase tracking-wider ${notification.type === 'interest' ? 'text-blue-500' : notification.type === 'threshold' ? 'text-emerald-500' : 'text-orange-500'}`}>{notification.type}</span>
              </div>
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300 leading-snug">{notification.message}</p>
              <div className="mt-4 flex justify-between items-center text-xs text-slate-500 dark:text-slate-400">
                <span>{notification.time}</span>
                <button onClick={() => handleOpenAlert(notification)} className="font-semibold text-purple-600 hover:text-purple-700 dark:text-purple-400 dark:hover:text-purple-300">{copy.viewDetails}</button>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="md:col-span-3 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
              {copy.noAlerts}
            </div>
          )}
        </div>
      </motion.div>

      <motion.div variants={itemVariants}>
        <Tabs defaultValue="requirements" className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-2 p-1">
            <TabsTrigger value="jobs">{t.companyDashboard.ourJobs}</TabsTrigger>
            <TabsTrigger value="requirements">{copy.requirements}</TabsTrigger>
            <TabsTrigger value="students">{t.companyDashboard.accessibleStudentsTab}</TabsTrigger>
            <TabsTrigger value="followed">{copy.followed}</TabsTrigger>
          </TabsList>

          <TabsContent value="jobs">
            <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.companyDashboard.ourJobs}</CardTitle>
                <CardDescription>{companyJobPostings.length} {t.companyDashboard.positions}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {companyJobPostings.map(job => (
                  <div key={job.id} className="border border-slate-200 dark:border-slate-800 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-lg">{job.title}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{job.type === 'internship' ? t.companyDashboard.internship : t.companyDashboard.fullTime} โ€ข {job.location}</p>
                      </div>
                      <Badge variant={job.status === 'open' ? 'default' : 'secondary'}>{job.status === 'open' ? t.companyDashboard.open : t.companyDashboard.closed}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-4 mb-3">
                      <div><div className="text-xs text-gray-600 dark:text-gray-400">{t.common.position}</div><div className="font-semibold">{job.positions} {t.companyDashboard.positionsCount}</div></div>
                      <div><div className="text-xs text-gray-600 dark:text-gray-400">{t.companyDashboard.applicantsLabel}</div><div className="font-semibold">{job.applicants.length} {t.common.person}</div></div>
                      <div><div className="text-xs text-gray-600 dark:text-gray-400">{t.companyDashboard.closeDate}</div><div className="font-semibold">{new Date(job.deadline).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { month: 'short', day: 'numeric' })}</div></div>
                    </div>
                    <Button size="sm" variant="outline" className="w-full" onClick={() => navigate('/applicants')}>{t.companyDashboard.viewApplicants}</Button>
                  </div>
                ))}
                {companyJobPostings.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noJobs}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students">
            <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <CardTitle>{t.companyDashboard.accessibleStudentsTab}</CardTitle>
                <CardDescription>{accessibleStudents.length} {t.common.person} ({t.companyDashboard.byConsent})</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {accessibleStudents.map(student => (
                  <div key={student.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                        <span className="text-lg font-bold text-white">{student.nameThai.charAt(0)}</span>
                      </div>
                      <div>
                        <div className="font-semibold">{student.nameThai}</div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">{t.companyDashboard.year} {student.year} โ€ข GPA {student.gpa.toFixed(2)}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => navigate('/student-profiles')}>{t.companyDashboard.viewProfile}</Button>
                  </div>
                ))}
                {accessibleStudents.length === 0 && (
                  <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                    {copy.noStudents}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="requirements">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="space-y-4 lg:col-span-1">
                <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>{copy.activeRequirements}</CardTitle>
                      <Badge variant="outline" className="bg-orange-50 text-orange-600 border-none px-2 dark:bg-orange-950/40 dark:text-orange-300">{requirements.length} {copy.total}</Badge>
                    </div>
                    <CardDescription>{copy.postedCriteria}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {requirements.map(req => (
                      <div key={req.id} className="p-4 border rounded-xl hover:bg-slate-50 dark:bg-slate-900 transition-colors cursor-pointer group dark:hover:bg-slate-800">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-semibold text-slate-800 dark:text-slate-100 group-hover:text-orange-600 transition-colors">{req.title}</h4>
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-200">{req.status}</Badge>
                        </div>
                        <div className="flex flex-wrap gap-1 mb-3">
                          {req.skills.map(s => <Badge key={s} variant="secondary" className="px-1.5 py-0 text-xs">{s}</Badge>)}
                        </div>
                        <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                          <span className="flex items-center gap-1"><BrainCircuit className="w-3.5 h-3.5" /> {req.matchCount} {copy.matches}</span>
                          <span>{req.type}</span>
                        </div>
                      </div>
                    ))}
                    {requirements.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {copy.noRequirements}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div className="lg:col-span-2">
                <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm h-full">
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-orange-500 dark:text-slate-400" />
                      <CardTitle>{copy.aiTalentMatching}</CardTitle>
                    </div>
                    <CardDescription>{copy.bestMatches}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {aiMatchedStudents.map(student => (
                      <div key={student.id} className="flex flex-col sm:flex-row gap-4 p-4 border rounded-xl items-center sm:items-start bg-gradient-to-r from-transparent to-orange-50/30 dark:to-orange-950/20">
                        <div className="relative">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center shadow-lg">
                            <span className="text-xl font-bold text-white">{student.nameThai.charAt(0)}</span>
                          </div>
                          <div className="absolute -bottom-2 -right-2 bg-white dark:bg-slate-900 rounded-full p-1 shadow">
                            <Badge className="bg-orange-500 hover:bg-orange-600 border-none text-xs">{student.matchScore}%</Badge>
                          </div>
                        </div>
                        <div className="flex-1 text-center sm:text-left">
                          <div className="flex flex-col sm:flex-row items-center sm:justify-start gap-2 mb-1">
                            <h4 className="font-semibold text-lg text-slate-800 dark:text-white">{student.nameThai}</h4>
                            {student.exclusiveAccess && <Badge variant="outline" className="bg-amber-100/50 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700 text-[10px] shadow-sm py-0"><Flame className="w-3 h-3 mr-1 text-orange-500" /> {copy.exclusiveAccess}</Badge>}
                          </div>
                          <p className="text-sm border-b pb-2 mb-2 text-slate-500 dark:text-slate-400">{t.companyDashboard.year} {student.year} โ€ข GPA {student.gpa.toFixed(2)} โ€ข {student.major}</p>
                          <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-green-600 dark:text-green-500 mt-2 font-medium">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>{copy.skills}: {student.matchedSkills.length ? student.matchedSkills.join(', ') : '-'}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                          {student.exclusiveAccess ? (
                             <Button size="sm" onClick={() => navigate('/messages')} className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg shadow-amber-500/30 group border-0">
                               <Send className="w-3.5 h-3.5 mr-1.5 group-hover:scale-110 transition-transform" /> {copy.fastTrackOffer}
                             </Button>
                          ) : (
                             <Button
                               size="sm"
                               onClick={() => {
                                 setFollowedStudents(current => current.some(item => item.id === student.id) ? current : [{ ...student, followDate: new Date().toISOString().slice(0, 10), thresholdMet: student.gpa >= 3.5 }, ...current]);
                                 toast.success(language === 'th' ? 'เน€เธเธดเนเธกเนเธเธฃเธฒเธขเธเธฒเธฃเธ•เธดเธ”เธ•เธฒเธกเนเธฅเนเธง' : 'Talent followed.');
                               }}
                               className="bg-slate-900 dark:bg-slate-800 group hover:bg-slate-800 dark:hover:bg-slate-700"
                             >
                               <Bookmark className="w-3.5 h-3.5 mr-1.5 group-hover:fill-current" /> {copy.follow}
                             </Button>
                          )}
                          <Button size="sm" variant="outline" className="dark:border-slate-700 dark:text-slate-300" onClick={() => navigate('/student-profiles')}>
                            {copy.viewProfile}
                          </Button>
                        </div>
                      </div>
                    ))}
                    {aiMatchedStudents.length === 0 && (
                      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                        {copy.noMatches}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="followed">
            <Card className="bg-white/6 dark:bg-slate-900/60 dark:bg-slate-900/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bookmark className="w-5 h-5 text-blue-500 fill-blue-500/20 dark:text-slate-400" />
                  <CardTitle>{copy.followed}</CardTitle>
                </div>
                <CardDescription>{copy.trackedProgress}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {followedStudents.map(student => (
                    <div key={student.id} className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-4 mb-4">
                        <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                          <span className="text-lg font-bold text-slate-700 dark:text-slate-300">{student.nameThai.charAt(0)}</span>
                        </div>
                        <div>
                          <div className="font-semibold">{student.nameThai}</div>
                          <div className="text-sm text-slate-500 dark:text-slate-400">{t.companyDashboard.year} {student.year}</div>
                        </div>
                      </div>
                      <div className="flex justify-between items-center text-sm border-t pt-3 mt-3 border-slate-100 dark:border-slate-800">
                        <span className="text-slate-400">{copy.followedDate}</span>
                        <span className="font-medium text-slate-700 dark:text-slate-300">{student.followDate}</span>
                      </div>
                      <div className="flex justify-between items-center text-sm mt-2">
                        <span className="text-slate-400">{copy.currentGpa}</span>
                        <div className="flex items-center gap-1 font-medium text-emerald-600 dark:text-slate-300">
                          <TrendingUp className="w-3.5 h-3.5" />
                          {student.gpa.toFixed(2)}
                        </div>
                      </div>
                      <Button className="w-full mt-4" variant="secondary" size="sm" onClick={() => navigate('/student-profiles')}>{copy.profileOverview}</Button>
                    </div>
                  ))}
                  {followedStudents.length === 0 && (
                    <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                      {copy.noFollowed}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

        </Tabs>
      </motion.div>
    </motion.div>
  );
}
