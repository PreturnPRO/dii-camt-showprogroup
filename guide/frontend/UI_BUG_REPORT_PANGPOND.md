# รายงานข้อผิดพลาด UI และการแสดงผล (UI Bug Report) สำหรับ PangPond

> **จัดทำโดย**: Oracle & AI Assistant (ตรวจผ่าน MCP Browser Automated Audit)  
> **ส่งมอบให้**: PangPond (Frontend Lead / Developer)  
> **วันที่ตรวจสอบ**: 5 ตุลาคม 2026  
> **ขอบเขตการตรวจ**: ทดสอบและส่องหน้าเว็บจริงผ่าน URL `http://localhost:5173/` ครบทั้ง 5 บทบาทผู้ใช้งาน (Admin, Staff, Lecturer, Company, Student) ทั้งในโหมด **Light Mode** และ **Dark Mode**

---

## 📌 บทนำและภาพรวม (Overview)

จากการนำ Automated Browser เข้าตรวจสอบหน้าเว็บจริงของโปรเจกต์ **DII CAMT ShowProGroup** พบว่าระบบมีดีไซน์ที่ทันสมัย การจัดวางองค์ประกอบและการเคลื่อนไหว (Micro-interactions) ทำได้สวยงามมาก อย่างไรก็ตาม พบจุดบกพร่องด้านการแสดงผล (Visual & Layout Bugs) อยู่จำนวนหนึ่ง โดยเฉพาะเรื่อง:
1. **ปัญหา Contrast สีตัวอักษรกลืนกับพื้นหลัง** (เช่น สีขาวบนพื้นขาวใน Light Mode หรือสีดำมืดบนพื้นมืดใน Dark Mode)
2. **ปัญหาการจัดเลย์เอาต์ซ้อนทับกัน (Z-index / Layering & Pointer Events)** ทำให้กดปุ่มบางจุดไม่ได้
3. **ปัญหาการบีบอัดของตารางและ Flex Container (Smashed Columns & Overflow)** ในหน้าจอระดับ Desktop ปกติ

เอกสารฉบับนี้รวบรวมรายละเอียด, ตำแหน่งไฟล์, สาเหตุทางเทคนิค (Root Cause) และแนวทางแก้ไขโค้ด (Recommended Fix) ไว้อย่างเป็นรูปธรรมเพื่อให้ PangPond นำไปปรับแก้ได้อย่างรวดเร็ว

---

## 📊 ตารางสรุปรายการ Bug (Summary Matrix)

| รหัส | รายการปัญหา | ตำแหน่ง / ไฟล์ | ระดับความรุนแรง | โหมดที่พบ |
| :--- | :--- | :--- | :---: | :---: |
| **BUG-01** | Header ลอยทับปุ่ม Toggle Sidebar และแสดงโลโก้ซ้ำซ้อน | `src/components/layout/Header.tsx`<br>`src/components/layout/Sidebar.tsx` | 🔴 **High** | ทั้งหมด |
| **BUG-02** | Staff Dashboard: ตัวหนังสือและไอคอนสีขาวบนการ์ดขาวล้วน | `src/pages/dashboards/StaffDashboard.tsx` | 🔴 **High** | Light Mode |
| **BUG-03** | Student Dashboard: ตารางเรียน (Timetable) บีบจนตัวหนังสือเกยทับกัน | `src/components/common/Timetable.tsx` | 🔴 **High** | ทั้งหมด |
| **BUG-04** | Global Dark Mode: ตัวอักษรสีเข้มบนปุ่มสีสด ทำให้อ่านไม่ออก | `src/index.css` (`--primary-foreground`) | 🔴 **High** | Dark Mode |
| **BUG-05** | Portfolio: แถบแท็บและปุ่ม "+ เพิ่มโปรเจกต์ใหม่" หลุดขอบไปมุดใต้การ์ดขวา | `src/pages/Portfolio.tsx` | 🟡 **Medium** | ทั้งหมด |
| **BUG-06** | Schedule Management: การ์ดห้องเรียนกลืนกับพื้นหลังใน Dark Mode | `src/pages/ScheduleManagement.tsx` | 🟡 **Medium** | Dark Mode |
| **BUG-07** | Users Page: ตัวหนังสือบนการ์ดสถิตินักศึกษา (สีม่วง) จมและอ่านยาก | `src/pages/Users.tsx` | 🟡 **Medium** | ทั้งหมด |
| **BUG-08** | Job Postings: ไอคอนสถิติใบแรกเป็นสีขาวบนพื้นหลังขาว | `src/pages/JobPostings.tsx` | 🟡 **Medium** | Light Mode |
| **BUG-09** | Landing Page: Animation Scroll ติดค้างที่ Opacity 0 เมื่อเลื่อนเร็ว | `src/pages/LandingPage.tsx` | 🟢 **Low** | ทั้งหมด |

