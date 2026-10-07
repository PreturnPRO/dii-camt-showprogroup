# แผนการปรับปรุงโครงสร้าง Frontend — Phase 2: State Management & TanStack Query
## ยกระดับ Data Fetching ด้วย TanStack Query: สร้าง Query Keys และ Custom Hooks สำหรับ Core Pages

> **เอกสารอ้างอิงหลัก**: [REFACTORING_ROADMAP_OVERVIEW.md](file:///D:/Project/dii-camt-showprogroup/guide/frontend/REFACTORING_ROADMAP_OVERVIEW.md)  
> **ความเร่งด่วน**: 🟠 **Medium-High Priority**  
> **ผลกระทบ**: กำจัด Boilerplate `useEffect` กว่า 60 แห่ง, มีระบบ Cache ในตัว (Instant Page Transition) และเลิกใช้วิธี Hack เช่น `reloadKey++`

---

## 🎯 วัตถุประสงค์ของ Phase 2

ปัจจุบันโปรเจกต์มีการติดตั้ง `@tanstack/react-query` ใน `package.json` และมี `<QueryClientProvider>` อยู่ใน `App.tsx` แล้ว แต่ยัง **ไม่มีหน้าไหนเรียกใช้งาน `useQuery` เลยแม้แต่หน้าเดียว (0% Adoption)**

เป้าหมายของเฟสนี้คือ:
1. สร้าง **Query Key Factory** (`queryKeys`) เป็นศูนย์กลางจัดการ Cache Key เพื่อป้องกัน Key ซ้ำซ้อนหรือสะกดผิด
2. สร้าง **Domain Custom Query Hooks** ให้กับ 4 หน้าหลักที่มี Traffic สูงและ Logic ซับซ้อนที่สุด:
   - **Dashboards** (`StudentDashboard.tsx` และ `MobileDashboard.tsx` เพื่อให้แชร์ Data ร่วมกัน)
   - **Courses** (`Courses.tsx`)
   - **Requests** (`Requests.tsx`)
   - **Internships** (`InternTracking.tsx`)
3. แทนที่วิธีสั่ง Re-fetch แบบเดิม เช่น `setReloadRequestsKey(k => k + 1)` ด้วย **Query Invalidation** ที่ได้มาตรฐาน
4. วาง **Standard Template** เพื่อให้ทีมงานนำไปแปลงหน้าที่เหลืออีก 30+ หน้าได้ด้วยรูปแบบเดียวกัน

---

## 🏗️ โครงสร้างสถาปัตยกรรมใหม่ (Target Directory Structure)

```text
src/
├── hooks/
│   └── queries/
│       ├── useDashboardQueries.ts   <-- แชร์ระหว่าง Student & Mobile Dashboard
│       ├── useCourseQueries.ts      <-- รายวิชา, ตารางสอน, การลงทะเบียน
│       ├── useRequestQueries.ts     <-- ระบบยื่นคำร้อง และ Comment
│       └── useInternshipQueries.ts  <-- ติดตามการฝึกงาน และ Daily Logs
└── lib/
    └── query-keys.ts                <-- Query Key Factory ศูนย์กลาง
```

---

## 🛠️ รายการปฏิบัติการ (Action Items)

---

### รายการที่ 2.1: สร้าง Query Key Factory กลาง

* **สร้างไฟล์ใหม่**: `src/lib/query-keys.ts`
* **ประโยชน์**: ป้องกันการพิมพ์ String Key ผิด และสามารถสั่ง Invalidate เป็นกลุ่มก้อน (Hierarchy) ได้แม่นยำ

```ts
// src/lib/query-keys.ts

export const queryKeys = {
  // 1. Dashboard Domain
  dashboard: {
    all: () => ['dashboard'] as const,
    student: (studentId?: string) => ['dashboard', 'student', studentId] as const,
    staff: () => ['dashboard', 'staff'] as const,
    lecturer: () => ['dashboard', 'lecturer'] as const,
    company: (companyId?: string) => ['dashboard', 'company', companyId] as const,
    admin: () => ['dashboard', 'admin'] as const,
  },

  // 2. Courses Domain
  courses: {
    all: () => ['courses'] as const,
    list: (filters?: Record<string, unknown>) => ['courses', 'list', filters] as const,
    detail: (id: string) => ['courses', 'detail', id] as const,
    lecturerSchedule: () => ['courses', 'lecturer-schedule'] as const,
  },

  // 3. Requests Domain
  requests: {
    all: () => ['requests'] as const,
    list: () => ['requests', 'list'] as const,
    detail: (id: string) => ['requests', 'detail', id] as const,
  },

  // 4. Internship Domain
  internships: {
    all: () => ['internships'] as const,
    list: (filters?: Record<string, unknown>) => ['internships', 'list', filters] as const,
    detail: (id: string) => ['internships', 'detail', id] as const,
  },

  // 5. User / Profile Domain
  users: {
    all: () => ['users'] as const,
    list: (role?: string) => ['users', 'list', role] as const,
    profile: (id: string) => ['users', 'profile', id] as const,
  },
} as const;
```

---

### รายการที่ 2.2: สร้าง Custom Hook สำหรับ Requests (ตัวอย่างการขจัด `reloadKey`)

* **ไฟล์เป้าหมาย**: `src/hooks/queries/useRequestQueries.ts` *(สร้างใหม่)*
* **ปัญหาเดิมใน [src/pages/Requests.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Requests.tsx)**:
  - ใช้ `const [reloadRequestsKey, setReloadRequestsKey] = useState(0)`
  - เมื่อสร้างคำร้องเสร็จ ต้องสั่ง `setReloadRequestsKey(prev => prev + 1)` เพื่อให้ `useEffect` รันใหม่
  - โค้ด Data Fetching และ Error Handling กินพื้นที่ไปกว่า 80 บรรทัด

#### สร้าง Hook ใหม่:
```ts
// src/hooks/queries/useRequestQueries.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { queryKeys } from '@/lib/query-keys';
import { asRecord, asArray, asString, asDate } from '@/lib/live-data';
import { toast } from 'sonner';

export type RequestRow = {
  id: string;
  type: string;
  title: string;
  status: string;
  step: number;
  totalSteps: number;
  createdAt: string;
  updatedAt: string;
  description: string;
  documents: string[];
  studentName?: string;
  studentId?: string;
  comments: Array<{ id: string; authorId: string; text: string; createdAt: string }>;
};

export function useRequestsList() {
  return useQuery({
    queryKey: queryKeys.requests.list(),
    queryFn: async () => {
      const response = await api.requests.list();
      return response.requests.map((item, index): RequestRow => {
        const record = asRecord(item);
        const student = asRecord(record.student);
        const studentUser = asRecord(student.user);
        return {
          id: asString(record.id, `REQ-${index + 1}`),
          type: asString(record.type, 'general'),
          title: asString(record.title, 'คำร้องทั่วไป'),
          status: asString(record.status, 'pending'),
          step: Math.min(Math.max(Number(record.step) || 1, 1), 3),
          totalSteps: 3,
          createdAt: asDate(record.createdAt).toLocaleDateString('th-TH'),
          updatedAt: asDate(record.updatedAt).toLocaleDateString('th-TH'),
          description: asString(record.reason, asString(record.description, '')),
          documents: asArray<string>(record.documents),
          studentName: asString(studentUser.nameThai, asString(studentUser.name, 'นักศึกษา')),
          studentId: asString(student.studentId, ''),
          comments: asArray(record.comments).map((c, cIdx) => {
            const comment = asRecord(c);
            return {
              id: asString(comment.id, `comment-${cIdx}`),
              authorId: asString(comment.authorId, ''),
              text: asString(comment.message, asString(comment.text, '')),
              createdAt: asDate(comment.createdAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }),
            };
          }),
        };
      });
    },
    staleTime: 1000 * 60 * 2, // Cache ไว้ 2 นาที
  });
}

export function useCreateRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (formData: FormData) => api.requests.create(formData),
    onSuccess: () => {
      toast.success('ยื่นคำร้องสำเร็จเรียบร้อยแล้ว');
      // สั่ง Invalidate เพื่อดึงข้อมูลใหม่ทันที ไม่ต้องพึ่ง reloadKey++
      queryClient.invalidateQueries({ queryKey: queryKeys.requests.all() });
    },
    onError: (error: Error) => {
      toast.error(`เกิดข้อผิดพลาดในการยื่นคำร้อง: ${error.message}`);
    },
  });
}
```

#### เปรียบเทียบโค้ดใน [src/pages/Requests.tsx](file:///D:/Project/dii-camt-showprogroup/src/pages/Requests.tsx):
* **ก่อนปรับปรุง**:
  ```tsx
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [reloadRequestsKey, setReloadRequestsKey] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let mounted = true;
    api.requests.list().then(res => { if(mounted) setRequests(mapData(res)) });
    return () => { mounted = false; };
  }, [reloadRequestsKey]);
  ```
* **หลังปรับปรุง**:
  ```tsx
  const { data: requests = [], isLoading, error } = useRequestsList();
  const createMutation = useCreateRequest();

  // เวลา Submit:
  const handleSubmit = async (formData: FormData) => {
    await createMutation.mutateAsync(formData);
    setIsDialogOpen(false);
  };
  ```
  *(ลดโค้ดในหน้า `Requests.tsx` ลงทันทีเกือบ 100 บรรทัด และได้สถานะ `createMutation.isPending` มาคุมปุ่ม Loading อัตโนมัติ)*

---

### รายการที่ 2.3: สร้าง Shared Hook สำหรับ Student Dashboard & Mobile Dashboard

* **ไฟล์เป้าหมาย**: `src/hooks/queries/useDashboardQueries.ts` *(สร้างใหม่)*
* **ปัญหาเดิม**:
  `StudentDashboard.tsx` (1,071 บรรทัด) และ `MobileDashboard.tsx` (1,037 บรรทัด) มีโค้ดคำนวณและยิง API หลายเส้นเหมือนกันเป๊ะ (Profile, Enrolled Courses, Activities, GPA History)
* **วิธีแก้ไขที่แนะนำ**:
  รวม Data Fetching ของนักศึกษาไว้ใน Hook เดียว:
  ```ts
  // src/hooks/queries/useDashboardQueries.ts
  import { useQuery } from '@tanstack/react-query';
  import { api } from '@/lib/api';
  import { queryKeys } from '@/lib/query-keys';
  import { mapStudent, mapCourse, mapActivity } from '@/lib/live-mappers';

  export function useStudentDashboardData(userId?: string) {
    return useQuery({
      queryKey: queryKeys.dashboard.student(userId),
      queryFn: async () => {
        const [studentRes, coursesRes, activitiesRes] = await Promise.all([
          api.students.profile(userId!),
          api.enrollments.my(),
          api.activities.my(),
        ]);

        return {
          student: mapStudent(studentRes.student),
          courses: coursesRes.enrollments.map((e) => mapCourse(e.course)),
          activities: activitiesRes.activities.map(mapActivity),
        };
      },
      enabled: Boolean(userId),
      staleTime: 1000 * 60 * 3, // Cache 3 นาที
    });
  }
  ```
  ทั้ง `StudentDashboard.tsx` และ `MobileDashboard.tsx` สามารถเรียกใช้ Hook นี้ตัวเดียวกันได้ทันที **เมื่อหน้าจอหนึ่งดึงข้อมูลแล้ว อีกหน้าจอจะหยิบจาก Cache ได้ทันทีโดยไม่ยิง API ซ้ำ!**

---

### รายการที่ 2.4: แบบฟอร์มมาตรฐานสำหรับแปลงหน้าที่เหลือ (Standard Template)

เพื่อให้ทีมงาน (รวมถึง PangPond) สามารถนำ Pattern นี้ไปแปลงหน้าที่เหลือได้ ให้ยึดโครงสร้าง 3 สเต็ปนี้:

1. **ระบุ Query Key** ใน `src/lib/query-keys.ts`
2. **สร้าง Query & Mutation Hooks** ใน `src/hooks/queries/use[Feature]Queries.ts`
   - ใส่ `staleTime` ที่เหมาะสม (ข้อมูลเปลี่ยนช้าใส่ 3-5 นาที, ข้อมูลเปลี่ยนเร็วใส่ 30 วินาที)
   - ใน `onSuccess` ของ Mutation ให้เรียก `queryClient.invalidateQueries(...)`
3. **นำไปใช้ในหน้า Page**:
   - แทนที่ `useState` ข้อมูล และ `useEffect` ด้วย `use[Feature]Query()`
   - นำ Loading State มาแสดง `<Skeleton />`

---

## ✅ เกณฑ์การตรวจสอบความสำเร็จของ Phase 2 (Verification Checklist)

- [ ] เปิดหน้า `Requests.tsx` สลับไปหน้าอื่น แล้วกดย้อนกลับมา: หน้าจอแสดงผลได้ทันทีโดยไม่ต้องรอหมุนติ้ว (Cache Hit สำเร็จ)
- [ ] ทดสอบสร้างคำร้องใหม่: หน้าตารางอัปเดตข้อมูลอัตโนมัติทันทีหลังแจ้งเตือน Success โดยไม่ต้องพึ่ง `reloadRequestsKey`
- [ ] เปิดหน้า `Courses.tsx`: ข้อมูลรายวิชาโหลดผ่าน `useCourseQueries`
- [ ] รันคำสั่งตรวจสอบ:
  ```bash
  npm run typecheck
  npm run build
  ```
  ต้องผ่าน 100% โดยไม่มี Type Errors

---

> 👉 **ขั้นตอนต่อไป**: เมื่อระบบ Data Layer มีความเสถียรแล้ว ให้ดำเนินการต่อใน [REFACTORING_PHASE_3_DECOMPOSITION.md](file:///D:/Project/dii-camt-showprogroup/guide/frontend/REFACTORING_PHASE_3_DECOMPOSITION.md)
