import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/contexts/LanguageContext';
import { Calendar, Search, MapPin, Plus, Clock, Edit3, Save, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams } from 'react-router-dom';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DraggableSchedule } from '@/components/schedule/DraggableSchedule';
import { ClassMoveDialog } from '@/components/schedule/ClassMoveDialog';
import { MoveRequestsPanel } from '@/components/schedule/MoveRequestsPanel';
import { thaiToday } from '@/lib/thai-date';
import { mapCourse } from '@/lib/live-mappers';
import { addDays, DAY_KEYS, formatMinutes, teachingEntries, termKey, termsOf, weekOf, type DayKey, type Occurrence, type PlacedSlot } from '@/lib/timetable';
import type { Course } from '@/types';
import { toast } from 'sonner';
import { api, ApiError, type ClassMoveView } from '@/lib/api';
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
    const [isEditMode, setIsEditMode] = useState(false);
    const [courses, setCourses] = useState<Course[]>([]);
    const [courseRecords, setCourseRecords] = useState<unknown[]>([]);
    const [termValue, setTermValue] = useState('');
    const [searchParams, setSearchParams] = useSearchParams();
    const weekParam = searchParams.get('week');
    const [mode, setMode] = useState<'recurring' | 'weekly'>(weekParam ? 'weekly' : 'recurring');
    const weekStart = weekOf(weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) ? weekParam : thaiToday());
    const setWeekStart = (next: string) => setSearchParams((prev) => { const p = new URLSearchParams(prev); p.set('week', next); return p; });
    const [moves, setMoves] = useState<ClassMoveView[]>([]);
    const [moveTarget, setMoveTarget] = useState<{ occurrence: Occurrence; date?: string; start?: string } | null>(null);
    const [movedDetail, setMovedDetail] = useState<ClassMoveView | null>(null);
    const [blockingMoves, setBlockingMoves] = useState<Array<{ moveId: string; sectionNumber: string; originalDate: string; originalStart: string; newDate: string; newStart: string }>>([]);
    const reloadMoves = React.useCallback(() => {
        api.classMoves.list(weekStart, addDays(weekStart, 6)).then((r) => setMoves(r.moves)).catch(() => setMoves([]));
    }, [weekStart]);
    React.useEffect(() => { if (mode === 'weekly') reloadMoves(); }, [mode, reloadMoves]);
    const cancelMove = async (id: string) => {
        try {
            await api.classMoves.cancel(id);
            toast.success(language === 'th' ? 'ยกเลิกการย้ายแล้ว คาบกลับไปเวลาเดิม' : 'Move cancelled');
            setMovedDetail(null);
            setBlockingMoves((cur) => cur.filter((m) => m.moveId !== id));
            reloadMoves();
        } catch (error) {
            toast.error(error instanceof Error ? error.message : 'Could not cancel');
        }
    };
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

        Promise.allSettled([api.courses.list(), api.facilities.list()])
            .then(([coursesResponse, facilitiesResponse]) => {
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
            // a weekly change that would drop a class with a one-time move: list those moves to cancel first
            // ApiError.details is the whole error payload: { message, details: [moves] }
            const moves = error instanceof ApiError ? asArray(asRecord(error.details).details) : [];
            if (moves.length > 0 && moves.every((d) => 'moveId' in asRecord(d))) {
                setBlockingMoves(moves as typeof blockingMoves);
                return;
            }
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
                    <motion.h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-900 dark:text-white leading-snug" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                        {t.scheduleManagementPage.title}<span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-violet-600">{t.scheduleManagementPage.titleHighlight}</span>
                    </motion.h1>
                </div>
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                    <Button onClick={() => setIsRoomDialogOpen(true)} className="rounded-xl bg-purple-600 hover:bg-purple-700 shadow-sm h-11">
                        <Plus className="w-4 h-4 mr-2" /> {t.scheduleManagementPage.bookRoom}
                    </Button>
                </motion.div>
            </div>

            <motion.div variants={itemVariants}>
                <MoveRequestsPanel onDecided={reloadMoves} />
            </motion.div>

            {/* Room Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {rooms.map((room, idx) => (
                    <motion.div key={idx} whileHover={{ scale: 1.02 }}
                        className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all">
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
            <motion.div variants={itemVariants} className="bg-white dark:bg-[#0c1222] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-6 shadow-sm min-h-[600px]">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">{t.scheduleManagementPage.combinedSchedule}</h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{t.scheduleManagementPage.combinedDesc}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4">
                        <div className="flex rounded-xl border border-slate-200 p-1 dark:border-slate-700">
                            <Button size="sm" variant={mode === 'recurring' ? 'default' : 'ghost'} data-testid="mode-recurring" onClick={() => setMode('recurring')}>{language === 'th' ? 'ประจำทุกสัปดาห์' : 'Every week'}</Button>
                            <Button size="sm" variant={mode === 'weekly' ? 'default' : 'ghost'} data-testid="mode-weekly" onClick={() => setMode('weekly')}>{language === 'th' ? 'รายสัปดาห์' : 'One week'}</Button>
                        </div>
                        {mode === 'weekly' && (
                            <div className="flex items-center gap-1">
                                <Button size="sm" variant="ghost" data-testid="week-prev" onClick={() => setWeekStart(addDays(weekStart, -7))}>‹</Button>
                                <span className="text-sm font-medium" data-testid="week-range">{weekStart} – {addDays(weekStart, 6)}</span>
                                <Button size="sm" variant="ghost" data-testid="week-next" onClick={() => setWeekStart(addDays(weekStart, 7))}>›</Button>
                            </div>
                        )}
                        <Select value={term ? termKey(term) : ''} onValueChange={setTermValue}>
                            <SelectTrigger data-testid="term-picker" className="w-44 rounded-xl"><SelectValue placeholder={language === 'th' ? 'เลือกเทอม' : 'Term'} /></SelectTrigger>
                            <SelectContent>
                                {terms.map((item) => (
                                    <SelectItem key={termKey(item)} value={termKey(item)}>{language === 'th' ? `เทอม ${item.semester}/${item.academicYear}` : `Term ${item.semester}/${item.academicYear}`}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <div className="flex items-center gap-2 bg-white/80 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700">
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
                {mode === 'recurring' ? (
                    <DraggableSchedule entries={teachingEntries(courses, term)} editable={isEditMode} onMove={handleScheduleMove} />
                ) : (
                    <DraggableSchedule
                        entries={teachingEntries(courses, term)}
                        editable={isEditMode}
                        weekStart={weekStart}
                        moves={moves}
                        // dragging inside the week fills the form; clicking opens it empty (any day) or shows a move
                        onMove={(p, day, start) => setMoveTarget({ occurrence: p as Occurrence, date: addDays(weekStart, DAY_KEYS.indexOf(day)), start: formatMinutes(start) })}
                        onSlotClick={(o) => (o.kind === 'moved-in' && o.move ? setMovedDetail(o.move) : setMoveTarget({ occurrence: o }))}
                    />
                )}
                <ClassMoveDialog
                    open={!!moveTarget}
                    onOpenChange={(open) => { if (!open) setMoveTarget(null); }}
                    occurrence={moveTarget?.occurrence ?? null}
                    initialDate={moveTarget?.date}
                    initialStart={moveTarget?.start}
                    mode="move"
                    onDone={reloadMoves}
                />
                <Dialog open={!!movedDetail} onOpenChange={(open) => { if (!open) setMovedDetail(null); }}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{language === 'th' ? `คาบที่ย้ายแล้ว ${movedDetail?.courseCode ?? ''}` : `Moved class ${movedDetail?.courseCode ?? ''}`}</DialogTitle></DialogHeader>
                        {movedDetail && (
                            <p className="text-sm text-slate-600 dark:text-slate-300">
                                {movedDetail.originalDate} {movedDetail.originalStart}–{movedDetail.originalEnd} → {movedDetail.newDate} {movedDetail.newStart}–{movedDetail.newEnd} · {movedDetail.room ?? '-'} · {movedDetail.reason}
                            </p>
                        )}
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setMovedDetail(null)}>{language === 'th' ? 'ปิด' : 'Close'}</Button>
                            {movedDetail && Math.min(Date.parse(movedDetail.originalDate), Date.parse(movedDetail.newDate)) > Date.parse(thaiToday()) && (
                                <Button data-testid="cancel-move" variant="destructive" onClick={() => void cancelMove(movedDetail.id)}>{language === 'th' ? 'ยกเลิกการย้าย' : 'Cancel move'}</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
                <Dialog open={blockingMoves.length > 0} onOpenChange={(open) => { if (!open) setBlockingMoves([]); }}>
                    <DialogContent>
                        <DialogHeader><DialogTitle>{language === 'th' ? 'ต้องยกเลิกการย้ายเฉพาะครั้งเหล่านี้ก่อน' : 'Cancel these one-time moves first'}</DialogTitle></DialogHeader>
                        <div className="space-y-2" data-testid="blocking-moves">
                            {blockingMoves.map((m) => (
                                <div key={m.moveId} className="flex items-center justify-between gap-3 text-sm">
                                    <span>{language === 'th' ? 'ตอน' : 'sec'} {m.sectionNumber} · {m.originalDate} {m.originalStart} → {m.newDate} {m.newStart}</span>
                                    <Button size="sm" variant="outline" onClick={() => void cancelMove(m.moveId)}>{language === 'th' ? 'ยกเลิกการย้าย' : 'Cancel move'}</Button>
                                </div>
                            ))}
                        </div>
                    </DialogContent>
                </Dialog>
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
