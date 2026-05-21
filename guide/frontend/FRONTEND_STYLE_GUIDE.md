# Frontend Style Guide

คู่มือหลักสำหรับทำ UI/Frontend ของระบบ DII CAMT ShowProGroup ให้ไปในทิศทางเดียวกัน ทั้งโครงสร้างหน้า, component, สี, typography, spacing, interaction และ code convention

## สำหรับ AI/Agent ที่เข้ามาทำงาน

ถ้าคุณเป็น AI coding agent หรือ frontend agent ให้อ่านส่วนนี้ก่อนเริ่มแก้ไฟล์ใด ๆ ส่วนนี้คือ brief หลักของโปรเจกต์

### Project Identity

- ชื่อระบบ: DII CAMT ShowProGroup
- ประเภทระบบ: role-based academic management platform สำหรับนักศึกษา, อาจารย์, เจ้าหน้าที่, บริษัท และผู้ดูแลระบบ
- Frontend stack: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- UI character: dashboard/admin app ที่สะอาด อ่านง่าย ใช้งานจริง ไม่ใช่ landing page marketing
- Primary language: ภาษาไทย โดยมี i18n ภาษาอังกฤษในบางส่วน
- Main layout: authenticated pages ใช้ `src/components/layout/DashboardLayout.tsx`

### Files You Must Inspect Before UI Work

ก่อนแก้ UI หรือสร้างหน้าใหม่ ให้ดูไฟล์เหล่านี้ก่อน:

- `src/index.css` สำหรับ design tokens, theme, font, global CSS
- `tailwind.config.ts` สำหรับ Tailwind semantic colors และ font
- `components.json` สำหรับ shadcn alias และ project setup
- `src/components/ui/*` สำหรับ shadcn components ที่ติดตั้งแล้ว
- `src/components/common/*` สำหรับ reusable components ของโปรเจกต์
- `src/components/layout/*` สำหรับ layout/navigation patterns
- `src/i18n/translations/th.ts` และ `src/i18n/translations/en.ts` ถ้าต้องเพิ่มข้อความหลายภาษา
- `src/lib/api.ts` และ `src/lib/live-mappers.ts` ถ้างานเกี่ยวข้องกับข้อมูลจริง

### Non-Negotiable UI Rules

- ใช้ component ที่มีอยู่ก่อนสร้าง markup ใหม่
- ใช้ `@/components/ui/*` สำหรับ base UI และ `@/components/common/*` สำหรับ pattern ที่ใช้ซ้ำ
- ใช้ semantic tokens เช่น `bg-card`, `text-muted-foreground`, `border-border`, `bg-primary`
- อย่า hardcode สีจำนวนมากใน component ใหม่ เว้นแต่เป็น role/status/chart ที่มีเหตุผล
- ใช้ `gap-*` แทน `space-y-*` และ `space-x-*` ในงานใหม่
- ใช้ `cn()` จาก `@/lib/utils` เมื่อมี conditional class
- ใช้ `lucide-react` สำหรับ icon
- ใช้ `Badge` สำหรับ status, `Skeleton` สำหรับ loading, `Alert` สำหรับ callout/error
- ทุก data page ต้องมี loading, empty และ error state
- ทุก form input ต้องมี label และ validation/error message ที่อ่านเข้าใจ
- Icon-only button ต้องมี `aria-label`
- Dialog/Sheet/Drawer ต้องมี title
- หน้า dashboard ห้ามเป็น hero/marketing page
- ห้ามแก้ design token หลักใน `src/index.css` ถ้า request ไม่ได้เกี่ยวกับ theme โดยตรง

### Preferred Implementation Flow

