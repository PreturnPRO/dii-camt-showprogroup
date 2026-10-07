# แผนการปรับปรุงโครงสร้าง Frontend — Phase 3: Component Decomposition & Data Sanitization
## หั่น God Components ขนาดยักษ์ (1,000+ บรรทัด) และขจัด Frankenstein Mock Data สู่ Real Backend 100%

> **เอกสารอ้างอิงหลัก**: [REFACTORING_ROADMAP_OVERVIEW.md](file:///D:/Project/dii-camt-showprogroup/guide/frontend/REFACTORING_ROADMAP_OVERVIEW.md)  
> **ความเร่งด่วน**: 🟠 **Medium Priority**  
> **ผลกระทบ**: เปลี่ยนโค้ด Spaghetti 1,500 บรรทัดให้เป็นโมดูลย่อยที่อ่านเข้าใจง่าย (< 350 บรรทัดต่อไฟล์) และทำให้ข้อมูลเชื่อมต่อ Backend จริง 100% ปราศจาก Mock Data ปนเปื้อน

---

## 🎯 วัตถุประสงค์ของ Phase 3

ในระบบปัจจุบันมีปัญหาไฟล์ขนาดยักษ์ (God Components) ที่รวมทั้ง State, UI ตาราง, กราฟ, Modal Dialogs และ Mock Data ปนกันอยู่ โดยเฉพาะ:
1. **[src/pages/InternTracking.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/InternTracking.tsx)** (1,582 บรรทัด): มี 18 `useState` และมีปัญหา **Frankenstein Data** (นำ Mock Data มา `% length` ผสมกับ Real API)
2. **[src/pages/Grades.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Grades.tsx)** (888 บรรทัด): มัดรวม 3 บทบาท (Student, Lecturer, Staff) ที่ Workflow ต่างกันไว้ในหน้าเดียว
3. **[src/pages/Courses.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Courses.tsx)** (1,084 บรรทัด): ฝังทั้งตัวอ่านไฟล์ Excel/CSV, ตัวแปลง Section และ Dialog สร้างวิชาไว้ในหน้าเดียว

เป้าหมายของเฟสนี้คือการ **Decompose (แยกชิ้นส่วน)** คอมโพเนนต์เหล่านี้ให้มีขนาดพอเหมาะ และ **Sanitize (ฟอกข้อมูล)** ให้เชื่อมต่อ Backend จริงอย่างโปร่งใส

---

## 🛠️ รายการปฏิบัติการ (Action Items)

---

### รายการที่ 3.1: ขจัด Frankenstein Data ใน `InternTracking.tsx`

* **ไฟล์เป้าหมาย**: [src/pages/InternTracking.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/InternTracking.tsx#L73-L200)
* **ปัญหาเดิม**:
  ใน `InternTracking.tsx` มีการประกาศตัวแปร `const internsData = [ ... ]` ยาวกว่า 130 บรรทัด เมื่อระบบดึงข้อมูลจาก API ได้:
  ```tsx
  // ปัญหา: นำ Mock Data มาผสมกับข้อมูลจริงใน Database
  const fallback = internsData[index % internsData.length];
  const totalWeeks = Math.max(asNumber(record.duration, fallback.totalWeeks), 1);
  const rawScore = asNumber(evaluation.overallScore, fallback.rating * 20);
  ```
  ทำให้นักศึกษาคนจริงได้ข้อมูลคะแนนรีวิวและชั่วโมงฝึกงานของนักศึกษาใน Mock data ไปผสมอย่างผิดพลาด

* **วิธีแก้ไขที่แนะนำ**:
  1. ลบก้อน `const internsData = [ ... ]` ออกจากไฟล์ทั้งหมด 100%
  2. แมปข้อมูลตรงจาก API Response โดยใช้ค่า Default ทางตรรกศาสตร์ (Fallback ตาม Schema จริง ไม่ใช่ Mock Data)
  3. ออกแบบ **Empty State UI** สำหรับกรณีที่นักศึกษายังไม่ได้เริ่มฝึกงาน หรือฐานข้อมูลยังไม่มีรายการ:

```tsx
// Component สำหรับแสดงผลเมื่อไม่มีข้อมูลจริง
export function InternshipEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800">
      <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-4">
        <Briefcase className="w-8 h-8" />
      </div>
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">ยังไม่มีข้อมูลการฝึกงาน</h3>
      <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-1 mb-6">
        ขณะนี้ยังไม่มีนักศึกษาที่ได้รับการอนุมัติการฝึกงานในระบบ ข้อมูลจะปรากฏเมื่อมีการตอบรับจากสถานประกอบการ
      </p>
    </div>
  );
}
```

---

### รายการที่ 3.2: แตกไฟล์ `InternTracking.tsx` ออกเป็น 4 Sub-Components

เพื่อลดขนาดไฟล์จาก 1,582 บรรทัด ให้เหลือไฟล์หลักไม่เกิน 250 บรรทัด ให้แยก Component ตามโครงสร้างนี้:

```text
src/
└── components/
    └── internship/
        ├── InternshipStats.tsx          <-- การ์ดตัวเลขสรุป 4 ใบด้านบน (~80 บรรทัด)
        ├── InternTableList.tsx          <-- ตารางรายชื่อนักศึกษา พร้อม Search & Filter (~250 บรรทัด)
        ├── DailyLogReviewDialog.tsx     <-- Modal ตรวจสอบ Daily Log ของพี่เลี้ยง (~150 บรรทัด)
        └── StipendManagementDialog.tsx   <-- Modal บันทึกเบี้ยเลี้ยงของเจ้าหน้าที่ (~180 บรรทัด)
```

#### การนำไปใช้ใน `src/pages/InternTracking.tsx`:
```tsx
// src/pages/InternTracking.tsx (กลายเป็น Clean Page Controller ที่สั้นและกระชับ)
import React, { useState } from 'react';
import { useInternshipsList } from '@/hooks/queries/useInternshipQueries';
import { InternshipStats } from '@/components/internship/InternshipStats';
import { InternTableList } from '@/components/internship/InternTableList';
import { DailyLogReviewDialog } from '@/components/internship/DailyLogReviewDialog';
import { StipendManagementDialog } from '@/components/internship/StipendManagementDialog';
import { InternshipEmptyState } from '@/components/internship/InternshipEmptyState';

export default function InternTracking() {
  const { data: interns = [], isLoading } = useInternshipsList();
  const [selectedIntern, setSelectedIntern] = useState<InternRow | null>(null);
  const [reviewLog, setReviewLog] = useState<DailyLogItem | null>(null);
  const [isStipendOpen, setIsStipendOpen] = useState(false);

  if (isLoading) return <InternshipSkeleton />;
  if (interns.length === 0) return <InternshipEmptyState />;

  return (
    <div className="space-y-6">
      {/* 1. สถิติสรุป */}
      <InternshipStats interns={interns} />

      {/* 2. ตารางหลัก */}
      <InternTableList
        interns={interns}
        onSelectIntern={setSelectedIntern}
        onOpenStipend={() => setIsStipendOpen(true)}
      />

      {/* 3. โมดอลตรวจงานประจำวัน */}
      {reviewLog && (
        <DailyLogReviewDialog
          log={reviewLog}
          onClose={() => setReviewLog(null)}
        />
      )}

      {/* 4. โมดอลจัดการเบี้ยเลี้ยง */}
      {isStipendOpen && selectedIntern && (
        <StipendManagementDialog
          intern={selectedIntern}
          isOpen={isStipendOpen}
          onClose={() => setIsStipendOpen(false)}
        />
      )}
    </div>
  );
}
```

---

### รายการที่ 3.3: แยกหน้า Multi-Role ใน `Grades.tsx` ตามบทบาทผู้ใช้

* **ไฟล์เป้าหมาย**: [src/pages/Grades.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Grades.tsx) (888 บรรทัด)
* **ปัญหาเดิม**:
  มีเงื่อนไข `if (user?.role === 'lecturer')` และ `if (user?.role === 'staff')` สลับ Layout ไปมา ทำให้ State ของการตัดเกรดอาจารย์กับ State ของกราฟนักศึกษาปะปนกัน
* **แนวทางแก้ไขที่แนะนำ**:
  แยกออกเป็นโฟลเดอร์ `src/pages/grades/`:
  1. `src/pages/grades/StudentGradesView.tsx`: หน้านักศึกษา (GPA Breakdown, กราฟแนวโน้ม, ดาวน์โหลด Transcript)
  2. `src/pages/grades/LecturerGradingView.tsx`: หน้าอาจารย์ (เลือกวิชา, กรอกคะแนนตามเกณฑ์คะแนนเก็บ/สอบ, ตัดเกรด)
  3. `src/pages/grades/StaffGradesOverview.tsx`: หน้าเจ้าหน้าที่ (สรุปการตัดเกรดของแต่ละภาควิชา)

ใน `src/pages/Grades.tsx` จะทำหน้าที่เป็น Role Switcher สั้นๆ เพียง 40 บรรทัด:
```tsx
// src/pages/Grades.tsx
import { useAuth } from '@/contexts/AuthContext';
import { StudentGradesView } from './grades/StudentGradesView';
import { LecturerGradingView } from './grades/LecturerGradingView';
import { StaffGradesOverview } from './grades/StaffGradesOverview';

export default function Grades() {
  const { user } = useAuth();

  if (user?.role === 'lecturer') return <LecturerGradingView />;
  if (user?.role === 'staff' || user?.role === 'admin') return <StaffGradesOverview />;
  return <StudentGradesView />;
}
```

---

### รายการที่ 3.4: แยก Import / Tabular Logic ออกจาก `Courses.tsx`

* **ไฟล์เป้าหมาย**: [src/pages/Courses.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Courses.tsx) (1,084 บรรทัด)
* **ปัญหาเดิม**:
  ในหัวไฟล์มีโค้ด `headerAliases`, `normalizeHeader`, `csvEscape`, `readTabularFile` และ Dialog Import วิชา ปนอยู่กับตารางรายวิชาและการลงทะเบียน
* **แนวทางแก้ไขที่แนะนำ**:
  1. ย้าย Logic การแมปและแปลงตาราง Excel ไปไว้ใน `src/lib/course-import.ts`
  2. แยกหน้าต่าง Dialog การ Import ไปไว้ใน `src/components/courses/CourseImportDialog.tsx`
  3. แยกการ์ดวิชาไปไว้ใน `src/components/courses/CourseCard.tsx`
  *(จะช่วยลดขนาดของ `Courses.tsx` ลงจาก 1,084 บรรทัด เหลือประมาณ 380 บรรทัดทันที)*

---

## ✅ เกณฑ์การตรวจสอบความสำเร็จของ Phase 3 (Verification Checklist)

- [ ] ตรวจสอบขนาดไฟล์: ไม่มีไฟล์ Component หรือ Page ใดใน 3 หน้านี้ที่มีขนาดยาวเกิน 400 บรรทัด
- [ ] ตรวจสอบ Mock Data: ค้นหาคำว่า `internsData` ทั่วทั้ง Codebase ต้องไม่พบการใช้งานปนใน Component อีกต่อไป
- [ ] ทดสอบหน้า `InternTracking.tsx`: กรณีฐานข้อมูลว่างเปล่า ต้องแสดง `InternshipEmptyState` อย่างสวยงาม ไม่พังและไม่มี Error ใน Console
- [ ] ทดสอบหน้า `Grades.tsx`: สลับสิทธิ์ล็อกอินระหว่างนักศึกษา (`alice@student.showpro.local`) กับอาจารย์ (`narin@showpro.local`) หน้าจอต้องแสดงผลแยกกันอย่างชัดเจนตาม Role
- [ ] รันคำสั่งตรวจสอบ:
  ```bash
  npm run typecheck
  npm run build
  ```
  ต้องผ่าน 100%

---

> 👉 **ขั้นตอนต่อไป**: ดำเนินการต่อในเฟสสุดท้าย [REFACTORING_PHASE_4_FORMS_VALIDATION.md](file:///D:/Project/dii-camt-showprogroup/guide/frontend/REFACTORING_PHASE_4_FORMS_VALIDATION.md)
