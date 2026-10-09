import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import {
    Calendar, Clock, Plus, CheckCircle, XCircle, User, MapPin, MessageSquare, Loader2
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
import { api, ApiError } from '@/lib/api';
import { mapAppointment, mapLecturer } from '@/lib/live-mappers';
import { asArray, asBoolean, asRecord, asString } from '@/lib/live-data';
import { thaiToday } from '@/lib/thai-date';
import { OfficeHoursEditor } from '@/components/appointments/OfficeHoursEditor';
import { lecturerDirectory } from '@/lib/lecturer-directory';
import type { Appointment, Lecturer } from '@/types';

type AppointmentRow = Appointment;
type LecturerRow = Lecturer;
type FreeSlot = { startTime: string; endTime: string; location: string; isBooked: boolean; isPast: boolean };

const sameSlot = (a: FreeSlot | null, b: FreeSlot) => a?.startTime === b.startTime && a?.endTime === b.endTime;

// the server's refusals, said in Thai
const bookingError = (error: unknown) => {
    if (error instanceof ApiError && error.status === 409) return 'มีคนจองช่วงเวลานี้ไปแล้ว กรุณาเลือกเวลาอื่น';
    if (error instanceof ApiError && error.status === 404) return 'ไม่พบอาจารย์ท่านนี้ในระบบแล้ว';
    if (error instanceof ApiError && error.status === 400) return 'ช่วงเวลานี้จองไม่ได้ (ผ่านไปแล้ว หรือไม่ใช่ office hours ของอาจารย์) กรุณาเลือกใหม่';
    return 'จองนัดไม่สำเร็จ กรุณาลองใหม่';
};

const DAY_LABELS: Record<string, string> = {
    monday: 'จันทร์', tuesday: 'อังคาร', wednesday: 'พุธ', thursday: 'พฤหัสบดี', friday: 'ศุกร์', saturday: 'เสาร์', sunday: 'อาทิตย์',
};

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

export default function Appointments() {
    const { t, language } = useLanguage();
    const { user } = useAuth();
    const [appointments, setAppointments] = React.useState<AppointmentRow[]>([]);
    const [lecturers, setLecturers] = React.useState<LecturerRow[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [lecturerQuery, setLecturerQuery] = React.useState('');
    const [advisorId, setAdvisorId] = React.useState<string | null>(null);
    const [bookingLecturer, setBookingLecturer] = React.useState<LecturerRow | null>(null);
    const [bookingDate, setBookingDate] = React.useState('');
    // the lecturer's office-hour slots on the chosen date, each marked booked or free by the server (M1)
    const [daySlots, setDaySlots] = React.useState<FreeSlot[] | null>(null);
    const [slotsError, setSlotsError] = React.useState(false);
    const [chosenSlot, setChosenSlot] = React.useState<FreeSlot | null>(null);
    const [bookingPurpose, setBookingPurpose] = React.useState('');
    const [isBooking, setIsBooking] = React.useState(false);
    const pendingCount = appointments.filter(a => a.status === 'pending').length;
    const confirmedCount = appointments.filter(a => a.status === 'confirmed').length;
    const isTeacher = user?.role === 'lecturer';
    // only students book; admin sees the list (the API takes bookings from students only)
    const canBook = user?.role === 'student';

    // the student's own advisor goes first in the directory (S-M3)
    React.useEffect(() => {
        if (!canBook) return;
        let mounted = true;
        api.students.profile()
            .then((response) => {
                const advisor = asRecord(asRecord(response.profile).advisor);
                if (mounted) setAdvisorId(asString(advisor.id) || null);
            })
            .catch(() => undefined);
        return () => { mounted = false; };
    }, [canBook]);

    const directory = React.useMemo(() => lecturerDirectory(lecturers, lecturerQuery, advisorId), [lecturers, lecturerQuery, advisorId]);

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
        setBookingLecturer(lecturer);
        setBookingDate('');
        setDaySlots(null);
        setChosenSlot(null);
        setBookingPurpose('');
    };

    // only the latest request may fill the list: switching dates quickly must not show the old day's slots
    const slotRequest = React.useRef(0);
    const loadDaySlots = React.useCallback(async (lecturerId: string, date: string) => {
        const requestId = ++slotRequest.current;
        setDaySlots(null);
        setSlotsError(false);
        setChosenSlot(null);
        try {
            const response = await api.offices.slots(lecturerId, date);
            if (requestId !== slotRequest.current) return;
            setDaySlots(asArray(asRecord(response).slots).map((item) => {
                const slot = asRecord(item);
                return {
                    startTime: asString(slot.startTime), endTime: asString(slot.endTime), location: asString(slot.location),
                    isBooked: asBoolean(slot.isBooked, false), isPast: asBoolean(slot.isPast, false),
                };
            }));
        } catch {
            if (requestId === slotRequest.current) setSlotsError(true);
        }
    }, []);

    React.useEffect(() => {
        if (bookingLecturer && bookingDate) void loadDaySlots(bookingLecturer.id, bookingDate);
    }, [bookingLecturer, bookingDate, loadDaySlots]);

    const createAppointment = async () => {
        if (!bookingLecturer || !chosenSlot || !bookingPurpose.trim()) return;
        setIsBooking(true);
        try {
            const response = await api.appointments.create({
                lecturerId: bookingLecturer.id,
                date: bookingDate,
                startTime: chosenSlot.startTime,
                endTime: chosenSlot.endTime,
                purpose: bookingPurpose.trim(),
            });
            setAppointments((current) => [mapAppointment(response.appointment), ...current]);
            toast.success(`${t.appointmentsPage.bookSuccess} ${bookingLecturer.nameThai}`);
            setBookingLecturer(null);
        } catch (error) {
            toast.error(bookingError(error));
            // whatever changed (taken, or the time passed), show the day as it is now
            if (error instanceof ApiError && (error.status === 409 || error.status === 400)) void loadDaySlots(bookingLecturer.id, bookingDate);
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
                    <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.appointmentsPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600">{t.appointmentsPage.titleHighlight}</span>
                    </motion.h1>
                </div>
            </div>

            {isTeacher && (
                <motion.div variants={itemVariants}>
                    <OfficeHoursEditor userId={user?.id ?? ''} />
                </motion.div>
            )}

            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: t.appointmentsPage.pendingTab, value: pendingCount, gradient: '', icon: Clock },
                    { label: t.appointmentsPage.confirmedTab, value: confirmedCount, gradient: '', icon: Calendar },
                    { label: t.appointmentsPage.completedTab, value: appointments.filter(a => a.status === 'completed').length, gradient: '', icon: CheckCircle },
                    { label: t.appointmentsPage.allTab, value: appointments.length, gradient: '', icon: Calendar },
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
                <Tabs defaultValue="upcoming" className="space-y-4">
                    <TabsList className="bg-slate-100 dark:bg-slate-800/80 p-1 h-auto rounded-xl border border-slate-200/70 dark:border-slate-700/60 inline-flex shadow-xs">
                        <TabsTrigger value="upcoming">{t.appointmentsPage.upcomingTab}</TabsTrigger>
                        <TabsTrigger value="pending">{t.appointmentsPage.pendingConfirm}</TabsTrigger>
                        <TabsTrigger value="completed">{t.appointmentsPage.historyTab}</TabsTrigger>
                    </TabsList>

                    <TabsContent value="upcoming">
                        <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm"><CardContent className="pt-6">
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
                                    <div key={apt.id} data-testid="appointment-card" className="bg-blue-50 dark:bg-blue-500/10 flex flex-wrap items-start gap-4 p-4 border dark:border-slate-700 rounded-xl">
                                        <div className="bg-blue-600 text-white rounded-xl px-4 py-3 text-center min-w-[80px]">
                                            <div className="text-xl font-bold">{new Date(apt.date).getDate()}</div>
                                            <div className="text-xs">{new Date(apt.date).toLocaleDateString('th-TH', { month: 'short' })}</div>
                                        </div>
                                        <div className="flex-1 min-w-0 break-words">
                                            <h3 className="font-semibold">{isTeacher ? apt.studentName : apt.lecturerName}</h3>
                                            <p className="text-sm text-gray-600 dark:text-slate-300">{apt.purpose}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400 mt-2">
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
                        <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm"><CardContent className="pt-6">
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
                                    <div key={apt.id} data-testid="appointment-card" className="flex flex-wrap items-start gap-4 p-4 border rounded-xl bg-orange-50 dark:bg-orange-950/20 dark:border-orange-900/30">
                                        <div className="bg-orange-600 text-white rounded-xl px-4 py-3 text-center min-w-[80px]">
                                            <div className="text-xl font-bold">{new Date(apt.date).getDate()}</div>
                                            <div className="text-xs">{new Date(apt.date).toLocaleDateString('th-TH', { month: 'short' })}</div>
                                        </div>
                                        <div className="flex-1 min-w-0 break-words">
                                            <h3 className="font-semibold">{isTeacher ? apt.studentName : apt.lecturerName}</h3>
                                            <p className="text-sm text-gray-600 dark:text-slate-300">{apt.purpose}</p>
                                            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500 dark:text-slate-400 mt-2">
                                                <span><Clock className="w-4 h-4 inline mr-1" />{apt.startTime}-{apt.endTime}</span>
                                                {apt.location && <span><MapPin className="w-4 h-4 inline mr-1" />{apt.location}</span>}
                                            </div>
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
                        <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm"><CardContent className="pt-6">
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

            {canBook && (
                <motion.div variants={itemVariants}>
                    <Card className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-sm">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><User className="w-5 h-5" />{t.appointmentsPage.availableLecturers}</CardTitle>
                            <CardDescription>เลือกอาจารย์ แล้วเลือกวันและช่วงเวลาว่างตาม office hours ของอาจารย์</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Input
                                type="search"
                                aria-label={language === 'th' ? 'ค้นหาอาจารย์' : 'Search lecturers'}
                                placeholder={language === 'th' ? 'ค้นหาชื่ออาจารย์หรือสาขา' : 'Search by name or department'}
                                value={lecturerQuery}
                                onChange={(event) => setLecturerQuery(event.target.value)}
                                className="mb-4 rounded-xl"
                            />
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
                                {!isLoading && lecturers.length > 0 && directory.length === 0 && (
                                    <div className="md:col-span-2 rounded-2xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                        {language === 'th' ? 'ไม่พบอาจารย์ที่ตรงกับคำค้น' : 'No lecturer matches'}
                                    </div>
                                )}
                                {!isLoading && directory.map((lecturer) => (
                                    <div key={lecturer.id} data-testid="bookable-lecturer" className="p-4 border rounded-xl hover:shadow-md transition-all">
                                        <div className="flex items-start gap-4">
                                            <div className="bg-emerald-600 w-14 h-14 rounded-xl flex items-center justify-center text-white font-bold text-lg">{lecturer.nameThai.charAt(0)}</div>
                                            <div className="flex-1 min-w-0 break-words">
                                                <h3 className="font-semibold">{lecturer.nameThai}</h3>
                                                {lecturer.id === advisorId && (
                                                    <Badge className="mt-1 bg-blue-600 text-white">{language === 'th' ? 'อาจารย์ที่ปรึกษา' : 'Your advisor'}</Badge>
                                                )}
                                                <p className="text-sm text-gray-600 dark:text-slate-300">{lecturer.department}</p>
                                                <div className="flex flex-wrap gap-1 mt-2">
                                                    {lecturer.officeHours.filter((hour) => hour.isAvailable).map((hour) => (
                                                        <Badge key={hour.id} variant="outline" className="text-xs">{DAY_LABELS[hour.day] ?? hour.day} {hour.startTime}-{hour.endTime}</Badge>
                                                    ))}
                                                    {lecturer.officeHours.every((hour) => !hour.isAvailable) && (
                                                        <span className="text-xs text-slate-500 dark:text-slate-400">ยังไม่ได้ตั้ง office hours</span>
                                                    )}
                                                </div>
                                            </div>
                                            <Button size="sm" disabled={lecturer.officeHours.every((hour) => !hour.isAvailable)} onClick={() => openBooking(lecturer)}>{t.appointmentsPage.bookTime}</Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </motion.div>
            )}

            <Dialog open={Boolean(bookingLecturer)} onOpenChange={(open) => !open && setBookingLecturer(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t.appointmentsPage.newAppointment}</DialogTitle>
                        <DialogDescription>{bookingLecturer?.nameThai || bookingLecturer?.name}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="appointment-date">วันที่</Label>
                            <Input id="appointment-date" type="date" min={thaiToday()} value={bookingDate} onChange={(event) => setBookingDate(event.target.value)} />
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                office hours: {bookingLecturer?.officeHours.filter((hour) => hour.isAvailable).map((hour) => `${DAY_LABELS[hour.day] ?? hour.day} ${hour.startTime}-${hour.endTime}`).join(' · ') || '-'}
                            </p>
                        </div>
                        {bookingDate && (
                            <div className="space-y-2" data-testid="day-slots">
                                <Label>ช่วงเวลาว่าง</Label>
                                {slotsError ? (
                                    <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">โหลดช่วงเวลาว่างไม่สำเร็จ ลองเลือกวันใหม่อีกครั้ง</p>
                                ) : daySlots === null ? (
                                    <p role="status" className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />กำลังโหลด...</p>
                                ) : daySlots.length === 0 ? (
                                    <p className="text-sm text-slate-500 dark:text-slate-400">อาจารย์ไม่มี office hours ในวันนี้ — ลองเลือกวันอื่น</p>
                                ) : (
                                    <div className="flex flex-wrap gap-2">
                                        {daySlots.map((slot) => (
                                            <Button
                                                key={`${slot.startTime}-${slot.endTime}`}
                                                type="button"
                                                size="sm"
                                                variant={sameSlot(chosenSlot, slot) ? 'default' : 'outline'}
                                                disabled={slot.isBooked || slot.isPast}
                                                aria-pressed={sameSlot(chosenSlot, slot)}
                                                onClick={() => setChosenSlot(slot)}
                                                className="rounded-lg"
                                            >
                                                {slot.startTime}-{slot.endTime} · {slot.location}{slot.isBooked ? ' (มีคนจองแล้ว)' : slot.isPast ? ' (เลยเวลาแล้ว)' : ''}
                                            </Button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="appointment-purpose">เรื่องที่ต้องการปรึกษา</Label>
                            <Textarea id="appointment-purpose" maxLength={500} value={bookingPurpose} onChange={(event) => setBookingPurpose(event.target.value)} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBookingLecturer(null)} disabled={isBooking}>{t.common.cancel}</Button>
                        <Button
                            onClick={createAppointment}
                            disabled={isBooking || !chosenSlot || !bookingPurpose.trim()}
                            className="flex items-center gap-1.5"
                        >
                            {isBooking ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                                    {t.common.loading}
                                </>
                            ) : (
                                t.appointmentsPage.bookTime
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
