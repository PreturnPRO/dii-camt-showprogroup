import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Briefcase, Award, Code, Download, Share2, Plus,
  Github, Linkedin, Globe, Mail, Phone, MapPin,
  Target, Zap, Layers, Sparkles, FileText, CheckCircle2,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { mapStudent, mapStudentStatsToStudent } from '@/lib/live-mappers';
import { toast } from 'sonner';
import { ProjectImage } from '@/components/portfolio/ProjectImage';
import type { Student } from '@/types';

const emptyStudent: Student = {
  id: '',
  email: '',
  name: '',
  nameThai: '',
  role: 'student',
  createdAt: new Date(),
  isActive: true,
  studentId: '',
  major: '',
  program: 'bachelor',
  year: 1,
  semester: 1,
  academicYear: '',
  gpa: 0,
  gpax: 0,
  totalCredits: 0,
  earnedCredits: 0,
  requiredCredits: 0,
  academicStatus: 'normal',
  skills: [],
  activities: [],
  totalActivityHours: 0,
  gamificationPoints: 0,
  badges: [],
  dataConsent: {
    studentId: '',
    allowDataSharing: false,
    allowPortfolioSharing: false,
    sharedWithCompanies: [],
    emailNotifications: true,
    smsNotifications: false,
    inAppNotifications: true,
    showInLeaderboard: false,
    profileVisibility: 'private',
    consentDate: new Date(),
    lastModified: new Date(),
    history: [],
  },
  timeline: [],
};

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: { opacity: 1, y: 0 },
};

