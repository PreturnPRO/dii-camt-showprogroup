import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { motion } from 'framer-motion';
import {
  Briefcase, Award, Code, Download, Share2, Edit, Plus,
  Github, Linkedin, Globe, Mail, Phone, MapPin, Calendar,
  Trophy, GraduationCap, Target, Zap, ArrowUpRight, Layers, Upload, Trash
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { mockStudent } from '@/lib/mockData';
import { api } from '@/lib/api';
import { mapStudent, mapStudentStatsToStudent } from '@/lib/live-mappers';
import { toast } from 'sonner';
import type { Student, Project } from '@/types';

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
  const { user, updateProfile } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = React.useState('projects');
  const [student, setStudent] = React.useState<Student>(emptyStudent);
  
  // Profile edit dialog states
  const [isProfileDialogOpen, setIsProfileDialogOpen] = React.useState(false);
  const [profileForm, setProfileForm] = React.useState({
    name: '',
    nameThai: '',
    avatar: '',
    summary: '',
    summaryThai: '',
    githubUrl: '',
    linkedinUrl: '',
    personalWebsite: '',
  });
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const profileAvatarInputRef = React.useRef<HTMLInputElement | null>(null);

  // Project dialog states
  const [isProjectDialogOpen, setIsProjectDialogOpen] = React.useState(false);
  const [editingProjectIndex, setEditingProjectIndex] = React.useState<number | null>(null);
  const [projectForm, setProjectForm] = React.useState({
    title: '',
    description: '',
    technologies: '',
    role: '',
    startDate: new Date().toISOString().split('T')[0],
    url: '',
    images: [] as string[],
  });
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Skill dialog states
  const [isSkillDialogOpen, setIsSkillDialogOpen] = React.useState(false);
  const [skillForm, setSkillForm] = React.useState({
    name: '',
    category: 'programming',
    level: 'intermediate',
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

  // Handlers for Profile Edit
  const handleEditProfile = () => {
    setProfileForm({
      name: student.name || '',
      nameThai: student.nameThai || '',
      avatar: student.avatar || '',
      summary: student.portfolio?.summary || '',
      summaryThai: student.portfolio?.summaryThai || '',
      githubUrl: student.portfolio?.githubUrl || '',
      linkedinUrl: student.portfolio?.linkedinUrl || '',
      personalWebsite: student.portfolio?.personalWebsite || '',
    });
    setIsProfileDialogOpen(true);
  };

  const handleUpdateProfile = async () => {
    try {
      await updateProfile({
        name: profileForm.name.trim(),
        nameThai: profileForm.nameThai.trim(),
        avatar: profileForm.avatar || null,
        roleData: {
          major: student.major,
          program: student.program,
          year: student.year,
          semester: student.semester,
          academicYear: student.academicYear,
          cvUrl: student.cvUrl || undefined,
        },
      });

      const currentPortfolio = student.portfolio;
      const response = await api.students.updateProfile({
        portfolio: {
          summary: profileForm.summary.trim(),
          summaryThai: profileForm.summaryThai.trim(),
          isPublic: currentPortfolio?.isPublic ?? true,
          sharedWith: currentPortfolio?.sharedWith ?? [],
          projects: currentPortfolio?.projects ?? [],
          githubUrl: profileForm.githubUrl.trim(),
          linkedinUrl: profileForm.linkedinUrl.trim(),
          personalWebsite: profileForm.personalWebsite.trim(),
        },
      });

      const nextStudent = mapStudent(response.profile);
      setStudent(prev => ({
        ...prev,
        name: profileForm.name.trim(),
        nameThai: profileForm.nameThai.trim(),
        avatar: profileForm.avatar || undefined,
        portfolio: nextStudent.portfolio,
      }));

      setIsProfileDialogOpen(false);
      toast.success('อัปเดตข้อมูลโปรไฟล์เรียบร้อย');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถอัปเดตข้อมูลโปรไฟล์ได้');
    }
  };

  const handleProfileAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์เกิน 5MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่านี้');
      return;
    }

    setIsUploadingAvatar(true);
    try {
      const upload = await api.files.upload(file, { category: 'avatar', visibility: 'public' });
      const asset = upload.asset as any;
      const url = asset?.url || asset?.publicUrl || asset?.signedUrl;
      if (url) {
        setProfileForm(prev => ({ ...prev, avatar: url }));
        toast.success('อัปโหลดรูปโปรไฟล์สำเร็จ');
      } else {
        throw new Error('No URL returned for avatar');
      }
    } catch (error) {
      toast.error('อัปโหลดรูปโปรไฟล์ไม่สำเร็จ');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  // Handlers for Public Toggle
  const handlePublicToggle = async (checked: boolean) => {
    const currentPortfolio = student.portfolio;
    try {
      const response = await api.students.updateProfile({
        portfolio: {
          summary: currentPortfolio?.summary || '',
          summaryThai: currentPortfolio?.summaryThai || '',
          githubUrl: currentPortfolio?.githubUrl || '',
          linkedinUrl: currentPortfolio?.linkedinUrl || '',
          personalWebsite: currentPortfolio?.personalWebsite || '',
          sharedWith: currentPortfolio?.sharedWith ?? [],
          projects: currentPortfolio?.projects ?? [],
          isPublic: checked,
        },
      });
      setStudent(mapStudent(response.profile));
      toast.success(checked ? 'เปิดให้ดู Portfolio แบบ Public' : 'ตั้งเป็น Private แล้ว');
    } catch (error) {
      toast.error('ไม่สามารถอัปเดตสถานะ Public ได้');
    }
  };

  // Handlers for Projects
  const handleEditProject = (index: number) => {
    const project = projects[index];
    setProjectForm({
      title: project.title,
      description: project.description,
      role: project.role,
      startDate: project.startDate ? new Date(project.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
      technologies: project.technologies.join(', '),
      url: project.url || '',
      images: project.images || [],
    });
    setEditingProjectIndex(index);
    setIsProjectDialogOpen(true);
  };

  const handleDeleteProject = async (indexToDelete: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผลงานนี้?')) return;
    const currentPortfolio = student.portfolio;
    const newProjects = [...projects];
    newProjects.splice(indexToDelete, 1);

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
          projects: newProjects,
        },
      });
      setStudent(mapStudent(response.profile));
      toast.success('ลบผลงานเรียบร้อยแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถลบผลงานได้');
    }
  };

  const handleAddProject = async () => {
    if (!projectForm.title.trim() || !projectForm.description.trim() || !projectForm.role.trim()) {
      toast.error('กรุณากรอกข้อมูลผลงานให้ครบ');
      return;
    }

    const currentPortfolio = student.portfolio;
    const projectPayload: Project = {
      id: editingProjectIndex !== null 
        ? (projects[editingProjectIndex]?.id || `project-${Date.now()}`)
        : `project-${Date.now()}`,
      title: projectForm.title.trim(),
      description: projectForm.description.trim(),
      technologies: projectForm.technologies.split(',').map((item) => item.trim()).filter(Boolean),
      role: projectForm.role.trim(),
      startDate: new Date(projectForm.startDate),
      url: projectForm.url.trim(),
      images: projectForm.images,
      highlights: [],
    };

    let newProjects = [...projects];
    if (editingProjectIndex !== null) {
      newProjects[editingProjectIndex] = projectPayload;
    } else {
      newProjects.push(projectPayload);
    }

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
          projects: newProjects,
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
        images: [],
      });
      setIsProjectDialogOpen(false);
      setEditingProjectIndex(null);
      toast.success(editingProjectIndex !== null ? 'แก้ไขผลงานเรียบร้อยแล้ว' : 'เพิ่มผลงานลง Portfolio แล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถบันทึกผลงานได้');
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('ขนาดไฟล์เกิน 5MB กรุณาเลือกไฟล์ที่มีขนาดเล็กกว่านี้');
      return;
    }

    setIsUploadingImage(true);
    try {
      const upload = await api.files.upload(file, { category: 'project', visibility: 'public' });
      const asset = upload.asset as any;
      const url = asset?.url || asset?.publicUrl || asset?.signedUrl;
      if (url) {
        setProjectForm(prev => ({ ...prev, images: [...prev.images, url] }));
        toast.success('อัปโหลดรูปภาพสำเร็จ');
      } else {
        throw new Error('No URL returned for project image');
      }
    } catch (error) {
      toast.error('อัปโหลดรูปภาพไม่สำเร็จ');
    } finally {
      setIsUploadingImage(false);
    }
  };

  // Handlers for Skills
  const handleAddSkill = async () => {
    if (!skillForm.name.trim()) {
      toast.error('กรุณากรอกชื่อทักษะ');
      return;
    }

    const newSkill = {
      name: skillForm.name.trim(),
      category: skillForm.category,
      level: skillForm.level,
    };

    const nextSkills = [...student.skills, newSkill];

    try {
      const response = await api.students.updateProfile({
        skills: nextSkills,
      });
      setStudent(mapStudent(response.profile));
      setSkillForm({
        name: '',
        category: 'programming',
        level: 'intermediate',
      });
      setIsSkillDialogOpen(false);
      toast.success('เพิ่มทักษะเรียบร้อยแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถเพิ่มทักษะได้');
    }
  };

  const handleDeleteSkill = async (indexToDelete: number) => {
    if (!window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบทักษะนี้?')) return;
    const nextSkills = [...student.skills];
    nextSkills.splice(indexToDelete, 1);
    try {
      const response = await api.students.updateProfile({
        skills: nextSkills,
      });
      setStudent(mapStudent(response.profile));
      toast.success('ลบทักษะเรียบร้อยแล้ว');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'ไม่สามารถลบทักษะได้');
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
    gradient: string;
    delay?: number;
  };

  const StatCard = ({ icon: Icon, label, value, gradient }: StatCardProps) => (
    <motion.div
      variants={itemVariants}
      whileHover={{ y: -5, scale: 1.02 }}
      className={`relative overflow-hidden rounded-3xl p-6 shadow-lg border border-white/20 ${gradient}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
      <div className="relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-sm border border-white/10 dark:bg-slate-900/50">
            <Icon className="w-6 h-6 text-white" />
          </div>
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center dark:bg-slate-900/50">
            <ArrowUpRight className="w-4 h-4 text-white" />
          </div>
        </div>
        <div>
          <p className="text-white/80 text-sm font-medium mb-1">{label}</p>
          <h3 className="text-3xl font-bold text-white tracking-tight">{value}</h3>
        </div>
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
      {/* Header Section - Matching Dashboard/Courses/Schedule Style */}
      <div className="flex flex-col md:flex-row justify-between items-end gap-6">
        <div>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
          >
            <Briefcase className="w-4 h-4 text-indigo-500 dark:text-slate-400" />
            <span>{t.portfolioPage.subtitle}</span>
          </motion.div>
          <motion.h1
            className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            Portfolio<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> & CV</span>
          </motion.h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-center w-full md:w-auto">
          {/* Public Toggle Switch */}
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl w-full sm:w-auto justify-between sm:justify-start">
            <Switch
              id="portfolio-public-mode"
              checked={student.portfolio?.isPublic !== false}
              onCheckedChange={handlePublicToggle}
            />
            <Label htmlFor="portfolio-public-mode" className="text-xs font-semibold cursor-pointer whitespace-nowrap">
              {student.portfolio?.isPublic !== false ? 'Public Mode' : 'Private Mode'}
            </Label>
          </div>
          <div className="flex gap-3 w-full sm:w-auto">
            <Button
              variant="outline"
              className="rounded-xl border-slate-200 dark:border-slate-700 flex-1 sm:flex-initial"
              onClick={() => {
                const shareId = student.studentId || student.id;
                const url = `${window.location.origin}/portfolio/${encodeURIComponent(shareId)}`;
                void navigator.clipboard?.writeText(url);
                toast.success('Portfolio link copied');
              }}
            >
              <Share2 className="w-4 h-4 mr-2" /> {t.portfolioPage.shareProfile}
            </Button>
            <Button
              className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20 flex-1 sm:flex-initial"
              onClick={() => {
                if (student.cvUrl) {
                  window.open(student.cvUrl, '_blank', 'noopener,noreferrer');
                  return;
                }
                toast.info('ยังไม่มี CV ในโปรไฟล์ กรุณาเพิ่มลิงก์ CV ที่หน้า Settings');
              }}
            >
              <Download className="w-4 h-4 mr-2" /> ดาวน์โหลด CV
            </Button>
          </div>
        </div>
      </div>

      {/* Dashboard-style Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Code}
          label={t.portfolioPage.totalProjects}
          value={projects.length}
          gradient="bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600"
        />
        <StatCard
          icon={Award}
          label={t.portfolioPage.achievements}
          value={achievements.length}
          gradient="bg-gradient-to-br from-amber-400 via-orange-500 to-red-500"
        />
        <StatCard
          icon={Zap}
          label={t.portfolioPage.skills}
          value={skills.length}
          gradient="bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600"
        />
        <StatCard
          icon={Target}
          label={t.portfolioPage.completeness}
          value="95%"
          gradient="bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <Tabs defaultValue="projects" className="w-full">
            <TabsList className="bg-white/40 backdrop-blur-xl border border-white/40 p-1.5 h-auto rounded-2xl shadow-sm mb-6 w-full md:w-auto inline-flex dark:bg-slate-900/50">
              <TabsTrigger
                value="projects"
                className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg shadow-blue-500/10 transition-all duration-300 font-medium text-slate-600 dark:text-slate-300 data-[state=active]:dark:bg-slate-800 data-[state=active]:dark:text-white"
              >
                {t.portfolioPage.works} ({projects.length})
              </TabsTrigger>
              <TabsTrigger
                value="achievements"
                className="rounded-xl px-6 py-3 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-lg shadow-blue-500/10 transition-all duration-300 font-medium text-slate-600 dark:text-slate-300 data-[state=active]:dark:bg-slate-800 data-[state=active]:dark:text-white"
              >
                {t.portfolioPage.awards}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="projects" className="space-y-6 mt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {projects.map((project, index) => (
                  <motion.div
                    key={project.id || index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                    whileHover={{ y: -5 }}
                    className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm cursor-pointer hover:shadow-xl transition-all relative"
                  >
                    <div className="h-48 overflow-hidden relative">
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <img
                        src={project.images?.[0] || `https://placehold.co/600x400/indigo/white?text=${encodeURIComponent(project.title)}`}
                        alt={project.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                      <div className="absolute bottom-4 left-4 right-4 z-20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all">
                        <Button size="sm" className="w-full bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:bg-slate-100" onClick={(e) => { e.stopPropagation(); handleEditProject(index); }}>
                          {t.portfolioPage.viewDetails}
                        </Button>
                      </div>
                      
                      {/* Edit/Delete Floating Controls */}
                      <div className="absolute top-4 right-4 z-20 flex gap-2">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProject(index);
                          }}
                          className="p-2 bg-indigo-500/80 text-white rounded-xl hover:bg-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteProject(index);
                          }}
                          className="p-2 bg-red-500/80 text-white rounded-xl hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2 group-hover:text-indigo-600 transition-colors">{project.title}</h3>
                      <p className="text-slate-500 text-sm line-clamp-2 mb-4 dark:text-slate-400">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.slice(0, 3).map((tech) => (
                          <Badge key={tech} variant="secondary" className="bg-slate-50 text-slate-600 dark:text-slate-400 border border-slate-100 dark:bg-slate-800 dark:border-slate-700">
                            {tech}
                          </Badge>
                        ))}
                        {project.technologies.length > 3 && (
                          <Badge variant="secondary" className="bg-slate-50 text-slate-600 dark:text-slate-300 dark:bg-slate-800">
                            +{project.technologies.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {projects.length === 0 && (
                  <div className="md:col-span-2 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-10 text-center">
                    <Briefcase className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <h3 className="font-bold text-slate-800 dark:text-slate-100">ยังไม่มีผลงานใน Portfolio</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เมื่อเพิ่มข้อมูล portfolio ลงฐานข้อมูล ผลงานจะแสดงที่นี่ทันที</p>
                  </div>
                )}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  whileHover={{ scale: 1.02 }}
                  onClick={() => {
                    setEditingProjectIndex(null);
                    setProjectForm({
                      title: '',
                      description: '',
                      technologies: '',
                      role: '',
                      startDate: new Date().toISOString().split('T')[0],
                      url: '',
                      images: [],
                    });
                    setIsProjectDialogOpen(true);
                  }}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-3xl flex flex-col items-center justify-center p-8 text-slate-400 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all cursor-pointer min-h-[300px] dark:text-slate-300"
                >
                  <div className="w-16 h-16 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center mb-4 group-hover:bg-white">
                    <Plus className="w-8 h-8" />
                  </div>
                  <span className="font-bold">{t.portfolioPage.addProject}</span>
                </motion.div>
              </div>
            </TabsContent>

            <TabsContent value="achievements" className="mt-0">
              <div className="space-y-4">
                {achievements.map((achievement, index) => (
                  <motion.div
                    key={achievement.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm flex gap-4 items-center group hover:border-amber-200 transition-all dark:bg-slate-900/50"
                  >
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center text-amber-600 shrink-0 group-hover:scale-110 transition-transform">
                      <Trophy className="w-8 h-8" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-white text-lg group-hover:text-amber-600 transition-colors">{achievement.title}</h3>
                      <p className="text-slate-500 text-sm dark:text-slate-400">{achievement.description}</p>
                      <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(achievement.date).toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
                      </div>
                    </div>
                  </motion.div>
                ))}
                {achievements.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-700 bg-white/70 dark:bg-slate-900/70 p-8 text-center">
                    <Trophy className="w-10 h-10 mx-auto text-slate-400 mb-3" />
                    <p className="font-semibold text-slate-700 dark:text-slate-200">ยังไม่มีรางวัลหรือ badge</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">เมื่อมีกิจกรรมหรือผลงานที่ได้รับ badge ระบบจะแสดงจากข้อมูลจริงที่นี่</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        <div className="space-y-8">
          {/* Profile Card */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm relative overflow-hidden dark:bg-slate-900"
          >
            <div className="h-24 bg-gradient-to-r from-blue-600 to-indigo-600 absolute top-0 left-0 right-0" />
            <div className="relative pt-10 text-center">
              <Avatar className="w-24 h-24 border-4 border-white shadow-xl rounded-2xl mx-auto mb-4">
                <AvatarImage src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-600 rounded-3xl dark:text-slate-300">
                  {student.nameThai ? student.nameThai.charAt(0) : 'U'}
                </AvatarFallback>
              </Avatar>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-200">{student.nameThai || '-'}</h2>
              <p className="text-slate-500 mb-4 dark:text-slate-400">{student.name || '-'}</p>

              <div className="flex flex-wrap gap-2 justify-center mb-6">
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">{student.major}</Badge>
                <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800">{t.portfolioPage.year} {student.year}</Badge>
              </div>

              <div className="flex gap-2 justify-center">
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl dark:text-slate-300 dark:bg-slate-800" onClick={() => student.portfolio?.linkedinUrl && window.open(student.portfolio.linkedinUrl, '_blank')}>
                  <Linkedin className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-xl dark:text-slate-200 dark:bg-slate-800" onClick={() => student.portfolio?.githubUrl && window.open(student.portfolio.githubUrl, '_blank')}>
                  <Github className="w-5 h-5" />
                </Button>
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl dark:text-slate-300" onClick={() => student.portfolio?.personalWebsite && window.open(student.portfolio.personalWebsite, '_blank')}>
                  <Globe className="w-5 h-5" />
                </Button>
              </div>

              <div className="flex gap-2 justify-center mt-6">
                <Button variant="outline" size="sm" onClick={handleEditProfile} className="w-full rounded-xl">
                  <Edit className="w-4 h-4 mr-2" /> Edit Profile & Links
                </Button>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Mail className="w-4 h-4 text-slate-400" />
                {student.email}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <Phone className="w-4 h-4 text-slate-400" />
                {student.phone || '-'}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-300">
                <MapPin className="w-4 h-4 text-slate-400" />
                Chiang Mai, Thailand
              </div>
            </div>
            
            {/* Bio Display inside Profile Card */}
            {(student.portfolio?.summaryThai || student.portfolio?.summary) && (
              <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-800 text-left">
                <h4 className="text-xs font-bold uppercase text-slate-400 mb-2">Bio / แนะนำตัว</h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed italic">
                  {student.portfolio?.summaryThai || student.portfolio?.summary}
                </p>
              </div>
            )}
          </motion.div>

          {/* Skills Management */}
          <motion.div
            variants={itemVariants}
            className="bg-white rounded-3xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm dark:bg-slate-900"
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-bold text-lg flex items-center gap-2">
                <Zap className="w-5 h-5 text-yellow-500" />
                {t.portfolioPage.skills}
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setIsSkillDialogOpen(true)} className="h-8 rounded-xl font-bold">
                <Plus className="w-4 h-4 mr-1" /> Add Skill
              </Button>
            </div>
            <div className="space-y-5">
              {skills.map((skill, idx) => (
                <div key={idx} className="group/skill">
                  <div className="flex justify-between text-sm mb-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                      {skill.icon} {skill.name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-500 dark:text-slate-400">{skill.level}%</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteSkill(idx)}
                        className="text-red-500 hover:text-red-600 opacity-0 group-hover/skill:opacity-100 transition-opacity p-0.5"
                        aria-label="delete skill"
                      >
                        <Trash className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${skill.level}%` }}
                      transition={{ delay: 0.5 + (idx * 0.1), duration: 1 }}
                      className="h-full bg-slate-900 dark:bg-slate-400 rounded-full"
                    />
                  </div>
                </div>
              ))}
              {skills.length === 0 && (
                <p className="text-slate-500 italic text-sm text-center">ไม่มีข้อมูลทักษะ</p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* Add/Edit Project Dialog */}
      <Dialog open={isProjectDialogOpen} onOpenChange={setIsProjectDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-[2rem] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingProjectIndex !== null ? 'แก้ไขรายละเอียดผลงาน' : 'เพิ่มผลงานใน Portfolio'}</DialogTitle>
            <DialogDescription>ข้อมูลจะถูกบันทึกลงฐานข้อมูลจริงของโปรไฟล์นักศึกษา</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
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
            
            {/* Project Image Upload */}
            <div className="space-y-2">
              <Label>รูปภาพผลงาน</Label>
              <div className="flex gap-4 items-start flex-wrap">
                {projectForm.images.map((img, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border">
                    <img src={img} alt="preview" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => setProjectForm(prev => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))} className="absolute top-1 right-1 p-1 bg-red-500/80 text-white rounded-md hover:bg-red-600">
                      <Trash className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {projectForm.images.length < 3 && (
                  <div className="flex-1 min-w-[200px]">
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/png, image/jpeg, image/webp" onChange={handleImageUpload} />
                    <Button variant="outline" type="button" onClick={() => fileInputRef.current?.click()} disabled={isUploadingImage} className="w-full h-20 border-dashed rounded-xl">
                      {isUploadingImage ? <span className="animate-spin mr-2 border-2 border-indigo-600 border-t-transparent rounded-full w-4 h-4" /> : <Upload className="w-4 h-4 mr-2" />}
                      {isUploadingImage ? 'Uploading...' : 'อัปโหลดรูปภาพ (สูงสุด 3 รูป)'}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsProjectDialogOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button onClick={handleAddProject} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">บันทึกผลงาน</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={isProfileDialogOpen} onOpenChange={setIsProfileDialogOpen}>
        <DialogContent className="sm:max-w-2xl rounded-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">แก้ไขข้อมูลโปรไฟล์และลิงก์</DialogTitle>
            <DialogDescription className="font-medium text-slate-500">ข้อมูลส่วนตัวและลิงก์เชื่อมโยงสำหรับแสดงบนหน้า Portfolio สาธารณะของคุณ</DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-6 py-4">
            {/* Avatar Upload Section */}
            <div className="flex flex-col md:flex-row items-center gap-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <Avatar className="w-20 h-20 border-2 border-white dark:border-slate-800 shadow-md rounded-2xl">
                <AvatarImage src={profileForm.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profileForm.name}`} />
                <AvatarFallback className="text-xl bg-indigo-100 text-indigo-600 font-bold rounded-2xl">{profileForm.nameThai?.[0] || 'U'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left space-y-2">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">รูปโปรไฟล์</h4>
                <div className="flex gap-2 justify-center md:justify-start">
                  <input
                    ref={profileAvatarInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleProfileAvatarUpload}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => profileAvatarInputRef.current?.click()}
                    disabled={isUploadingAvatar}
                    className="rounded-xl font-bold"
                  >
                    {isUploadingAvatar ? 'กำลังอัปโหลด...' : 'เปลี่ยนรูป'}
                  </Button>
                  {profileForm.avatar && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:text-red-600 rounded-xl font-bold"
                      onClick={() => setProfileForm(prev => ({ ...prev, avatar: '' }))}
                    >
                      ลบรูป
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Names Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-bold ml-1">ชื่อ-นามสกุล (ภาษาไทย)</Label>
                <Input
                  value={profileForm.nameThai}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, nameThai: e.target.value }))}
                  className="rounded-xl font-medium focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold ml-1">ชื่อ-นามสกุล (ภาษาอังกฤษ)</Label>
                <Input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="rounded-xl font-medium focus-visible:ring-indigo-500"
                />
              </div>
            </div>

            {/* Bios Input */}
            <div className="space-y-2">
              <Label className="font-bold ml-1">แนะนำตัวสั้นๆ (ภาษาไทย)</Label>
              <Textarea
                value={profileForm.summaryThai}
                onChange={(e) => setProfileForm(prev => ({ ...prev, summaryThai: e.target.value }))}
                placeholder="อธิบายตัวคุณและสิ่งที่คุณสนใจเป็นภาษาไทย..."
                className="rounded-xl min-h-[80px] font-medium focus-visible:ring-indigo-500"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-bold ml-1">แนะนำตัวสั้นๆ (ภาษาอังกฤษ)</Label>
              <Textarea
                value={profileForm.summary}
                onChange={(e) => setProfileForm(prev => ({ ...prev, summary: e.target.value }))}
                placeholder="Explain yourself and your interests in English..."
                className="rounded-xl min-h-[80px] font-medium focus-visible:ring-indigo-500"
              />
            </div>

            {/* Links Input */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="font-bold ml-1">GitHub URL</Label>
                <Input
                  value={profileForm.githubUrl}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, githubUrl: e.target.value }))}
                  placeholder="https://github.com/username"
                  className="rounded-xl font-medium focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold ml-1">LinkedIn URL</Label>
                <Input
                  value={profileForm.linkedinUrl}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                  placeholder="https://linkedin.com/in/username"
                  className="rounded-xl font-medium focus-visible:ring-indigo-500"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-bold ml-1">Personal Website</Label>
                <Input
                  value={profileForm.personalWebsite}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, personalWebsite: e.target.value }))}
                  placeholder="https://mywebsite.com"
                  className="rounded-xl font-medium focus-visible:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsProfileDialogOpen(false)} className="rounded-xl font-bold">ยกเลิก</Button>
            <Button onClick={handleUpdateProfile} className="rounded-xl font-bold bg-slate-900 hover:bg-slate-800 text-white dark:bg-white dark:text-slate-900">บันทึกข้อมูล</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Skill Dialog */}
      <Dialog open={isSkillDialogOpen} onOpenChange={setIsSkillDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>เพิ่มทักษะความสามารถ</DialogTitle>
            <DialogDescription>เพิ่มทักษะด้านโปรแกรมหรือทักษะทั่วไปเพื่อระบุความสามารถของคุณ</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="space-y-2">
              <Label>ชื่อทักษะ (เช่น React, Python, English Communication)</Label>
              <Input
                value={skillForm.name}
                onChange={(e) => setSkillForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="ชื่อทักษะ..."
                className="rounded-xl"
              />
            </div>
            
            <div className="space-y-2">
              <Label>ประเภททักษะ</Label>
              <Select
                value={skillForm.category}
                onValueChange={(val) => setSkillForm(prev => ({ ...prev, category: val }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="เลือกประเภท..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="programming">Programming Language / Technical</SelectItem>
                  <SelectItem value="framework">Framework / Library / Tool</SelectItem>
                  <SelectItem value="database">Database</SelectItem>
                  <SelectItem value="soft_skill">Soft Skill / General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ระดับความชำนาญ</Label>
              <Select
                value={skillForm.level}
                onValueChange={(val) => setSkillForm(prev => ({ ...prev, level: val }))}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="เลือกระดับ..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Beginner (เริ่มต้น)</SelectItem>
                  <SelectItem value="intermediate">Intermediate (ปานกลาง)</SelectItem>
                  <SelectItem value="advanced">Advanced (เชี่ยวชาญ)</SelectItem>
                  <SelectItem value="expert">Expert (ผู้เชี่ยวชาญพิเศษ)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSkillDialogOpen(false)} className="rounded-xl">ยกเลิก</Button>
            <Button onClick={handleAddSkill} className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900">เพิ่มทักษะ</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
