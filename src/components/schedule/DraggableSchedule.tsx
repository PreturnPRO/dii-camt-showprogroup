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
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
];

export function DraggableSchedule({ initialSchedule, editable = false, onRequestMove }: DraggableScheduleProps) {
    const { t } = useLanguage();
    const DAYS = [t.scheduleComponent.monday, t.scheduleComponent.tuesday, t.scheduleComponent.wednesday, t.scheduleComponent.thursday, t.scheduleComponent.friday, t.scheduleComponent.saturday, t.scheduleComponent.sunday];
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
                <div className="min-w-[950px] grid grid-cols-[75px_repeat(7,minmax(0,1fr))] gap-2">
                    {/* Header Row */}
                    <div className="font-bold text-xs text-slate-700 dark:text-slate-300 text-center py-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center">
                        เวลา
                    </div>
                    {DAYS.map((day) => (
                        <div key={day} className="font-bold text-xs text-blue-950 dark:text-blue-200 text-center py-2.5 bg-blue-50 dark:bg-slate-800/90 rounded-xl border border-blue-200/80 dark:border-slate-700 shadow-sm">
                            {day}
                        </div>
                    ))}

                    {/* Time Slots */}
                    {TIME_SLOTS.map((time) => (
                        <React.Fragment key={time}>
                            <div className="text-xs text-slate-600 dark:text-slate-400 font-bold py-4 text-center border-t border-slate-200 dark:border-slate-800 relative flex items-center justify-center">
                                <span className="-top-2.5 relative bg-background px-1.5 font-mono">{time}</span>
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
                                            "min-h-[85px] border border-dashed border-slate-300/80 dark:border-slate-700/80 rounded-xl p-1 transition-all",
                                            isActiveDrop ? "bg-blue-100/70 border-blue-500 scale-[1.02] z-10" : "hover:bg-slate-100/50 dark:hover:bg-slate-800/30",
                                            item ? "border-transparent bg-transparent hover:bg-transparent" : ""
                                        )}
                                    >
                                        {item && (
                                            <motion.div
                                                layoutId={item.id}
                                                draggable={editable}
                                                onDragStart={((e: React.DragEvent) => handleDragStart(e, item)) as never}
                                                className={cn(
                                                    "h-full p-2.5 rounded-xl shadow-sm border text-left cursor-grab active:cursor-grabbing transition-all",
                                                    "bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 border-l-4 border-l-blue-600 dark:border-l-blue-400",
                                                    editable ? "hover:shadow-md hover:scale-[1.02]" : "",
                                                    item.isOneTime ? "border-l-orange-500 ring-2 ring-orange-200 dark:ring-orange-900" : ""
                                                )}
                                                initial={{ opacity: 0, scale: 0.9 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                            >
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-extrabold text-xs text-blue-700 dark:text-blue-400 tracking-tight">{item.courseCode}</span>
                                                    {editable && <GripVertical className="w-3.5 h-3.5 text-slate-400 shrink-0" />}
                                                </div>
                                                <div className="text-xs font-bold text-slate-900 dark:text-slate-100 line-clamp-2 leading-tight">{item.courseName}</div>
                                                <div className="flex items-center gap-1 mt-2 text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                                                    <MapPin className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                                                    <span className="truncate">{item.room}</span>
                                                </div>
                                                {item.isOneTime && (
                                                    <Badge variant="outline" className="mt-1.5 text-[10px] bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 font-bold">
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
