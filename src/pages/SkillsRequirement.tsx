import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import {
  Target, Plus, Trash2, Edit2, Users, Briefcase, Star, Search, ChevronRight,
  Code, Palette, Database, Brain, Globe, Shield, BarChart3, Sparkles, X, Save
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const skillIcons: Record<string, React.ElementType> = {
  'React': Code, 'Python': Code, 'Node.js': Code, 'TypeScript': Code,
  'UI/UX Design': Palette, 'Figma': Palette,
  'SQL': Database, 'MongoDB': Database, 'PostgreSQL': Database,
  'Machine Learning': Brain, 'Data Analysis': BarChart3,
  'English Communication': Globe, 'Cybersecurity': Shield,
};



type RequirementRow = {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
  skills: { name: string; level: string }[];
  priority: string;
  matchedStudents: number;
  avgMatch: number;
  positions: number;
};

type MatchRow = {
  name: string;
  nameEn: string;
  gpa: number;
  year: number;
  matchScore: number;
  skills: string[];
};

export default function SkillsRequirement() {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const tr = t.skillsRequirement;
  const [requirements, setRequirements] = useState<RequirementRow[]>([]);
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showMatches, setShowMatches] = useState(false);
  const [selectedReq, setSelectedReq] = useState<RequirementRow | null>(null);
  const [editingReq, setEditingReq] = useState<RequirementRow | null>(null);
  const { user, updateProfile } = useAuth();
  const rawUser = asRecord(user?.raw);
  const companyProfile = asRecord(rawUser.companyProfile);
  const currentCompanyProfileId = asString(companyProfile.id);

  const [formData, setFormData] = useState({
    name: '', description: '', priority: 'medium' as string, positions: 1,
    skills: [{ name: '', level: 'beginner' }] as { name: string; level: string }[],
  });

  const mapJobRequirement = React.useCallback((item: unknown): RequirementRow => {
    const job = asRecord(item);
    const preferredSkills = asArray<string>(job.preferredSkills);
    const requirementsList = asArray<string>(job.requirements);
    const applications = asArray(job.applications);
    const skills = (preferredSkills.length ? preferredSkills : requirementsList).slice(0, 6).map((skill) => ({
      name: String(skill),
      level: 'intermediate',
    }));

    return {
      id: asString(job.id),
      name: asString(job.title, '-'),
      nameEn: asString(job.title, '-'),
      description: asString(job.description, '-'),
      descriptionEn: asString(job.description, '-'),
      skills,
      priority: asString(job.status, 'open') === 'open' ? 'high' : 'medium',
      matchedStudents: applications.length,
      avgMatch: applications.length ? Math.min(95, 70 + applications.length * 5) : 0,
      positions: asNumber(job.positions, 1),
    };
  }, []);

  React.useEffect(() => {
    let isMounted = true;

    Promise.allSettled([api.jobs.list(), api.talent.search()])
      .then(([jobsResponse, talentResponse]) => {
        if (!isMounted) return;

        if (jobsResponse.status === 'fulfilled') {
          const mapped = jobsResponse.value.jobs
            .filter((job: any) => job.companyId === currentCompanyProfileId && job.type === 'skill_requirement')
            .map((job) => mapJobRequirement(job));
          setRequirements(mapped);
        }

        if (talentResponse.status === 'fulfilled') {
          const mapped = talentResponse.value.talents.map((item, index) => {
            const talent = asRecord(item);
            return {
              name: asString(talent.nameThai, asString(talent.name, `Student ${index + 1}`)),
              nameEn: asString(talent.name, asString(talent.nameThai, `Student ${index + 1}`)),
              gpa: asNumber(talent.gpax, asNumber(talent.gpa, 0)),
              year: asNumber(talent.year, 0),
              matchScore: asNumber(talent.matchScore, asNumber(talent.score, 0)),
              skills: asArray<string>(talent.skills),
            };
          });
          setMatches(mapped);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [mapJobRequirement]);

  const getPriorityConfig = (p: string) => {
    switch (p) {
      case 'high': return { label: tr.high, color: 'bg-red-100 text-red-700 border-red-200' };
      case 'medium': return { label: tr.medium, color: 'bg-amber-100 text-amber-700 border-amber-200' };
      case 'low': return { label: tr.low, color: 'bg-green-100 text-green-700 border-green-200' };
      default: return { label: p, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case 'beginner': return tr.beginner;
      case 'intermediate': return tr.intermediate;
      case 'advanced': return tr.advanced;
      case 'expert': return tr.expert;
      default: return level;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-blue-100 text-blue-700';
      case 'intermediate': return 'bg-emerald-100 text-emerald-700';
      case 'advanced': return 'bg-purple-100 text-purple-700';
      case 'expert': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const handleAddSkill = () => {
    setFormData(prev => ({ ...prev, skills: [...prev.skills, { name: '', level: 'beginner' }] }));
  };

  const handleRemoveSkill = (index: number) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter((_, i) => i !== index) }));
  };

  const handleSave = async () => {
    const payload = {
      title: formData.name,
      type: 'skill_requirement',
      positions: formData.positions,
      description: formData.description || formData.name,
      responsibilities: [],
      requirements: formData.skills.map((skill) => skill.name).filter(Boolean),
      preferredSkills: formData.skills.map((skill) => skill.name).filter(Boolean),
      salary: '',
      benefits: [],
      location: 'Chiang Mai',
      workType: 'hybrid',
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      status: formData.priority === 'low' ? 'closed' : 'open',
    };

    try {
      if (editingReq) {
        const response = await api.jobs.update(editingReq.id, payload);
        setRequirements((current) => current.map((item) => item.id === editingReq.id ? mapJobRequirement(response.job) : item));
      } else {
        const response = await api.jobs.create(payload);
        setRequirements((current) => [mapJobRequirement(response.job), ...current]);
      }
      
      // Update internshipSlots quota
      const currentSlots = asNumber(companyProfile.internshipSlots, 0);
      const addedPositions = editingReq 
        ? formData.positions - editingReq.positions // if edit, add the difference
        : formData.positions;
        
      if (addedPositions !== 0) {
        await updateProfile({
           roleData: {
             internshipSlots: Math.max(0, currentSlots + addedPositions)
           }
        });
      }

      toast({ title: tr.saveRequirement, description: formData.name });
      setShowForm(false);
      setEditingReq(null);
      setFormData({ name: '', description: '', priority: 'medium', positions: 1, skills: [{ name: '', level: 'beginner' }] });
    } catch (error) {
      toast({ title: tr.saveRequirement, description: error instanceof Error ? error.message : 'Unable to save requirement' });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.jobs.remove(id);
    } catch {
      // Keep local removal available for older seeded rows that do not map to a job id.
    }
    setRequirements((current) => current.filter((item) => item.id !== id));
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
      {/* Header */}
      <div>
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
          <Target className="w-4 h-4 text-indigo-500 dark:text-slate-400" />
          <span>{tr.subtitle}</span>
        </motion.div>
        <div className="flex items-end justify-between">
          <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            {tr.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">{tr.titleHighlight}</span>
          </motion.h1>
          <Button onClick={() => { setEditingReq(null); setFormData({ name: '', description: '', priority: 'medium', positions: 1, skills: [{ name: '', level: 'beginner' }] }); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Plus className="w-4 h-4" /> {tr.createNew}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Target, label: tr.totalRequirements, value: requirements.length.toString(), gradient: 'from-indigo-500 to-purple-500', shadow: 'shadow-indigo-200' },
          { icon: Briefcase, label: tr.activePositions, value: requirements.reduce((s, r) => s + r.positions, 0).toString(), gradient: 'from-blue-500 to-cyan-500', shadow: 'shadow-blue-200' },
          { icon: Users, label: tr.matchedStudents, value: requirements.reduce((s, r) => s + r.matchedStudents, 0).toString(), gradient: 'from-emerald-500 to-teal-500', shadow: 'shadow-emerald-200' },
          { icon: Star, label: tr.avgMatch, value: `${requirements.length ? Math.round(requirements.reduce((s, r) => s + r.avgMatch, 0) / requirements.length) : 0}%`, gradient: 'from-amber-500 to-orange-500', shadow: 'shadow-amber-200' },
        ].map((stat, i) => (
          <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-5 text-white shadow-xl ${stat.shadow}`}>
            <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50"><stat.icon className="w-4 h-4" /></div>
                <span className="text-sm font-medium text-white/90">{stat.label}</span>
              </div>
              <div className="text-3xl font-bold">{stat.value}</div>
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* Requirements List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {requirements.map((req, i) => {
          const priority = getPriorityConfig(req.priority);
          return (
            <motion.div key={req.id} variants={itemVariants} whileHover={{ y: -4 }}
              className="bg-white border border-slate-100 dark:border-slate-800 rounded-2xl p-6 shadow-lg shadow-slate-100/50 hover:shadow-xl transition-all dark:bg-slate-900/50">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-200">
                    {language === 'th' ? req.name : req.nameEn}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {language === 'th' ? req.description : req.descriptionEn}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={priority.color}>{priority.label}</Badge>
                  <Badge variant="outline">{req.positions} {t.common.position}</Badge>
                </div>
              </div>

              {/* Skills */}
              <div className="mb-4">
                <div className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-2">{tr.requiredSkills}</div>
                <div className="flex flex-wrap gap-2">
                  {req.skills.map((skill, si) => {
                    const SkillIcon = skillIcons[skill.name] || Code;
                    return (
                      <div key={si} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-700">
                        <SkillIcon className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                        <span className="text-sm font-medium">{skill.name}</span>
                        <Badge className={`text-[10px] px-1.5 py-0 h-5 ${getLevelColor(skill.level)}`}>{getLevelLabel(skill.level)}</Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Match stats */}
              <div className="flex items-center gap-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 dark:bg-indigo-950/30 dark:border-indigo-900/30 mb-4">
                <div className="flex-1">
                  <div className="text-xs text-slate-500 dark:text-slate-400 mb-1">{tr.matchScore}</div>
                  <Progress value={req.avgMatch} className="h-2" />
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600 dark:text-slate-300">{req.avgMatch}%</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">{req.matchedStudents} {t.common.person}</div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 rounded-xl gap-1" size="sm"
                  onClick={() => { setSelectedReq(req); setShowMatches(true); }}>
                  <Search className="w-3.5 h-3.5" /> {tr.viewMatches}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl"
                  onClick={() => {
                    setEditingReq(req);
                    setFormData({
                      name: req.name,
                      description: req.description,
                      priority: req.priority,
                      positions: req.positions,
                      skills: req.skills.length ? req.skills : [{ name: '', level: 'beginner' }],
                    });
                    setShowForm(true);
                  }}
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="outline" size="sm" className="rounded-xl text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-slate-300 dark:bg-slate-800" onClick={() => handleDelete(req.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          );
        })}
        {isLoading && (
          <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {language === 'th' ? 'กำลังโหลด Requirements...' : 'Loading requirements...'}
          </div>
        )}
        {!isLoading && requirements.length === 0 && (
          <div className="lg:col-span-2 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {language === 'th' ? 'ยังไม่มี Requirement' : 'No requirements yet.'}
          </div>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-[550px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-indigo-500 dark:text-slate-400" /> {editingReq ? (language === 'th' ? 'แก้ไข Requirement' : 'Edit Requirement') : tr.createNew}
            </DialogTitle>
            <DialogDescription>{tr.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div>
              <Label>{tr.requirementName}</Label>
              <Input value={formData.name} onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Full-Stack Developer" />
            </div>
            <div>
              <Label>{tr.description}</Label>
              <Textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} rows={3} />
            </div>
            <div>
              <Label>{tr.priority}</Label>
              <Select value={formData.priority} onValueChange={v => setFormData(prev => ({ ...prev, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="high">{tr.high}</SelectItem>
                  <SelectItem value="medium">{tr.medium}</SelectItem>
                  <SelectItem value="low">{tr.low}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label>จำนวนตำแหน่ง (คน)</Label>
              <Input 
                type="number" 
                min={1} 
                value={formData.positions} 
                onChange={e => setFormData(prev => ({ ...prev, positions: parseInt(e.target.value) || 1 }))} 
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>{tr.requiredSkills}</Label>
                <Button type="button" variant="outline" size="sm" onClick={handleAddSkill} className="gap-1">
                  <Plus className="w-3.5 h-3.5" /> {tr.addSkill}
                </Button>
              </div>
              <div className="space-y-2">
                {formData.skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input className="flex-1" placeholder={tr.skillName} value={skill.name}
                      onChange={e => {
                        const skills = [...formData.skills];
                        skills[i].name = e.target.value;
                        setFormData(prev => ({ ...prev, skills }));
                      }} />
                    <Select value={skill.level} onValueChange={v => {
                      const skills = [...formData.skills];
                      skills[i].level = v;
                      setFormData(prev => ({ ...prev, skills }));
                    }}>
                      <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">{tr.beginner}</SelectItem>
                        <SelectItem value="intermediate">{tr.intermediate}</SelectItem>
                        <SelectItem value="advanced">{tr.advanced}</SelectItem>
                        <SelectItem value="expert">{tr.expert}</SelectItem>
                      </SelectContent>
                    </Select>
                    {formData.skills.length > 1 && (
                      <Button type="button" variant="ghost" size="sm" className="text-red-500 dark:text-slate-400" onClick={() => handleRemoveSkill(i)}>
                        <X className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 gap-2" onClick={handleSave}>
                <Save className="w-4 h-4" /> {tr.saveRequirement}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>{t.common.cancel}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Match Results Dialog */}
      <Dialog open={showMatches} onOpenChange={setShowMatches}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-indigo-500 dark:text-slate-400" /> {tr.matchResults}
            </DialogTitle>
            <DialogDescription>
              {selectedReq && (language === 'th' ? selectedReq.name : selectedReq.nameEn)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            {matches.map((match, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 transition-colors dark:bg-slate-800">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                  {(language === 'th' ? match.name : match.nameEn).charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{language === 'th' ? match.name : match.nameEn}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">GPA {match.gpa} • {t.studentsPage?.year || 'Year'} {match.year}</div>
                  <div className="flex gap-1 mt-1">
                    {match.skills.map((s, si) => (
                      <Badge key={si} variant="outline" className="text-[10px] px-1.5 py-0">{s}</Badge>
                    ))}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-bold text-indigo-600 dark:text-slate-300">{match.matchScore}%</div>
                  <div className="text-xs text-slate-400">{tr.matchScore}</div>
                </div>
              </div>
            ))}
            {matches.length === 0 && (
              <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center text-sm text-slate-500 dark:text-slate-400">
                {language === 'th' ? 'ยังไม่มีผลจับคู่' : 'No match results yet.'}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
