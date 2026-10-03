import React from 'react';
import { motion } from 'framer-motion';
import { Code2, CheckCircle2, Eye, FileCode, Tag, BookOpen, MessageSquare, RefreshCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

// Technical Skills based on Google Engineering Practices / Clean Code
interface RubricCriteria {
    id: string;
    name: string;
    nameThai: string;
    description: string;
    score: number;
    maxScore: number;
    icon: React.ElementType;
    color: string;
    bgColor: string;
    reference: string;
}

// Comment Tags for statistics
interface CommentTag {
    type: 'bug' | 'suggestion' | 'good_job';
    count: number;
    color: string;
    bgColor: string;
}

interface TechnicalSkillsRubricProps {
    functionality: number;
    readability: number;
    bestPractice: number;
    professorWeight?: number; // Default 60%
    peerWeight?: number; // Default 40%
    professorScore?: number;
    peerScore?: number;
    commentTags?: {
        bug: number;
        suggestion: number;
        goodJob: number;
    };
}

export function TechnicalSkillsRubricCard({
    functionality,
    readability,
    bestPractice,
    professorWeight = 60,
    peerWeight = 40,
    professorScore = 0,
    peerScore = 0,
    commentTags = { bug: 0, suggestion: 5, goodJob: 12 },
}: TechnicalSkillsRubricProps) {
    const rubricCriteria: RubricCriteria[] = [
        {
            id: 'functionality',
            name: 'Functionality',
            nameThai: 'ทำงานได้จริง',
            description: 'โค้ดทำงานได้ตรงตาม Requirements ไม่มี Bug ทดสอบได้',
            score: functionality,
            maxScore: 5,
            icon: CheckCircle2,
            color: 'text-emerald-600',
            bgColor: 'bg-emerald-50',
            reference: 'Google Engineering Practices',
        },
        {
            id: 'readability',
            name: 'Readability',
            nameThai: 'โค้ดอ่านง่าย',
            description: 'ตั้งชื่อตัวแปร/ฟังก์ชันชัดเจน โครงสร้างเข้าใจง่าย มี Comment เหมาะสม',
            score: readability,
            maxScore: 5,
            icon: Eye,
            color: 'text-blue-600',
            bgColor: 'bg-blue-50',
            reference: 'Clean Code (Robert C. Martin)',
        },
        {
            id: 'bestpractice',
            name: 'Best Practice',
            nameThai: 'โครงสร้างถูกต้อง',
            description: 'ใช้ Design Pattern เหมาะสม แยก Module ดี ไม่ Repeat Code (DRY)',
            score: bestPractice,
            maxScore: 5,
            icon: FileCode,
            color: 'text-violet-600',
            bgColor: 'bg-violet-50',
            reference: 'Google Engineering Practices',
        },
    ];

    const tags: CommentTag[] = [
        { type: 'bug', count: commentTags.bug, color: 'text-red-600', bgColor: 'bg-red-50' },
        { type: 'suggestion', count: commentTags.suggestion, color: 'text-amber-600', bgColor: 'bg-amber-50' },
        { type: 'good_job', count: commentTags.goodJob, color: 'text-emerald-600', bgColor: 'bg-emerald-50' },
    ];

    const getTagLabel = (type: string) => {
        switch (type) {
            case 'bug': return 'Bug';
            case 'suggestion': return 'Suggestion';
            case 'good_job': return 'Good Job';
            default: return type;
        }
    };

    // Calculate weighted score
    const avgScore = (functionality + readability + bestPractice) / 3;
    const weightedScore = professorScore > 0 || peerScore > 0
        ? (professorScore * professorWeight / 100) + (peerScore * peerWeight / 100)
        : avgScore;

    const getScoreLevel = (score: number) => {
        if (score >= 4.5) return { label: 'Excellent', color: 'text-emerald-600', bg: 'bg-emerald-50' };
        if (score >= 3.5) return { label: 'Good', color: 'text-blue-600', bg: 'bg-blue-50' };
        if (score >= 2.5) return { label: 'Fair', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Needs Improvement', color: 'text-red-600', bg: 'bg-red-50' };
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/20">
                        <Code2 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Technical Skills</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">Hard Skills ตามมาตรฐาน Google / Clean Code</p>
                    </div>
                </div>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger>
                            <div className={`px-3 py-1.5 rounded-xl ${getScoreLevel(weightedScore).bg}`}>
                                <span className={`text-xl font-bold ${getScoreLevel(weightedScore).color}`}>
                                    {weightedScore.toFixed(1)}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400 ml-1">/ 5</span>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>คะแนนถ่วงน้ำหนัก: อาจารย์ {professorWeight}% / เพื่อน {peerWeight}%</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Rubric Criteria */}
            <div className="space-y-4 mb-6">
                {rubricCriteria.map((criteria, index) => (
                    <motion.div
                        key={criteria.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className={`p-4 rounded-2xl ${criteria.bgColor} border border-white/50`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <criteria.icon className={`w-4 h-4 ${criteria.color}`} />
                                <span className={`font-semibold text-sm ${criteria.color}`}>
                                    {criteria.name}
                                </span>
                                <span className="text-xs text-slate-500 dark:text-slate-400">({criteria.nameThai})</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className={`text-lg font-bold ${criteria.color}`}>{criteria.score}</span>
                                <span className="text-xs text-slate-400">/ {criteria.maxScore}</span>
                            </div>
                        </div>
                        <p className="text-xs text-slate-600 dark:text-slate-400 mb-2">{criteria.description}</p>
                        <div className="h-2 bg-white/60 rounded-full overflow-hidden dark:bg-slate-900/50">
                            <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(criteria.score / criteria.maxScore) * 100}%` }}
                                transition={{ duration: 1, delay: index * 0.1 }}
                                className="h-full rounded-full"
                                style={{
                                    background: criteria.color.includes('emerald')
                                        ? 'linear-gradient(to right, #10B981, #34D399)'
                                        : criteria.color.includes('blue')
                                            ? 'linear-gradient(to right, #3B82F6, #60A5FA)'
                                            : 'linear-gradient(to right, #8B5CF6, #A855F7)',
                                }}
                            />
                        </div>
                        <div className="flex items-center gap-1 mt-2">
                            <BookOpen className="w-3 h-3 text-slate-400" />
                            <span className="text-[10px] text-slate-400">อ้างอิง: {criteria.reference}</span>
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Weight Info */}
            <div className="flex items-center justify-center gap-6 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 mb-4">
                <div className="text-center">
                    <div className="text-lg font-bold text-indigo-600 dark:text-slate-300">{professorWeight}%</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">อาจารย์</div>
                </div>
                <div className="w-px h-8 bg-slate-200 dark:bg-slate-800" />
                <div className="text-center">
                    <div className="text-lg font-bold text-pink-600">{peerWeight}%</div>
                    <div className="text-xs text-slate-500 dark:text-slate-400">เพื่อนร่วมทีม</div>
                </div>
            </div>

            {/* Comment Tags Statistics */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                    <span className="font-semibold text-slate-700 dark:text-slate-300 text-sm">สถิติ Tagging</span>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <motion.div
                            key={tag.type}
                            whileHover={{ scale: 1.05 }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${tag.bgColor} border border-white/50`}
                        >
                            <span className="text-sm">{getTagLabel(tag.type)}</span>
                            <Badge variant="secondary" className={`${tag.color} bg-white/50 font-bold dark:bg-slate-900/50`}>
                                {tag.count}
                            </Badge>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.div>
    );
}
