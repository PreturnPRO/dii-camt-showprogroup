# แผนการปรับปรุงโครงสร้าง Frontend — Phase 1: Quick Wins & Performance
## ขจัดปัญหา Double Mount, รวมศูนย์ Toast และทำความสะอาด Global Layout

> **เอกสารอ้างอิงหลัก**: [REFACTORING_ROADMAP_OVERVIEW.md](file:///D:/Project/dii-camt-showprogroup/guide/frontend/REFACTORING_ROADMAP_OVERVIEW.md)  
> **ความเร่งด่วน**: 🔴 **High Priority (เริ่มทำทันที)**  
> **ผลกระทบ**: ลดภาระ Network Requests ลง 50% ทันที, ป้องกัน Memory Leak และลดความซ้ำซ้อนของ Library

---

## 🎯 วัตถุประสงค์ของ Phase 1

ในเฟสแรกนี้ เราเน้นการปรับปรุงที่เป็น **"High Impact, Low Risk"** — คือการแก้ปัญหาประสิทธิภาพและข้อผิดพลาดเชิงโครงสร้างที่สามารถทำได้ทันทีโดยไม่ต้องรื้อ Business Logic หรือแก้ API Endpoints:
1. ป้องกันไม่ให้ React Mount ทั้ง `MobileDashboard` และ Desktop Dashboard พร้อมกัน
2. เลือกใช้ Toast Notification ตัวเดียว (`sonner`) แทนที่จะเปิดใช้งาน 2 Library ซ้อนกัน
3. รวมศูนย์ Default State Objects (เช่น `emptyStudent`) ที่ประกาศซ้ำกันใน 6 ไฟล์ ให้เป็น Single Source of Truth
4. ปลดล็อก Layout Clipping ใน `DashboardLayout.tsx` เพื่อให้ตารางข้อมูลและกราฟแสดงผลได้เต็มพื้นที่

---

## 🛠️ รายการปฏิบัติการ (Action Items)

---

### รายการที่ 1.1: แก้ปัญหา Double Mount ในหน้า Dashboard

* **ไฟล์เป้าหมาย**: [src/pages/Dashboard.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Dashboard.tsx)
* **ปัญหาเดิม**:
  โค้ดใช้คลาส Tailwind CSS เพื่อซ่อน/แสดงผล:
  ```tsx
  {/* ปัญหา: ทั้ง 2 ส่วนถูก React Render และ Mount ลง DOM ทั้งคู่ */}
  <div className="block md:hidden">
    <MobileDashboard />
  </div>
  <div className="hidden md:block">
    {renderDesktopDashboard()}
  </div>
  ```
  การทำเช่นนี้ทำให้ `useEffect` ของ `MobileDashboard` (ยิง API 4 เส้น) และ `useEffect` ของ Desktop Dashboard (ยิง API 7 เส้น) ทำงานพร้อมกันทุกครั้งที่ผู้ใช้เข้าสู่ระบบ ส่งผลให้เกิด Network Requests ซ้ำซ้อน 10–13 requests และเปลือง CPU ในการประมวลผล

* **วิธีแก้ไขที่แนะนำ**:
  สร้าง Custom Hook `useMediaQuery` เพื่อเลือกเรนเดอร์คอมโพเนนต์ที่ตรงกับขนาดหน้าจอของผู้ใช้เพียงตัวเดียว

#### ขั้นตอนการทำ:
1. สร้างไฟล์ `src/hooks/use-media-query.ts`:
```ts
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(query);
    const handler = (event: MediaQueryListEvent) => setMatches(event.matches);

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [query]);

  return matches;
}
```

2. ปรับปรุง [src/pages/Dashboard.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Dashboard.tsx):
```tsx
import { useAuth } from '@/contexts/AuthContext';
import { useMediaQuery } from '@/hooks/use-media-query';
import StudentDashboard from './dashboards/StudentDashboard';
import LecturerDashboard from './dashboards/LecturerDashboard';
import StaffDashboard from './dashboards/StaffDashboard';
import CompanyDashboard from './dashboards/CompanyDashboard';
import AdminDashboard from './dashboards/AdminDashboard';
import { MobileDashboard } from './dashboards/mobile/MobileDashboard';

export default function Dashboard() {
  const { user } = useAuth();
  const isMobile = useMediaQuery('(max-width: 767px)');

  if (!user) return null;

  // เลือกรันเฉพาะ View ของอุปกรณ์ที่เปิดจริงเท่านั้น
  if (isMobile) {
    return <MobileDashboard />;
  }

  switch (user.role) {
    case 'student':
      return <StudentDashboard />;
    case 'lecturer':
      return <LecturerDashboard />;
    case 'staff':
      return <StaffDashboard />;
    case 'company':
      return <CompanyDashboard />;
    case 'admin':
      return <AdminDashboard />;
    default:
      return <StudentDashboard />;
  }
}
```

---

### รายการที่ 1.2: รวมศูนย์ระบบ Toast Notifications เหลือเพียง Sonner

* **ไฟล์เป้าหมาย**:
  * [src/App.tsx](file:///D:/Project/dii-camt-showprogroup/src/App.tsx)
  * [src/pages/dashboards/StudentDashboard.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/dashboards/StudentDashboard.tsx)
  * [src/pages/InternTracking.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/InternTracking.tsx)
  * [src/pages/Cooperation.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Cooperation.tsx)
  * [src/pages/Settings.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Settings.tsx)
* **ปัญหาเดิม**:
  โปรเจกต์ติดตั้งระบบแจ้งเตือน 2 ค่ายไว้คู่กัน:
  - `sonner` (`import { toast } from 'sonner'`) ใช้ใน 33 หน้า
  - `@/hooks/use-toast` (Radix Toast) ใช้ใน 4 หน้า
  - ใน `App.tsx` Mount ทั้ง `<Toaster />` และ `<Toaster as Sonner />` ซ้อนกัน ทำให้ Bundle ใหญ่ขึ้นโดยไม่จำเป็น และสไตล์การแจ้งเตือนไม่สม่ำเสมอ
* **วิธีแก้ไขที่แนะนำ**:
  1. ใน 4 หน้าดังกล่าว ให้เปลี่ยนจาก `const { toast } = useToast(); toast({ title: '...' })` มาเป็น `import { toast } from 'sonner'` และใช้ `toast.success(...)` หรือ `toast.error(...)`
  2. ใน [src/App.tsx](file:///D:/Project/dii-camt-showprogroup/src/App.tsx#L1-L2) นำ `import { Toaster } from "@/components/ui/toaster"` ออก และลบ tag `<Toaster />` ออก เหลือไว้เฉพาะ Sonner:
  ```tsx
  // src/App.tsx
  import { Toaster } from "@/components/ui/sonner";
  ...
  <TooltipProvider>
    <Toaster position="top-right" richColors closeButton />
    <BrowserRouter>
  ```

---

### รายการที่ 1.3: รวมศูนย์ Constants และ Default Initial State

* **ไฟล์เป้าหมาย**:
  * [src/lib/constants/defaults.ts](file:///D:/Project/dii-camt-showprogroup/src/lib/constants/defaults.ts) *(สร้างใหม่)*
  * หน้าที่ใช้ซ้ำ: `Activities.tsx`, `Grades.tsx`, `Portfolio.tsx`, `StudentDashboard.tsx`, `MobileDashboard.tsx`, `live-mappers.ts`
* **ปัญหาเดิม**:
  มีการประกาศตัวแปร `emptyStudent` ความยาว 40 บรรทัดซ้ำกันถึง 6 แห่ง หากมีการแก้ไข Field หรือ Type ของนักศึกษาในอนาคต จะเกิดความไม่สอดคล้อง (Data Drift)
* **วิธีแก้ไขที่แนะนำ**:
  1. สร้างไฟล์ `src/lib/constants/defaults.ts`:
  ```ts
  import type { Student, Course } from '@/types';

  export const EMPTY_STUDENT: Student = {
    id: '',
    email: '',
    name: '',
    nameThai: '',
    role: 'student',
    createdAt: new Date(),
    isActive: true,
    studentId: '',
    major: '',
    program: 'bachelor',
    year: 1,
    semester: 1,
    academicYear: '',
    gpa: 0,
    gpax: 0,
    totalCredits: 0,
    earnedCredits: 0,
    requiredCredits: 0,
    academicStatus: 'normal',
    advisorName: 'ผศ.ดร. นรินทร์ พิชยกุล',
    advisorNameThai: 'ผศ.ดร. นรินทร์ พิชยกุล',
    coAdvisorName: 'ดร. วิลเลียม สมิธ',
    coAdvisorNameThai: 'ดร. วิลเลียม สมิธ',
    skills: [],
    activities: [],
    totalActivityHours: 0,
    gamificationPoints: 0,
    badges: [],
    dataConsent: {
      studentId: '',
      allowDataSharing: false,
      allowPortfolioSharing: false,
      sharedWithCompanies: [],
      emailNotifications: true,
      smsNotifications: false,
      inAppNotifications: true,
      showInLeaderboard: false,
      profileVisibility: 'private',
      consentDate: new Date(),
      lastModified: new Date(),
      history: [],
    },
    timeline: [],
  };

  export const createEmptyStudent = (index = 0): Student => ({
    ...EMPTY_STUDENT,
    id: `student-${index}`,
  });
  ```
  2. ในทั้ง 6 ไฟล์ ให้เปลี่ยนมาเป็น `import { EMPTY_STUDENT } from '@/lib/constants/defaults';`

---

### รายการที่ 1.4: ปลดล็อก Horizontal Clipping ใน DashboardLayout

* **ไฟล์เป้าหมาย**: [src/components/layout/DashboardLayout.tsx](file:///D:/Project/dii-camt-showprogroup/src/components/layout/DashboardLayout.tsx#L68-L74)
* **ปัญหาเดิม**:
  ```tsx
  <main className="flex-1 min-h-0 pt-24 sm:pt-28 pb-8 overflow-y-auto overflow-x-hidden w-full">
  ```
  คลาส `overflow-x-hidden` บังคับตัดเนื้อหาที่ล้นในแนวนอนทิ้ง ส่งผลให้ตารางข้อมูลหรือการ์ดที่มีความกว้างเกินจอ (เช่น `Timetable.tsx` หรือ ตารางตัดเกรด) ไม่สามารถมี Horizontal Scrollbar ได้ ข้อมูลจึงถูกตัดหายไป
* **วิธีแก้ไข**:
  เปลี่ยนเป็น:
  ```tsx
  <main className="flex-1 min-h-0 pt-24 sm:pt-28 pb-8 overflow-y-auto w-full">
  ```
  และให้ Component ภายในที่มีตารางเป็นผู้กำหนด `<div className="w-full overflow-x-auto">` เองอย่างอิสระ

---

## ✅ เกณฑ์การตรวจสอบความสำเร็จของ Phase 1 (Verification Checklist)

- [ ] เปิดหน้า Dashboard แล้วเปิด DevTools > Network Tab: ตรวจสอบว่ามี API Requests เฉพาะของ Role นั้นๆ โดยไม่มี Requests ของ MobileDashboard ยิงปนมาเมื่อเปิดบน Desktop
- [ ] สลับหน้าจอไปที่ Mobile View (กด Device Toggle ใน DevTools เป็น iPhone/Android): ตรวจสอบว่า MobileDashboard แสดงผลถูกต้องตามปกติ
- [ ] ทดสอบ Trigger ข้อความแจ้งเตือน Toast: การแจ้งเตือนแสดงผลจาก Sonner อย่างสวยงาม ไม่มีการ Import ซ้ำซ้อน
- [ ] รัน `npm run typecheck` และ `npm run build`: ต้องผ่าน 100% โดยไม่มีข้อผิดพลาด

---

> 👉 **ขั้นตอนต่อไป**: เมื่อผ่าน Phase 1 แล้ว ให้ดำเนินการต่อใน [REFACTORING_PHASE_2_REACT_QUERY.md](file:///D:/Project/dii-camt-showprogroup/guide/frontend/REFACTORING_PHASE_2_REACT_QUERY.md)
