import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DAY_KEYS, DAY_LABELS } from '@/lib/timetable';
import { emptySection, type FormSection } from '@/lib/course-form';

type Props = {
  sections: FormSection[];
  onChange: (sections: FormSection[]) => void;
  disabled?: boolean;
  language: 'th' | 'en';
};

/** every section of a course, each with its own seats, room and weekly classes (G4: no more single section) */
export function SectionsEditor({ sections, onChange, disabled, language }: Props) {
  const th = language === 'th';
  const update = (index: number, next: Partial<FormSection>) =>
    onChange(sections.map((section, i) => (i === index ? { ...section, ...next } : section)));

  return (
    <div className="space-y-4" data-testid="sections-editor">
      {sections.map((section, index) => (
        <div key={index} data-testid="section-row" className="space-y-3 rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <div className="flex flex-wrap items-end gap-3">
            <div className="w-24 space-y-1">
              <Label htmlFor={`section-number-${index}`} className="text-xs">{th ? 'ตอน' : 'Section'}</Label>
              <Input id={`section-number-${index}`} data-testid="section-number" disabled={disabled} value={section.number} onChange={(e) => update(index, { number: e.target.value })} />
            </div>
            <div className="w-28 space-y-1">
              <Label htmlFor={`section-max-${index}`} className="text-xs">{th ? 'รับสูงสุด' : 'Max seats'}</Label>
              <Input id={`section-max-${index}`} type="number" min="1" disabled={disabled} value={section.maxStudents} onChange={(e) => update(index, { maxStudents: Number(e.target.value) })} />
            </div>
            <div className="min-w-40 flex-1 space-y-1">
              <Label htmlFor={`section-room-${index}`} className="text-xs">{th ? 'ห้องเรียน (ข้อความ)' : 'Room (text)'}</Label>
              <Input id={`section-room-${index}`} disabled={disabled} placeholder={section.facilityId ? (th ? 'ใช้ห้องที่จองไว้' : 'Booked room') : 'CAMT 113'} value={section.room} onChange={(e) => update(index, { room: e.target.value })} />
            </div>
            {section.facilityId && (
              <Button type="button" variant="outline" size="sm" disabled={disabled} data-testid="section-release-room"
                onClick={() => update(index, { facilityId: undefined })}>
                {th ? 'ยกเลิกห้องที่จอง' : 'Release booked room'}
              </Button>
            )}
            {sections.length > 1 && (
              <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={th ? `ลบตอน ${section.number}` : `Remove section ${section.number}`} onClick={() => onChange(sections.filter((_, i) => i !== index))}>
                <Trash2 className="h-4 w-4 text-rose-500" />
              </Button>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{th ? 'คาบเรียนรายสัปดาห์ (ไม่มี = ยังไม่กำหนด)' : 'Weekly classes (none = not set yet)'}</p>
            {section.slots.map((slot, slotIndex) => (
              <div key={slotIndex} data-testid="section-slot" className="flex flex-wrap items-center gap-2">
                <select
                  aria-label={th ? 'วัน' : 'Day'}
                  disabled={disabled}
                  value={slot.day}
                  onChange={(e) => update(index, { slots: section.slots.map((s, i) => (i === slotIndex ? { ...s, day: e.target.value } : s)) })}
                  className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm dark:border-slate-700 dark:bg-slate-950"
                >
                  {DAY_KEYS.map((day) => <option key={day} value={day}>{DAY_LABELS[day][th ? 'th' : 'en']}</option>)}
                </select>
                <Input aria-label={th ? 'เวลาเริ่ม' : 'Start'} type="time" disabled={disabled} className="h-9 w-28" value={slot.startTime}
                  onChange={(e) => update(index, { slots: section.slots.map((s, i) => (i === slotIndex ? { ...s, startTime: e.target.value } : s)) })} />
                <span className="text-slate-400">–</span>
                <Input aria-label={th ? 'เวลาเลิก' : 'End'} type="time" disabled={disabled} className="h-9 w-28" value={slot.endTime}
                  onChange={(e) => update(index, { slots: section.slots.map((s, i) => (i === slotIndex ? { ...s, endTime: e.target.value } : s)) })} />
                <Button type="button" variant="ghost" size="icon" disabled={disabled} aria-label={th ? 'ลบคาบนี้' : 'Remove class'}
                  onClick={() => update(index, { slots: section.slots.filter((_, i) => i !== slotIndex) })}>
                  <Trash2 className="h-4 w-4 text-slate-400" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" size="sm" disabled={disabled} data-testid="section-add-slot"
              onClick={() => update(index, { slots: [...section.slots, { day: 'monday', startTime: '09:00', endTime: '12:00' }] })}>
              <Plus className="mr-1 h-3.5 w-3.5" /> {th ? 'เพิ่มคาบ' : 'Add class'}
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" disabled={disabled} data-testid="section-add"
        onClick={() => onChange([...sections, emptySection(sections.map((s) => s.number))])}>
        <Plus className="mr-1 h-4 w-4" /> {th ? 'เพิ่มตอนเรียน' : 'Add section'}
      </Button>
    </div>
  );
}
