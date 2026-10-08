import { z } from 'zod';

const optionalUrl = z.union([
  z.literal(''),
  z.string().url('รูปแบบ URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย http:// หรือ https://)'),
]).optional();

const optionalEmail = z.union([
  z.literal(''),
  z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
]).optional();

// Base user schema shared across roles
export const baseUserSchema = z.object({
  name: z.string().min(2, 'กรุณากรอกชื่อ-นามสกุล (ภาษาอังกฤษอย่างน้อย 2 ตัวอักษร)'),
  nameThai: z.string().min(2, 'กรุณากรอกชื่อ-นามสกุล (ภาษาไทยอย่างน้อย 2 ตัวอักษร)'),
  email: z.string().email('รูปแบบอีเมลไม่ถูกต้อง'),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

// 1. Student Schema
export const studentUserSchema = baseUserSchema.extend({
  studentId: z
    .string()
    .min(1, 'กรุณากรอกรหัสนักศึกษา')
    .regex(/^\d{8,9}$/, 'รหัสนักศึกษาต้องเป็นตัวเลข 8-9 หลัก (เช่น 652110001)'),
  major: z.string().min(1, 'กรุณาระบุสาขาวิชา'),
  program: z.string().min(1, 'กรุณาระบุหลักสูตร'),
  year: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกชั้นปีเป็นตัวเลข' })
    .min(1, 'ชั้นปีต้องอยู่ระหว่าง 1-6')
    .max(6, 'ชั้นปีต้องอยู่ระหว่าง 1-6'),
  semester: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกภาคเรียนเป็นตัวเลข' })
    .min(1, 'ภาคการศึกษาต้องอยู่ระหว่าง 1-3')
    .max(3, 'ภาคการศึกษาต้องอยู่ระหว่าง 1-3'),
  academicYear: z.string().min(4, 'กรุณาระบุปีการศึกษา (เช่น 2568)'),
  /** lecturer profile id; '' = no advisor */
  advisorId: z.string().default(''),
});
export type StudentUserFormValues = z.infer<typeof studentUserSchema>;

// 2. Lecturer Schema
export const lecturerUserSchema = baseUserSchema.extend({
  lecturerId: z.string().optional().or(z.literal('')),
  department: z.string().min(1, 'กรุณาระบุภาควิชา / หน่วยงาน'),
  position: z.string().min(1, 'กรุณาระบุตำแหน่งทางวิชาการ (เช่น อาจารย์, ผศ.)'),
});
export type LecturerUserFormValues = z.infer<typeof lecturerUserSchema>;

// 3. Staff Schema
export const staffUserSchema = baseUserSchema.extend({
  staffId: z.string().optional().or(z.literal('')),
  department: z.string().min(1, 'กรุณาระบุฝ่าย / หน่วยงานสังกัด'),
  position: z.string().min(1, 'กรุณาระบุตำแหน่งหน้าที่'),
});
export type StaffUserFormValues = z.infer<typeof staffUserSchema>;

// 4. Company Schema
export const companyUserSchema = z.object({
  companyName: z.string().min(2, 'กรุณากรอกชื่อบริษัท (English)'),
  companyNameThai: z.string().min(2, 'กรุณากรอกชื่อบริษัท (ไทย)'),
  email: z.string().email('รูปแบบอีเมลบริษัทไม่ถูกต้อง'),
  phone: z.string().optional().or(z.literal('')),
  password: z.string().min(8, 'รหัสผ่านต้องมีความยาวอย่างน้อย 8 ตัวอักษร').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
  companyId: z.string().optional().or(z.literal('')),
  industry: z.string().min(1, 'กรุณาระบุกลุ่มอุตสาหกรรม'),
  size: z.enum(['small', 'medium', 'large']).default('small'),
  website: optionalUrl,
  address: z.string().optional().or(z.literal('')),
  locationMapUrl: optionalUrl,
  productsServices: z.string().optional().or(z.literal('')),
  contactPersonName: z.string().optional().or(z.literal('')),
  contactPersonRole: z.string().optional().or(z.literal('')),
  contactPersonEmail: optionalEmail,
  contactPersonPhone: z.string().optional().or(z.literal('')),
  socialMedia: z.string().optional().or(z.literal('')),
});
export type CompanyUserFormValues = z.infer<typeof companyUserSchema>;
