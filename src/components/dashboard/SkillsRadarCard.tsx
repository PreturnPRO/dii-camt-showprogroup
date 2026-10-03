import React from 'react';
import { motion } from 'framer-motion';
import { Radar, Target, BarChart3, CheckCircle2, TrendingUp, Scale } from 'lucide-react';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface SkillsRadarProps {
    technicalSkills: {
        functionality: number;
        readability: number;
        bestPractice: number;
    };
    softSkills: {
        communication: number;
        openness: number;
    };
}

export function SkillsRadarCard({ technicalSkills, softSkills }: SkillsRadarProps) {
    // All skills for radar chart (normalized to 5)
    const skills = [
        { name: 'Functionality', value: technicalSkills.functionality, type: 'tech' },
        { name: 'Readability', value: technicalSkills.readability, type: 'tech' },
        { name: 'Best Practice', value: technicalSkills.bestPractice, type: 'tech' },
        { name: 'Communication', value: softSkills.communication, type: 'soft' },
        { name: 'Openness', value: softSkills.openness, type: 'soft' },
    ];

    const maxValue = 5;
    const centerX = 150;
    const centerY = 140;
    const maxRadius = 100;

    // Calculate average scores
    const techAvg = (technicalSkills.functionality + technicalSkills.readability + technicalSkills.bestPractice) / 3;
    const softAvg = (softSkills.communication + softSkills.openness) / 2;

    // Calculate polygon points
    const getPolygonPoints = (values: number[]) => {
        const angleStep = (2 * Math.PI) / values.length;
        return values.map((value, index) => {
            const angle = index * angleStep - Math.PI / 2;
            const radius = (value / maxValue) * maxRadius;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            };
        }).map(p => `${p.x},${p.y}`).join(' ');
    };

    // Generate radar grid lines
    const gridLines = [0.2, 0.4, 0.6, 0.8, 1].map(scale => {
        const points = skills.map((_, index) => {
            const angle = (index * 2 * Math.PI) / skills.length - Math.PI / 2;
            const radius = maxRadius * scale;
            return {
                x: centerX + radius * Math.cos(angle),
                y: centerY + radius * Math.sin(angle),
            };
        });
        return points.map(p => `${p.x},${p.y}`).join(' ');
    });

    // Generate axis lines
    const axisLines = skills.map((_, index) => {
        const angle = (index * 2 * Math.PI) / skills.length - Math.PI / 2;
        return {
            x1: centerX,
            y1: centerY,
            x2: centerX + maxRadius * Math.cos(angle),
            y2: centerY + maxRadius * Math.sin(angle),
        };
    });

    // Label positions
    const labelPositions = skills.map((skill, index) => {
        const angle = (index * 2 * Math.PI) / skills.length - Math.PI / 2;
        const labelRadius = maxRadius + 30;
        return {
            x: centerX + labelRadius * Math.cos(angle),
            y: centerY + labelRadius * Math.sin(angle),
            skill,
        };
    });

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50"
        >
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20">
                    <Target className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">Skills Radar</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400">เปรียบเทียบ Tech vs Soft Skills</p>
                </div>
            </div>

            {/* Radar Chart */}
            <div className="flex justify-center mb-6">
                <svg width="300" height="280" className="overflow-visible">
                    {/* Grid circles */}
                    {gridLines.map((points, index) => (
                        <polygon
                            key={index}
                            points={points}
                            fill="none"
                            stroke="#E2E8F0"
                            strokeWidth="1"
                            strokeDasharray={index < gridLines.length - 1 ? "2,2" : "0"}
                        />
                    ))}

                    {/* Axis lines */}
                    {axisLines.map((line, index) => (
                        <line
                            key={index}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke="#E2E8F0"
                            strokeWidth="1"
                        />
                    ))}

                    {/* Data polygon */}
                    <motion.polygon
                        points={getPolygonPoints(skills.map(s => s.value))}
                        fill="url(#radarGradient)"
                        fillOpacity="0.3"
                        stroke="url(#radarStroke)"
                        strokeWidth="2"
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        style={{ transformOrigin: `${centerX}px ${centerY}px` }}
                    />

                    {/* Data points */}
                    {skills.map((skill, index) => {
                        const angle = (index * 2 * Math.PI) / skills.length - Math.PI / 2;
                        const radius = (skill.value / maxValue) * maxRadius;
                        const x = centerX + radius * Math.cos(angle);
                        const y = centerY + radius * Math.sin(angle);
                        const color = skill.type === 'tech' ? '#8B5CF6' : '#EC4899';

                        return (
                            <motion.circle
                                key={index}
                                cx={x}
                                cy={y}
                                r="6"
                                fill={color}
                                stroke="white"
                                strokeWidth="2"
                                initial={{ opacity: 0, scale: 0 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.5 + index * 0.1 }}
                            />
                        );
                    })}

                    {/* Labels */}
                    {labelPositions.map((pos, index) => (
                        <text
                            key={index}
                            x={pos.x}
                            y={pos.y}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            className="text-[10px] font-medium"
                            fill={pos.skill.type === 'tech' ? '#8B5CF6' : '#EC4899'}
                        >
                            {pos.skill.name}
                        </text>
                    ))}

                    {/* Gradient definitions */}
                    <defs>
                        <linearGradient id="radarGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                        <linearGradient id="radarStroke" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#8B5CF6" />
                            <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                    </defs>
                </svg>
            </div>

            {/* Legend */}
            <div className="flex justify-center gap-6 mb-4">
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Technical Skills</span>
                </div>
                <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Soft Skills</span>
                </div>
            </div>

            {/* Score Summary */}
            <div className="grid grid-cols-2 gap-4">
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="p-4 rounded-2xl bg-gradient-to-br from-violet-50 to-purple-50 border border-violet-100 cursor-help"
                            >
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-violet-600">{techAvg.toFixed(1)}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Technical Average</div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Functionality</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{technicalSkills.functionality}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Readability</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{technicalSkills.readability}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Best Practice</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{technicalSkills.bestPractice}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>อ้างอิง: Google Engineering Practices, Clean Code</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <motion.div
                                whileHover={{ scale: 1.02 }}
                                className="p-4 rounded-2xl bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 cursor-help"
                            >
                                <div className="text-center">
                                    <div className="text-3xl font-bold text-pink-600">{softAvg.toFixed(1)}</div>
                                    <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">Soft Skills Average</div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Communication</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{softSkills.communication}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500 dark:text-slate-400">Openness</span>
                                        <span className="font-medium text-slate-700 dark:text-slate-300">{softSkills.openness}</span>
                                    </div>
                                </div>
                            </motion.div>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>อ้างอิง: AAC&U Value Rubrics</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>

            {/* Strength/Weakness Insights */}
            <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-2 flex items-center gap-1.5">
                    <BarChart3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    <span>วิเคราะห์จุดแข็ง-จุดอ่อน</span>
                </h4>
                <div className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {techAvg > softAvg ? (
                        <>
                            <p className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span><strong className="text-blue-600 dark:text-blue-400 font-semibold">จุดแข็ง:</strong> Technical Skills โดดเด่น เหมาะกับงาน Development</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span><strong className="text-amber-600 font-semibold">ควรพัฒนา:</strong> เพิ่มทักษะ Communication และการทำงานร่วมกับทีม</span>
                            </p>
                        </>
                    ) : techAvg < softAvg ? (
                        <>
                            <p className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span><strong className="text-blue-600 dark:text-blue-400 font-semibold">จุดแข็ง:</strong> Soft Skills ดีเยี่ยม เหมาะกับงาน PM/Lead</span>
                            </p>
                            <p className="flex items-center gap-1.5">
                                <TrendingUp className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span><strong className="text-amber-600 font-semibold">ควรพัฒนา:</strong> เพิ่มความแข็งแกร่งด้าน Technical</span>
                            </p>
                        </>
                    ) : (
                        <p className="flex items-center gap-1.5">
                            <Scale className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                            <span><strong className="text-blue-600 font-semibold">สมดุล:</strong> ทักษะทั้งสองด้านมีความสมดุลกัน</span>
                        </p>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
