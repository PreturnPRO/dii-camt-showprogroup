import React from 'react';
import { motion } from 'framer-motion';
import { Shield, Search, Filter, Download, User, Clock, Activity, Eye, AlertCircle, CheckCircle, Sparkles } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import { api } from '@/lib/api';
import { asDate, asRecord, asString, roleToClient } from '@/lib/live-data';
import { toast } from 'sonner';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

type AuditLogRow = {
    id: string;
    userId: string;
    userName: string;
    userRole: string;
    action: string;
    resource: string;
    timestamp: Date;
    status: string;
};

export default function Audit() {
    const { t } = useLanguage();
    const [searchQuery, setSearchQuery] = React.useState('');
    const [roleFilter, setRoleFilter] = React.useState('all');
    const [auditLogs, setAuditLogs] = React.useState<AuditLogRow[]>([]);

    React.useEffect(() => {
        let isMounted = true;

        api.audit.list()
            .then((response) => {
                if (!isMounted) return;
                const logs = response.logs.map((item, index) => {
                    const log = asRecord(item);
                    const user = asRecord(log.user);
                    return {
                        id: asString(log.id, `LOG${index + 1}`),
                        userId: asString(log.userId, asString(user.id, '-')),
                        userName: asString(user.nameThai, asString(user.name, '-')),
                        userRole: roleToClient(user.role),
                        action: asString(log.action, '-').toLowerCase(),
                        resource: asString(log.resource, '-'),
                        timestamp: asDate(log.timestamp),
                        status: asString(log.status, 'success'),
                    };
                });
                setAuditLogs(logs);
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, []);

    const getActionBadge = (action: string) => {
        switch (action) {
            case 'login': return <Badge className="bg-blue-100 text-blue-700 dark:text-slate-300 dark:bg-slate-800">{t.audit.actionLogin}</Badge>;
            case 'update_grade': return <Badge className="bg-purple-100 text-purple-700 dark:text-slate-300 dark:bg-slate-800">{t.audit.actionUpdateGrade}</Badge>;
            case 'approve_request': return <Badge className="bg-emerald-100 text-emerald-700 dark:text-slate-300 dark:bg-slate-800">{t.audit.actionApproveRequest}</Badge>;
            case 'view_student': return <Badge className="bg-orange-100 text-orange-700 dark:text-slate-300">{t.audit.actionViewStudent}</Badge>;
            case 'create_user': return <Badge className="bg-pink-100 text-pink-700">{t.audit.actionCreateUser}</Badge>;
            default: return <Badge>{action}</Badge>;
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'student': return <Badge variant="outline" className="text-blue-700 border-blue-300 dark:text-slate-300">{t.roles.student}</Badge>;
            case 'lecturer': return <Badge variant="outline" className="text-emerald-700 border-emerald-300 dark:text-slate-300">{t.roles.lecturer}</Badge>;
            case 'staff': return <Badge variant="outline" className="text-purple-700 border-purple-300 dark:text-slate-300">{t.roles.staff}</Badge>;
            case 'company': return <Badge variant="outline" className="text-orange-700 border-orange-300 dark:text-slate-300">{t.roles.company}</Badge>;
            case 'admin': return <Badge variant="outline" className="text-red-700 border-red-300 dark:text-slate-300">{t.roles.admin}</Badge>;
            default: return <Badge variant="outline">{role}</Badge>;
        }
    };

    const filteredLogs = auditLogs.filter(log => {
        const matchesSearch = log.userName.includes(searchQuery) || log.action.includes(searchQuery);
        const matchesRole = roleFilter === 'all' || log.userRole === roleFilter;
        return matchesSearch && matchesRole;
    });
    const today = new Date();
    const todayLogCount = auditLogs.filter((log) => log.timestamp.toDateString() === today.toDateString()).length;

    const exportLogs = () => {
        const rows = filteredLogs.map((log) => [
            log.id,
            log.userId,
            log.userName,
            log.userRole,
            log.action,
            log.resource,
            log.status,
            log.timestamp.toISOString(),
        ]);
        const csv = [['id', 'userId', 'userName', 'role', 'action', 'resource', 'status', 'timestamp'], ...rows]
            .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = 'audit-logs.csv';
        link.click();
        URL.revokeObjectURL(url);
    };

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
                        <Shield className="w-4 h-4 text-indigo-500 dark:text-slate-400" />
                        <span>{t.audit.subtitle}</span>
                    </motion.div>
                    <motion.h1
                        className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        {t.audit.title} <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-500">{t.audit.titleHighlight}</span>
                    </motion.h1>
                </div>

                <motion.div className="flex gap-3" variants={itemVariants}>
                    <Button variant="outline" onClick={exportLogs} className="rounded-xl border-slate-200 dark:border-slate-700 hover:bg-white hover:text-indigo-600 dark:text-slate-300 dark:bg-slate-900">
                        <Download className="w-4 h-4 mr-2" />{t.audit.exportLabel}
                    </Button>
                </motion.div>
            </div>

            {/* Stats Grid - Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden"
                >
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 dark:bg-slate-900/50" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-sm dark:bg-slate-900/50">
                                <Activity className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-white/90">{t.audit.totalLabel}</span>
                        </div>
                        <div className="text-5xl font-bold tracking-tight">{auditLogs.length}</div>
                        <div className="mt-3 text-sm text-indigo-100 flex items-center gap-1">
                            <Sparkles className="w-4 h-4" />
                            {t.audit.logEntries}
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
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.audit.success}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 transition-colors">{auditLogs.filter(l => l.status === 'success').length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.audit.successDesc}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-red-50 group-hover:text-red-600 transition-colors">
                                <AlertCircle className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.audit.failed}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-red-600 transition-colors">{auditLogs.filter(l => l.status === 'failed').length}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.audit.failedDesc}</div>
                    </div>
                </motion.div>

                <motion.div
                    variants={itemVariants}
                    whileHover={{ y: -5 }}
                    className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-xl shadow-slate-100/50 relative overflow-hidden group"
                >
                    <div className="relative z-10">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Clock className="w-6 h-6" />
                            </div>
                            <span className="font-medium text-slate-600 dark:text-slate-300">{t.audit.todayLabel}</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900 dark:text-white group-hover:text-blue-600 transition-colors">{todayLogCount}</div>
                        <div className="mt-3 text-sm text-slate-400">{t.audit.todayDesc}</div>
                    </div>
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input placeholder={t.audit.searchPlaceholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
                    </div>
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger className="w-40"><SelectValue placeholder={t.audit.roleFilter} /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">{t.audit.allRoles}</SelectItem>
                            <SelectItem value="student">{t.roles.student}</SelectItem>
                            <SelectItem value="lecturer">{t.roles.lecturer}</SelectItem>
                            <SelectItem value="staff">{t.roles.staff}</SelectItem>
                            <SelectItem value="company">{t.roles.company}</SelectItem>
                            <SelectItem value="admin">{t.roles.admin}</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                    <CardContent className="pt-6">
                        <div className="space-y-3">
                            {filteredLogs.map((log, index) => (
                                <motion.div
                                    key={log.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.03 }}
                                    className="flex items-center justify-between p-4 border rounded-xl hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${log.status === 'success' ? 'bg-emerald-100' : 'bg-red-100'}`}>
                                            {log.status === 'success' ? <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-slate-300" /> : <AlertCircle className="w-5 h-5 text-red-600 dark:text-slate-300" />}
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold">{log.userName}</span>
                                                {getRoleBadge(log.userRole)}
                                            </div>
                                            <div className="text-sm text-gray-600 dark:text-slate-300">
                                                {log.timestamp.toLocaleString('th-TH')}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {getActionBadge(log.action)}
                                        <Badge variant="outline">{log.resource}</Badge>
                                        <Button size="sm" variant="ghost" onClick={() => toast.info(`${log.action} • ${log.resource} • ${log.status}`)}><Eye className="w-4 h-4" /></Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>
        </motion.div>
    );
}
