import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useLanguage } from '@/contexts/LanguageContext';
import type { Course } from '@/types';
import type { LecturerOption } from '@/hooks/queries/useCourseQueries';

export type CourseFormState = {
  code: string;
  name: string;
  nameThai: string;
  credits: string;
  semester: string;
  academicYear: string;
  year: string;
  lecturerId: string;
  maxStudents: string;
  minStudents: string;
  description: string;
  syllabus: string;
};

interface CourseFormDialogProps {
  isOpen: boolean;
  editingCourse: Course | null;
  courseForm: CourseFormState | null;
  lecturers: LecturerOption[];
  isSaving: boolean;
  onUpdateForm: (field: keyof CourseFormState, value: string) => void;
  onClose: () => void;
  onSave: () => Promise<void>;
}

export function CourseFormDialog({
  isOpen,
  editingCourse,
  courseForm,
  lecturers,
  isSaving,
  onUpdateForm,
  onClose,
  onSave,
}: CourseFormDialogProps) {
  const { language } = useLanguage();

  if (!isOpen || !courseForm) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl dark:border-slate-800">
        <DialogHeader>
          <DialogTitle>
            {editingCourse
              ? language === 'th' ? 'แก้ไขรายวิชา' : 'Edit course'
              : language === 'th' ? 'เพิ่มรายวิชา' : 'Add course'}
          </DialogTitle>
          <DialogDescription>
            {editingCourse
              ? `${editingCourse.code} ${editingCourse.name}`
              : language === 'th' ? 'กรอกรายละเอียดรายวิชาใหม่' : 'Enter the new course details'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="course-code">{language === 'th' ? 'รหัสวิชา' : 'Code'}</Label>
            <Input
              id="course-code"
              value={courseForm.code}
              onChange={(event) => onUpdateForm('code', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-credits">{language === 'th' ? 'หน่วยกิต' : 'Credits'}</Label>
            <Input
              id="course-credits"
              type="number"
              min="1"
              value={courseForm.credits}
              onChange={(event) => onUpdateForm('credits', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-name">{language === 'th' ? 'ชื่ออังกฤษ' : 'English name'}</Label>
            <Input
              id="course-name"
              value={courseForm.name}
              onChange={(event) => onUpdateForm('name', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-name-th">{language === 'th' ? 'ชื่อไทย' : 'Thai name'}</Label>
            <Input
              id="course-name-th"
              value={courseForm.nameThai}
              onChange={(event) => onUpdateForm('nameThai', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-semester">{language === 'th' ? 'ภาคเรียน' : 'Semester'}</Label>
            <Input
              id="course-semester"
              type="number"
              min="1"
              value={courseForm.semester}
              onChange={(event) => onUpdateForm('semester', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-year">{language === 'th' ? 'ปีการศึกษา' : 'Academic year'}</Label>
            <Input
              id="course-year"
              value={courseForm.academicYear}
              onChange={(event) => onUpdateForm('academicYear', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-level">{language === 'th' ? 'ชั้นปี' : 'Year level'}</Label>
            <Input
              id="course-level"
              type="number"
              min="1"
              value={courseForm.year}
              onChange={(event) => onUpdateForm('year', event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="course-max">{language === 'th' ? 'จำนวนนักศึกษาสูงสุด' : 'Max students'}</Label>
            <Input
              id="course-max"
              type="number"
              min="1"
              value={courseForm.maxStudents}
              onChange={(event) => onUpdateForm('maxStudents', event.target.value)}
            />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="course-lecturer">{language === 'th' ? 'ผู้สอน' : 'Instructor'}</Label>
            <Select value={courseForm.lecturerId} onValueChange={(value) => onUpdateForm('lecturerId', value)}>
              <SelectTrigger id="course-lecturer">
                <SelectValue placeholder={language === 'th' ? 'เลือกผู้สอน' : 'Choose instructor'} />
              </SelectTrigger>
              <SelectContent>
                {lecturers.map((lecturer) => (
                  <SelectItem key={lecturer.id} value={lecturer.id}>
                    {lecturer.name} ({lecturer.lecturerId || lecturer.id})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="course-description">{language === 'th' ? 'คำอธิบายรายวิชา' : 'Description'}</Label>
            <Textarea
              id="course-description"
              value={courseForm.description}
              onChange={(event) => onUpdateForm('description', event.target.value)}
            />
          </div>
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="course-syllabus">Syllabus</Label>
            <Textarea
              id="course-syllabus"
              value={courseForm.syllabus}
              onChange={(event) => onUpdateForm('syllabus', event.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            {language === 'th' ? 'ยกเลิก' : 'Cancel'}
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving
              ? language === 'th' ? 'กำลังบันทึก...' : 'Saving...'
              : language === 'th' ? 'บันทึก' : 'Save'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
