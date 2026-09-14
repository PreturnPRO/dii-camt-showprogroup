import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Bell, Check, Trash2, Settings, Filter, Mail, Calendar, AlertTriangle, Info, CheckCircle, Plus, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import type { Notification } from '@/types';
import { api } from '@/lib/api';
import { asArray, asDate, asRecord, asString } from '@/lib/live-data';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Notifications() {
    const navigate = useNavigate();
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const canManage = user?.role === 'admin' || user?.role === 'staff';

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [formData, setFormData] = useState<{
        title: string;
        message: string;
        type: Notification['type'];
        priority: Notification['priority'];
        target: 'self' | 'STUDENT' | 'LECTURER' | 'STAFF' | 'COMPANY' | 'ADMIN';
    }>({ title: '', message: '', type: 'info', priority: 'medium', target: 'self' });

    const unreadCount = notifications.filter(n => !n.isRead).length;

    const mapNotification = React.useCallback((item: unknown, index = 0): Notification => {
        const source = asRecord(item);
        return {
            id: asString(source.id, `notification-${index}`),
            recipientId: asString(source.userId, user?.id || ''),
            recipientRole: (user?.role || 'staff') as Notification['recipientRole'],
            title: asString(source.title, '-'),
            titleThai: asString(source.titleThai, asString(source.title, '-')),
            message: asString(source.message, '-'),
            messageThai: asString(source.messageThai, asString(source.message, '-')),
            type: asString(source.type, 'info') as Notification['type'],
            priority: asString(source.priority, 'medium') as Notification['priority'],
            isRead: Boolean(source.isRead ?? false),
            channels: (asArray<string>(source.channels).length ? asArray<string>(source.channels) : ['in-app']) as Notification['channels'],
            createdAt: asDate(source.createdAt),
            readAt: source.readAt ? asDate(source.readAt) : undefined,
            actionUrl: asString(source.actionUrl),
            actionLabel: asString(source.actionLabel),
            expiresAt: source.expiresAt ? asDate(source.expiresAt) : undefined,
        };
    }, [user?.id, user?.role]);

    React.useEffect(() => {
        let isMounted = true;
        api.notifications.list()
            .then((response) => {
                if (!isMounted) return;
                const mapped = response.notifications.map(mapNotification);
                setNotifications(mapped);
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, [mapNotification]);

    const handleDelete = async (id: string) => {
        if (confirm(t.notificationsPage.deleteConfirm)) {
            try {
                await api.notifications.remove(id);
                setNotifications(current => current.filter(n => n.id !== id));
                toast.success(t.notificationsPage.deleteSuccess);
            } catch (error) {
                toast.error(error instanceof Error ? error.message : t.notificationsPage.deleteConfirm);
            }
        }
    };

    const handleMarkRead = async (id: string) => {
        try {
            await api.notifications.markRead(id);
        } catch {
            // Keep the UI responsive for legacy/local rows.
        }
        const readAt = new Date();
        setNotifications(current => current.map((item) => item.id === id ? { ...item, isRead: true, readAt } : item));
        window.dispatchEvent(new CustomEvent('showpro:notification-read', { detail: { id, readAt } }));
    };

    const handleMarkAllRead = async () => {
        try {
            await api.notifications.markAllRead();
        } catch {
            // Keep the UI responsive for legacy/local rows.
        }
        const readAt = new Date();
        setNotifications(current => current.map((item) => ({ ...item, isRead: true, readAt })));
        window.dispatchEvent(new CustomEvent('showpro:notification-read-all', { detail: { readAt } }));
    };

    const handleOpenNotification = async (notification: Notification) => {
        if (!notification.isRead) {
            await handleMarkRead(notification.id);
        }
        if (notification.actionUrl) {
            navigate(notification.actionUrl);
        }
    };

    const handleCreate = async () => {
        try {
            const response = await api.notifications.broadcast({
                title: formData.title,
                titleThai: formData.title,
                message: formData.message,
                messageThai: formData.message,
                type: formData.type,
                priority: formData.priority,
                channels: ['in-app'],
                userIds: formData.target === 'self' && user?.id ? [user.id] : [],
                targetRoles: formData.target === 'self' ? [] : [formData.target],
            });
            const mapped = response.notifications
                .map(mapNotification)
                .filter((notification) => notification.recipientId === user?.id);
            if (mapped.length) {
                setNotifications([...mapped, ...notifications]);
            }
            toast.success(`${t.notificationsPage.createSuccess} (${response.notifications.length})`);
            setIsDialogOpen(false);
            setFormData({ title: '', message: '', type: 'info', priority: 'medium', target: 'self' });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.notificationsPage.createTitle);
        }
    };

    React.useEffect(() => {
        const onRead = (event: Event) => {
            const detail = (event as CustomEvent<{ id?: string; readAt?: Date }>).detail;
            if (!detail?.id) return;
            setNotifications(current => current.map(item => item.id === detail.id ? { ...item, isRead: true, readAt: detail.readAt ?? new Date() } : item));
        };
        const onReadAll = (event: Event) => {
            const detail = (event as CustomEvent<{ readAt?: Date }>).detail;
            const readAt = detail?.readAt ?? new Date();
            setNotifications(current => current.map(item => ({ ...item, isRead: true, readAt })));
        };

        window.addEventListener('showpro:notification-read', onRead);
        window.addEventListener('showpro:notification-read-all', onReadAll);
        return () => {
            window.removeEventListener('showpro:notification-read', onRead);
            window.removeEventListener('showpro:notification-read-all', onReadAll);
        };
    }, []);

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-slate-300" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-slate-300" />;
            case 'error': return <AlertTriangle className="w-5 h-5 text-red-600 dark:text-slate-300" />;
            case 'schedule_change': return <Calendar className="w-5 h-5 text-blue-600 dark:text-slate-300" />;
            default: return <Info className="w-5 h-5 text-blue-600 dark:text-slate-300" />;
        }
    };

    const getPriorityBadge = (priority: string) => {
        switch (priority) {
            case 'urgent': return <Badge className="bg-red-100 text-red-700 dark:text-slate-300 dark:bg-slate-800">{t.notificationsPage.urgentHigh}</Badge>;
            case 'high': return <Badge className="bg-orange-100 text-orange-700 dark:text-slate-300">{t.notificationsPage.urgent}</Badge>;
            case 'medium': return <Badge className="bg-blue-100 text-blue-700 dark:text-slate-300 dark:bg-slate-800">{t.notificationsPage.mediumPriority}</Badge>;
            default: return <Badge className="bg-gray-100 text-gray-700 dark:text-slate-300 dark:bg-slate-800">{t.notificationsPage.general}</Badge>;
        }
    };

    const formatDate = (date: Date) => new Date(date).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-US', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
    const getTitle = (notification: Notification) => language === 'th' ? notification.titleThai : notification.title;
    const getMessage = (notification: Notification) => language === 'th' ? notification.messageThai : notification.message;
    const unreadNotifications = notifications.filter(notification => !notification.isRead);
    const urgentNotifications = notifications.filter(notification => notification.priority === 'urgent' || notification.priority === 'high');

    const renderNotificationList = (items: Notification[]) => (
        <Card>
            <CardContent className="pt-6">
                <div className="space-y-3">
                    <AnimatePresence>
                        {items.map((notification, index) => (
                            <motion.div
                                layout
                                key={notification.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0 }}
                                transition={{ delay: index * 0.03 }}
                                role="button"
                                tabIndex={0}
                                onClick={() => handleOpenNotification(notification)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter' || event.key === ' ') {
                                        event.preventDefault();
                                        handleOpenNotification(notification);
                                    }
                                }}
                                className={`flex items-start gap-4 p-4 border rounded-xl transition-all hover:shadow-md cursor-pointer ${!notification.isRead ? 'bg-blue-50/70 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/60' : 'bg-white border-slate-200 dark:border-slate-800'
                                    }`}
                            >
                                <div className="mt-1">{getTypeIcon(notification.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-gray-900 dark:text-slate-200">{getTitle(notification)}</h3>
                                        {!notification.isRead && <div className="w-2 h-2 bg-blue-500 rounded-full" />}
                                    </div>
                                    <p className="text-sm text-gray-600 dark:text-slate-400 line-clamp-2">{getMessage(notification)}</p>
                                    <div className="flex flex-wrap items-center gap-2 mt-2">
                                        <span className="text-xs text-gray-400">
                                            {formatDate(notification.createdAt)}
                                        </span>
                                        {getPriorityBadge(notification.priority)}
                                        {notification.actionLabel && <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">{notification.actionLabel}</Badge>}
                                    </div>
                                </div>
                                <div className="flex gap-1">
                                    {!notification.isRead && (
                                        <Button size="sm" variant="ghost" onClick={(event) => { event.stopPropagation(); handleMarkRead(notification.id); }}>
                                            <Check className="w-4 h-4" />
                                        </Button>
                                    )}
                                    {canManage && (
                                        <Button size="sm" variant="ghost" className="text-gray-400 hover:text-red-600 dark:text-slate-300" onClick={(event) => { event.stopPropagation(); handleDelete(notification.id); }}>
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    {items.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center text-sm text-slate-500 dark:text-slate-400">
                            {language === 'th' ? 'ยังไม่มีรายการแจ้งเตือนในหมวดนี้' : 'No notifications in this section.'}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <Bell className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                        <span>{t.notificationsPage.subtitle}</span>
                    </motion.div>
                    <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.notificationsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">{t.notificationsPage.titleHighlight}</span>
                    </motion.h1>
                    <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-slate-500 mt-2 dark:text-slate-400">
                        {notifications.length} {t.notificationsPage.subtitle} • {unreadCount} {t.notificationsPage.unread}
                    </motion.p>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="flex gap-2">
                    {canManage && (
                        <Button onClick={() => setIsDialogOpen(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700 shadow-lg">
                            <Plus className="w-4 h-4 mr-2" />{t.notificationsPage.createAnnouncement}
                        </Button>
                    )}
                    <Button variant="outline" size="sm" className="rounded-xl" onClick={handleMarkAllRead}><Check className="w-4 h-4 mr-2" />{t.notificationsPage.markAllRead}</Button>
                </motion.div>
            </div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t.notificationsPage.allTab, value: notifications.length, gradient: '', icon: Bell },
                    { label: t.notificationsPage.unreadTab, value: unreadCount, gradient: '', icon: Mail },
                    { label: t.notificationsPage.urgentTab, value: notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length, gradient: '', icon: AlertTriangle },
                    { label: t.notificationsPage.readTab, value: notifications.filter(n => n.isRead).length, gradient: '', icon: CheckCircle },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5`}>
                        
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 rounded-xl bg-blue-500/10 dark:bg-blue-500/10"><stat.icon className="w-5 h-5" /></div>
                                <span className="text-xs text-slate-500 dark:text-slate-400">{stat.label}</span>
                            </div>
                            <div className="text-3xl font-extrabold font-mono tracking-tight text-slate-900 dark:text-slate-100">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            <motion.div variants={itemVariants}>
                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
                        <TabsTrigger value="all">{t.notificationsPage.allTab}</TabsTrigger>
                        <TabsTrigger value="unread">{t.notificationsPage.unreadTab}</TabsTrigger>
                        <TabsTrigger value="urgent">{t.notificationsPage.urgentTab}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="all">
                        {renderNotificationList(notifications)}
                    </TabsContent>

                    <TabsContent value="unread">
                        {renderNotificationList(unreadNotifications)}
                    </TabsContent>
                    <TabsContent value="urgent">
                        {renderNotificationList(urgentNotifications)}
                    </TabsContent>
                </Tabs>
            </motion.div>

            {/* Create Notification Dialog */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.notificationsPage.createTitle}</DialogTitle>
                        <DialogDescription>{t.notificationsPage.createDesc}</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>{t.notificationsPage.titleLabel}</Label>
                            <Input value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>{t.notificationsPage.messageLabel}</Label>
                            <Textarea value={formData.message} onChange={e => setFormData({ ...formData, message: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label>ผู้รับ</Label>
                            <Select value={formData.target} onValueChange={v => setFormData({ ...formData, target: v as typeof formData.target })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="self">เฉพาะฉัน</SelectItem>
                                    <SelectItem value="STUDENT">{t.roles.student}</SelectItem>
                                    <SelectItem value="LECTURER">{t.roles.lecturer}</SelectItem>
                                    <SelectItem value="STAFF">{t.roles.staff}</SelectItem>
                                    <SelectItem value="COMPANY">{t.roles.company}</SelectItem>
                                    <SelectItem value="ADMIN">{t.roles.admin}</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="grid gap-2">
                                <Label>{t.notificationsPage.typeLabel}</Label>
                                <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v as Notification['type'] })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="info">{t.notificationsPage.typeGeneral}</SelectItem>
                                        <SelectItem value="success">{t.notificationsPage.typeSuccess}</SelectItem>
                                        <SelectItem value="warning">{t.notificationsPage.typeWarning}</SelectItem>
                                        <SelectItem value="error">{t.notificationsPage.typeError}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="grid gap-2">
                                <Label>{t.notificationsPage.importanceLabel}</Label>
                                <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v as Notification['priority'] })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="medium">{t.notificationsPage.importanceNormal}</SelectItem>
                                        <SelectItem value="high">{t.notificationsPage.importanceUrgent}</SelectItem>
                                        <SelectItem value="urgent">{t.notificationsPage.importanceVeryUrgent}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>{t.notificationsPage.cancelBtn}</Button>
                        <Button onClick={handleCreate} className="bg-purple-600 hover:bg-purple-700">
                            <Save className="w-4 h-4 mr-2" />{t.notificationsPage.sendBtn}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
