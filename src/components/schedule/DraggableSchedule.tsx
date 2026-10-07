import React from 'react';
import { MapPin, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/contexts/LanguageContext';
import { RescheduleDialog } from './RescheduleDialog';
import type { ClassMoveView } from '@/lib/api';
import { addDays, DAY_KEYS, DAY_LABELS, formatMinutes, placeSlots, visibleRange, weekOccurrences, type DayKey, type Occurrence, type PlacedSlot, type TimetableEntry } from '@/lib/timetable';

interface DraggableScheduleProps {
    entries: TimetableEntry[];
    editable: boolean;
    /** recurring mode: confirmed through the permanent-move dialog · weekly mode: called straight away */
    onMove: (slot: PlacedSlot, day: DayKey, start: number) => void;
    /** weekly mode: the Monday shown, with this week's moves */
    weekStart?: string;
    moves?: ClassMoveView[];
    onSlotClick?: (occurrence: Occurrence) => void;
}

const ROW_PX = 28;

export function DraggableSchedule({ entries, editable, onMove, weekStart, moves, onSlotClick }: DraggableScheduleProps) {
    const { language } = useLanguage();
    const isTH = language !== 'en';
    const weekly = !!weekStart;
    const placed: Array<PlacedSlot & Partial<Occurrence>> = React.useMemo(
        () => (weekStart ? weekOccurrences(entries, weekStart, moves ?? []) : placeSlots(entries)),
        [entries, weekStart, moves],
    );
    const range = visibleRange(placed);
    const rows = (range.end - range.start) / 30;
    const [dragged, setDragged] = React.useState<PlacedSlot | null>(null);
    // set one frame after dragstart so the browser keeps the drag image; then every block,
    // the dragged one included, lets the drop zones underneath receive the drop
    const [dragging, setDragging] = React.useState(false);
    const endDrag = () => { setDragged(null); setDragging(false); setOver(null); };
    const [over, setOver] = React.useState<string | null>(null);
    const [pending, setPending] = React.useState<{ slot: PlacedSlot; day: DayKey; start: number } | null>(null);
    const label = (day: DayKey, start: number, end?: number) =>
        `${isTH ? DAY_LABELS[day].th : DAY_LABELS[day].en} ${formatMinutes(start)}${end !== undefined ? `–${formatMinutes(end)}` : ''}`;

    return (
        <>
            <div className="overflow-x-auto">
                <div className="grid min-w-[900px]" style={{ gridTemplateColumns: `56px repeat(7, minmax(0, 1fr))` }}>
                    <div />
                    {DAY_KEYS.map((day, i) => (
                        <div key={day} className="border-b border-slate-200 p-2 text-center text-sm font-semibold dark:border-slate-700">
                            {isTH ? DAY_LABELS[day].th : DAY_LABELS[day].en}
                            {weekStart && ` ${new Date(`${addDays(weekStart, i)}T00:00:00Z`).getUTCDate()}`}
                        </div>
                    ))}
                    <div className="relative" style={{ height: rows * ROW_PX }}>
                        {Array.from({ length: rows / 2 }, (_, i) => range.start + i * 60).map((h) => (
                            <div key={h} className="absolute right-2 text-xs text-slate-500 dark:text-slate-400" style={{ top: ((h - range.start) / 30) * ROW_PX - 7 }}>{formatMinutes(h)}</div>
                        ))}
                    </div>
                    {DAY_KEYS.map((day) => (
                        <div key={day} className="relative border-l border-slate-100 dark:border-slate-800" style={{ height: rows * ROW_PX }}>
                            {editable && Array.from({ length: rows }, (_, i) => range.start + i * 30).map((start) => {
                                const id = `${day}-${formatMinutes(start)}`;
                                return (
                                    <div
                                        key={id}
                                        data-testid={`drop-${id}`}
                                        className={cn('absolute inset-x-0 border-t border-dashed border-slate-100 dark:border-slate-800', over === id && 'bg-blue-100 dark:bg-slate-700')}
                                        style={{ top: ((start - range.start) / 30) * ROW_PX, height: ROW_PX }}
                                        onDragOver={(e) => { e.preventDefault(); setOver(id); }}
                                        onDragLeave={() => setOver((cur) => (cur === id ? null : cur))}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            setOver(null);
                                            if (dragged && !(dragged.day === day && dragged.start === start)) {
                                                if (weekly) onMove(dragged, day, start);
                                                else setPending({ slot: dragged, day, start });
                                            }
                                            endDrag();
                                        }}
                                    />
                                );
                            })}
                            {placed.filter((p) => p.day === day).map((p) => (
                                <div
                                    key={p.key}
                                    data-testid="timetable-slot"
                                    data-course={p.course.code}
                                    data-day={p.day}
                                    data-start={formatMinutes(p.start)}
                                    data-lane={p.lane}
                                    data-kind={p.kind ?? 'regular'}
                                    data-date={p.date}
                                    draggable={editable && p.kind !== 'moved-out'}
                                    onClick={onSlotClick && p.kind !== 'moved-out' ? () => onSlotClick(p as Occurrence) : undefined}
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('text/plain', p.key);
                                        e.dataTransfer.effectAllowed = 'move';
                                        setDragged(p);
                                        requestAnimationFrame(() => setDragging(true));
                                    }}
                                    onDragEnd={endDrag}
                                    className={cn(
                                        'absolute overflow-hidden rounded-lg border-l-4 bg-white p-1.5 text-xs shadow-sm dark:bg-slate-800',
                                        p.kind === 'moved-out' ? 'z-0 border-dashed border-l-slate-300 opacity-40' : 'z-10',
                                        p.kind === 'moved-in' ? 'border-l-orange-500' : p.kind !== 'moved-out' && 'border-l-blue-500',
                                        editable && p.kind !== 'moved-out' && 'cursor-grab',
                                        onSlotClick && p.kind !== 'moved-out' && 'cursor-pointer',
                                    )}
                                    style={{
                                        top: ((p.start - range.start) / 30) * ROW_PX,
                                        height: ((p.end - p.start) / 30) * ROW_PX - 2,
                                        left: p.kind === 'moved-out' ? 2 : `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                                        width: p.kind === 'moved-out' ? 'calc(100% - 4px)' : `calc(${100 / p.lanes}% - 4px)`,
                                        pointerEvents: dragging ? 'none' : undefined,
                                        opacity: dragged?.key === p.key ? 0.6 : undefined,
                                    }}
                                >
                                    <div className="flex items-start justify-between">
                                        <span className="font-bold text-slate-800 dark:text-slate-200">{p.course.code}{p.section ? ` ${isTH ? 'ตอน' : 'sec'} ${p.section.sectionNumber}` : ''}</span>
                                        {editable && <GripVertical className="h-3 w-3 text-slate-400" />}
                                    </div>
                                    <div className="text-slate-600 dark:text-slate-300">{formatMinutes(p.start)}–{formatMinutes(p.end)}</div>
                                    {p.kind === 'moved-out' && p.move && <div className="text-slate-600 dark:text-slate-300">{isTH ? 'ย้ายไป' : 'Moved to'} {p.move.newDate} {p.move.newStart}</div>}
                                    {p.kind === 'moved-in' && p.move && <div className="text-orange-700 dark:text-orange-300">{isTH ? 'ย้ายมาจาก' : 'Moved from'} {p.move.originalDate} {p.move.originalStart}</div>}
                                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400"><MapPin className="h-3 w-3" />{p.slot.room || p.section?.room || '-'}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
            <RescheduleDialog
                open={!!pending}
                onOpenChange={(open) => { if (!open) setPending(null); }}
                courseCode={pending?.slot.course.code ?? ''}
                fromLabel={pending ? label(pending.slot.day, pending.slot.start, pending.slot.end) : ''}
                toLabel={pending ? label(pending.day, pending.start, pending.start + (pending.slot.end - pending.slot.start)) : ''}
                onConfirm={() => { if (pending) onMove(pending.slot, pending.day, pending.start); setPending(null); }}
            />
        </>
    );
}