---

## 🔍 รายละเอียดของแต่ละ Bug (Detailed Findings & Solutions)

---

### 🔴 BUG-01: Header ลอยทับปุ่ม Toggle Sidebar และแสดงโลโก้ซ้อนกัน

* **หน้าจอที่พบ**: ทุกหน้าที่ผ่านการเข้าสู่ระบบ (Authenticated Dashboard ทุก Role)
* **ไฟล์ที่เกี่ยวข้อง**:
  * `src/components/layout/Header.tsx`
  * `src/components/layout/Sidebar.tsx`
* **อาการที่พบ**:
  * แถบ `Header.tsx` ด้านบนถูกเซ็ตเป็น `fixed top-0 left-0 right-0 z-40` และมีโลโก้ ShowPro วางอยู่ที่พิกัดด้านซ้าย (`x: ~24px, y: ~20px`)
  * ในขณะเดียวกัน `Sidebar.tsx` ก็มีโลโก้ ShowPro และปุ่มกดพับ/ขยาย Sidebar อยู่ตรงตำแหน่งเดียวกัน
  * คอนเทนเนอร์ของ Header ที่กว้างเต็มหน้าจอบังการคลิก (`pointer-events`) ส่งผลให้ผู้ใช้กดปุ่มพับขยาย Sidebar ไม่ติด หรือติดยาก เพราะ Header ลอยทับอยู่ด้านบน
* **สาเหตุทางเทคนิค**:
  * Wrapper ของ Header ในหน้าจอเดสก์ท็อปไม่ได้เว้นระยะทางซ้ายสำหรับ Sidebar (`pl-[72px]` หรือ `pl-64`) และตัว Header เองมีโลโก้ซ้ำกับ Sidebar
* **แนวทางแก้ไขที่แนะนำ**:
  1. ในหน้าจอ Desktop (`hidden lg:flex`) ให้ซ่อนโลโก้ใน `Header.tsx` เพราะใน Sidebar มีโลโก้อยู่แล้ว
  2. ใส่ `pointer-events-none` บน Container แถบกว้างของ Header แล้วใส่ `pointer-events-auto` เฉพาะบน Element ที่กดได้จริง (เช่น Search bar, Notification bell, User avatar)

```tsx
// src/components/layout/Header.tsx
// เปลี่ยน container ให้ไม่ไปบล็อกคลิกของ Sidebar:
<header className="fixed top-0 left-0 right-0 z-30 pointer-events-none ...">
  <div className="flex items-center justify-between pointer-events-auto ...">
    {/* ซ่อนโลโก้ฝั่งซ้ายเมื่อเป็น Desktop ที่มี Sidebar อยู่แล้ว */}
    <div className="flex items-center gap-3 lg:hidden">
       <ShowProLogo />
    </div>
    ...
  </div>
</header>
```

---

### 🔴 BUG-02: Staff Dashboard - ตัวหนังสือและไอคอนสีขาวบนการ์ดขาว (Light Mode)