1. อ่านไฟล์ pattern ที่ใกล้เคียงกับงาน เช่น page เดิมใน `src/pages` หรือ component ใน `src/components/common`
2. เลือก reuse component เดิมก่อน เช่น `PageHeader`, `StatsCard`, `ThemedCard`
3. ถ้าต้องใช้ shadcn component ให้ตรวจว่ามีไฟล์ใน `src/components/ui` แล้วหรือไม่
4. เขียน UI ด้วย semantic token และ responsive layout
5. เพิ่ม loading/empty/error/accessibility states
6. ถ้ามีข้อความใหม่จำนวนมาก ให้เพิ่มใน translation files แทน hardcode ทั้งหน้า
7. ตรวจ `npm run typecheck`, `npm run lint`, `npm run build` เมื่อเป็น code change

### Agent Output Expectations

เมื่อส่งงานกลับ ให้สรุป:

- ไฟล์ที่แก้
- pattern หรือ component หลักที่ใช้
- state ที่รองรับ เช่น loading/empty/error
- test/check ที่รัน
- สิ่งที่ไม่ได้แตะ โดยเฉพาะ uncommitted changes ของคนอื่น

### Common Mistakes To Avoid

- สร้าง card หรือ button เอง ทั้งที่ shadcn มีอยู่แล้ว
- ใช้สี `blue-500`, `slate-900`, `white` กระจายทั่ว component จน theme/dark mode แตก
- ทำ layout ด้วย fixed width ที่ล้น mobile
- เพิ่ม animation เยอะในหน้า dashboard/table
- ใช้ `any` เพื่อให้ TypeScript ผ่าน
- เพิ่ม text ภาษาไทย hardcode ในหน้าที่เดิมใช้ `useLanguage()`
- แก้ไฟล์ generated หรือ unrelated files เพื่อให้ build ผ่านแบบไม่จำเป็น

## เป้าหมายของงาน UI

- หน้าระบบต้องให้ความรู้สึกเป็น dashboard สำหรับงานวิชาการ/สหกิจ/องค์กร: สะอาด อ่านง่าย ใช้งานซ้ำได้จริง
- ใช้ design token และ component กลางก่อนเสมอ เพื่อลดหน้าตาที่หลุดกันระหว่างแต่ละ module
- รองรับภาษาไทยเป็นหลัก และภาษาอังกฤษตามระบบ i18n
- รองรับ light/dark mode โดยไม่ hardcode สีที่ทำให้ theme พัง
- ทุกหน้าต้อง responsive ตั้งแต่ mobile 320px ขึ้นไป

## Tech Stack ที่ต้องยึด

- React + TypeScript + Vite
- Tailwind CSS v3
- shadcn/ui + Radix UI
- lucide-react สำหรับ icon
- framer-motion สำหรับ animation ที่จำเป็น
- React Router สำหรับ routing
- TanStack Query/ระบบ `api` กลาง เมื่อเชื่อมข้อมูลจริง
- `sonner` สำหรับ toast หลัก

ไฟล์สำคัญ:

- `src/index.css` เก็บ design token, theme variables, global style
- `tailwind.config.ts` เก็บ Tailwind token mapping
- `components.json` เก็บ shadcn config และ alias
- `src/components/ui/*` คือ shadcn/ui base components
- `src/components/common/*` คือ reusable components ของโปรเจกต์
- `src/components/layout/*` คือ layout หลัก เช่น `DashboardLayout`, `Header`, `Sidebar`

## Design System หลัก

### สี

ใช้ semantic color จาก Tailwind token ก่อนเสมอ:

- `bg-background`, `text-foreground`
- `bg-card`, `text-card-foreground`
- `border-border`
- `bg-primary`, `text-primary`, `text-primary-foreground`
- `bg-secondary`, `text-secondary-foreground`
- `bg-muted`, `text-muted-foreground`
- `bg-accent`, `text-accent-foreground`
- `bg-success`, `bg-warning`, `bg-info`, `bg-destructive`

หลีกเลี่ยงการใช้ raw color เช่น `bg-blue-500`, `text-slate-900` ใน component ใหม่ ยกเว้นกรณีที่เป็น role color, chart color, หรือหน้าเดิมมี pattern ชัดเจนแล้ว

### Theme

ระบบมี theme ใน `src/index.css`:

- default/navy
- blue
- green
- purple
- rose
- orange
- dark mode