export default function Portfolio() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState('projects');
  const [student, setStudent] = React.useState<Student>(emptyStudent);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = React.useState(false);
  const [isSubmittingProject, setIsSubmittingProject] = React.useState(false);
  const [projectForm, setProjectForm] = React.useState({
    title: '',
    description: '',
    technologies: '',
    role: '',
    startDate: new Date().toISOString().split('T')[0],
    url: '',
  });

  React.useEffect(() => {
    let mounted = true;

    Promise.allSettled([api.students.profile(), api.students.stats()])
      .then(([profileResult, statsResult]) => {
        if (!mounted) return;
        let nextStudent = emptyStudent;
        if (profileResult.status === 'fulfilled') {
          nextStudent = mapStudent(profileResult.value.profile);
        }
        if (statsResult.status === 'fulfilled') {
          nextStudent = mapStudentStatsToStudent(nextStudent, statsResult.value.stats);
        }
        setStudent(nextStudent);
      })
      .catch((error) => {
        console.warn('Unable to load portfolio from API', error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const projects = student.portfolio?.projects ?? [];
  const achievements = student.badges.length
    ? student.badges.map((badge) => ({
      id: badge.id,
      studentId: student.studentId,
      title: badge.nameThai || badge.name,
      description: badge.description,
      category: 'badge',
      date: badge.earnedAt,
    }))
    : [];

  const skillLevelPercent: Record<string, number> = {
    beginner: 35,
    intermediate: 60,
    advanced: 82,
    expert: 96,
  };
  const skills = student.skills
    .map((skill) => ({
      name: skill.name,
      level: skillLevelPercent[skill.level] ?? 60,
      icon: skill.category === 'soft_skill' ? <Layers className="w-4 h-4 text-purple-500" /> : <Code className="w-4 h-4 text-blue-500" />,
    }))
    .sort((a, b) => b.level - a.level);

  const handleAddProject = async () => {
    if (!projectForm.title.trim() || !projectForm.description.trim() || !projectForm.role.trim() || isSubmittingProject) {
      toast.error('กรุณากรอกข้อมูลผลงานให้ครบ');
      return;
    }

    setIsSubmittingProject(true);
    const currentPortfolio = student.portfolio;
    const projectPayload = {
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      technologies: projectForm.technologies.split(',').map((item) => item.trim()).filter(Boolean),
      role: projectForm.role.trim(),
      startDate: new Date(projectForm.startDate),
      url: projectForm.url.trim() || undefined,
      images: [],
    };

    try {
      const response = await api.portfolio.save({
        bio: currentPortfolio?.bio ?? '',
        projects: [...(currentPortfolio?.projects ?? []), projectPayload],
      });

      setStudent((current) => ({
        ...current,
        portfolio: {
          bio: response.portfolio.bio ?? '',
          projects: response.portfolio.projects ?? [],
        },
      }));

      setProjectForm({
        title: '',
        description: '',
        technologies: '',
        role: '',
        startDate: new Date().toISOString().split('T')[0],
        url: '',
      });
      setIsProjectDialogOpen(false);
      toast.success('เพิ่มผลงานเรียบร้อยแล้ว');
    } catch (error) {
      console.warn('Unable to add portfolio project', error);
      toast.error('ไม่สามารถบันทึกผลงานได้');
    } finally {
      setIsSubmittingProject(false);
    }
  };

  if (user?.role !== 'student') {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Student view only
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={100}>
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6 pb-12 max-w-7xl mx-auto"
      >
        {/* Header Section with Compact Metrics Ribbon */}
        <div className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div>
              <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
                <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <span>{t.portfolioPage.subtitle}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight">
                Portfolio<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 font-black"> & CV</span>
              </h1>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm min-h-[40px] px-4 font-medium transition-colors flex-1 sm:flex-initial"
                onClick={() => {
                  const url = `${window.location.origin}/student-profiles?studentId=${encodeURIComponent(student.id)}`;
                  void navigator.clipboard?.writeText(url);
                  toast.success('Portfolio link copied');
                }}
              >
                <Share2 className="w-4 h-4 mr-1.5 text-slate-400" /> {t.portfolioPage.shareProfile}
              </Button>
              <Button
                size="sm"
                className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-sm min-h-[40px] px-4 font-semibold transition-all flex-1 sm:flex-initial"
                onClick={() => {
                  if (student.cvUrl) {
                    window.open(student.cvUrl, '_blank', 'noopener,noreferrer');
                    return;
                  }
                  toast.info('ยังไม่มี CV ในโปรไฟล์ กรุณาเพิ่มลิงก์ CV ที่หน้า Settings');
                }}
              >
                <Download className="w-4 h-4 mr-1.5" /> ดาวน์โหลด CV
              </Button>
            </div>
          </div>

          {/* Compact Inline Metrics Strip (Saves vertical space so projects stay above the fold) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Code className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">ผลงาน (Projects)</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-50">{projects.length} ชิ้น</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Award className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">เกียรติบัตร (Awards)</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-50">{achievements.length} รางวัล</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">ทักษะที่บันทึก (Skills)</span>
                <span className="text-lg font-bold font-mono text-slate-900 dark:text-slate-50">{skills.length} ด้าน</span>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
              <div className="w-9 h-9 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <Target className="w-4.5 h-4.5" />
              </div>
              <div>
                <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">ความสมบูรณ์โปรไฟล์</span>
                <span className="text-lg font-bold font-mono text-indigo-600 dark:text-indigo-400">95%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout: 2-Column [minmax(0,1fr)_380px] */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          {/* Left Column — Projects & Achievements */}
          <div className="space-y-6 min-w-0">
            <Tabs defaultValue="projects" className="w-full" onValueChange={setActiveTab}>
              {/* Tabs Bar with Clear Active State & Add New Project Button on the Right */}
              <div className="flex items-center justify-between gap-3 pb-1">
                <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1.5 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
                  <TabsTrigger
                    value="projects"
                    className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-slate-600 dark:text-slate-300 cursor-pointer min-h-[38px]"
                  >
                    <Briefcase className="w-4 h-4 mr-1.5 inline-block" />
                    {t.portfolioPage.works} ({projects.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="achievements"
                    className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm transition-all text-slate-600 dark:text-slate-300 cursor-pointer min-h-[38px]"
                  >
                    <Award className="w-4 h-4 mr-1.5 inline-block" />
                    {t.portfolioPage.awards} ({achievements.length})
                  </TabsTrigger>
                </TabsList>

                <Button
                  size="sm"
                  onClick={() => setIsProjectDialogOpen(true)}
                  className="rounded-xl text-sm font-semibold min-h-[40px] px-4 bg-blue-600 hover:bg-blue-700 text-white shadow-xs transition-colors flex items-center gap-1.5 ml-auto cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{t.portfolioPage.addProject}</span>
                </Button>
              </div>

              {/* Projects Tab */}
              <TabsContent value="projects" className="space-y-6 mt-4">
                <div className="grid grid-cols-1 xl:grid-cols-2 auto-rows-fr gap-5">
                  {projects.map((project, index) => (
                    <motion.div
                      key={project.id || index}
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.08 }}
                      whileHover={{ y: -3 }}
                      tabIndex={0}
                      onClick={() => {
                        if (project.url) {
                          window.open(project.url, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          if (project.url) {
                            window.open(project.url, '_blank', 'noopener,noreferrer');
                          }
                        }
                      }}
                      className="group flex flex-col bg-white dark:bg-[#0c1222] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-md transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 h-full"
                    >
                      {/* Modern Mockup Preview Image with Hover Overlay */}
                      <ProjectImage
                        src={project.images?.[0]}
                        alt={project.title}
                        title={project.title}
                      />

                      {/* Card Content with Role Badge under Title and line-clamp-2 description */}
                      <div className="p-5 flex flex-col flex-1 justify-between">
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight line-clamp-1">
                            {project.title}
                          </h3>

                          {/* Role tag directly under title */}
                          <div className="mt-1.5 mb-2.5">
                            {project.role ? (
                              <Badge
                                variant="secondary"
                                className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-mono font-medium rounded-md px-2 py-0.5"
                              >
                                {project.role}
                              </Badge>
                            ) : null}
                          </div>

                          <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-2 leading-relaxed mb-4">
                            {project.description}
                          </p>
                        </div>

                        {/* Technology Tags */}
                        <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-2 items-center">
                          {project.technologies.slice(0, 4).map((tech) => (
                            <Badge
                              key={tech}
                              variant="secondary"
                              className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono px-2.5 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60"
                            >
                              {tech}
                            </Badge>
                          ))}
                          {project.technologies.length > 4 && (
                            <span className="text-xs font-mono text-slate-400 dark:text-slate-500">
                              +{project.technologies.length - 4}
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* Add New Project Card: Same Height with Clear Hover State */}
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.01 }}
                    tabIndex={0}
                    onClick={() => setIsProjectDialogOpen(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setIsProjectDialogOpen(true);
                      }
                    }}
                    className="h-full min-h-[300px] rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-solid hover:border-blue-500 hover:bg-blue-50/20 dark:hover:bg-blue-950/20 transition-all cursor-pointer group flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-600 group-hover:text-white text-slate-500 dark:text-slate-400 transition-all shadow-xs">
                      <Plus className="w-7 h-7" />
                    </div>
                    <span className="font-bold text-base tracking-tight text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400">
                      {t.portfolioPage.addProject}
                    </span>
                    <span className="text-xs text-slate-400 mt-1 text-center max-w-[220px]">
                      อัปโหลดผลงาน โครงงาน หรือรางวัลเพื่อจัดแสดงใน Portfolio
                    </span>
                  </motion.div>
                </div>

                {projects.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-10 text-center">
                    <Briefcase className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีผลงานใน Portfolio</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เมื่อเพิ่มข้อมูลผลงาน โปรเจกต์จะแสดงที่นี่ทันที</p>
                  </div>
                )}
              </TabsContent>

              {/* Achievements Tab */}
              <TabsContent value="achievements" className="mt-4 space-y-3">
                <div className="grid gap-3">
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id || index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-center justify-between gap-4"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="p-3 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 shrink-0">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="text-base font-bold text-slate-900 dark:text-slate-100">{achievement.title}</h4>
                          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{achievement.description}</p>
                        </div>
                      </div>
                      {achievement.date && (
                        <span className="text-xs font-mono text-slate-400 shrink-0">
                          {new Date(achievement.date).toLocaleDateString('th-TH')}
                        </span>
                      )}
                    </motion.div>
                  ))}
                  {achievements.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-10 text-center">
                      <Award className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีเหรียญรางวัลหรือเกียรติบัตร</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เข้าร่วมกิจกรรมเพื่อสะสมเหรียญรางวัลและเกียรติบัตร</p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Right Column — Student Profile Sidebar */}
          <div className="space-y-6">
            {/* Identity Panel */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-[#0c1222] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden"
            >
              {/* Top decorative gradient bar */}
              <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 absolute top-0 left-0 right-0" />

              <div className="pt-2 text-center">
                <Avatar className="w-20 h-20 border-2 border-slate-200 dark:border-slate-700 shadow-md rounded-2xl mx-auto mb-3">
                  {student.avatar ? (
                    <AvatarImage src={student.avatar} alt={student.name} />
                  ) : null}
                  <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-black rounded-2xl">
                    {student.nameThai ? student.nameThai.charAt(0) : student.name ? student.name.charAt(0) : 'S'}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">{student.nameThai || student.name}</h2>
                <p className="text-sm text-slate-400 font-mono mb-3">{student.name}</p>

                <div className="flex flex-wrap gap-2 justify-center mb-4">
                  <Badge variant="secondary" className="bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200/60 dark:border-blue-800/60 text-xs font-semibold px-2.5 py-0.5">
                    {student.major || 'Digital Innovation'}
                  </Badge>
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-mono font-medium px-2.5 py-0.5">
                    {t.portfolioPage.year} {student.year || 3}
                  </Badge>
                </div>

                {/* Social Links with Tooltip & aria-label & minimum 40x40px touch targets */}
                <div className="flex gap-2 justify-center">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="LinkedIn Profile"
                        disabled={!student.linkedin}
                        onClick={() => student.linkedin && window.open(student.linkedin, '_blank')}
                        className="h-10 w-10 min-h-[40px] min-w-[40px] bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/60 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Linkedin className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{student.linkedin ? 'เยี่ยมชม LinkedIn' : 'ยังไม่ได้เชื่อมต่อ LinkedIn'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="GitHub Profile"
                        disabled={!student.github}
                        onClick={() => student.github && window.open(student.github, '_blank')}
                        className="h-10 w-10 min-h-[40px] min-w-[40px] bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Github className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{student.github ? 'เยี่ยมชม GitHub' : 'ยังไม่ได้เชื่อมต่อ GitHub'}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Personal Website"
                        disabled={!student.website}
                        onClick={() => student.website && window.open(student.website, '_blank')}
                        className="h-10 w-10 min-h-[40px] min-w-[40px] bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{student.website ? 'เยี่ยมชม Website' : 'ยังไม่ได้เชื่อมต่อ Website'}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>

              {/* Contact Information with Fallbacks and Styled 'เพิ่มข้อมูล' Links */}
              <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-3 text-sm text-slate-600 dark:text-slate-300">
                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                      <Mail className="w-3.5 h-3.5" />
                    </div>
                    {student.email ? (
                      <span className="truncate font-mono text-xs text-slate-800 dark:text-slate-200">{student.email}</span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">ยังไม่ได้เพิ่มอีเมล</span>
                    )}
                  </div>
                  {!student.email && (
                    <a href="/settings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded-md transition-colors shrink-0">
                      เพิ่ม
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    {student.phone ? (
                      <span className="font-mono text-xs text-slate-800 dark:text-slate-200">{student.phone}</span>
                    ) : (
                      <span className="text-slate-400 italic text-xs">ยังไม่ได้เพิ่มเบอร์โทร</span>
                    )}
                  </div>
                  {!student.phone && (
                    <a href="/settings" className="text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-900/60 px-2.5 py-1 rounded-md transition-colors shrink-0">
                      เพิ่ม
                    </a>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 text-slate-500">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-xs text-slate-700 dark:text-slate-300">Chiang Mai, Thailand</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Compact Skills Panel — Sorted Descending, Bar h-2, % at End */}
            <motion.div
              variants={itemVariants}
              className="bg-white dark:bg-[#0c1222] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs"
            >
              <h3 className="font-bold text-base mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100 tracking-tight">
                <Zap className="w-4 h-4 text-amber-500" />
                {t.portfolioPage.skills}
              </h3>
              <div className="space-y-4">
                {skills.map((skill, idx) => (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-2">
                        {skill.icon}
                        <span>{skill.name}</span>
                      </span>
                      <span className="font-mono font-bold text-sm text-blue-600 dark:text-blue-400">
                        {skill.level}%
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${skill.level}%` }}
                        transition={{ delay: 0.2 + (idx * 0.05), duration: 0.8 }}
                        className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                      />
                    </div>
                  </div>
                ))}
                {skills.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">ยังไม่มีข้อมูลทักษะ</p>
                )}
              </div>
            </motion.div>

            {/* Portfolio Highlights & Verification Card (Balances bottom of right column) */}
            <motion.div
              variants={itemVariants}
              className="bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-slate-900 dark:to-blue-950/20 rounded-2xl p-5 border border-blue-200/60 dark:border-blue-900/40 shadow-xs"
            >
              <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm mb-2">
                <CheckCircle2 className="w-4.5 h-4.5" />
                <span>ShowPro Verified Student</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3.5">
                ผลงานและเกียรติบัตรทั้งหมดได้รับการตรวจสอบโดยคณะวิทยาลัยศิลปะ สื่อ และเทคโนโลยี (CAMT)
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold rounded-xl bg-white dark:bg-slate-800 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 min-h-[36px]"
                onClick={() => {
                  if (student.cvUrl) {
                    window.open(student.cvUrl, '_blank', 'noopener,noreferrer');
                  } else {
                    toast.info('ยังไม่มีไฟล์ CV กรุณาอัปโหลดที่เมนู Settings');
                  }
                }}
              >
                <FileText className="w-3.5 h-3.5 mr-1.5" />
                ดูประวัติย่อแบบทางการ (Official CV)
              </Button>
            </motion.div>
          </div>
        </div>

        {/* Dialog for Adding New Project */}
        <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
          <DialogContent className="sm:max-w-2xl rounded-[2rem]">
            <DialogHeader>
              <DialogTitle>เพิ่มผลงานใน Portfolio</DialogTitle>
              <DialogDescription>ข้อมูลจะถูกบันทึกลงฐานข้อมูลจริงของโปรไฟล์นักศึกษา</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>ชื่อผลงาน</Label>
                <Input
                  value={projectForm.title}
                  onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))}
                  placeholder="เช่น ระบบจัดการนัดหมายออนไลน์"
                />
              </div>
              <div className="space-y-2">
                <Label>รายละเอียด</Label>
                <Textarea
                  value={projectForm.description}
                  onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))}
                  placeholder="อธิบายสรุปเกี่ยวกับโปรเจกต์ ปัญหาที่แก้ไข และฟีเจอร์เด่น"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>บทบาทในงาน</Label>
                  <Input
                    value={projectForm.role}
                    onChange={(event) => setProjectForm((current) => ({ ...current, role: event.target.value }))}
                    placeholder="เช่น Frontend Lead, Fullstack Developer"
                  />
                </div>
                <div className="space-y-2">
                  <Label>วันที่เริ่ม</Label>
                  <Input
                    type="date"
                    value={projectForm.startDate}
                    onChange={(event) => setProjectForm((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>เทคโนโลยี</Label>
                <Input
                  value={projectForm.technologies}
                  onChange={(event) => setProjectForm((current) => ({ ...current, technologies: event.target.value }))}
                  placeholder="React, TypeScript, Tailwind, Prisma"
                />
              </div>
              <div className="space-y-2">
                <Label>ลิงก์ผลงาน</Label>
                <Input
                  type="url"
                  value={projectForm.url}
                  onChange={(event) => setProjectForm((current) => ({ ...current, url: event.target.value }))}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" className="min-h-[40px] px-4 text-sm" onClick={() => setIsProjectDialogOpen(false)}>
                ยกเลิก
              </Button>
              <Button
                className="min-h-[40px] px-5 text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
                onClick={handleAddProject}
                disabled={isSubmittingProject}
              >
                {isSubmittingProject ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                    กำลังบันทึก...
                  </>
                ) : (
                  'บันทึกผลงาน'
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </motion.div>
    </TooltipProvider>
  );
}