* **บัญชีที่พบ**: `staff@showpro.local`
* **หน้าจอ**: `/dashboard` (Staff Dashboard)
* **ไฟล์ที่เกี่ยวข้อง**: `src/pages/dashboards/StaffDashboard.tsx`
* **อาการที่พบ**:
  * เมื่อเปิดใช้งานใน Light Mode (โหมดสว่าง) ตัวการ์ดสถิติ `MetricCard` มีพื้นหลังสีขาว (`bg-white`)
  * แต่ตัวเลขสถิติ หัวข้อ และไอคอนกลับถูกใส่คลาส `text-white` และ `bg-white/20` แบบ hardcoded
  * ทำให้หน้าจอเห็นเพียง "กล่องสี่เหลี่ยมสีขาวโล่งๆ" มองไม่เห็นตัวเลขหรือข้อความใดๆ เลย
* **สาเหตุทางเทคนิค**:
  * มีการฮาร์ดโค้ดคลาสสีขาวล้วนไว้ใน Component ย่อยของ `StaffDashboard.tsx` โดยไม่ได้แยกเงื่อนไขตามสีของการ์ดหรือ Dark Mode
* **แนวทางแก้ไขที่แนะนำ**:
  * เปลี่ยนจากการฮาร์ดโค้ด `text-white` เป็นการใช้ Semantic Color ของ Tailwind เช่น `text-slate-900 dark:text-white` และไอคอนใช้ `text-indigo-600 dark:text-indigo-400`
  * หรือหากต้องการให้เป็นการ์ดสีสดเหมือน Admin Dashboard ให้ใส่ Background Gradient สีสันชัดเจน (เช่น `bg-gradient-to-br from-indigo-500 to-purple-600`) ตัวหนังสือสีขาวถึงจะอ่านออก

---

### 🔴 BUG-03: Student Dashboard - ตารางเรียน (Timetable) บีบจนตัวหนังสือทับกัน

* **บัญชีที่พบ**: `alice@student.showpro.local`
* **หน้าจอ**: `/dashboard` (Student Dashboard)
* **ไฟล์ที่เกี่ยวข้อง**: `src/components/common/Timetable.tsx`
* **อาการที่พบ**:
  * หน้า Student Dashboard จัด Layout แบบ 2 คอลัมน์คือ `lg:grid-cols-[minmax(0,1fr)_420px]`
  * ฝั่งขวาใช้พื้นที่ไป 420px ทำให้ฝั่งซ้ายซึ่งเป็นตารางเรียนสัปดาห์ (Timetable) เหลือพื้นที่กว้างเพียง ~500px
  * ตัวตารางเรียนแบ่งเป็น 7 วัน (จันทร์ - อาทิตย์) ด้วย `table-fixed` ส่งผลให้แต่ละวันเหลือความกว้างเพียง ~59px
  * ชื่อวิชาภาษาไทย, รหัสวิชา, เวลา และห้องเรียนจึงถูกบีบอัดทับซ้อนกันจนไม่สามารถอ่านชื่อวิชาได้
* **สาเหตุทางเทคนิค**:
  * ตัว `<table>` ไม่ได้กำหนด `min-w-[...]` และ Wrapper ขาดการรองรับการเลื่อนในแนวนอน (`overflow-x-auto`)
* **แนวทางแก้ไขที่แนะนำ**:
  * ครอบตารางด้วย `<div className="w-full overflow-x-auto">` และกำหนดความกว้างขั้นต่ำของตาราง เช่น `<table className="min-w-[680px] w-full ...">` เพื่อให้ผู้ใช้สามารถเลื่อนแนวนอนดูได้อย่างสวยงามโดยที่ตัวหนังสือไม่แตก
  * หรือบนมุมขวาของการ์ดตารางเรียน ให้มีปุ่มสลับมุมมองเป็น "มุมมองวันนี้ (Today's View)" กับ "มุมมองรายสัปดาห์ (Weekly View)"

