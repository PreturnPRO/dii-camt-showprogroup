import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, Search, Filter, Eye, Mail, Star, Code, Award, ChevronRight, Sparkles, ExternalLink, MessageSquare } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';
import { mapStudent } from '@/lib/live-mappers';
import type { Student } from '@/types';

type StudentRow = Student;
type StudentSkill = StudentRow['skills'][number];

const normalizeSkillCategory = (value: unknown): StudentSkill['category'] => {
    const category = asString(value, 'programming');
    if (category === 'framework' || category === 'tool' || category === 'language' || category === 'soft_skill') {
        return category;
    }
    return 'programming';
};

const mapVisibleStudent = (value: unknown, index: number): StudentRow => {
    const source = asRecord(value);
    const student = mapStudent(value, index);
    return {
        ...student,
        nameThai: asString(source.nameThai, asString(source.name, student.nameThai)),
        gpa: asNumber(source.gpa, asNumber(source.gpax, student.gpa)),
        gpax: asNumber(source.gpax, student.gpax),
        skills: asArray(source.skills).length
            ? asArray(source.skills).map((skill) => {
                if (typeof skill === 'string') {
                    return { name: skill, category: 'programming', level: 'intermediate' };
                }
                const item = asRecord(skill);
                return {
                    name: asString(item.name, 'Skill'),
                    category: normalizeSkillCategory(item.category),
                    level: asString(item.level, 'intermediate') as StudentRow['skills'][number]['level'],
                    verifiedBy: asString(item.verifiedBy, ''),
                };
            })
            : student.skills,
        dataConsent: {
            ...student.dataConsent,
            allowPortfolioSharing: true,
            profileVisibility: 'public',
        },
    };
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function StudentProfiles() {
    const navigate = useNavigate();
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [yearFilter, setYearFilter] = React.useState('all');
    const [skillFilter, setSkillFilter] = React.useState('all');
    const [students, setStudents] = React.useState<StudentRow[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedStudent, setSelectedStudent] = React.useState<StudentRow | null>(null);

    React.useEffect(() => {
        let mounted = true;

        api.students
            .profiles()
            .then((response) => {
                if (!mounted) return;
                setStudents(response.profiles.map(mapVisibleStudent));
            })
            .catch((error) => {
                console.warn('Unable to load student profiles from API', error);
            })
            .finally(() => {
                if (mounted) setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    const accessibleStudents = students;

    const filteredStudents = accessibleStudents.filter(student => {
        const matchesSearch = student.nameThai.includes(searchQuery) || student.name.includes(searchQuery);
        const matchesYear = yearFilter === 'all' || student.year.toString() === yearFilter;
        const matchesSkill = skillFilter === 'all' || student.skills.some(s => s.name.toLowerCase().includes(skillFilter.toLowerCase()));
        return matchesSearch && matchesYear && matchesSkill;
    });

    const allSkills = [...new Set(accessibleStudents.flatMap(s => s.skills.map(sk => sk.name)))];

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header Section - Bento Grid Style */}
            <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                <div>
                    <motion.div
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2"
                    >
                        <GraduationCap className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                        <span>{accessibleStudents.length} {t.studentProfiles.allowedView}</span>
                    </motion.div>
                    <motion.h1
                        className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {t.studentProfiles.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-500">{t.studentProfiles.titleHighlight}</span>
                    </motion.h1>
                </div>
            </div>

            {/* Stats Grid - Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-white/90">{t.studentProfiles.totalAccessible}</span>
                        </div>
                        <div className="text-5xl font-bold tracking-tight">{accessibleStudents.length}</div>
                        <div className="mt-3 text-sm text-blue-100 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            {t.studentProfiles.inSystem}
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                                <Star className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.studentProfiles.gpa35Plus}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{accessibleStudents.filter(s => s.gpa >= 3.5).length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.studentProfiles.excellentGrades}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-purple-50 group-hover:text-purple-600 transition-colors">
                                <Code className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.studentProfiles.hasSkills}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-purple-600 transition-colors">{accessibleStudents.filter(s => s.skills.length >= 3).length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.studentProfiles.skills3Plus}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-orange-50 group-hover:text-orange-600 transition-colors">
                                <Award className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.studentProfiles.hasBadge}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-orange-600 transition-colors">{accessibleStudents.filter(s => s.badges.length > 0).length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.studentProfiles.outstanding}</div>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <div className="flex flex-col sm:flex-row gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder={t.studentProfiles.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                        <SelectTrigger className="w-32"><SelectValue placeholder={t.studentProfiles.yearPlaceholder} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.studentProfiles.allYears}</SelectItem>
                            <SelectItem value="1">{t.studentProfiles.yearPrefix} 1</SelectItem>
                            <SelectItem value="2">{t.studentProfiles.yearPrefix} 2</SelectItem>
                            <SelectItem value="3">{t.studentProfiles.yearPrefix} 3</SelectItem>
                            <SelectItem value="4">{t.studentProfiles.yearPrefix} 4</SelectItem>
                        </SelectContent>
                    </Select>
                    <Select value={skillFilter} onValueChange={setSkillFilter}>
                        <SelectTrigger className="w-40"><SelectValue placeholder={t.studentProfiles.skillsPlaceholder} /></SelectTrigger>
                        <SelectContent className="max-h-64 overflow-y-auto">
                            <SelectItem value="all">{t.studentProfiles.allSkills}</SelectItem>
                            {allSkills.map(skill => (
                                <SelectItem key={skill} value={skill}>{skill}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredStudents.map((student, index) => (
                        <motion.div
                            key={student.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={{ scale: 1.02 }}
                        >
                            <Card className="h-full hover:shadow-lg transition-all cursor-pointer group bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                                <CardContent className="pt-6">
                                    <div className="flex items-start gap-4 mb-4">
                                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                            {student.nameThai.charAt(0)}
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">{student.nameThai}</h3>
                                            <p className="text-sm text-gray-600 dark:text-slate-300">{student.major}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline">{t.studentProfiles.yearPrefix} {student.year}</Badge>
                                                <Badge className={student.gpa >= 3.5 ? 'bg-emerald-100 text-emerald-700' : 'bg-blue-100 text-blue-700'}>
                                                    {t.studentProfiles.gpa} {student.gpa.toFixed(2)}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mb-4">
                                        <div className="text-sm text-gray-600 dark:text-slate-400 mb-2">{t.studentProfiles.skillsLabel}</div>
                                        <div className="flex flex-wrap gap-1">
                                            {student.skills.slice(0, 4).map((skill, i) => (
                                                <Badge key={i} variant="secondary" className="text-xs">{skill.name}</Badge>
                                            ))}
                                            {student.skills.length > 4 && (
                                                <Badge variant="outline" className="text-xs">+{student.skills.length - 4}</Badge>
                                            )}
                                        </div>
                                    </div>

                                    {student.badges.length > 0 && (
                                        <div className="mb-4">
                                            <div className="text-sm text-gray-600 dark:text-slate-400 mb-2">Badges</div>
                                            <div className="flex gap-2">
                                                {student.badges.slice(0, 3).map((badge) => (
                                                    <span key={badge.id} className="text-xl" title={badge.nameThai}>{badge.icon}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex gap-2 pt-4 border-t">
                                        <Button size="sm" className="flex-1" onClick={() => setSelectedStudent(student)}><Eye className="w-4 h-4 mr-1" />{t.studentProfiles.viewProfile}</Button>
                                        <Button size="sm" variant="outline" onClick={() => navigate(`/portfolio/${student.id}`)} title="ดู Portfolio เต็ม"><ExternalLink className="w-4 h-4" /></Button>
                                        <Button size="sm" variant="outline" onClick={() => navigate(`/messages?to=${encodeURIComponent(student.nameThai || student.name)}`)} title="ส่งข้อความ"><Mail className="w-4 h-4" /></Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    ))}
                    {isLoading && (
                        <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            กำลังโหลดโปรไฟล์นักศึกษา...
                        </div>
                    )}
                    {!isLoading && filteredStudents.length === 0 && (
                        <div className="md:col-span-2 lg:col-span-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            ยังไม่มีโปรไฟล์นักศึกษาจาก API หรือไม่ตรงกับตัวกรอง
                        </div>
                    )}
                </div>
            </motion.div>

            <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
                <DialogContent className="sm:max-w-[640px]">
                    {selectedStudent && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{selectedStudent.nameThai || selectedStudent.name}</DialogTitle>
                                <DialogDescription>{selectedStudent.studentId} / {selectedStudent.major} / GPA {selectedStudent.gpa.toFixed(2)}</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">Year</div><div className="font-bold">{selectedStudent.year}</div></div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">GPA</div><div className="font-bold">{selectedStudent.gpa.toFixed(2)}</div></div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">Credits</div><div className="font-bold">{selectedStudent.earnedCredits}/{selectedStudent.requiredCredits}</div></div>
                                    <div className="rounded-xl bg-slate-50 dark:bg-slate-900 p-3"><div className="text-slate-500">Status</div><div className="font-bold">{selectedStudent.academicStatus}</div></div>
                                </div>
                                <div>
                                    <div className="font-semibold mb-2">{t.studentProfiles.skillsLabel}</div>
                                    <div className="flex flex-wrap gap-2">
                                        {selectedStudent.skills.map((skill) => <Badge key={`${skill.name}-${skill.level}`} variant="secondary">{skill.name} / {skill.level}</Badge>)}
                                        {selectedStudent.skills.length === 0 && <span className="text-sm text-slate-500">-</span>}
                                    </div>
                                </div>
                                <div>
                                    <div className="font-semibold mb-1">Portfolio</div>
                                    <p className="text-sm text-slate-600 dark:text-slate-300">{selectedStudent.portfolio?.summaryThai || selectedStudent.portfolio?.summary || '-'}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex-1" onClick={() => { setSelectedStudent(null); navigate(`/portfolio/${selectedStudent.id}`); }}><ExternalLink className="w-4 h-4 mr-2" />ดู Portfolio เต็ม</Button>
                                    <Button className="flex-1" onClick={() => { setSelectedStudent(null); navigate(`/messages?to=${encodeURIComponent(selectedStudent.nameThai || selectedStudent.name)}`); }}><Mail className="w-4 h-4 mr-2" />ส่งข้อความ</Button>
                                </div>
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