เวลาทำ component ใหม่ ให้ใช้ token เช่น `primary`, `muted`, `card`, `border` เพื่อให้เปลี่ยน theme แล้วไม่แตก

ตัวอย่างที่ควรใช้:

```tsx
<div className="rounded-xl border border-border bg-card text-card-foreground shadow-sm">
  <p className="text-sm text-muted-foreground">คำอธิบาย</p>
</div>
```

หลีกเลี่ยง:

```tsx
<div className="rounded-xl border border-gray-200 bg-white text-gray-900">
  <p className="text-sm text-gray-500">คำอธิบาย</p>
</div>
```

## Typography

Font หลักคือ `IBM Plex Sans Thai` จาก `src/index.css` และ `tailwind.config.ts`

แนวทางขนาดตัวอักษร:

- Page title: `text-3xl` ถึง `text-4xl`
- Section title: `text-xl` ถึง `text-2xl`
- Card title: `text-base` ถึง `text-lg`
- Body: `text-sm` หรือ `text-base`
- Metadata/helper text: `text-xs` หรือ `text-sm text-muted-foreground`

ข้อควรระวัง:

- ไม่ใช้ text ที่ใหญ่เกินจำเป็นใน card/table
- ไม่ใช้ negative letter spacing
- หลีกเลี่ยง paragraph ยาวใน dashboard ให้แยกเป็น label/value หรือ list สั้น

## Layout

หน้าในระบบหลัง login ต้องอยู่ภายใต้ `DashboardLayout`

โครงสร้างหน้ามาตรฐาน:

```tsx
export default function ExamplePage() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="ชื่อหน้า" subtitle="คำอธิบายสั้น" />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {/* stats cards */}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* main content + side panel */}
      </section>
    </div>
  );
}
```

Spacing มาตรฐาน:

- ระหว่าง section: `gap-6`
- ระหว่าง cards: `gap-4` หรือ `gap-6`
- Card padding: `p-4` สำหรับ compact, `p-6` สำหรับ dashboard
- Page content padding ใช้จาก `DashboardLayout` เป็นหลัก ไม่ต้องเพิ่ม outer padding ซ้ำ

ใช้ `gap-*` แทน `space-y-*` หรือ `space-x-*` ใน component ใหม่

## Component Guidelines

### ใช้ component กลางก่อน

ให้มองหา component ที่มีอยู่ก่อนสร้างใหม่:

- UI base: `src/components/ui/*`
- Common: `src/components/common/*`
- Layout: `src/components/layout/*`

ตัวอย่าง component ที่ควร reuse:

- `PageHeader` หรือ `ThemedPageHeader` สำหรับหัวหน้า
- `StatsCard` หรือ `ThemedStatCard` สำหรับ metric
- `ThemedCard`, `GlassCard` สำหรับ card ที่ซ้ำหลายหน้า
- `Timetable`, `ProgressRing`, `NotificationCenter` ตาม use case

### shadcn/ui

ใช้ shadcn composition ให้ครบ:

- `Card` ควรใช้ `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, `CardFooter`
- `Dialog`, `Sheet`, `Drawer` ต้องมี title เพื่อ accessibility
- `TabsTrigger` ต้องอยู่ใน `TabsList`
- `SelectItem` ควรอยู่ใน `SelectContent`
- `Avatar` ต้องมี `AvatarFallback`
- ใช้ `Separator` แทน `<hr>`
- ใช้ `Badge` แทน custom status span
- ใช้ `Skeleton` สำหรับ loading placeholder
- ใช้ `Alert` สำหรับ warning/error/callout

ตัวอย่าง Card:

```tsx
<Card>
  <CardHeader>
    <CardTitle>สถานะการฝึกงาน</CardTitle>
    <CardDescription>อัปเดตล่าสุดจากบริษัท</CardDescription>
  </CardHeader>
  <CardContent>
    <p className="text-sm text-muted-foreground">รายละเอียด...</p>
  </CardContent>