```tsx
// src/components/common/Timetable.tsx
<div className="w-full overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800">
  <table className="min-w-[700px] w-full table-fixed text-sm">
    {/* thead & tbody */}
  </table>
</div>
```

---

### 🔴 BUG-04: Global Dark Mode - ตัวอักษรสีเข้มบนปุ่มสีสด (`--primary-foreground`)

* **หน้าจอที่พบ**: ปุ่มกดที่มีพื้นหลังสีเข้ม/สีสดในโหมดมืด (Dark Mode) ทุกหน้า
* **ไฟล์ที่เกี่ยวข้อง**: `src/index.css`
* **อาการที่พบ**:
  * ในโหมดมืด ปุ่มที่ใช้สีของธีม เช่น ปุ่มกดบันทึก, ปุ่มส่งงาน, ปุ่มกรองข้อมูล ตัวหนังสือจะกลายเป็นสีเทาเข้มเกือบดำ (`#0F172A`) อยู่บนพื้นหลังที่เป็นสีน้ำเงิน/ม่วงเข้ม ทำให้กลืนกันจนอ่านไม่ออก
* **สาเหตุทางเทคนิค**:
  * ใน `src/index.css` บล็อก `.dark` มีการกำหนด:
    ```css
    --primary-foreground: 222 47% 11%; /* เป็นค่าสี Dark Slate เกือบดำ */
    ```
  * ซึ่งในโหมดมืด หาก Background เป็นสี Primary เข้ม ตัว Foreground ต้องเป็นสีขาวสว่าง
* **แนวทางแก้ไขที่แนะนำ**:
  * ปรับค่าใน `src/index.css` ใต้คลาส `.dark`:
    ```css
    .dark {
      --primary-foreground: 210 40% 98%; /* ปรับเป็นสีขาวสว่าง สะอาดตา */
    }
    ```
  * ปุ่มใดที่มีการระบุคลาสแบบ custom เช่น `bg-purple-600 hover:bg-purple-700` ให้กำกับคลาส `text-white` เสมอ

---

### 🟡 BUG-05: Portfolio - แท็บและปุ่ม "+ เพิ่มโปรเจกต์ใหม่" หลุดขอบจอ

* **บัญชีที่พบ**: `alice@student.showpro.local`
* **หน้าจอ**: `/portfolio`
* **ไฟล์ที่เกี่ยวข้อง**: `src/pages/Portfolio.tsx`
* **อาการที่พบ**:
  * บริเวณส่วนบนของรายการโครงงาน มีการวาง `TabsList` (หมวดหมู่ผลงาน) คู่กับปุ่ม `+ เพิ่มโปรเจกต์ใหม่` ในแนวนอนเดียวกัน
  * เมื่อเปิดในหน้าจอปกติ แถบหมวดหมู่กินพื้นที่ไปกว่า 400px ส่งผลให้ปุ่ม "+ เพิ่มโปรเจกต์ใหม่" ถูกดันทะลุกรอบออกไปทางขวา และมุดเข้าไปอยู่ใต้การ์ดโปรไฟล์ฝั่งขวา
* **สาเหตุทางเทคนิค**:
  * ตัว Flexbox ของแท็บใช้ `flex justify-between items-center` แต่ไม่ได้ใส่ `flex-wrap` และไม่มีการจัด breakpoint สำหรับหน้าจอขนาดกลาง
* **แนวทางแก้ไขที่แนะนำ**:
  * เปลี่ยนคอนเทนเนอร์ให้เป็น `flex flex-wrap items-center justify-between gap-3` เพื่อให้ปุ่มตกลงมาอยู่ในบรรทัดใหม่อย่างสวยงามเมื่อพื้นที่ไม่พอ

---

### 🟡 BUG-06: Schedule Management - การ์ดห้องเรียนกลืนกับพื้นหลังใน Dark Mode

