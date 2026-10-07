import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { companyUserSchema, type CompanyUserFormValues } from '@/schemas/user-forms.schema';
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
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import type { UserRow } from '../types';

interface CompanyUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CompanyUserFormValues) => Promise<void>;
  initialData?: UserRow | null;
  isSubmitting?: boolean;
}

const defaultValues: CompanyUserFormValues = {
  companyName: '',
  companyNameThai: '',
  email: '',
  phone: '',
  password: '',
  status: 'active',
  companyId: '',
  industry: 'Technology',
  size: 'small',
  website: '',
  address: '',
  locationMapUrl: '',
  productsServices: '',
  contactPersonName: '',
  contactPersonRole: 'HR / Company Coordinator',
  contactPersonEmail: '',
  contactPersonPhone: '',
  socialMedia: '',
};

export function CompanyUserDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting = false,
}: CompanyUserDialogProps) {
  const form = useForm<CompanyUserFormValues>({
    resolver: zodResolver(companyUserSchema),
    defaultValues,
  });

  useEffect(() => {
    if (open) {
      if (initialData) {
        const companyName = initialData.companyName || initialData.name || '';
        const companyNameThai =
          initialData.companyNameThai || initialData.nameThai || companyName;

        const size =
          initialData.size === 'medium' || initialData.size === 'large'
            ? initialData.size
            : 'small';

        form.reset({
          companyName,
          companyNameThai,
          email: initialData.email || '',
          phone: initialData.phone || '',
          password: '',
          status: initialData.isActive === false ? 'inactive' : 'active',
          companyId: initialData.identifier || '',
          industry: initialData.industry || 'Technology',
          size,
          website: initialData.website || '',
          address: initialData.address || '',
          locationMapUrl: initialData.locationMapUrl || '',
          productsServices: initialData.productsServices || '',
          contactPersonName: initialData.contactPersonName || '',
          contactPersonRole: initialData.contactPersonRole || 'HR / Company Coordinator',
          contactPersonEmail: initialData.contactPersonEmail || '',
          contactPersonPhone: initialData.contactPersonPhone || '',
          socialMedia: initialData.socialMedia || '',
        });
      } else {
        form.reset(defaultValues);
      }
    }
  }, [open, initialData, form]);

  const handleSubmit = async (values: CompanyUserFormValues) => {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  const isEditing = Boolean(initialData);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'แก้ไขข้อมูลสถานประกอบการ' : 'เพิ่มสถานประกอบการใหม่'}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? `แก้ไขข้อมูลของ ${initialData?.companyNameThai || initialData?.companyName}`
              : 'กรอกข้อมูลสถานประกอบการเพื่อสร้างบัญชีองค์กรใหม่ในระบบ'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="companyId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>รหัสบริษัท</FormLabel>
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
                    <FormLabel>อีเมลบริษัท *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="contact@company.com"
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
                name="companyNameThai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อบริษัท (ภาษาไทย) *</FormLabel>
                    <FormControl>
                      <Input placeholder="บริษัท เทคโนโลยี จำกัด" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="companyName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อบริษัท (English) *</FormLabel>
                    <FormControl>
                      <Input placeholder="Technology Co., Ltd." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>กลุ่มอุตสาหกรรม *</FormLabel>
                    <FormControl>
                      <Input placeholder="Technology / Software / AI" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="size"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ขนาดองค์กร *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="เลือกขนาดองค์กร" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="small">ธุรกิจขนาดเล็ก (Small 1-50 คน)</SelectItem>
                        <SelectItem value="medium">ธุรกิจขนาดกลาง (Medium 51-200 คน)</SelectItem>
                        <SelectItem value="large">ธุรกิจขนาดใหญ่ (Large 200+ คน)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เบอร์โทรศัพท์ติดต่อ</FormLabel>
                    <FormControl>
                      <Input placeholder="021234567" {...field} />
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
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>เว็บไซต์บริษัท</FormLabel>
                    <FormControl>
                      <Input placeholder="https://example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="locationMapUrl"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Google Maps URL</FormLabel>
                    <FormControl>
                      <Input placeholder="https://maps.google.com/..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>ที่อยู่สำนักงาน</FormLabel>
                    <FormControl>
                      <Input placeholder="เลขที่ อาคาร ถนน ตำบล อำเภอ จังหวัด" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="productsServices"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>สินค้า / บริการ / อุตสาหกรรมดิจิทัล</FormLabel>
                    <FormControl>
                      <Textarea placeholder="รายละเอียดสินค้าและบริการที่องค์กรดำเนินการ" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-2 pt-2 border-t">
                <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3">
                  ข้อมูลผู้ประสานงาน (Coordinator / HR)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPersonName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ชื่อผู้ประสานงาน</FormLabel>
                        <FormControl>
                          <Input placeholder="คุณสมศรี ประสานงาน" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPersonRole"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>ตำแหน่งผู้ประสานงาน</FormLabel>
                        <FormControl>
                          <Input placeholder="HR / Talent Acquisition" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPersonEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>อีเมลผู้ประสานงาน</FormLabel>
                        <FormControl>
                          <Input placeholder="hr@company.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="contactPersonPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>เบอร์โทรศัพท์ผู้ประสานงาน</FormLabel>
                        <FormControl>
                          <Input placeholder="0891234567" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="socialMedia"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Social Media / Line ID</FormLabel>
                        <FormControl>
                          <Input placeholder="@company_line / facebook.com/company" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
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