</Card>
```

## Buttons และ Actions

ใช้ `Button` จาก `@/components/ui/button` เสมอ

แนวทาง variant:

- Primary action: default button
- Secondary action: `variant="secondary"`
- Low emphasis: `variant="ghost"`
- Border action: `variant="outline"`
- Dangerous action: `variant="destructive"`

Icon ใช้ `lucide-react` และวางในปุ่มแบบสม่ำเสมอ:

```tsx
<Button>
  <Search className="mr-2 h-4 w-4" />
  ค้นหา
</Button>
```

หน้าที่มีหลาย actions ให้ primary action อยู่ขวาสุดหรือเด่นสุด และไม่ควรมี primary button หลายตัวใน section เดียวกัน

## Forms

ใช้ component จาก shadcn/ui:

- `Input`
- `Textarea`
- `Select`
- `Checkbox`
- `RadioGroup`
- `Switch`
- `Slider`
- `Label`
- `Button`

แนวทาง:

- Label ต้องชัดเจนและสัมพันธ์กับ input
- Required field ให้บอกใน label หรือ validation message
- Error state ใช้ `aria-invalid` และข้อความ error ที่อ่านรู้เรื่อง
- Form layout ใช้ `grid gap-4` หรือ `flex flex-col gap-4`
- ปุ่ม submit อยู่ท้าย form และ disable ระหว่าง loading

ตัวอย่าง:

```tsx
<div className="grid gap-2">
  <Label htmlFor="email">อีเมล</Label>
  <Input id="email" type="email" aria-invalid={Boolean(error)} />
  {error && <p className="text-sm text-destructive">{error}</p>}
</div>
```

## Tables และ Data Display

ใช้ `Table` จาก shadcn/ui เมื่อข้อมูลเป็นรายการจริง

แนวทาง:

- Header ชัดเจน ไม่ยาวเกินไป
- Cell สำคัญใช้ font weight ต่างกัน เช่น `font-medium`
- Status ใช้ `Badge`
- Action ต่อ row ใช้ icon button หรือ dropdown menu
- ข้อมูลว่างต้องมี empty state ไม่ปล่อยตารางเปล่า
- Loading ใช้ `Skeleton` หรือ row placeholder

สำหรับข้อมูลที่ต้อง scan เร็ว:

- ใช้ card metric ด้านบน
- ใช้ filter/search เหนือ table
- ใช้ `Pagination` เมื่อข้อมูลยาว

## Status และ Role Colors

Role color ที่ใช้ในระบบ:

- Student: blue/cyan
- Teacher/Lecturer: emerald/teal
- Staff: purple/violet
- Company: orange/amber
- Admin: slate/zinc

Status color:

- Success/สำเร็จ/ปกติ: `success` หรือ emerald
- Warning/รอดำเนินการ/เสี่ยง: `warning` หรือ amber/orange
- Error/ปฏิเสธ/อันตราย: `destructive`
- Info/ข้อมูลทั่วไป: `info`
- Neutral/ไม่ระบุ/ปิดใช้งาน: `muted` หรือ `secondary`

อย่าพึ่งสีเพียงอย่างเดียวในการสื่อความหมาย ควรมี label เช่น `ปกติ`, `รอดำเนินการ`, `ต้องแก้ไข`

## Icons

- ใช้ `lucide-react`
- Icon ใน navigation/action ควรมีขนาด `h-4 w-4` หรือ `h-5 w-5`
- Icon ใน empty state หรือ hero area ใช้ `h-8 w-8` ถึง `h-12 w-12`
- ไม่ใช้ icon หลาย style ปะปนกันในหน้าเดียว
- Icon ต้องช่วยอ่าน ไม่ใช่ decoration ล้วน

## Motion และ Interaction

ใช้ `framer-motion` อย่างพอดี:

- Page enter: fade/slide เบา ๆ
- Card hover: shadow หรือ scale เล็กน้อย เช่น `scale: 1.01` ถึง `1.02`
- Modal/Sheet ใช้ animation ของ component เป็นหลัก

หลีกเลี่ยง:

- Animation ที่วนซ้ำตลอดใน dashboard
- Hover effect ที่ทำให้ layout ขยับ
- Motion เยอะเกินไปใน table/list ที่มีข้อมูลจำนวนมาก

## Responsive Rules

Breakpoint ที่ใช้บ่อย:

- Mobile default: 320px+
- `sm`: ปรับ layout action/header
- `md`: เพิ่ม column หรือขยาย typography
- `lg`: sidebar/content split
- `xl`: dashboard grid 4 columns

แนวทาง:

- Mobile เริ่มจาก single column
- ตารางที่กว้างต้องอยู่ใน `overflow-x-auto`
- Button group บน mobile ควร wrap หรือ stack
- Header action ไม่ควรเบียด title
- Card grid ใช้ `grid-cols-1 sm:grid-cols-2 lg:grid-cols-4`

## Empty, Loading, Error

ทุกหน้าที่โหลดข้อมูลต้องมี 3 state:

- Loading: skeleton/spinner พร้อมพื้นที่คงที่
- Empty: ข้อความบอกว่าไม่มีข้อมูล และ action ถ้ามี
- Error: ข้อความอ่านรู้เรื่อง พร้อม retry หรือคำแนะนำ

ตัวอย่าง:

```tsx
if (isLoading) return <Skeleton className="h-40 w-full rounded-xl" />;