* **บัญชีที่พบ**: `admin@showpro.local`, `staff@showpro.local`
* **หน้าจอ**: `/schedule-management` (จัดการตารางเรียนและห้องเรียน)
* **ไฟล์ที่เกี่ยวข้อง**: `src/pages/ScheduleManagement.tsx`
* **อาการที่พบ**:
  * รายชื่อการ์ดห้องเรียนในตารางกำหนดการใช้คลาส `bg-white/60` โดยไม่ได้ใส่ variant สำหรับ Dark Mode
  * เมื่อเปิด Dark Mode พื้นหลังของการ์ดยังคงเป็นสีขาวโปร่งแสง ในขณะที่ตัวอักษรเป็นสีขาว ส่งผลให้เกิดอาการ White-on-White ตัวหนังสือเลือนรางมองแทบไม่เห็น
* **แนวทางแก้ไขที่แนะนำ**:
  * ปรับเปลี่ยนคลาสพื้นหลังเป็นการ์ดที่รองรับทั้ง 2 โหมด:
    ```tsx
    className="bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 ..."
    ```

---

### 🟡 BUG-07: Users Page - กล่องสถิตินักศึกษาตัวหนังสือจม (Low Contrast)

* **บัญชีที่พบ**: `admin@showpro.local`
* **หน้าจอ**: `/users` (การจัดการผู้ใช้งาน)
* **ไฟล์ที่เกี่ยวข้อง**: `src/pages/Users.tsx`
* **อาการที่พบ**:
  * การ์ดสถิตินักศึกษา (Student Stat Card) มีการใช้พื้นหลังแบบ Gradient สีม่วงเข้ม `bg-gradient-to-br from-purple-500 to-violet-600`
  * แต่ข้อความคำอธิบายด้านล่างกลับใช้คลาส `text-slate-500 dark:text-slate-400`
  * สีเทาเข้มเมื่ออยู่บนพื้นหลังสีม่วง ทำให้ค่า Contrast Ratio ตกเกณฑ์ WCAG จนอ่านข้อความแทบไม่ออก
* **แนวทางแก้ไขที่แนะนำ**:
  * เปลี่ยนคลาสข้อความบนการ์ดที่มีพื้นหลัง Gradient ให้ใช้โทนสีขาวโปร่งแสง เช่น `text-purple-100` หรือ `text-white/80`

---

### 🟡 BUG-08: Job Postings - ไอคอนสีขาวบนพื้นหลังขาวใน Light Mode

* **บัญชีที่พบ**: `talent@northernsoft.local`
* **หน้าจอ**: `/job-postings` (ตำแหน่งงานที่เปิดรับ)
* **ไฟล์ที่เกี่ยวข้อง**: `src/pages/JobPostings.tsx`
* **อาการที่พบ**:
  * กล่องสถิติการ์ดแรก ส่วนกล่องไอคอนมีคลาส `p-2.5 rounded-xl bg-white dark:bg-slate-900/20`
  * แต่เส้น Stroke ของ SVG ไอคอนภายในถูกกำหนดเป็น `text-white`
  * ใน Light Mode ตัวไอคอนจึงเป็นสีขาวบนกล่องสี่เหลี่ยมสีขาว (มองไม่เห็นไอคอน)
* **แนวทางแก้ไขที่แนะนำ**:
  * ปรับให้ใช้ Semantic Token ของไอคอน เช่น `bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400`

---

### 🟢 BUG-09: Landing Page - Framer Motion ติดค้างที่ Opacity 0 เมื่อเลื่อนเร็ว

