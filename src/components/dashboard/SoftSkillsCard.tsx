import React from 'react';
import { motion } from 'framer-motion';
import { Users, Shield, Target, MessageSquare, Star } from 'lucide-react';

interface SoftSkillScore {
    category: string;
    categoryThai: string;
    score: number;
    maxScore: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
}

interface PeerFeedback {
    projectName: string;
    teamSize: number;
    averageScore: number;
    date: string;
}

interface SoftSkillsProps {
    leadership: number;
    discipline: number;
    responsibility: number;
    communication?: number;
    peerFeedbacks?: PeerFeedback[];
}

export function SoftSkillsCard({
    leadership,
    discipline,
    responsibility,
    communication = 0,
    peerFeedbacks = [],
}: SoftSkillsProps) {
    const softSkills: SoftSkillScore[] = [
        {
            category: 'Leadership',
            categoryThai: 'ความเป็นผู้นำ',
            score: leadership,
            maxScore: 5,
            icon: Users,
            color: 'text-violet-600',
            bgColor: 'bg-violet-50',
        },
        {
            category: 'Discipline',
            categoryThai: 'ระเบียบวินัย',
            score: discipline,
            maxScore: 5,
            icon: Shield,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
        },
        {
            category: 'Responsibility',
            categoryThai: 'ความรับผิดชอบ',
            score: responsibility,
            maxScore: 5,
            icon: Target,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
        },
        {
            category: 'Communication',
            categoryThai: 'การสื่อสาร',
            score: communication,
            maxScore: 5,
            icon: MessageSquare,
            color: 'text-orange-600',
            bgColor: 'bg-orange-50',
        },
    ];

    const averageScore = (leadership + discipline + responsibility + communication) / 4;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xs"
        >
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                        <Users className="w-4 h-4" />
                    </div>
                    <div>
                        <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-slate-100 tracking-tight">ทักษะทางสังคม (Soft Skills)</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400">การทำงานร่วมกับผู้อื่น</p>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-slate-900 dark:text-slate-200">{averageScore.toFixed(1)}</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">คะแนนเฉลี่ย</div>
                </div>
            </div>

            {/* Skill Bars */}
            <div className="space-y-4 mb-6">
                {softSkills.map((skill, index) => (
                    <motion.div
                        key={skill.category}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <div className={`p-1.5 rounded-lg ${skill.bgColor}`}>
                                    <skill.icon className={`w-3.5 h-3.5 ${skill.color}`} />
                                </div>
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{skill.categoryThai}</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`text-sm font-bold ${skill.color}`}>{skill.score.toFixed(1)}</span>
                                <span className="text-xs text-slate-400">/ {skill.maxScore}</span>
                            </div>
                        </div>
                        <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(skill.score / skill.maxScore) * 100}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className={`h-full rounded-full ${skill.bgColor.replace('bg-', 'bg-gradient-to-r from-').replace('-50', '-400')} to-${skill.color.replace('text-', '').replace('-600', '-500')}`}
                                style={{
                                    background: `linear-gradient(to right, ${skill.color.includes('violet') ? '#8B5CF6' : skill.color.includes('blue') ? '#3B82F6' : skill.color.includes('emerald') ? '#10B981' : '#F97316'}, ${skill.color.includes('violet') ? '#A855F7' : skill.color.includes('blue') ? '#60A5FA' : skill.color.includes('emerald') ? '#34D399' : '#FB923C'})`,
                                }}
                            />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Star Rating Visual */}
            <div className="flex justify-center gap-1 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`w-6 h-6 ${star <= Math.round(averageScore)
                                ? 'text-yellow-400 fill-yellow-400'
                                : 'text-slate-200'
                            }`}
                    />
                ))}
            </div>

            {/* Peer Feedback History */}
            {peerFeedbacks.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                    <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-3">ผลประเมินจาก Project</h4>
                    <div className="space-y-2">
                        {peerFeedbacks.slice(0, 3).map((feedback, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-800"
                            >
                                <div>
                                    <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">{feedback.projectName}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400">
                                        ทีม {feedback.teamSize} คน • {feedback.date}
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                                    <span className="font-bold text-slate-700 dark:text-slate-300">{feedback.averageScore.toFixed(1)}</span>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            )}
        </motion.div>
    );
}
