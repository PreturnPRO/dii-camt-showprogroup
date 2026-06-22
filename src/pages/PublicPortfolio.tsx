import React from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Briefcase, Code, Award, Trophy, ArrowLeft,
  Github, Linkedin, Globe, FileText, Layers, Calendar, Moon, Sun
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { api } from '@/lib/api';
import { mapStudent } from '@/lib/live-mappers';
import type { Student } from '@/types';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from 'next-themes';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PublicPortfolio() {
  const { id } = useParams<{ id: string }>();
  const { t } = useLanguage();
  const { theme, setTheme } = useTheme();
  const [student, setStudent] = React.useState<Student | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (!id) return;
    let mounted = true;

    api.students.profile(id)
      .then((response) => {
        if (!mounted) return;
        setStudent(mapStudent(response.profile));
        setLoading(false);
      })
      .catch((err) => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to load portfolio');
        setLoading(false);
      });

    return () => { mounted = false; };
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full border-4 border-slate-200 border-t-indigo-600 h-12 w-12" />
      </div>
    );
  }

  if (error || !student || student.portfolio?.isPublic === false) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
        <Briefcase className="w-16 h-16 text-slate-300 mb-4" />
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Portfolio Not Found</h1>
        <p className="text-slate-500 mb-6 max-w-md">The portfolio you are looking for does not exist or is set to private.</p>
        <Button asChild><Link to="/">Return to Home</Link></Button>
      </div>
    );
  }

  const projects = student.portfolio?.projects ?? [];
  const achievements = student.badges.map((badge) => ({
    id: badge.id,
    title: badge.nameThai || badge.name,
    description: badge.description,
    date: badge.earnedAt,
  }));
  const skills = student.skills.map((skill) => ({
    name: skill.name,
    level: skill.level,
    category: skill.category,
    icon: skill.category === 'soft_skill' ? <Layers className="w-4 h-4" /> : <Code className="w-4 h-4" />,
  }));

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-12 px-4 sm:px-6 lg:px-8 overflow-hidden relative">
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-5xl mx-auto space-y-8 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" asChild>
            <Link to="/"><ArrowLeft className="w-4 h-4 mr-2" /> Back</Link>
          </Button>
          <button
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            aria-label="toggle dark mode"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        </div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8">
          
          {/* Header Profile */}
          <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[3rem] p-8 md:p-12 border border-slate-200 dark:border-slate-800 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-8 relative z-10">
              <Avatar className="w-32 h-32 md:w-40 md:h-40 border-4 border-white shadow-xl rounded-3xl shrink-0">
                <AvatarImage src={student.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${student.name}`} />
                <AvatarFallback className="text-4xl bg-indigo-100 text-indigo-600 rounded-3xl dark:text-slate-300">
                  {student.nameThai.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-center md:text-left">
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 dark:text-white tracking-tight mb-2">
                  {student.nameThai}
                </h1>
                <p className="text-xl text-slate-500 dark:text-slate-400 mb-4 font-medium">{student.name}</p>
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-6">
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-base py-1 px-3">{student.major}</Badge>
                  <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-base py-1 px-3">{t.portfolioPage.year} {student.year}</Badge>
                </div>
                <div className="flex gap-3 justify-center md:justify-start">
                  {student.portfolio?.linkedinUrl && (
                    <Button variant="outline" size="icon" className="rounded-xl border-slate-200" onClick={() => window.open(student.portfolio?.linkedinUrl, '_blank')}>
                      <Linkedin className="w-5 h-5 text-blue-600" />
                    </Button>
                  )}
                  {student.portfolio?.githubUrl && (
                    <Button variant="outline" size="icon" className="rounded-xl border-slate-200" onClick={() => window.open(student.portfolio?.githubUrl, '_blank')}>
                      <Github className="w-5 h-5" />
                    </Button>
                  )}
                  {student.portfolio?.personalWebsite && (
                    <Button variant="outline" size="icon" className="rounded-xl border-slate-200" onClick={() => window.open(student.portfolio?.personalWebsite, '_blank')}>
                      <Globe className="w-5 h-5 text-indigo-600" />
                    </Button>
                  )}
                  {student.cvUrl && (
                    <Button className="rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-md" onClick={() => window.open(student.cvUrl, '_blank')}>
                      <FileText className="w-4 h-4 mr-2" /> CV
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {(student.portfolio?.summary || student.portfolio?.summaryThai) && (
              <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800 relative z-10">
                <p className="text-slate-600 dark:text-slate-300 text-lg leading-relaxed">
                  {student.portfolio?.summaryThai || student.portfolio?.summary}
                </p>
              </div>
            )}
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Skills & Badges Column */}
            <div className="space-y-8">
              <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-3 tracking-tight">
                  <div className="p-2 rounded-xl bg-indigo-50 text-indigo-500"><Code className="w-5 h-5" /></div>
                  Skills
                </h3>
                {skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, idx) => (
                      <Badge key={idx} variant="secondary" className="bg-slate-100 dark:bg-slate-800 py-1.5 px-3 text-sm flex items-center gap-1.5">
                        {skill.icon} {skill.name} <span className="opacity-50 text-xs ml-1 font-normal capitalize">({skill.level})</span>
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 italic text-sm">No skills added yet.</p>
                )}
              </motion.div>

              <motion.div variants={itemVariants} className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm">
                <h3 className="font-bold text-xl mb-6 flex items-center gap-3 tracking-tight">
                  <div className="p-2 rounded-xl bg-amber-50 text-amber-500"><Trophy className="w-5 h-5" /></div>
                  Achievements
                </h3>
                <div className="space-y-4">
                  {achievements.length > 0 ? (
                    achievements.map((ach) => (
                      <div key={ach.id} className="flex gap-3 items-start">
                        <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                          <Award className="w-5 h-5 text-amber-600" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 dark:text-white leading-tight">{ach.title}</h4>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-1 line-clamp-2">{ach.description}</p>
                          <div className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(ach.date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 italic text-sm">No achievements yet.</p>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Projects Column */}
            <div className="lg:col-span-2 space-y-6">
              <motion.h3 variants={itemVariants} className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-purple-50 text-purple-500"><Briefcase className="w-6 h-6" /></div>
                Projects & Works
              </motion.h3>

              {projects.length > 0 ? (
                projects.map((project, index) => (
                  <motion.div 
                    key={project.id} 
                    variants={itemVariants} 
                    className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm group hover:shadow-xl transition-all"
                  >
                    {project.images?.[0] && (
                      <div className="h-48 overflow-hidden w-full relative bg-slate-100 dark:bg-slate-800">
                        <img 
                          src={project.images[0]} 
                          alt={project.title} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                    )}
                    <div className="p-8">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-1 group-hover:text-indigo-600 transition-colors">
                            {project.title}
                          </h3>
                          <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">{project.role}</p>
                        </div>
                        {project.url && (
                          <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => window.open(project.url, '_blank')}>
                            View Project
                          </Button>
                        )}
                      </div>
                      
                      <p className="text-slate-600 dark:text-slate-300 mb-6 leading-relaxed">
                        {project.description}
                      </p>
                      
                      <div className="flex flex-wrap gap-2">
                        {project.technologies.map((tech) => (
                          <Badge key={tech} variant="outline" className="border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <motion.div variants={itemVariants} className="bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
                  <Briefcase className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-500 font-medium">No projects have been added yet.</p>
                </motion.div>
              )}
            </div>

          </div>
        </motion.div>
      </div>
    </div>
  );
}
