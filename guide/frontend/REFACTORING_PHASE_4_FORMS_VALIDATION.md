# แผนการปรับปรุงโครงสร้าง Frontend — Phase 4: Forms Architecture & Type Safety with Zod
## ยกเครื่อง Form Handling ด้วย React Hook Form + Zod: แยก Role Dialogs ในหน้า Users สู่มาตรฐานสากล

> **เอกสารอ้างอิงหลัก**: [REFACTORING_ROADMAP_OVERVIEW.md](file:///D:/Project/dii-camt-showprogroup/guide/frontend/REFACTORING_ROADMAP_OVERVIEW.md)  
> **ความเร่งด่วน**: 🟢 **Medium Priority**  
> **ผลกระทบ**: แก้ไข Mega-Form State 30 ฟิลด์ในหน้า Users, มี Inline Error Validation ใต้ช่องกรอกที่แม่นยำ และป้องกันข้อมูลผิดพลาดส่งไป Backend 100%

---

## 🎯 วัตถุประสงค์ของ Phase 4

ปัจจุบันในระบบมีการติดตั้งไลบรารีฟอร์มระดับมาตรฐานไว้อยู่แล้ว ได้แก่ `react-hook-form`, `zod`, และ `@hookform/resolvers` แต่ในหน้าสำคัญอย่าง **[src/pages/Users.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Users.tsx)** (824 บรรทัด) กลับใช้รูปแบบ:
1. รวมฟิลด์ข้อมูลของ **4 บทบาท (Student, Lecturer, Staff, Company)** กว่า 30 ฟิลด์ ไว้ใน Object เดียวกัน (`UserFormData`)
2. ตรวจสอบความถูกต้องด้วยคำสั่ง `if (!formData.name) toast.error(...)` เรียงกันนับสิบบรรทัดในฟังก์ชัน `handleSubmit`
3. ผู้ใช้มองไม่เห็นว่ากรอกฟิลด์ไหนผิด เพราะไม่มี Inline Error Message สีแดงใต้กล่อง Input

เป้าหมายของเฟสนี้คือ:
1. สร้าง **Zod Validation Schema** แยกเฉพาะสำหรับแต่ละบทบาท
2. แยก Modal Dialog ออกเป็น **Role-Specific Form Dialogs**
3. ใช้งาน `useForm` คู่กับ `zodResolver` และ Shadcn UI `<Form>` เพื่อให้แสดงผล Error ได้อย่างสวยงาม

---

## 🏗️ โครงสร้างสถาปัตยกรรมใหม่ (Target Directory Structure)

```text
src/
├── schemas/
│   └── user-forms.schema.ts     <-- Zod Schemas สำหรับแต่ละ Role
└── components/
    └── users/
        ├── forms/
        │   ├── StudentUserDialog.tsx    <-- ฟอร์มสร้าง/แก้ไข นักศึกษา (~150 บรรทัด)
        │   ├── LecturerUserDialog.tsx   <-- ฟอร์มสร้าง/แก้ไข อาจารย์ (~120 บรรทัด)
        │   ├── CompanyUserDialog.tsx    <-- ฟอร์มสร้าง/แก้ไข บริษัท (~160 บรรทัด)
        │   └── StaffUserDialog.tsx      <-- ฟอร์มสร้าง/แก้ไข เจ้าหน้าที่ (~100 บรรทัด)
        └── UserTableList.tsx            <-- ตารางแสดงผลผู้ใช้งานแยกตาม Tabs
```

---

## 🛠️ รายการปฏิบัติการ (Action Items)

---

### รายการที่ 4.1: สร้าง Zod Validation Schemas แยกราย Role

* **สร้างไฟล์ใหม่**: `src/schemas/user-forms.schema.ts`
* **ประโยชน์**: กำหนดกฎการ Validate ที่ชัดเจน เช่น รูปแบบ Email, รหัสนักศึกษา, เบอร์โทรศัพท์

```ts
// src/schemas/user-forms.schema.ts
import { z } from 'zod';

// Base Schema ที่ทุก Role มีร่วมกัน
const baseUserSchema = z.object({
  name: z.string().min(2, 'กรุณากรอกชื่อ-นามสกุล (ภาษาอังกฤษ)'),
  nameThai: z.string().min(2, 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทย)'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().min(9, 'เบอร์โทรศัพท์ต้องมีความยาวอย่างน้อย 9 หลัก').optional().or(z.literal('')),
  password: z.string().min(8, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร').optional(),
});

// 1. Schema สำหรับนักศึกษา
export const studentUserSchema = baseUserSchema.extend({
  studentId: z.string().regex(/^\d{9}$/, 'รหัสนักศึกษาต้องเป็นตัวเลข 9 หลัก (เช่น 652110001)'),
  major: z.string().min(1, 'กรุณาเลือกสาขาวิชา'),
  program: z.enum(['bachelor', 'master', 'doctoral']),
  year: z.coerce.number().min(1).max(6),
  semester: z.coerce.number().min(1).max(3),
  academicYear: z.string().min(4, 'กรุณากรอกปีการศึกษา เช่น 2568'),
});
export type StudentUserFormValues = z.infer<typeof studentUserSchema>;

// 2. Schema สำหรับอาจารย์
export const lecturerUserSchema = baseUserSchema.extend({
  department: z.string().min(1, 'กรุณากรอกภาควิชา'),
  position: z.string().min(1, 'กรุณาระบุตำแหน่งทางวิชาการ (เช่น ผศ., อ.)'),
});
export type LecturerUserFormValues = z.infer<typeof lecturerUserSchema>;

// 3. Schema สำหรับสถานประกอบการ (Company)
export const companyUserSchema = baseUserSchema.extend({
  companyName: z.string().min(2, 'กรุณากรอกชื่อบริษัท (English)'),
  companyNameThai: z.string().min(2, 'กรุณากรอกชื่อบริษัท (ไทย)'),
  industry: z.string().min(1, 'กรุณาระบุกลุ่มอุตสาหกรรม'),
  size: z.enum(['small', 'medium', 'large']),
  website: z.string().url('รูปแบบ URL ไม่ถูกต้อง').optional().or(z.literal('')),
  contactPersonName: z.string().min(2, 'กรุณาระบุชื่อผู้ประสานงาน'),
  contactPersonPhone: z.string().min(9, 'กรุณาระบุเบอร์ติดต่อผู้ประสานงาน'),
});
export type CompanyUserFormValues = z.infer<typeof companyUserSchema>;
```

---

### รายการที่ 4.2: สร้าง Component `StudentUserDialog.tsx` ด้วย React Hook Form

* **สร้างไฟล์ใหม่**: `src/components/users/forms/StudentUserDialog.tsx`
* **ตัวอย่างโค้ดที่สะอาดและมี Type-Safety 100%**:

```tsx
// src/components/users/forms/StudentUserDialog.tsx
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { studentUserSchema, type StudentUserFormValues } from '@/schemas/user-forms.schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface StudentUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: StudentUserFormValues) => Promise<void>;
  initialData?: Partial<StudentUserFormValues> | null;
  isSubmitting?: boolean;
}

export function StudentUserDialog({
  open,
  onOpenChange,
  onSubmit,
  initialData,
  isSubmitting = false,
}: StudentUserDialogProps) {
  const form = useForm<StudentUserFormValues>({
    resolver: zodResolver(studentUserSchema),
    defaultValues: {
      name: initialData?.name || '',
      nameThai: initialData?.nameThai || '',
      email: initialData?.email || '',
      studentId: initialData?.studentId || '',
      major: initialData?.major || 'DII',
      program: initialData?.program || 'bachelor',
      year: initialData?.year || 1,
      semester: initialData?.semester || 1,
      academicYear: initialData?.academicYear || '2568',
      phone: initialData?.phone || '',
    },
  });

  const handleSubmit = async (values: StudentUserFormValues) => {
    await onSubmit(values);
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? 'แก้ไขข้อมูลนักศึกษา' : 'เพิ่มนักศึกษาใหม่'}</DialogTitle>
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
                    <FormControl><Input placeholder="652110001" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="student@cmu.ac.th" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nameThai"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ชื่อ-นามสกุล (ไทย) *</FormLabel>
                    <FormControl><Input placeholder="สมชาย ใจดี" {...field} /></FormControl>
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
                    <FormControl><Input placeholder="Somchai Jaidee" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
```

---

### รายการที่ 4.3: ลดรูปหน้า `src/pages/Users.tsx` ให้เป็น Clean Master Controller

หลังแยก Dialog ออกเป็น `StudentUserDialog`, `LecturerUserDialog`, และ `CompanyUserDialog` แล้ว:
* ตัด `UserFormData` 30 ฟิลด์ทิ้งทั้งหมด
* ตัด Validation if-else 10 ชั้นทิ้งทั้งหมด
* ใน `Users.tsx` จะเหลือเพียงตัวจัดการ Table, Search, Filter และการเปิด/ปิด Dialog ของ Role ที่ผู้ใช้กดปุ่มเลือก
* **ผลลัพธ์**: ขนาดไฟล์ `Users.tsx` จะลดลงจาก **824 บรรทัด เหลือเพียงประมาณ 280 บรรทัด**

---

## ✅ เกณฑ์การตรวจสอบความสำเร็จของ Phase 4 (Verification Checklist)

- [ ] เปิด Modal เพิ่มนักศึกษาแล้วกดบันทึกโดยไม่กรอกข้อมูล: ช่องรหัสนักศึกษา, อีเมล และชื่อ ต้องแสดงข้อความเตือนสีแดงด้านล่างทันที
- [ ] กรอกรหัสนักศึกษาเป็นตัวอักษรหรือความยาวไม่ถึง 9 หลัก: Zod ต้องดักจับและขึ้นข้อความแจ้งเตือนทันที
- [ ] ทดสอบสร้างผู้ใช้ครบทั้ง 4 บทบาท (Student, Lecturer, Staff, Company): ข้อมูลถูกส่งไป Backend และบันทึกผ่าน API ได้ถูกต้อง
- [ ] รันคำสั่งตรวจสอบ:
  ```bash
  npm run typecheck
  npm run build
  ```
  ต้องผ่าน 100% ปราศจาก Type Warning หรือ Build Error

---

## 🏆 ผลลัพธ์สุดท้ายเมื่อเสร็จสิ้นครบทั้ง 4 Phases

1. **โครงสร้างสะอาด (Clean Architecture)**: ไม่มีไฟล์ขนาดยักษ์เกิน 400 บรรทัดเหลืออยู่ในระบบ
2. **ประสิทธิภาพสูง (High Performance)**: ปัญหา Double Mount บน Dashboard หมดไป โค้ดดึงข้อมูลผ่าน Cache ของ TanStack Query หน้าเว็บโหลดเร็วขึ้นเท่าตัว
3. **ข้อมูลถูกต้อง 100%**: ตัด Mock Data ปนเปื้อนใน `InternTracking.tsx` ออก เชื่อมต่อฐานข้อมูลจริงพร้อม Empty State
4. **ความปลอดภัยของข้อมูล (Type-Safe Forms)**: ทุกฟอร์มผ่านการตรวจสอบด้วย Zod ป้องกันความผิดพลาดของข้อมูลในระดับ Frontend ก่อนส่งไปยัง Backend API
