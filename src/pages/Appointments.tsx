import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Calendar, Clock, Plus, CheckCircle, XCircle, User, MapPin, MessageSquare
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { mapAppointment, mapLecturer } from '@/lib/live-mappers';
import type { Appointment, Lecturer } from '@/types';

type AppointmentRow = Appointment;
type LecturerRow = Lecturer;

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Appointments() {
    const { t } = useLanguage();
    const { user } = useAuth();
    const [appointments, setAppointments] = React.useState<AppointmentRow[]>([]);
    const [lecturers, setLecturers] = React.useState<LecturerRow[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [bookingLecturer, setBookingLecturer] = React.useState<LecturerRow | null>(null);
    const [bookingDate, setBookingDate] = React.useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));
    const [bookingStart, setBookingStart] = React.useState('09:00');
    const [bookingEnd, setBookingEnd] = React.useState('10:00');
    const [bookingLocation, setBookingLocation] = React.useState('');
    const [bookingPurpose, setBookingPurpose] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);
    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
    const isTeacher = user?.role === 'lecturer';

    React.useEffect(() => {
        let mounted = true;

        Promise.allSettled([
            api.appointments.list(),
            api.lecturers.list(),
        ]).then(([appointmentsResult, lecturersResult]) => {
            if (!mounted) return;
            if (appointmentsResult.status === 'fulfilled') {
                setAppointments(appointmentsResult.value.appointments.map(mapAppointment));
            } else {
                setAppointments([]);
            }
            if (lecturersResult.status === 'fulfilled') {
                setLecturers(lecturersResult.value.lecturers.map(mapLecturer));
            } else {
                setLecturers([]);
            }
        }).catch((error) => {
            console.warn('Unable to load appointments from API', error);
            if (mounted) {
                setAppointments([]);
                setLecturers([]);
            }
        }).finally(() => {
            if (mounted) setIsLoading(false);
        });

        return () => {
            mounted = false;
        };
    }, []);

    const updateAppointmentStatus = async (id: string, status: AppointmentRow['status']) => {
        const previous = appointments;
        setAppointments(current => current.map(item => item.id === id ? { ...item, status } : item));

        try {
            const response = await api.appointments.updateStatus(id, { status });
            setAppointments(current => current.map(item => item.id === id ? mapAppointment(response.appointment) : item));
            toast.success(status === 'confirmed' ? t.appointmentsPage.confirmedTab : status);
        } catch (error) {
            console.warn('Unable to update appointment status', error);
            setAppointments(previous);
            toast.error(t.appointmentsPage.systemUpgrade);
        }
    };

    const openBooking = (lecturer: LecturerRow) => {
        const firstSlot = lecturer.officeHours.find((slot) => slot.isAvailable) ?? lecturer.officeHours[0];
        setBookingLecturer(lecturer);
        setBookingStart(firstSlot?.startTime || '09:00');
        setBookingEnd(firstSlot?.endTime || '10:00');
        setBookingLocation(firstSlot?.location || lecturer.department || '');
        setBookingPurpose('');
    };

    const createAppointment = async () => {
        if (!bookingLecturer || !bookingPurpose.trim()) return;
        setIsBooking(true);
        try {
            const response = await api.appointments.create({
                lecturerId: bookingLecturer.id,
                date: bookingDate,
                startTime: bookingStart,
                endTime: bookingEnd,
                location: bookingLocation || bookingLecturer.department || 'TBA',
                purpose: bookingPurpose.trim(),
            });
            setAppointments((current) => [mapAppointment(response.appointment), ...current]);
            toast.success(`${t.appointmentsPage.bookSuccess} ${bookingLecturer.nameThai}`);
            setBookingLecturer(null);
        } catch (error) {
            toast.error(error instanceof Error ? error.message : t.appointmentsPage.systemUpgrade);
        } finally {
            setIsBooking(false);
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge className="bg-orange-100 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400">{t.appointmentsPage.pendingTab}</Badge>;
            case 'confirmed': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400">{t.appointmentsPage.confirmedTab}</Badge>;
            case 'completed': return <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">{t.appointmentsPage.completedTab}</Badge>;
            default: return <Badge>{status}</Badge>;
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-6">
            {/* Header */}
            <div className="flex items-end justify-between">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <Calendar className="w-4 h-4 text-blue-500 dark:text-slate-400" />
                        <span>{`${appointments.length} ${t.appointmentsPage.titleHighlight} • ${pendingCount} ${t.appointmentsPage.subtitle}`}</span>
                    </motion.div>
                    <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.appointmentsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">{t.appointmentsPage.titleHighlight}</span>
                    </motion.h1>
                </div>
                {!isTeacher && (
                    <Button className="bg-gradient-to-r from-blue-500 to-cyan-500" onClick={() => lecturers[0] ? openBooking(lecturers[0]) : toast.error('ไม่พบอาจารย์ที่เปิดให้จอง')}>
                        <Plus className="w-4 h-4 mr-2" />{t.appointmentsPage.newAppointment}
                    </Button>
                )}
            </div>

            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t.appointmentsPage.pendingTab, value: pendingCount, gradient: 'from-orange-500 to-amber-500', icon: Clock },
                    { label: t.appointmentsPage.confirmedTab, value: confirmedCount, gradient: 'from-blue-500 to-indigo-500', icon: Calendar },
                    { label: t.appointmentsPage.completedTab, value: appointments.filter(a => a.status === 'completed').length, gradient: 'from-emerald-500 to-teal-500', icon: CheckCircle },
                    { label: t.appointmentsPage.allTab, value: appointments.length, gradient: 'from-purple-500 to-pink-500', icon: Calendar },
                ].map((stat, i) => (
                    <motion.div key={i} whileHover={{ scale: 1.02 }} className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.gradient} p-6 text-white shadow-xl`}>
                        <div className="absolute -top-10 -right-10 w-28 h-28 bg-white/10 rounded-full blur-2xl dark:bg-slate-900/50" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-3">
                                <div className="p-2 rounded-xl bg-white/20 dark:bg-slate-900/50"><stat.icon className="w-5 h-5" /></div>
                                <span className="font-medium text-white/90">{stat.label}</span>
                            </div>
                            <div className="text-4xl font-bold">{stat.value}</div>
                        </div>
                    </motion.div>
                ))}
            </motion.div>

            {!isTeacher && (
                <motion.div variants={itemVariants}>
                    <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />{t.appointmentsPage.availableLecturers}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {isLoading && (
                                    <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        กำลังโหลดข้อมูลอาจารย์จากระบบ...
                                    </div>
                                )}
                                {!isLoading && lecturers.length === 0 && (
                                    <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        ไม่พบข้อมูลอาจารย์จากระบบ
                                    </div>
                                )}
                                {!isLoading && lecturers.map((lecturer) => (
                                    <div key={lecturer.id} className="p-4 border rounded-xl hover:shadow-md transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-bold text-lg">{lecturer.nameThai.charAt(0)}</div>
                                            <div className="flex-1">
                                                <h3 className="font-semibold">{lecturer.nameThai}</h3>
                                                <p className="text-sm text-gray-600 dark:text-slate-300">{lecturer.department}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {lecturer.officeHours.slice(0, 2).map((hour) => (
                                                        <Badge key={hour.id} variant="outline" className="text-xs">{hour.day} {hour.startTime}-{hour.endTime}</Badge>
                                                    ))}
                                                </div>
                                            </div>
                                            <Button size="sm" onClick={() => openBooking(lecturer)}>{ t.appointmentsPage.bookTime}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <motion.div variants={itemVariants}>
                <Tabs defaultValue="upcoming" className="space-y-4">
                    <TabsList className="bg-white/80 backdrop-blur-sm border shadow-sm dark:bg-slate-900/50">
                        <TabsTrigger value="upcoming">{t.appointmentsPage.upcomingTab}</TabsTrigger>
                        <TabsTrigger value="pending">{t.appointmentsPage.pendingConfirm}</TabsTrigger>
                        <TabsTrigger value="completed">{t.appointmentsPage.historyTab}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming">
                        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50"><CardContent className="pt-6">
                            <div className="space-y-4">
                                {isLoading && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        กำลังโหลดนัดหมายจริงจากระบบ...
                                    </div>
                                )}
                                {!isLoading && appointments.filter(a => a.status === 'confirmed').length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        ไม่มีนัดหมายที่ยืนยันแล้ว
                                    </div>
                                )}
                                {!isLoading && appointments.filter(a => a.status === 'confirmed').map((apt) => (
                                    <div key={apt.id} className="flex items-start gap-4 p-4 border dark:border-slate-700 rounded-xl bg-gradient-to-r from-blue-50 to-white dark:from-slate-800 dark:to-slate-800/60">
                                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 text-white rounded-xl px-4 py-3 text-center min-w-[80px]">
                                            <div className="text-xl font-bold">{new Date(apt.date).getDate()}</div>
                                            <div className="text-xs">{new Date(apt.date).toLocaleDateString('th-TH', { month: 'short' })}</div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{isTeacher ? apt.studentName : apt.lecturerName}</h3>
                                            <p className="text-sm text-gray-600 dark:text-slate-300">{apt.purpose}</p>
                                            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-slate-400 mt-2">
                                                <span><Clock className="w-4 h-4 inline mr-1" />{apt.startTime}-{apt.endTime}</span>
                                                <span><MapPin className="w-4 h-4 inline mr-1" />{apt.location}</span>
                                            </div>
                                        </div>
                                        {getStatusBadge(apt.status)}
                                    </div>
                                ))}
                            </div>
                        </CardContent></Card>
                    </TabsContent>

                    <TabsContent value="pending">
                        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50"><CardContent className="pt-6">
                            <div className="space-y-4">
                                {isLoading && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        กำลังโหลดนัดหมายจริงจากระบบ...
                                    </div>
                                )}
                                {!isLoading && appointments.filter(a => a.status === 'pending').length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        ไม่มีนัดหมายที่รอยืนยัน
                                    </div>
                                )}
                                {!isLoading && appointments.filter(a => a.status === 'pending').map((apt) => (
                                    <div key={apt.id} className="flex items-start gap-4 p-4 border rounded-xl bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/30">
                                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 text-white rounded-xl px-4 py-3 text-center min-w-[80px]">
                                            <div className="text-xl font-bold">{new Date(apt.date).getDate()}</div>
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold">{isTeacher ? apt.studentName : apt.lecturerName}</h3>
                                            <p className="text-sm text-gray-600 dark:text-slate-300">{apt.purpose}</p>
                                        </div>
                                        {isTeacher ? (
                                            <div className="flex gap-2">
                                                <Button size="sm" className="bg-emerald-500" onClick={() => updateAppointmentStatus(apt.id, 'confirmed')}><CheckCircle className="w-4 h-4 mr-1" />{t.appointmentsPage.confirm}</Button>
                                                <Button size="sm" variant="outline" className="text-red-600 dark:text-slate-300" onClick={() => updateAppointmentStatus(apt.id, 'cancelled')}><XCircle className="w-4 h-4" /></Button>
                                            </div>
                                        ) : getStatusBadge(apt.status)}
                                    </div>
                                ))}
                            </div>
                        </CardContent></Card>
                    </TabsContent>

                    <TabsContent value="completed">
                        <Card className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl shadow-sm dark:bg-slate-900/50"><CardContent className="pt-6">
                            <div className="space-y-3">
                                {isLoading && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        กำลังโหลดนัดหมายจริงจากระบบ...
                                    </div>
                                )}
                                {!isLoading && appointments.filter(a => a.status === 'completed').length === 0 && (
                                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                                        ยังไม่มีประวัตินัดหมาย
                                    </div>
                                )}
                                {!isLoading && appointments.filter(a => a.status === 'completed').map((apt) => (
                                    <div key={apt.id} className="flex items-center justify-between p-4 border rounded-xl bg-gray-50 dark:bg-slate-800">
                                        <div className="flex items-center gap-4">
                                            <CheckCircle className="w-6 h-6 text-emerald-600 dark:text-slate-300" />
                                            <div>
                                                <h3 className="font-semibold">{isTeacher ? apt.studentName : apt.lecturerName}</h3>
                                                <p className="text-xs text-gray-400">{new Date(apt.date).toLocaleDateString('th-TH')}</p>
                                            </div>
                                        </div>
                                        {getStatusBadge(apt.status)}
                                    </div>
                                ))}
                            </div>
                        </CardContent></Card>
                    </TabsContent>
                </Tabs>
            </motion.div>

            <Dialog open={Boolean(bookingLecturer)} onOpenChange={(open) => !open && setBookingLecturer(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.appointmentsPage.newAppointment}</DialogTitle>
                        <DialogDescription>{bookingLecturer?.nameThai || bookingLecturer?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="appointment-date">Date</Label>
                            <Input id="appointment-date" type="date" value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="appointment-location">Location</Label>
                            <Input id="appointment-location" value={bookingLocation} onChange={(event) => setBookingLocation(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="appointment-start">Start</Label>
                            <Input id="appointment-start" type="time" value={bookingStart} onChange={(event) => setBookingStart(event.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="appointment-end">End</Label>
                            <Input id="appointment-end" type="time" value={bookingEnd} onChange={(event) => setBookingEnd(event.target.value)} />
                        </div>
                        <div className="sm:col-span-2 space-y-2">
                            <Label htmlFor="appointment-purpose">Purpose</Label>
                            <Textarea id="appointment-purpose" value={bookingPurpose} onChange={(event) => setBookingPurpose(event.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBookingLecturer(null)} disabled={isBooking}>{t.common.cancel}</Button>
                        <Button onClick={createAppointment} disabled={isBooking || !bookingPurpose.trim()}>
                            {isBooking ? t.common.loading : t.appointmentsPage.bookTime}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
