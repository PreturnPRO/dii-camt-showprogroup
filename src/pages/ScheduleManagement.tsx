import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Search, MapPin, Plus, Clock, Edit3, Save, AlertCircle, Bell, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useNavigate } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DraggableSchedule } from '@/components/schedule/DraggableSchedule';
import { mapCourse } from '@/lib/live-mappers';
import { formatMinutes, teachingEntries, termKey, termsOf, type DayKey, type PlacedSlot } from '@/lib/timetable';
import type { Course } from '@/types';
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

export default function ScheduleManagement() {
    const { t, language } = useLanguage();
    const navigate = useNavigate();
    const [isEditMode, setIsEditMode] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseRecords, setCourseRecords] = useState<unknown[]>([]);
    const [termValue, setTermValue] = useState('');
    const [requests, setRequests] = useState<Array<{ id: string; submitter: string; title: string; status: string; submittedAt: string }>>([]);
    const terms = termsOf(courses);
    const term = terms.find((item) => termKey(item) === termValue) ?? terms[0] ?? null;
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
                    setCourses(coursesResponse.value.courses.map(mapCourse));
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
                            const studentUser = asRecord(asRecord(request.student).user);
                            return {
                                id: asString(request.id, String(index + 1)),
                                submitter: asString(studentUser.nameThai, asString(studentUser.name, '-')),
                                title: asString(request.title, '-'),
                                status: asString(request.status, '-'),
                                submittedAt: asString(request.submittedAt, asString(request.createdAt, '')),
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

    const handleScheduleMove = async (p: PlacedSlot, day: DayKey, start: number) => {
        const record = asRecord(courseRecords.find((r) => asString(asRecord(r).id) === p.course.id));
        const slotIndex = p.section ? p.section.schedule.indexOf(p.slot) : -1;
        if (!p.section || slotIndex < 0) {
            toast.error(language === 'th' ? 'หาคาบนี้ในข้อมูลวิชาไม่เจอ' : 'Could not find this class in the course');
            return;
        }
        const nextSlot = { day, startTime: formatMinutes(start), endTime: formatMinutes(start + (p.end - p.start)) };
        // send every section by number: the API updates sections in place, so enrollments keep their section
        const sections = asArray(record.sections).map((item) => {
            const s = asRecord(item);
            const schedule = asArray(s.schedule).map((slot, i) =>
                asString(s.id) === p.section!.id && i === slotIndex ? { ...asRecord(slot), ...nextSlot } : asRecord(slot));
            return {
                number: asString(s.number),
                room: asString(s.room) || undefined,
                facilityId: asString(s.facilityId) || undefined,
                maxStudents: asNumber(s.maxStudents, 30),
                minStudents: asNumber(s.minStudents, 0),
                schedule,
            };
        });
        try {
            const response = await api.courses.update(p.course.id, { sections });
            const updated = asRecord(response.course);
            setCourseRecords((cur) => cur.map((r) => (asString(asRecord(r).id) === p.course.id ? updated : r)));
            setCourses((cur) => cur.map((c) => (c.id === p.course.id ? mapCourse(updated) : c)));
            toast.success(language === 'th' ? 'ย้ายคาบแล้ว (มีผลทุกสัปดาห์)' : 'Class moved (every week)');
        } catch (error) {
            toast.error(error instanceof Error ? error.message : (language === 'th' ? 'ย้ายคาบไม่สำเร็จ' : 'Could not move the class'));
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

            {/* Requests that mention the schedule or rooms: shown as they are, handled on the requests page */}
            <motion.div variants={itemVariants} data-testid="schedule-requests"
                className="bg-amber-50/80 backdrop-blur-xl border border-amber-200 rounded-3xl p-6 shadow-sm dark:bg-slate-900/50 dark:border-slate-800">
                <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                    <div>
                        <h3 className="text-lg font-bold text-amber-800 dark:text-slate-200 flex items-center gap-2">
                            <Bell className="w-5 h-5" /> {language === 'th' ? `คำร้องที่เกี่ยวกับตาราง/ห้อง (${requests.length})` : `Requests about schedules or rooms (${requests.length})`}
                        </h3>
                        <p className="text-sm text-amber-700/80 dark:text-slate-400">
                            {language === 'th' ? 'คัดจากคำในหัวข้อและรายละเอียดคำร้อง · พิจารณาและตอบที่หน้าคำร้อง' : 'Picked by words in the request title and text · review and answer them on the requests page'}
                        </p>
                    </div>
                    <Button size="sm" variant="outline" className="rounded-xl" onClick={() => navigate('/requests')}>
                        <ExternalLink className="w-4 h-4 mr-1" /> {language === 'th' ? 'เปิดหน้าคำร้อง' : 'Open requests'}
                    </Button>
                </div>
                {requests.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">{language === 'th' ? 'ไม่มีคำร้องที่เกี่ยวกับตารางหรือห้อง' : 'No requests about schedules or rooms'}</p>
                ) : (
                    <div className="space-y-3">
                        {requests.map((req) => (
                            <div key={req.id} className="bg-white p-4 rounded-2xl border border-amber-100 shadow-sm flex flex-wrap items-center justify-between gap-3 dark:bg-slate-900 dark:border-slate-800">
                                <div className="min-w-0">
                                    <div className="font-semibold text-slate-800 dark:text-slate-200 truncate">{req.title}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400">
                                        {language === 'th' ? 'ผู้ยื่น' : 'From'}: {req.submitter}
                                        {req.submittedAt && ` · ${new Date(req.submittedAt).toLocaleDateString(language === 'th' ? 'th-TH' : 'en-GB')}`}
                                    </div>
                                </div>
                                <Badge variant="outline" className="rounded-lg text-xs">{req.status}</Badge>
                            </div>
                        ))}
                    </div>
                )}
            </motion.div>

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
                        <Select value={term ? termKey(term) : ''} onValueChange={setTermValue}>
                            <SelectTrigger data-testid="term-picker" className="w-44 rounded-xl"><SelectValue placeholder={language === 'th' ? 'เลือกเทอม' : 'Term'} /></SelectTrigger>
                            <SelectContent>
                                {terms.map((item) => (
                                    <SelectItem key={termKey(item)} value={termKey(item)}>{language === 'th' ? `เทอม ${item.semester}/${item.academicYear}` : `Term ${item.semester}/${item.academicYear}`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                <DraggableSchedule entries={teachingEntries(courses, term)} editable={isEditMode} onMove={handleScheduleMove} />
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