if (!items.length) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <p className="font-medium">ยังไม่มีข้อมูล</p>
        <p className="text-sm text-muted-foreground">ลองเปลี่ยนตัวกรองหรือเพิ่มรายการใหม่</p>
      </CardContent>
    </Card>
  );
}
```

## ภาษาและข้อความใน UI

- ภาษาไทยควรเป็นภาษาหลักสำหรับ user-facing text
- ถ้าหน้านั้นรองรับหลายภาษา ให้ใช้ `useLanguage()` และเพิ่ม key ใน `src/i18n/translations/*`
- ใช้ข้อความสั้น ชัดเจน เป็นภาษาคนใช้งานจริง
- หลีกเลี่ยงคำเทคนิคถ้าไม่จำเป็น
- Button ควรเป็นคำกริยา เช่น `บันทึก`, `ส่งคำขอ`, `ค้นหา`, `ยกเลิก`

## Accessibility

ขั้นต่ำที่ต้องมี:

- ปุ่ม icon-only ต้องมี accessible label เช่น `aria-label`
- Dialog/Sheet ต้องมี title
- Form input ต้องมี label
- สี text ต้องอ่านได้บนพื้นหลัง
- Interactive element ต้อง focus ได้ด้วย keyboard
- ไม่ใช้ div ทำหน้าที่ button ถ้าไม่จำเป็น
- Toast/error ต้องบอก action หรือปัญหาให้ชัดเจน

## File และ Naming Convention

### Pages

- เก็บใน `src/pages`
- ใช้ PascalCase เช่น `Students.tsx`, `ScheduleManagement.tsx`
- Default export สำหรับ page component
- Route เพิ่มใน `src/App.tsx`

### Components

- Reusable component เก็บใน `src/components/common`
- Layout component เก็บใน `src/components/layout`
- Feature-specific component เก็บเป็น folder ตาม domain เช่น `src/components/schedule`
- ใช้ PascalCase สำหรับชื่อไฟล์ component

### Imports

ใช้ alias ตาม `components.json`:

```tsx
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
```

หลีกเลี่ยง relative import ลึก ๆ เช่น:

```tsx
import { Button } from "../../../components/ui/button";
```

## TypeScript และ React

แนวทาง:

- Props interface ตั้งชื่อ `ComponentNameProps`
- ใช้ type จาก `src/types` เมื่อเป็น domain model
- หลีกเลี่ยง `any`
- แยก helper function ที่ซับซ้อนออกจาก JSX
- ใช้ `React.useMemo` เฉพาะเมื่อคำนวณหนักหรือช่วยลด re-render จริง
- ใช้ `React.useEffect` สำหรับ side effect เท่านั้น
- Cleanup effect เมื่อมี async/mounted state

ตัวอย่าง:

```tsx
interface StudentCardProps {
  student: Student;
  onOpen: (student: Student) => void;
}

export function StudentCard({ student, onOpen }: StudentCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{student.nameThai || student.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={() => onOpen(student)}>
          ดูรายละเอียด
        </Button>
      </CardContent>
    </Card>
  );
}
```

## Data และ API

- เรียก API ผ่าน `src/lib/api.ts` หรือ helper กลางที่มีอยู่
- Mapping ข้อมูล backend/frontend ใช้ mapper เช่น `src/lib/live-mappers.ts`
- อย่าเรียก endpoint กระจายเองในหลายหน้า ถ้ามี pattern กลางแล้ว
- Error จาก API ต้องมี fallback state ไม่ให้หน้า crash
- Toast success/error ใช้เมื่อ user action สำเร็จหรือล้มเหลว ไม่ใช้กับทุกการโหลดข้อมูล

## Code Style สำหรับ Tailwind

ลำดับ class ที่อ่านง่าย:

1. Layout: `flex`, `grid`, `relative`, `overflow-hidden`
2. Size/spacing: `h-*`, `w-*`, `p-*`, `gap-*`
3. Border/radius: `rounded-*`, `border`
4. Color: `bg-*`, `text-*`
5. Typography: `text-sm`, `font-medium`
6. Effects: `shadow-*`, `transition-*`
7. Responsive/dark/state: `md:*`, `dark:*`, `hover:*`

ใช้ `cn()` เมื่อ class มี condition:

```tsx
<Badge className={cn(status === "active" ? "bg-success" : "bg-muted")}>
  {label}
</Badge>
```

## Do / Don't

Do:

- ใช้ semantic token
- ใช้ shadcn/ui components
- ใช้ `gap-*`
- ใช้ `Badge` สำหรับ status
- ใช้ `Skeleton` สำหรับ loading
- ใช้ `aria-label` กับ icon button
- ตรวจ mobile ก่อนส่งงาน

Don't:

- hardcode สีจำนวนมากใน component ใหม่
- สร้าง card ซ้อน card โดยไม่จำเป็น
- ใช้ text ใหญ่แบบ hero ใน dashboard panel
- ทำ animation หนักใน list/table
- ปล่อย empty/error state ว่าง
- ใช้ relative import ลึก
- ใช้ `any` เพื่อข้าม type

## Checklist ก่อนส่ง PR

- [ ] หน้า responsive ที่ 320px, tablet, desktop
- [ ] Light/dark mode ไม่แตก
- [ ] ใช้ component กลางหรือ shadcn/ui ก่อน custom markup
- [ ] มี loading, empty, error state
- [ ] Form มี label และ validation message
- [ ] Icon-only button มี `aria-label`
- [ ] Text ภาษาไทยอ่านรู้เรื่องและไม่ล้น container
- [ ] ไม่มี console log/debug ที่ไม่จำเป็น
- [ ] ผ่าน `npm run typecheck`
- [ ] ผ่าน `npm run lint`
- [ ] ผ่าน `npm run build`

## Quick Pattern: Dashboard Page

```tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/PageHeader";

export default function ExampleDashboard() {
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="ภาพรวม"
        subtitle="สรุปสถานะและรายการที่ต้องดำเนินการ"
        gradient="navy"
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>รายการทั้งหมด</CardDescription>
            <CardTitle className="text-3xl">128</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant="secondary">อัปเดตวันนี้</Badge>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <Card>
          <CardHeader>
            <CardTitle>รายการล่าสุด</CardTitle>
            <CardDescription>ข้อมูลที่ต้องตรวจสอบ</CardDescription>
          </CardHeader>
          <CardContent>
            {/* table/list */}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>ทางลัด</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button>สร้างรายการ</Button>
            <Button variant="outline">ดูรายงาน</Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
```
