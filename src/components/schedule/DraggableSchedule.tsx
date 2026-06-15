import React, { useEffect, useState } from 'react';
import { motion, Reorder } from 'framer-motion';
import { format, startOfWeek, addDays, setHours, setMinutes } from 'date-fns';
import { th } from 'date-fns/locale';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MapPin, Clock, GripVertical } from 'lucide-react';
import { RescheduleDialog } from './RescheduleDialog';
import { useLanguage } from '@/contexts/LanguageContext';
import { toast } from 'sonner';

export interface ScheduleItem {
    id: string;
    courseId?: string;
    sectionIndex?: number;
    scheduleIndex?: number;
    courseCode: string;
    courseName: string;
    day: number; // 0-6 (Sun-Sat), but typically 1-5 (Mon-Fri)
    startTime: string; // "09:00"
    endTime: string;   // "12:00"
    room: string;
    lecturer?: string;
    isOneTime?: boolean;
}

interface DraggableScheduleProps {
    initialSchedule: ScheduleItem[];
    editable?: boolean;
    onRequestMove?: (item: ScheduleItem, targetDay: number, targetTime: string, mode: 'permanent' | 'one-time') => void;
}

const TIME_SLOTS = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00'
];

export function DraggableSchedule({ initialSchedule, editable = false, onRequestMove }: DraggableScheduleProps) {
    const { t } = useLanguage();
    const DAYS = [t.scheduleComponent.monday, t.scheduleComponent.tuesday, t.scheduleComponent.wednesday, t.scheduleComponent.thursday, t.scheduleComponent.friday];
    const [schedule, setSchedule] = useState(initialSchedule);
    const [draggedItem, setDraggedItem] = useState<ScheduleItem | null>(null);
    const [dropTarget, setDropTarget] = useState<{ day: number, time: string } | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [pendingMove, setPendingMove] = useState<{ item: ScheduleItem, targetDay: number, targetTime: string } | null>(null);

    useEffect(() => {
        setSchedule(initialSchedule);
    }, [initialSchedule]);

    const handleDragStart = (e: React.DragEvent, item: ScheduleItem) => {
        if (!editable) return;
        setDraggedItem(item);
        e.dataTransfer.setData('text/plain', item.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, dayIndex: number, time: string) => {
        e.preventDefault();
        if (!editable) return;
        setDropTarget({ day: dayIndex + 1, time }); // +1 because generic DAYS array is 0-indexed but data uses 1-5 for Mon-Fri commonly
    };

    const handleDrop = (e: React.DragEvent, dayIndex: number, time: string) => {
        e.preventDefault();
        if (!editable || !draggedItem) return;

        const targetDay = dayIndex + 1;
        // Don't trigger if dropped on same slot
        if (draggedItem.day === targetDay && draggedItem.startTime === time) {
            setDraggedItem(null);
            setDropTarget(null);
            return;
        }

        setPendingMove({ item: draggedItem, targetDay, targetTime: time });
        setDialogOpen(true);
        setDraggedItem(null);
        setDropTarget(null);
    };

    const handleConfirmMove = (mode: 'permanent' | 'one-time') => {
        if (!pendingMove) return;

        if (onRequestMove) {
            onRequestMove(pendingMove.item, pendingMove.targetDay, pendingMove.targetTime, mode);
            setDialogOpen(false);
            setPendingMove(null);
            return;
        }

        toast.error('Unable to save schedule change because no backend handler is configured.');
        setDialogOpen(false);
        setPendingMove(null);
    };

    const calculateEndTime = (newStart: string, oldStart: string, oldEnd: string) => {
        // calculate duration
        const startH = parseInt(oldStart.split(':')[0]);
        const endH = parseInt(oldEnd.split(':')[0]);
        const duration = endH - startH;

        const newStartH = parseInt(newStart.split(':')[0]);
        const newEndH = newStartH + duration;
        return `${newEndH.toString().padStart(2, '0')}:00`;
    };

    return (
        <>
            <div className="overflow-x-auto pb-4">
                <div className="min-w-[800px] grid grid-cols-[100px_repeat(5,1fr)] gap-2">
                    {/* Header Row */}
                    <div className="font-semibold text-gray-500 dark:text-slate-400 text-center py-2 bg-gray-50 rounded-lg dark:bg-slate-800">เวลา</div>
                    {DAYS.map((day, i) => (
                        <div key={day} className="font-semibold text-gray-700 dark:text-slate-300 text-center py-2 bg-blue-50/50 rounded-lg border border-blue-100">
                            {day}
                        </div>
                    ))}

                    {/* Time Slots */}
                    {TIME_SLOTS.map((time) => (
                        <React.Fragment key={time}>
                            <div className="text-sm text-gray-500 dark:text-slate-400 font-medium py-4 text-center border-t relative">
                                <span className="-top-3 relative bg-background px-1">{time}</span>
                            </div>

                            {DAYS.map((_, dayIndex) => {
                                // Find course starting at this time/day
                                const item = schedule.find(s => s.day === dayIndex + 1 && s.startTime === time);

                                const isActiveDrop = dropTarget?.day === dayIndex + 1 && dropTarget?.time === time;

                                return (
                                    <div
                                        key={`${dayIndex}-${time}`}
                                        onDragOver={(e) => handleDragOver(e, dayIndex, time)}
                                        onDrop={(e) => handleDrop(e, dayIndex, time)}
                                        className={cn(
                                            "min-h-[80px] border border-dashed border-gray-100 rounded-lg p-1 transition-all",
                                            isActiveDrop ? "bg-blue-100 border-blue-400 scale-105 z-10" : "hover:bg-gray-50/50",
                                            item ? "border-transparent bg-transparent hover:bg-transparent" : ""
                                        )}
                                    >
                                        {item && (
                                            <motion.div
                                                layoutId={item.id}
                                                draggable={editable}
                                                onDragStart={((e: React.DragEvent) => handleDragStart(e, item)) as never}
                                                className={cn(
                                                    "h-full p-3 rounded-xl shadow-sm border text-left cursor-grab active:cursor-grabbing",
                                                    // Dynamic colors based on ID or hash
                                                    "bg-white border-l-4 border-l-blue-500",
                                                    editable ? "hover:shadow-md hover:scale-[1.02]" : "",
                                                    item.isOneTime ? "border-l-orange-500 ring-2 ring-orange-200" : ""
                                                )}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-sm text-gray-800 dark:text-slate-200">{item.courseCode}</span>
                                                    {editable && <GripVertical className="w-4 h-4 text-gray-400" />}
                                                </div>
                                                <div className="text-xs text-gray-600 dark:text-slate-400 line-clamp-1">{item.courseName}</div>
                                                <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-500 dark:text-slate-400">
                                                    <MapPin className="w-3 h-3" /> {item.room}
                                                </div>
                                                {item.isOneTime && (
                                                    <Badge variant="outline" className="mt-2 text-[10px] bg-orange-50 text-orange-600 border-orange-200 dark:text-slate-300">
                                                        เปลี่ยนเฉพาะวันนี้
                                                    </Badge>
                                                )}
                                            </motion.div>
                                        )}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            </div>

            <RescheduleDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onConfirm={handleConfirmMove}
                item={pendingMove?.item}
                targetTime={`${DAYS[pendingMove?.targetDay ? pendingMove.targetDay - 1 : 0]} ${pendingMove?.targetTime}`}
            />
        </>
    );
}
