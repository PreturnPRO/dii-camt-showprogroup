import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown, Star, BarChart3 } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

interface SemesterGPA {
    semester: string;
    gpa: number;
    credits: number;
}

interface GPAHistoryProps {
    semesterHistory: SemesterGPA[];
    /** GPA of the current term; null when nothing is graded yet this term */
    currentGPA: number | null;
    gpax: number;
}

export function GPAHistoryCard({ semesterHistory, currentGPA, gpax }: GPAHistoryProps) {
    const chartData = semesterHistory.map(s => ({
        name: s.semester,
        gpa: s.gpa,
    }));

    const trend = semesterHistory.length >= 2
        ? semesterHistory[semesterHistory.length - 1].gpa - semesterHistory[semesterHistory.length - 2].gpa
        : 0;

    const isPositiveTrend = trend >= 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            data-testid="gpa-history"
            data-points={chartData.length}
            className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50"
        >
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/20">
                        <BarChart3 className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">ประวัติผลการเรียน</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">GPA ทุกภาคเรียน</p>
                    </div>
                </div>
            </div>

            {/* GPAX Highlight */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-emerald-100">GPAX สะสม</span>
                        <Star className="w-4 h-4 text-yellow-300" />
                    </div>
                    <div className="text-3xl font-bold">{gpax.toFixed(2)}</div>
                </motion.div>

                <motion.div
                    whileHover={{ scale: 1.02 }}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">GPA ล่าสุด</span>
                        {isPositiveTrend ? (
                            <TrendingUp className="w-4 h-4 text-emerald-500 dark:text-slate-400" />
                        ) : (
                            <TrendingDown className="w-4 h-4 text-red-500 dark:text-slate-400" />
                        )}
                    </div>
                    <div className="flex items-end gap-2">
                        <span className="text-3xl font-bold text-slate-900 dark:text-slate-200" data-testid="gpa-latest">{currentGPA === null ? '-' : currentGPA.toFixed(2)}</span>
                        <span className={`text-sm font-medium ${isPositiveTrend ? 'text-emerald-500' : 'text-red-500'}`}>
                            {isPositiveTrend ? '+' : ''}{trend.toFixed(2)}
                        </span>
                    </div>
                </motion.div>
            </div>

            {/* Chart */}
            <div className="h-40 mb-6">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                        <defs>
                            <linearGradient id="gpaGradient" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <XAxis
                            dataKey="name"
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            domain={[0, 4]}
                            tick={{ fontSize: 10, fill: '#94A3B8' }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                border: 'none',
                                borderRadius: '12px',
                                boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                            }}
                            formatter={(value: number) => [value.toFixed(2), 'GPA']}
                        />
                        <Line
                            type="monotone"
                            dataKey="gpa"
                            stroke="#10B981"
                            strokeWidth={3}
                            dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                            activeDot={{ r: 6, fill: '#059669' }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Semester Table */}
            <div className="space-y-2">
                {semesterHistory.slice().reverse().map((semester, index) => (
                    <motion.div
                        key={semester.semester}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="flex items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center font-bold text-slate-600 dark:text-slate-400 text-sm">
                                {semester.semester.split('/')[0]}
                            </div>
                            <div>
                                <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">ภาคเรียนที่ {semester.semester}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400">{semester.credits} หน่วยกิต</div>
                            </div>
                        </div>
                        <div className={`text-lg font-bold ${semester.gpa >= 3.5 ? 'text-emerald-600' : semester.gpa >= 3.0 ? 'text-blue-600' : 'text-orange-600'}`}>
                            {semester.gpa.toFixed(2)}
                        </div>
                    </motion.div>
                ))}
            </div>
        </motion.div>
    );
}
