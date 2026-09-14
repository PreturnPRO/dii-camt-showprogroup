import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Briefcase, Award, Code, Download, Share2, Edit, Plus,
  Github, Linkedin, Globe, Mail, Phone, MapPin, Calendar,
  Trophy, GraduationCap, Target, Zap, ArrowUpRight, Layers
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Portfolio() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState('projects');
  const [student, setStudent] = React.useState<Student>(emptyStudent);
  const [isProjectDialogOpen, setIsProjectDialogOpen] = React.useState(false);
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
  const skills = student.skills.map((skill) => ({
    name: skill.name,
    level: skillLevelPercent[skill.level] ?? 60,
    icon: skill.category === 'soft_skill' ? <Layers className="w-4 h-4" /> : <Code className="w-4 h-4" />,
  }));

  const handleAddProject = async () => {
    if (!projectForm.title.trim() || !projectForm.description.trim() || !projectForm.role.trim()) {
      toast.error('กรุณากรอกข้อมูลผลงานให้ครบ');
      return;
    }

    const currentPortfolio = student.portfolio;
    const projectPayload = {
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      technologies: projectForm.technologies.split(',').map((item) => item.trim()).filter(Boolean),
      role: projectForm.role.trim(),
      startDate: projectForm.startDate,
      url: projectForm.url.trim(),
      images: [],
      highlights: [],
    };

    try {
      const response = await api.students.updateProfile({
        portfolio: {
          summary: currentPortfolio?.summary || '',
          summaryThai: currentPortfolio?.summaryThai || '',
          githubUrl: currentPortfolio?.githubUrl || '',
          linkedinUrl: currentPortfolio?.linkedinUrl || '',
          personalWebsite: currentPortfolio?.personalWebsite || '',
          isPublic: currentPortfolio?.isPublic ?? true,
          sharedWith: currentPortfolio?.sharedWith ?? [],
          projects: [
            ...projects.map((project) => ({
              title: project.title,
              description: project.description,
              technologies: project.technologies,
              role: project.role,
              startDate: project.startDate,
              endDate: project.endDate,
              url: project.url || '',
              images: project.images || [],
              highlights: project.highlights || [],
            })),
            projectPayload,
          ],
        },
      });
      setStudent(mapStudent(response.profile));
      setProjectForm({
        title: '',
        description: '',
        technologies: '',
        role: '',
        startDate: new Date().toISOString().split('T')[0],
        url: '',
      });
      setIsProjectDialogOpen(false);
      toast.success('เพิ่มผลงานลง Portfolio แล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเพิ่มผลงานได้');
    }
  };

  if (user?.role !== 'student') {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-slate-400">
        Student view only
      </div>
    );
  }

  type StatCardProps = {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    accentColor: string;
    iconBg: string;
    delay?: number;
  };

  const StatCard = ({ icon: Icon, label, value, accentColor, iconBg }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -2 }}
      transition={{ duration: 0.15 }}
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5 bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 shadow-xs"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
        <div className={`p-2 rounded-xl ${iconBg} ${accentColor} border border-current/15`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="flex items-baseline justify-between">
        <h3 className="text-2xl sm:text-3xl font-extrabold font-mono text-slate-900 dark:text-slate-50 tracking-tight">{value}</h3>
      </div>
    </motion.div>
  );

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8 pb-10"
    >
      {/* Header Section - Sleek ShowPro Style with Restrained Hierarchy */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs font-medium mb-1.5"
          >
            <Briefcase className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
            <span>{t.portfolioPage.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-slate-50 tracking-tight"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            Portfolio<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500 font-extrabold"> & CV</span>
          </motion.h1>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            className="rounded-xl border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs h-9 px-3.5 font-medium transition-colors flex-1 sm:flex-initial"
            onClick={() => {
              const url = `${window.location.origin}/student-profiles?studentId=${encodeURIComponent(student.id)}`;
              void navigator.clipboard?.writeText(url);
              toast.success('Portfolio link copied');
            }}
          >
            <Share2 className="w-3.5 h-3.5 mr-1.5 text-slate-400" /> {t.portfolioPage.shareProfile}
          </Button>
          <Button
            size="sm"
            className="rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm shadow-blue-500/20 text-xs h-9 px-4 font-semibold transition-all flex-1 sm:flex-initial"
            onClick={() => {
              if (student.cvUrl) {
                window.open(student.cvUrl, '_blank', 'noopener,noreferrer');
                return;
              }
              toast.info('ยังไม่มี CV ในโปรไฟล์ กรุณาเพิ่มลิงก์ CV ที่หน้า Settings');
            }}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" /> ดาวน์โหลด CV
          </Button>
        </div>
      </div>

      {/* Restrained Stats Grid — Subtle accents, prominent numbers */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <StatCard
          icon={Code}
          label={t.portfolioPage.totalProjects}
          value={projects.length}
          accentColor="text-indigo-600 dark:text-indigo-400"
          iconBg="bg-indigo-500/10"
        />
        <StatCard
          icon={Award}
          label={t.portfolioPage.achievements}
          value={achievements.length}
          accentColor="text-amber-600 dark:text-amber-400"
          iconBg="bg-amber-500/10"
        />
        <StatCard
          icon={Zap}
          label={t.portfolioPage.skills}
          value={skills.length}
          accentColor="text-emerald-600 dark:text-emerald-400"
          iconBg="bg-emerald-500/10"
        />
        <StatCard
          icon={Target}
          label={t.portfolioPage.completeness}
          value="95%"
          accentColor="text-blue-600 dark:text-blue-400"
          iconBg="bg-blue-500/10"
        />
      </div>

      {/* Main Content Layout: 2-Column (Projects 2/3, Profile Sidebar 1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-start">
        {/* Left Column — 2/3 Projects & Achievements */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="projects" className="w-full" onValueChange={setActiveTab}>
            {/* Modern Subtle Segmented Control for Tabs */}
            <div className="flex items-center justify-between pb-1">
              <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
                <TabsTrigger
                  value="projects"
                  className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  <Briefcase className="w-3.5 h-3.5 mr-1.5 inline-block" />
                  {t.portfolioPage.works} ({projects.length})
                </TabsTrigger>
                <TabsTrigger
                  value="achievements"
                  className="rounded-lg px-4 py-2 text-xs font-semibold data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:dark:bg-slate-900 data-[state=active]:dark:text-blue-400 data-[state=active]:shadow-xs transition-all text-slate-600 dark:text-slate-400 cursor-pointer"
                >
                  <Award className="w-3.5 h-3.5 mr-1.5 inline-block" />
                  {t.portfolioPage.awards} ({achievements.length})
                </TabsTrigger>
              </TabsList>

              <Button
                size="sm"
                variant="outline"
                onClick={() => setIsProjectDialogOpen(true)}
                className="hidden sm:inline-flex rounded-xl text-xs h-8 px-3 border-slate-200/80 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5 text-blue-500" />
                {t.portfolioPage.addProject}
              </Button>
            </div>

            {/* Projects Tab */}
            <TabsContent value="projects" className="space-y-6 mt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id || index}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    whileHover={{ y: -3 }}
                    className="group flex flex-col bg-white dark:bg-[#0c1222] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-md transition-all duration-200 cursor-pointer"
                    onClick={() => {
                      if (project.url) {
                        window.open(project.url, '_blank', 'noopener,noreferrer');
                      }
                    }}
                  >
                    {/* Fixed Aspect Ratio 16:9 Image with zero broken alt text */}
                    <ProjectImage
                      src={project.images?.[0]}
                      alt={project.title}
                      title={project.title}
                    />

                    {/* Card Content with consistent flex structure */}
                    <div className="p-4 sm:p-5 flex flex-col flex-1 justify-between">
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors line-clamp-1">
                            {project.title}
                          </h3>
                          {project.role && (
                            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 shrink-0">
                              {project.role}
                            </span>
                          )}
                        </div>

                        <p className="text-slate-500 dark:text-slate-400 text-xs line-clamp-2 leading-relaxed mb-4">
                          {project.description}
                        </p>
                      </div>

                      {/* Technology Tags at bottom */}
                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap gap-1.5 items-center">
                        {project.technologies.slice(0, 4).map((tech) => (
                          <Badge
                            key={tech}
                            variant="secondary"
                            className="bg-slate-100/70 dark:bg-slate-800/60 text-slate-600 dark:text-slate-300 text-[10.5px] font-mono px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50"
                          >
                            {tech}
                          </Badge>
                        ))}
                        {project.technologies.length > 4 && (
                          <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">
                            +{project.technologies.length - 4}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}

                {/* Add New Project Card */}
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => setIsProjectDialogOpen(true)}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-500 rounded-2xl flex flex-col items-center justify-center p-6 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50/20 dark:hover:bg-blue-950/10 transition-all cursor-pointer min-h-[260px] group"
                >
                  <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/40 text-slate-500 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-all shadow-xs">
                    <Plus className="w-6 h-6" />
                  </div>
                  <span className="font-semibold text-xs tracking-tight">{t.portfolioPage.addProject}</span>
                  <span className="text-[11px] text-slate-400 mt-1">อัปโหลดผลงานหรือโปรเจกต์ใหม่</span>
                </motion.div>
              </div>

              {projects.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-10 text-center">
                  <Briefcase className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีผลงานใน Portfolio</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">เมื่อเพิ่มข้อมูลผลงาน โปรเจกต์จะแสดงที่นี่ทันที</p>
                </div>
              )}
            </TabsContent>

            {/* Achievements Tab */}
            <TabsContent value="achievements" className="mt-3 space-y-3">
              <div className="grid gap-3">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id || index}
                    initial={{ opacity: 0, x: -15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className="bg-white dark:bg-[#0c1222] rounded-2xl p-4 sm:p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs flex items-start gap-4 group hover:border-amber-300 dark:hover:border-amber-700/60 transition-colors"
                  >
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/15 to-orange-500/15 border border-amber-500/30 flex items-center justify-center text-amber-500 shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                      <Trophy className="w-6 h-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                        {achievement.title}
                      </h3>
                      <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 line-clamp-2">
                        {achievement.description}
                      </p>
                      <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5 font-mono">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        {new Date(achievement.date).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {achievements.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 p-8 text-center">
                    <Trophy className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200 text-xs">ยังไม่มีรางวัลหรือ badge</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">เมื่อมีกิจกรรมหรือผลงานที่ได้รับ badge ระบบจะแสดงจากข้อมูลจริงที่นี่</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Right Column — 1/3 Student Profile Sidebar (Sticky, perfectly aligned with project cards) */}
        <div className="space-y-5 lg:sticky lg:top-24 lg:pt-[48px]">
          {/* Identity Panel */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-[#0c1222] rounded-2xl p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-xs relative overflow-hidden"
          >
            {/* Top decorative gradient bar */}
            <div className="h-2 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 absolute top-0 left-0 right-0" />

            <div className="pt-2 text-center">
              <Avatar className="w-20 h-20 border-2 border-slate-200 dark:border-slate-700 shadow-md rounded-2xl mx-auto mb-3">
                <AvatarImage src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                <AvatarFallback className="text-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold rounded-2xl">
                  {student.nameThai.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{student.nameThai}</h2>
              <p className="text-xs text-slate-400 font-mono mb-3">{student.name}</p>

              <div className="flex flex-wrap gap-1.5 justify-center mb-4">
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-medium">
                  {student.major}
                </Badge>
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-mono">
                  {t.portfolioPage.year} {student.year}
                </Badge>
              </div>

              {/* Social Links */}
              <div className="flex gap-1.5 justify-center">
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Linkedin className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Github className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-slate-800 rounded-lg transition-colors">
                  <Globe className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Contact Information */}
            <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800/80 space-y-2.5 text-xs text-slate-600 dark:text-slate-300 font-mono">
              <div className="flex items-center gap-2.5">
                <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{student.email}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>{student.phone || '-'}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-sans">Chiang Mai, Thailand</span>
              </div>
            </div>
          </motion.div>

          {/* Compact Skills Panel */}
          <motion.div
            variants={itemVariants}
            className="bg-white dark:bg-[#0c1222] rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-xs"
          >
            <h3 className="font-bold text-sm mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100 tracking-tight">
              <Zap className="w-4 h-4 text-amber-500" />
              {t.portfolioPage.skills}
            </h3>
            <div className="space-y-3.5">
              {skills.map((skill, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      {skill.icon} {skill.name}
                    </span>
                    <span className="font-mono text-slate-400">{skill.level}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.level}%` }}
                      transition={{ delay: 0.3 + (idx * 0.05), duration: 0.8 }}
                      className="h-full bg-blue-600 dark:bg-blue-500 rounded-full"
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem]">
          <DialogHeader>
            <DialogTitle>เพิ่มผลงานใน Portfolio</DialogTitle>
            <DialogDescription>ข้อมูลจะถูกบันทึกลงฐานข้อมูลจริงของโปรไฟล์นักศึกษา</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="space-y-2">
              <Label>ชื่อผลงาน</Label>
              <Input value={projectForm.title} onChange={(event) => setProjectForm((current) => ({ ...current, title: event.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>รายละเอียด</Label>
              <Textarea value={projectForm.description} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>บทบาทในงาน</Label>
                <Input value={projectForm.role} onChange={(event) => setProjectForm((current) => ({ ...current, role: event.target.value }))} placeholder="Frontend Developer" />
              </div>
              <div className="space-y-2">
                <Label>วันที่เริ่ม</Label>
                <Input type="date" value={projectForm.startDate} onChange={(event) => setProjectForm((current) => ({ ...current, startDate: event.target.value }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>เทคโนโลยี</Label>
              <Input value={projectForm.technologies} onChange={(event) => setProjectForm((current) => ({ ...current, technologies: event.target.value }))} placeholder="React, TypeScript, Prisma" />
            </div>
            <div className="space-y-2">
              <Label>ลิงก์ผลงาน</Label>
              <Input type="url" value={projectForm.url} onChange={(event) => setProjectForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)}>ยกเลิก</Button>
            <Button onClick={handleAddProject}>บันทึกผลงาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