* **หน้าจอ**: `/` (Landing Page สำหรับผู้เยี่ยมชม)
* **ไฟล์ที่เกี่ยวข้อง**: `src/pages/LandingPage.tsx`
* **อาการที่พบ**:
  * คอมโพเนนต์ที่ใช้ Animation `whileInView` หรือ `FadeIn` ถูกตั้งค่าเริ่มต้นไว้ที่ `opacity: 0`
  * หากผู้ใช้งานเลื่อนหน้าจอผ่านอย่างรวดเร็ว หรือเข้าชมด้วยเบราว์เซอร์บางรุ่น/โหมดแคปหน้าจอ ตัวการ์ดบางส่วนจะโหลดไม่ทันและค้างอยู่ที่ `opacity: 0` (กลายเป็นพื้นที่ว่างเปล่า)
* **แนวทางแก้ไขที่แนะนำ**:
  * เพิ่ม Property `viewport={{ once: true, amount: 0.1 }}` เพื่อให้ Trigger ติดได้ง่ายขึ้นแม้อยู่ที่ขอบจอ
  * หรือตั้งค่า Animation ให้มี Fallback แสดงผลเสมอหาก Reduced Motion ถูกเปิดใช้งาน

---

## 💡 คำแนะนำทางเทคนิคเพิ่มเติมเพื่อความเนี๊ยบของ UI

1. **การใช้ Tailwind Semantic Tokens**:
   * หลีกเลี่ยงการ Hardcode สี เช่น `text-slate-500` บนปุ่มหรือการ์ดที่มีสีสันเฉพาะ ให้ใช้ `text-muted-foreground`, `text-primary-foreground` หรือ `text-white` ตามบริบทของพื้นหลัง
2. **การป้องกัน Layout Shift บนตาราง (Responsive Data Tables)**:
   * ทุกหน้าที่มี `table` ที่มีคอลัมน์เกิน 4 คอลัมน์ขึ้นไป ควรครอบด้วย `<div className="overflow-x-auto w-full">` เสมอ และใส่ `min-w-[600px]` ถึง `min-w-[800px]` บน `table` เพื่อป้องกันไม่ให้ข้อมูลเบียดกันเมื่อเปิดบนจอแล็ปท็อปขนาด 13-14 นิ้ว
3. **การทดสอบโหมดสี (Dark / Light Mode Consistency)**:
   * ในการตกแต่ง component ใหม่ ให้สลับ Toggle เช็กทั้ง 2 โหมดเสมอ โดยสังเกตตัวหนังสือสีเทา (`text-slate-400`, `text-slate-500`) ว่าจมไปกับพื้นหลังหรือไม่

---

## ✅ Checklist สำหรับการตรวจสอบและแก้ไข (PangPond Task Checklist)

- [ ] **BUG-01**: จัดการ `Header.tsx` ไม่ให้ลอยทับปุ่ม Toggle ของ `Sidebar.tsx`
- [ ] **BUG-02**: แก้ไข `StaffDashboard.tsx` ให้นำ `text-white` ออกจากการ์ดสีขาวใน Light Mode
- [ ] **BUG-03**: ใส่ `overflow-x-auto` และ `min-w-[680px]` ใน `Timetable.tsx`
- [ ] **BUG-04**: อัปเดต `--primary-foreground` ใน `src/index.css` สำหรับ `.dark` ให้เป็นสีขาวสว่าง
- [ ] **BUG-05**: ใส่ `flex-wrap gap-3` ให้กับแท็บและปุ่มใน `Portfolio.tsx`
- [ ] **BUG-06**: เพิ่มคลาส `dark:bg-slate-800/80` ให้กับการ์ดห้องเรียนใน `ScheduleManagement.tsx`
- [ ] **BUG-07**: เปลี่ยนสีตัวหนังสือสถิตินักศึกษาในการ์ดสีม่วงของ `Users.tsx` ให้เป็น `text-purple-100`
- [ ] **BUG-08**: ปรับสีกล่องไอคอนและไอคอนใน `JobPostings.tsx` ให้มองเห็นได้ใน Light Mode
- [ ] **BUG-09**: ตรวจสอบ Viewport ของ Framer Motion ใน `LandingPage.tsx`
