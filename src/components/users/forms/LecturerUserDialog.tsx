import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { lecturerUserSchema, type LecturerUserFormValues } from '@/schemas/user-forms.schema';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { UserRow } from '../types';

interface LecturerUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: LecturerUserFormValues) => Promise<void>;
  initialData?: UserRow | null;
  isSubmitting?: boolean;
}

const defaultValues: LecturerUserFormValues = {
  lecturerId: '',
  name: '',
  nameThai: '',
  email: '',
  phone: '',
  department: 'Digital Industry Integration',
  position: 'Lecturer',
  status: 'active',
  password: '',
};

export function LecturerUserDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting = false,
}: LecturerUserDialogProps) {
  const form = useForm<LecturerUserFormValues>({
    resolver: zodResolver(lecturerUserSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        form.reset({
          lecturerId: initialData.identifier || '',
          name: initialData.name || '',
          nameThai: initialData.nameThai || initialData.name || '',
          email: initialData.email || '',
          phone: initialData.phone || '',
          department: initialData.department || 'Digital Industry Integration',
          position: initialData.position || 'Lecturer',
          status: initialData.isActive === false ? 'inactive' : 'active',
          password: '',
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = async (values: LecturerUserFormValues) => {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  const isEditing = Boolean(initialData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'แก้ไขข้อมูลอาจารย์' : 'เพิ่มอาจารย์ใหม่'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `แก้ไขข้อมูลของ ${initialData?.name || initialData?.lecturerId}`
              : 'กรอกข้อมูลอาจารย์ผู้สอนเพื่อสร้างบัญชีผู้ใช้งานใหม่ในระบบ'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="lecturerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสอาจารย์</FormLabel>
                    <FormControl>
                      <Input placeholder="เว้นว่างเพื่อให้ระบบสร้างให้อัตโนมัติ" {...field} />
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
                        placeholder="lecturer@cmu.ac.th"
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
                      <Input placeholder="อ.ดร. สมชาย ใจดี" {...field} />
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
                      <Input placeholder="Dr. Somchai Jaidee" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ภาควิชา / หน่วยงาน *</FormLabel>
                    <FormControl>
                      <Input placeholder="Digital Industry Integration" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ตำแหน่งทางวิชาการ *</FormLabel>
                    <FormControl>
                      <Input placeholder="อาจารย์ / ผศ.ดร." {...field} />
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
