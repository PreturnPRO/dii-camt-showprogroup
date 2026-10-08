import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentUserSchema, type StudentUserFormValues } from '@/schemas/user-forms.schema';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/api';
import { asArray, asRecord, asString } from '@/lib/live-data';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { UserRow } from '../types';

interface StudentUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: StudentUserFormValues) => Promise<void>;
  initialData?: UserRow | null;
  isSubmitting?: boolean;
}

const defaultValues: StudentUserFormValues = {
  studentId: '',
  name: '',
  nameThai: '',
  email: '',
  phone: '',
  major: 'Digital Industry Integration',
  program: 'bachelor',
  year: 1,
  semester: 1,
  academicYear: '2569',
  status: 'active',
  password: '',
  advisorId: '',
};

// Radix Select has no empty value; this stands for "no advisor"
const NO_ADVISOR = 'none';

export function StudentUserDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting = false,
}: StudentUserDialogProps) {
  const form = useForm<StudentUserFormValues>({
    resolver: zodResolver(studentUserSchema),
    defaultValues,
  });
  const [lecturers, setLecturers] = React.useState<Array<{ id: string; name: string }>>([]);
  const [lecturersFailed, setLecturersFailed] = React.useState(false);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    api.lecturers.list()
      .then((response) => {
        if (!mounted) return;
        setLecturersFailed(false);
        setLecturers(asArray(response.lecturers).map((item) => {
          const lecturer = asRecord(item);
          const user = asRecord(lecturer.user);
          return { id: asString(lecturer.id), name: asString(user.nameThai, asString(user.name, '-')) };
        }).filter((lecturer) => lecturer.id));
      })
      .catch(() => { if (mounted) setLecturersFailed(true); });
    return () => { mounted = false; };
  }, [open]);

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          studentId: initialData.identifier || '',
          // the English field must hold the English name, not the Thai display name
          name: initialData.nameEn ?? initialData.name ?? '',
          nameThai: initialData.nameThai || initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          major: initialData.major || 'Digital Industry Integration',
          program: initialData.program || 'bachelor',
          year: Number(initialData.year ?? 1),
          semester: Number(initialData.semester ?? 1),
          academicYear: initialData.academicYear || '2569',
          status: initialData.isActive === false ? 'inactive' : 'active',
          password: '',
          advisorId: initialData.advisorId ?? '',
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = async (values: StudentUserFormValues) => {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  const isEditing = Boolean(initialData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `แก้ไขข้อมูลของ ${initialData?.name || initialData?.studentId}`
              : 'กรอกข้อมูลนักศึกษาเพื่อสร้างบัญชีผู้ใช้งานใหม่ในระบบ'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="studentId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสนักศึกษา *</FormLabel>
                    <FormControl>
                      <Input placeholder="652110001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>อีเมลมหาวิทยาลัย *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="student@cmu.ac.th"
                        {...field}
                        disabled={isEditing}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameThai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล (ภาษาไทย) *</FormLabel>
                    <FormControl>
                      <Input placeholder="สมชาย ใจดี" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Somchai Jaidee" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์</FormLabel>
                    <FormControl>
                      <Input placeholder="0812345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>สถานะบัญชี</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกสถานะ" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active (เปิดใช้งาน)</SelectItem>
                        <SelectItem value="inactive">Inactive (ระงับชั่วคราว)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="major"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>สาขาวิชา *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digital Industry Integration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="program"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>หลักสูตร *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกหลักสูตร" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="bachelor">ปริญญาตรี (Bachelor)</SelectItem>
                        <SelectItem value="master">ปริญญาโท (Master)</SelectItem>
                        <SelectItem value="doctoral">ปริญญาเอก (Doctoral)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-3 gap-2 sm:col-span-2">
                <FormField
                  control={form.control}
                  name="year"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ชั้นปี *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={6} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="semester"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ภาคเรียน *</FormLabel>
                      <FormControl>
                        <Input type="number" min={1} max={3} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="academicYear"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>ปีการศึกษา *</FormLabel>
                      <FormControl>
                        <Input placeholder="2569" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="advisorId"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>อาจารย์ที่ปรึกษา</FormLabel>
                    <Select onValueChange={(value) => field.onChange(value === NO_ADVISOR ? '' : value)} value={field.value || NO_ADVISOR}>
                      <FormControl>
                        <SelectTrigger aria-label="อาจารย์ที่ปรึกษา">
                          <SelectValue placeholder="เลือกอาจารย์ที่ปรึกษา" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={NO_ADVISOR}>ยังไม่มีอาจารย์ที่ปรึกษา</SelectItem>
                        {/* the saved advisor while the list loads (or if it failed), so it never looks like "none" */}
                        {field.value && !lecturers.some((lecturer) => lecturer.id === field.value) && (
                          <SelectItem value={field.value}>{lecturersFailed ? 'อาจารย์ที่ปรึกษาเดิม (โหลดชื่อไม่สำเร็จ)' : 'กำลังโหลดชื่ออาจารย์...'}</SelectItem>
                        )}
                        {lecturers.map((lecturer) => (
                          <SelectItem key={lecturer.id} value={lecturer.id}>{lecturer.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {lecturersFailed && <p className="text-xs text-rose-600 dark:text-rose-400">โหลดรายชื่ออาจารย์ไม่สำเร็จ — ปิดแล้วเปิดหน้าต่างนี้ใหม่</p>}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isSubmitting}
              >
                ยกเลิก
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกข้อมูล'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
