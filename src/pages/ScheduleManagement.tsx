import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Search, MapPin, Plus, Clock, Edit3, Save, AlertCircle, CheckCircle, XCircle, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DraggableSchedule, ScheduleItem } from '@/components/schedule/DraggableSchedule';
import { toast } from 'sonner';
import { api } from '@/lib/api';
import { asArray, asNumber, asRecord, asString } from '@/lib/live-data';

const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
};

const dayToIndex = (day: unknown) => {
    const value = asString(day).toLowerCase();
    const map: Record<string, number> = {
        monday: 1,
        mon: 1,
        tuesday: 2,
        tue: 2,
        wednesday: 3,
        wed: 3,
        thursday: 4,
        thu: 4,
        friday: 5,
        fri: 5,
    };
    return map[value] ?? asNumber(day, 1);
};

export default function ScheduleManagement() {
    const { t } = useLanguage();
    const [isEditMode, setIsEditMode] = useState(false);
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [courseRecords, setCourseRecords] = useState<unknown[]>([]);
    const [requests, setRequests] = useState<Array<{ id: string; lecturer: string; courseCode: string; courseName: string; oldTime: string; newTime: string; reason: string; type: string; targetDate?: string }>>([]);
    const [rooms, setRooms] = useState<Array<{ id: string; code: string; name: string; building: string; room: string; type: string; capacity: number; status: string }>>([]);
    const [isRoomDialogOpen, setIsRoomDialogOpen] = useState(false);
    const [roomForm, setRoomForm] = useState({
        code: '',
        name: '',
        building: 'DII',
        room: '',
        floor: '',
        type: 'classroom',
        capacity: '30',
        notes: '',
    });

    React.useEffect(() => {
        let isMounted = true;

        Promise.allSettled([api.courses.list(), api.facilities.list(), api.requests.list()])
            .then(([coursesResponse, facilitiesResponse, requestsResponse]) => {
                if (!isMounted) return;

                if (coursesResponse.status === 'fulfilled') {
                    setCourseRecords(coursesResponse.value.courses);
                    const mappedSchedule = coursesResponse.value.courses.flatMap((item, courseIndex) => {
                        const course = asRecord(item);
                        const sections = asArray(course.sections);
                        const slots = sections.length
                            ? sections.flatMap((section, sectionIndex) => asArray(asRecord(section).schedule).map((slot, scheduleIndex) => ({ slot, section, sectionIndex, scheduleIndex })))
                            : asArray(course.schedule).map((slot, scheduleIndex) => ({ slot, section: {}, sectionIndex: undefined, scheduleIndex }));

                        return slots.map(({ slot, section, sectionIndex, scheduleIndex }, slotIndex) => {
                            const scheduleSlot = asRecord(slot);
                            const sectionRecord = asRecord(section);
                            const facility = asRecord(sectionRecord.facility);
                            const courseId = asString(course.id, `course-${courseIndex}`);
                            return {
                                id: `${courseId}-${sectionIndex ?? 'course'}-${scheduleIndex ?? slotIndex}`,
                                courseId,
                                sectionIndex,
                                scheduleIndex,
                                day: dayToIndex(scheduleSlot.day),
                                startTime: asString(scheduleSlot.startTime, '09:00'),
                                endTime: asString(scheduleSlot.endTime, '12:00'),
                                courseCode: asString(course.code, 'DII'),
                                courseName: asString(course.nameThai, asString(course.name, '-')),
                                room: asString(sectionRecord.room, asString(facility.room, asString(scheduleSlot.room, '-'))),
                            };
                        });
                    });
                    setSchedule(mappedSchedule);
                }

                if (facilitiesResponse.status === 'fulfilled') {
                    const mappedRooms = facilitiesResponse.value.facilities.map((item) => {
                        const facility = asRecord(item);
                        const sectionCount = asArray(facility.sections).length;
                        return {
                            id: asString(facility.id),
                            code: asString(facility.code),
                            name: `${asString(facility.code, asString(facility.room, '-'))} (${asString(facility.type, 'Room')})`,
                            building: asString(facility.building),
                            room: asString(facility.room),
                            type: asString(facility.type, 'Room'),
                            capacity: asNumber(facility.capacity, 0),
                            status: facility.isActive === false
                                ? 'maintenance'
                                : sectionCount > 0 ? 'occupied' : 'available',
                        };
                    });
                    setRooms(mappedRooms);
                }

                if (requestsResponse.status === 'fulfilled') {
                    const mappedRequests = requestsResponse.value.requests
                        .filter((item) => {
                            const request = asRecord(item);
                            const text = `${asString(request.type)} ${asString(request.title)} ${asString(request.description)}`.toLowerCase();
                            return text.includes('schedule') || text.includes('section') || text.includes('room') || text.includes('ตาราง') || text.includes('ห้อง');
                        })
                        .map((item, index) => {
                            const request = asRecord(item);
                            const student = asRecord(request.student);
                            const studentUser = asRecord(student.user);
                            return {
                                id: asString(request.id, String(index + 1)),
                                lecturer: asString(studentUser.nameThai, asString(studentUser.name, '-')),
                                courseCode: asString(request.type, '-'),
                                courseName: asString(request.title, '-'),
                                oldTime: '-',
                                newTime: '-',
                                reason: asString(request.description, '-'),
                                type: 'one-time',
                                targetDate: asString(request.submittedAt, ''),
                            };
                        });
                    setRequests(mappedRequests);
                }
            })
            .catch(() => undefined);

        return () => {
            isMounted = false;
        };
    }, []);

    const handleApprove = async (req: { id: string; lecturer: string }) => {
        try {
            await api.requests.updateStatus(String(req.id), { status: 'approved' });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to approve request');
            return;
        }
        toast.success(`${t.scheduleManagementPage.approveSuccess} - ${req.lecturer}`, {
            description: t.scheduleManagementPage.approveDesc
        });
        setRequests(prev => prev.filter(r => r.id !== req.id));
    };

    const handleReject = async (id: string) => {
        try {
            await api.requests.updateStatus(String(id), { status: 'rejected' });
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to reject request');
            return;
        }
        toast.error(t.scheduleManagementPage.rejectSuccess);
        setRequests(prev => prev.filter(r => r.id !== id));
    };

    const createRoom = async () => {
        if (!roomForm.code.trim() || !roomForm.name.trim() || !roomForm.building.trim()) {
            toast.error('กรุณากรอกข้อมูลห้องให้ครบ');
            return;
        }

        try {
            const response = await api.facilities.create({
                code: roomForm.code,
                name: roomForm.name,
                building: roomForm.building,
                room: roomForm.room || undefined,
                floor: roomForm.floor || undefined,
                type: roomForm.type,
                capacity: Number(roomForm.capacity || 0),
                isActive: true,
                notes: roomForm.notes || undefined,
            });
            const facility = asRecord(response.facility);
            setRooms((current) => [{
                id: asString(facility.id),
                code: asString(facility.code),
                name: `${asString(facility.code)} (${asString(facility.type, 'Room')})`,
                building: asString(facility.building),
                room: asString(facility.room),
                type: asString(facility.type),
                capacity: asNumber(facility.capacity, 0),
                status: 'available',
            }, ...current]);
            setRoomForm({ code: '', name: '', building: 'DII', room: '', floor: '', type: 'classroom', capacity: '30', notes: '' });
            setIsRoomDialogOpen(false);
            toast.success('เพิ่มห้องแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to create room');
        }
    };

    const toggleRoomStatus = async (room: { id: string; status: string }) => {
        try {
            const isActive = room.status === 'maintenance';
            await api.facilities.update(room.id, { isActive });
            setRooms((current) => current.map((item) => item.id === room.id ? { ...item, status: isActive ? 'available' : 'maintenance' } : item));
            toast.success(isActive ? 'เปิดใช้งานห้องแล้ว' : 'ปิดใช้งานห้องแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to update room');
        }
    };

    const calculateEndTime = (newStart: string, oldStart: string, oldEnd: string) => {
        const startHour = Number(oldStart.split(':')[0]);
        const endHour = Number(oldEnd.split(':')[0]);
        const duration = Number.isFinite(startHour) && Number.isFinite(endHour) ? Math.max(endHour - startHour, 1) : 3;
        const nextHour = Number(newStart.split(':')[0]);
        return `${String(nextHour + duration).padStart(2, '0')}:00`;
    };

    const dayNameByIndex = (day: number) => ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'][day - 1] ?? 'monday';

    const handleScheduleMove = async (item: ScheduleItem, targetDay: number, targetTime: string, mode: 'permanent' | 'one-time') => {
        if (!item.courseId || typeof item.scheduleIndex !== 'number') {
            toast.error('Unable to identify schedule slot');
            return;
        }

        const course = courseRecords.find((record) => asString(asRecord(record).id) === item.courseId);
        if (!course) {
            toast.error('Unable to find course record');
            return;
        }

        const courseRecord = asRecord(course);
        const nextSlot = {
            day: dayNameByIndex(targetDay),
            startTime: targetTime,
            endTime: calculateEndTime(targetTime, item.startTime, item.endTime),
            room: item.room,
        };

        try {
            if (typeof item.sectionIndex === 'number') {
                const nextSections = asArray(courseRecord.sections).map((section, sectionIndex) => {
                    const sectionRecord = asRecord(section);
                    const scheduleItems = asArray(sectionRecord.schedule).map((slot, scheduleIndex) =>
                        sectionIndex === item.sectionIndex && scheduleIndex === item.scheduleIndex
                            ? { ...asRecord(slot), ...nextSlot }
                            : asRecord(slot),
                    );
                    return {
                        number: asString(sectionRecord.number, String(sectionIndex + 1)),
                        room: asString(sectionRecord.room, item.room),
                        facilityId: asString(sectionRecord.facilityId) || undefined,
                        maxStudents: asNumber(sectionRecord.maxStudents, 30),
                        schedule: scheduleItems,
                    };
                });
                await api.courses.update(item.courseId, { sections: nextSections });
            } else {
                const nextSchedule = asArray(courseRecord.schedule).map((slot, scheduleIndex) =>
                    scheduleIndex === item.scheduleIndex ? { ...asRecord(slot), ...nextSlot } : asRecord(slot),
                );
                await api.courses.update(item.courseId, { schedule: nextSchedule });
            }

            setSchedule((current) => current.map((slot) =>
                slot.id === item.id
                    ? { ...slot, day: targetDay, startTime: targetTime, endTime: nextSlot.endTime, isOneTime: mode === 'one-time' }
                    : slot,
            ));
            toast.success(mode === 'one-time' ? 'บันทึกการเปลี่ยนเฉพาะครั้งแล้ว' : 'บันทึกตารางเรียนแล้ว');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Unable to update schedule');
        }
    };

    return (
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-8 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                <div>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 text-slate-500 dark:text-slate-400 font-medium mb-2">
                        <Calendar className="w-4 h-4 text-purple-500 dark:text-slate-400" />
                        <span>{t.scheduleManagementPage.subtitle}</span>
                    </motion.div>
                    <motion.h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tight" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.scheduleManagementPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.scheduleManagementPage.titleHighlight}</span>
                    </motion.h1>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Button onClick={() => setIsRoomDialogOpen(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700 shadow-lg shadow-purple-200 h-11">
                        <Plus className="w-4 h-4 mr-2" /> {t.scheduleManagementPage.bookRoom}
                    </Button>
                </motion.div>
            </div>

            {/* Pending Requests */}
            <AnimatePresence>
                {requests.length > 0 && (
                    <motion.div variants={itemVariants} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="bg-amber-50/80 backdrop-blur-xl border border-amber-200 rounded-3xl p-6 shadow-sm">
                        <h3 className="text-lg font-bold text-amber-800 mb-4 flex items-center gap-2">
                            <Bell className="w-5 h-5 animate-pulse" /> {t.scheduleManagementPage.editRequests} ({requests.length})
                        </h3>
                        <div className="space-y-3">
                            {requests.map(req => (
                                <motion.div key={req.id} whileHover={{ x: 4 }} className="bg-white p-5 rounded-2xl border border-amber-100 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4 dark:bg-slate-900">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                                            <span className="font-bold text-slate-800 dark:text-slate-200">{req.lecturer}</span>
                                            <Badge variant="outline" className="rounded-lg text-xs">{req.courseCode}</Badge>
                                            <Badge className={`rounded-lg text-xs ${req.type === 'permanent' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>
                                                {req.type === 'permanent' ? t.scheduleManagementPage.permanentChange : t.scheduleManagementPage.oneTime}
                                            </Badge>
                                        </div>
                                        <p className="text-sm text-slate-600 dark:text-slate-300">
                                            จาก <span className="text-red-500 font-medium dark:text-slate-400">{req.oldTime}</span> เป็น <span className="text-emerald-600 font-medium dark:text-slate-300">{req.newTime}</span>
                                        </p>
                                        <p className="text-sm text-slate-400 mt-1">{t.scheduleManagementPage.reason} {req.reason}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 border-red-200 rounded-xl dark:text-slate-400 dark:bg-slate-800" onClick={() => handleReject(req.id)}>
                                            <XCircle className="w-4 h-4 mr-1" /> {t.scheduleManagementPage.reject}
                                        </Button>
                                        <Button size="sm" className="bg-emerald-500 hover:bg-emerald-600 rounded-xl shadow-lg shadow-emerald-200" onClick={() => handleApprove(req)}>
                                            <CheckCircle className="w-4 h-4 mr-1" /> {t.scheduleManagementPage.approve}
                                        </Button>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Room Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {rooms.map((room, idx) => (
                    <motion.div key={idx} whileHover={{ scale: 1.02 }}
                        className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all dark:bg-slate-900/50">
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200 text-sm">{room.name}</h4>
                            <div className={`w-3 h-3 rounded-full ${room.status === 'available' ? 'bg-emerald-500' : room.status === 'occupied' ? 'bg-red-500' : 'bg-amber-500'}`} />
                        </div>
                        <p className="text-sm text-slate-400 flex items-center gap-2 mb-4">
                            <MapPin className="w-3.5 h-3.5" /> {t.scheduleManagementPage.capacity} {room.capacity} {t.scheduleManagementPage.seats}
                        </p>
                        <div className="flex gap-2">
                            <Button size="sm" variant="outline" className="flex-1 rounded-xl text-xs" onClick={() => setIsEditMode(true)}>{t.scheduleManagementPage.scheduleTab}</Button>
                            <Button size="sm" className="flex-1 rounded-xl text-xs bg-purple-600 hover:bg-purple-700" onClick={() => toggleRoomStatus(room)}>
                                {room.status === 'maintenance' ? 'เปิดใช้' : 'ปิดใช้'}
                            </Button>
                        </div>
                    </motion.div>
                ))}
                {rooms.length === 0 && (
                    <div className="col-span-2 lg:col-span-4 rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 p-8 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-400">
                        ยังไม่มีข้อมูลห้องจากระบบ
                    </div>
                )}
            </motion.div>

            {/* Schedule */}
            <motion.div variants={itemVariants} className="bg-white/60 backdrop-blur-xl border border-white/60 dark:border-slate-800/60 rounded-3xl p-6 shadow-sm min-h-[600px] dark:bg-slate-900/50">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.scheduleManagementPage.combinedSchedule}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t.scheduleManagementPage.combinedDesc}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-900/50">
                            <Switch id="edit-mode" checked={isEditMode} onCheckedChange={setIsEditMode} />
                            <Label htmlFor="edit-mode" className="cursor-pointer flex items-center gap-2 text-sm">
                                <Edit3 className="w-4 h-4" /> {t.scheduleManagementPage.editMode}
                            </Label>
                        </div>
                    </div>
                </div>
                {isEditMode && (
                    <div className="mb-4 p-3.5 bg-blue-50 border border-blue-100 rounded-2xl text-sm text-blue-700 flex items-center gap-2 dark:text-slate-300 dark:bg-slate-800">
                        <Edit3 className="w-4 h-4" /> {t.scheduleManagementPage.editModeDesc}
                    </div>
                )}
                <DraggableSchedule initialSchedule={schedule} editable={isEditMode} onRequestMove={handleScheduleMove} />
            </motion.div>

            <Dialog open={isRoomDialogOpen} onOpenChange={setIsRoomDialogOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>เพิ่มห้อง/ทรัพยากรการเรียน</DialogTitle>
                    </DialogHeader>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                        <div className="space-y-2">
                            <Label>รหัสห้อง</Label>
                            <Input value={roomForm.code} onChange={(event) => setRoomForm({ ...roomForm, code: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ชื่อห้อง</Label>
                            <Input value={roomForm.name} onChange={(event) => setRoomForm({ ...roomForm, name: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>อาคาร</Label>
                            <Input value={roomForm.building} onChange={(event) => setRoomForm({ ...roomForm, building: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>เลขห้อง</Label>
                            <Input value={roomForm.room} onChange={(event) => setRoomForm({ ...roomForm, room: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ชั้น</Label>
                            <Input value={roomForm.floor} onChange={(event) => setRoomForm({ ...roomForm, floor: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ประเภท</Label>
                            <Input value={roomForm.type} onChange={(event) => setRoomForm({ ...roomForm, type: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>ความจุ</Label>
                            <Input type="number" value={roomForm.capacity} onChange={(event) => setRoomForm({ ...roomForm, capacity: event.target.value })} />
                        </div>
                        <div className="space-y-2">
                            <Label>หมายเหตุ</Label>
                            <Input value={roomForm.notes} onChange={(event) => setRoomForm({ ...roomForm, notes: event.target.value })} />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRoomDialogOpen(false)}>ยกเลิก</Button>
                        <Button onClick={createRoom} className="bg-purple-600 hover:bg-purple-700">บันทึก</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </motion.div>
    );
}
