import React from 'react';
import { motion } from 'framer-motion';
import { Code2, Palette, Server, Users, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Skill } from '@/types';

interface CareerPath {
    id: string;
    name: string;
    nameThai: string;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    gradientFrom: string;
    gradientTo: string;
}

interface TechnicalSkillsProps {
    skills: Skill[];
    activities?: {
        name: string;
        type: string;
        date: string;
    }[];
}

const careerPaths: CareerPath[] = [
    {
        id: 'uiux',
        name: 'UI/UX',
        nameThai: 'UI/UX Design',
        icon: Palette,
        color: 'text-pink-600',
        bgColor: 'bg-pink-50',
        gradientFrom: 'from-pink-500',
        gradientTo: 'to-rose-500',
    },
    {
        id: 'frontend',
        name: 'Frontend',
        nameThai: 'Frontend Development',
        icon: Code2,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        gradientFrom: 'from-blue-500',
        gradientTo: 'to-indigo-500',
    },
    {
        id: 'backend',
        name: 'Backend',
        nameThai: 'Backend Development',
        icon: Server,
        color: 'text-emerald-600',
        bgColor: 'bg-emerald-50',
        gradientFrom: 'from-emerald-500',
        gradientTo: 'to-teal-500',
    },
    {
        id: 'pm',
        name: 'PM',
        nameThai: 'Project Management',
        icon: Users,
        color: 'text-violet-600',
        bgColor: 'bg-violet-50',
        gradientFrom: 'from-violet-500',
        gradientTo: 'to-purple-500',
    },
];

const skillToCareerPath: Record<string, string[]> = {
    'uiux': ['UI/UX Design', 'Figma', 'Adobe XD', 'Design Thinking', 'User Research'],
    'frontend': ['React', 'Vue.js', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Tailwind CSS'],
    'backend': ['Python', 'Node.js', 'Java', 'SQL', 'MongoDB', 'API Design', 'Machine Learning'],
    'pm': ['Agile', 'Scrum', 'JIRA', 'Communication', 'Leadership'],
};

const getLevelColor = (level: string) => {
    switch (level) {
        case 'expert': return 'bg-violet-100 text-violet-700 border-violet-200';
        case 'advanced': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
        case 'intermediate': return 'bg-blue-100 text-blue-700 border-blue-200';
        default: return 'bg-slate-100 text-slate-700 dark:text-slate-300 border-slate-200';
    }
};

const getLevelLabel = (level: string) => {
    switch (level) {
        case 'expert': return 'Expert';
        case 'advanced': return 'Advanced';
        case 'intermediate': return 'Intermediate';
        default: return 'Beginner';
    }
};

export function TechnicalSkillsCard({ skills, activities = [] }: TechnicalSkillsProps) {
    // Group skills by career path
    const groupedSkills = careerPaths.map(path => ({
        ...path,
        skills: skills.filter(skill =>
            skillToCareerPath[path.id]?.some(s =>
                skill.name.toLowerCase().includes(s.toLowerCase())
            )
        ),
    }));

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                        <Code2 className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">ทักษะทางเทคนิค</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">Technical Competencies</p>
                    </div>
                </div>
            </div>

            {/* Career Path Sections */}
            <div className="space-y-4">
                {groupedSkills.map((path, pathIndex) => (
                    <motion.div
                        key={path.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: pathIndex * 0.1 }}
                        className={`p-4 rounded-2xl ${path.bgColor} border border-white/50`}
                    >
                        <div className="flex items-center gap-2 mb-3">
                            <path.icon className={`w-4 h-4 ${path.color}`} />
                            <span className={`font-semibold text-sm ${path.color}`}>{path.nameThai}</span>
                        </div>

                        {path.skills.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
                                {path.skills.map((skill, skillIndex) => (
                                    <motion.div
                                        key={skill.name}
                                        initial={{ opacity: 0, scale: 0.8 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ delay: pathIndex * 0.1 + skillIndex * 0.05 }}
                                    >
                                        <Badge
                                            variant="outline"
                                            className={`${getLevelColor(skill.level)} px-3 py-1 font-medium`}
                                        >
                                            {skill.name}
                                            <span className="ml-1.5 text-[10px] opacity-75">
                                                {getLevelLabel(skill.level)}
                                            </span>
                                        </Badge>
                                    </motion.div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-xs text-slate-400">ยังไม่มีทักษะในหมวดนี้</p>
                        )}
                    </motion.div>
                ))}
            </div>

            {/* Experience & Activities */}
            {activities.length > 0 && (
                <div className="mt-6 pt-6 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">ประสบการณ์และกิจกรรม</span>
                    </div>
                    <div className="space-y-2">
                        {activities.slice(0, 3).map((activity, index) => (
                            <div
                                key={index}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                            >
                                <div>
                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{activity.name}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">{activity.type}</div>
                                </div>
                                <span className="text-xs text-slate-400">{activity.date}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
