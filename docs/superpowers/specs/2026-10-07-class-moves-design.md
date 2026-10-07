# F3b: ย้ายคาบเฉพาะครั้ง (Class Moves) — Design

**วันที่:** 7 ต.ค. 2569 · **ผู้ตัดสิน:** Por · **สถานะ:** รอ Por รีวิว
**ที่มา:** audit F3 — ตัวเลือก "เปลี่ยนเฉพาะครั้ง" ในหน้าจัดตารางของ staff เดิมเปลี่ยนถาวรแบบหลอก (F3a ซ่อนไว้แล้วใน `0efee80`) · งานนี้ทำของจริง

## 1. เป้าหมาย

คาบเรียน 1 ครั้ง (คาบประจำของ section หนึ่ง ณ วันที่หนึ่ง) ย้ายไปวัน/เวลา/ห้องอื่นได้จริง · ทุกคนที่เกี่ยวข้องเห็นในตารางของสัปดาห์นั้นและได้รับแจ้ง · ไม่มีปุ่มหรือข้อความที่บอกว่าเปลี่ยนแล้วแต่ไม่ได้เปลี่ยน

**สำเร็จเมื่อ:**
- staff ย้ายคาบเฉพาะครั้งได้ และอาจารย์ขอย้ายคาบของตัวเองได้โดย staff อนุมัติ
- นักศึกษา/อาจารย์เห็นการย้ายในตารางรายสัปดาห์ (มีวันที่จริง) และใน dashboard สัปดาห์นี้
- ห้องหรืออาจารย์ไม่มีวันถูกจองซ้อนเพราะการย้าย

## 2. การตัดสินของ Por (7/10/69)

| เรื่อง | ตัดสิน |
|---|---|
| ใครเริ่ม | ทั้ง staff ย้ายเอง และอาจารย์ยื่นขอแล้ว staff อนุมัติ |
| ชนิดการเปลี่ยน | ย้ายวัน/เวลาเท่านั้น (ไม่มีงดคาบ, ไม่มีเปลี่ยนห้องแยก) · ความยาวคาบเท่าเดิม |
| ย้ายได้ไกลแค่ไหน | วันไหนก็ได้ (ไม่ผูกสัปดาห์/เทอม) |
| ห้อง | ห้องเดิมเป็นค่าตั้งต้น เปลี่ยนห้องได้ในฟอร์มเดียวกัน · section ที่ไม่มี facility ต้องเลือกห้องจากรายการห้องในระบบ |
| เช็คชน | ห้องชน / อาจารย์ชน → บล็อก · นักศึกษาชน → เตือน ยังยืนยันได้ |
| แจ้งเตือน | แจ้งในระบบ (ไม่มีอีเมล): ย้าย/ยกเลิก → นักศึกษาที่ลง section + อาจารย์ · ยื่นคำขอ → staff ทุกคน · ปฏิเสธ → อาจารย์ผู้ยื่น |
| การแสดงผล | หน้าตารางเรียน (นักศึกษา/อาจารย์) + หน้าจัดตาราง staff เลื่อนดูทีละสัปดาห์ · dashboard = สัปดาห์นี้ไม่มีปุ่มเลื่อน · หน้า staff มีโหมด "ประจำทุกสัปดาห์" กับ "รายสัปดาห์" |
| วิธีอาจารย์ขอ | กดคาบในตารางรายสัปดาห์ → ฟอร์ม (วันใหม่, เวลาใหม่, ห้อง, เหตุผล) |
| แก้ทีหลัง | ยกเลิก/ย้ายซ้ำได้จนกว่าวันเดิมหรือวันใหม่จะถึง · อาจารย์ถอนคำขอที่ยังรออยู่ได้ |
| ชนกับการย้ายถาวร | ย้ายถาวร (ลากหรือฟอร์มแก้วิชา) ไม่ได้ถ้าคาบนั้นมีการย้ายเฉพาะครั้งค้างอยู่ — ต้องยกเลิกก่อน |
| เก็บข้อมูล | แนวทาง A: ตารางเดียว `ClassMove` |

**สมมติฐาน (Por ไม่ได้แย้ง):** วันที่/เวลาทั้งหมดเป็นวันไทย (`thaiDay` จาก F5) · การเช็คชื่อของคาบที่ย้ายบันทึกตามวันใหม่โดยธรรมชาติ (F5 บันทึกตามวันที่)

## 3. ข้อมูล

```prisma
model ClassMove {
  id             String    @id @default(cuid())
  sectionId      String
  section        Section   @relation(fields: [sectionId], references: [id])
  originalDate   DateTime  // Thai day (UTC midnight)
  originalStart  String    // "HH:MM" Thai
  originalEnd    String
  newDate        DateTime  // Thai day, any date after today
  newStart       String
  newEnd         String    // newStart + (originalEnd - originalStart)
  facilityId     String?
  facility       Facility? @relation(fields: [facilityId], references: [id])
  room           String?   // label kept for display
  status         String    // pending | approved | rejected | withdrawn | cancelled
  reason         String
  requestedById  String    // User id
  decidedById    String?   // User id of the staff who approved/rejected/cancelled
  decidedAt      DateTime?
  decisionNote   String?
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@index([sectionId, originalDate])
  @@index([newDate])
}
```

**กฎ:**
- คาบต้นทาง = `section + originalDate + originalStart` ต้องตรงกับคาบประจำจริง (วันในสัปดาห์ของ `originalDate` ตามวันไทย = `slot.day`, `slot.startTime` = `originalStart`)
- คาบหนึ่ง ณ วันหนึ่ง มีการย้าย "ที่ยังมีผล" (`pending` หรือ `approved`) ได้ 1 รายการ
- "ค้างอยู่" = `pending|approved` และ `min(originalDate, newDate) > วันนี้`
- "แก้ได้" = `min(originalDate, newDate) > วันนี้`

## 4. API (`/api/class-moves`)

| Route | ใคร | ผล |
|---|---|---|
| `GET /?from=YYYY-MM-DD&to=YYYY-MM-DD` | ทุก role ที่ login | การย้ายที่ `originalDate` หรือ `newDate` อยู่ในช่วง · นักศึกษา: `approved` ของ section ที่ลง (ไม่ถอน) · อาจารย์: วิชาตัวเองทุกสถานะ · staff/admin: ทั้งหมด · บริษัท: 403 |
| `POST /check` | staff, อาจารย์ (วิชาตัวเอง) | ไม่บันทึก · `{ roomClashes, lecturerClashes, studentClashes: [{ courseCode, count }] }` |
| `POST /` | staff → `approved` · อาจารย์ (วิชาตัวเอง) → `pending` | body `{ sectionId, originalDate, originalStart, newDate, newStart, facilityId?, reason }` · 201 + `studentClashes` |
| `GET /pending` | staff, admin | คำขอที่รอ |
| `POST /:id/approve` | staff, admin | เช็คชน + วันใหม่อีกรอบ → `approved` |
| `POST /:id/reject` `{ note }` | staff, admin | → `rejected` |
| `POST /:id/withdraw` | อาจารย์ผู้ยื่น | เฉพาะ `pending` → `withdrawn` |
| `POST /:id/cancel` | staff, admin | เฉพาะ `approved` ที่แก้ได้ → `cancelled` |

**รหัสตอบกลับ:** วันไม่ใช่อนาคต / คาบต้นทางไม่ตรง / ไม่มีห้อง = 400 · ไม่ใช่วิชาตัวเอง / role ไม่มีสิทธิ์ = 403 · ห้องชน / อาจารย์ชน / มีการย้ายที่ยังมีผลอยู่แล้ว / สถานะไม่ถูก / เลยวัน = 409 พร้อม `details` (รายการที่ชน: วิชา, ห้อง, วัน, เวลา)

**ย้ายซ้ำ:**
- staff: ถ้ามี `approved` ของคาบเดียวกัน → `cancelled` อันเดิม + สร้างใหม่ ใน transaction เดียว · ถ้ามี `pending` → 409 (ตัดสินคำขอก่อน)
- อาจารย์: ถ้ามี `pending` หรือ `approved` อยู่แล้ว → 409

**ตรวจชน ณ วัน D เวลา [s, e):** ช่วงเวลาที่ไม่ว่าง = คาบประจำวันนั้น (ตามวันในสัปดาห์ ของวิชาที่ `active` ในเทอมเดียวกับวิชาต้นทาง) − คาบที่ถูกย้ายออกจากวัน D (`approved`) + คาบที่ถูกย้ายเข้าวัน D (`approved`) · ไม่นับการย้ายที่กำลังแก้อยู่เอง
- ห้อง: ตาม `facilityId`
- อาจารย์: ทุกวิชาที่ `lecturerId` เดียวกัน
- นักศึกษา: ทุกนักศึกษาที่ลง section ต้นทาง (ไม่ถอน) เทียบกับ section อื่นที่เขาลง → นับต่อวิชา

**กันพร้อมกัน:** `POST /`, approve, cancel ทำใน transaction ที่ `SELECT … FOR UPDATE` แถว Section ต้นทาง (แบบ F4) แล้วตรวจกฎ "1 รายการที่ยังมีผล" ภายใน lock

**การย้ายถาวร:** `PATCH /courses/:id` ที่ทำให้คาบประจำซึ่งมีการย้ายค้างอยู่หายไปหรือเปลี่ยนวัน/เวลาเริ่ม → 409 `details: [{ moveId, originalDate, originalStart, newDate, newStart }]`

**แจ้งเตือน:** `createNotification` / `createNotificationsForRole` · `actionUrl` = `/schedule?week=YYYY-MM-DD` (staff: `/schedule-management?week=…`) · การแจ้งล้มไม่ทำให้การย้ายล้ม แต่ `console.error` พร้อม move id

## 5. หน้าจอ

**ตรรกะกลาง** (`src/lib/timetable.ts`, pure):
- `weekOf(date): string` — วันจันทร์ (YYYY-MM-DD) ของสัปดาห์ตามวันไทย
- `weekOccurrences(entries, weekStart, moves)` → คาบที่มีวันที่จริงของ 7 วัน: คาบปกติ · คาบที่ย้ายออก (ช่องจาง + ป้าย "ย้ายไป …", ไม่กินเลน) · คาบที่ย้ายเข้า (ป้าย "ย้ายมาจาก …", ห้องใหม่)

**ตารางรายสัปดาห์ (`/schedule` นักศึกษา/อาจารย์):** ‹ › + "สัปดาห์นี้" + ช่วงวันที่ · หัวคอลัมน์มีวันที่ · รับ `?week=` จากลิงก์แจ้งเตือน · อาจารย์กดคาบของตัวเองที่แก้ได้ → ฟอร์มขอย้าย · คาบที่มีคำขอรอ → ป้าย "รออนุมัติ" + ถอนได้ · นักศึกษาดูอย่างเดียว

**ฟอร์มย้าย/ขอย้าย (dialog เดียว):** คาบเดิม (อ่านอย่างเดียว) · วันใหม่ (date picker, หลังวันนี้) · เวลาเริ่ม (ทีละ 30 นาที, เวลาจบคำนวณให้) · ห้อง (ห้องที่เปิดใช้, ค่าตั้งต้นห้องเดิม) · เหตุผล (บังคับ) · เรียก `/check` เมื่อค่าเปลี่ยน: 🔴 ห้อง/อาจารย์ชน → ปุ่มยืนยันกดไม่ได้ · 🟡 นักศึกษาชน → กดได้ · ส่งล้ม → dialog ไม่ปิด ข้อมูลไม่หาย มีข้อความ

**หน้าจัดตาราง staff:** สวิตช์ "ประจำทุกสัปดาห์" (ลากถาวร แบบ F3a) / "รายสัปดาห์" (เลื่อนสัปดาห์, ลากในสัปดาห์ → ฟอร์มกรอกวัน/เวลาให้, กดคาบ → ฟอร์มเปล่า, กดคาบที่ย้ายแล้ว → รายละเอียด + ยกเลิก) · ลากถาวรโดน 409 → แสดงรายการการย้ายที่ต้องยกเลิกก่อน · แผงคำขอ (แทนแผงคำร้องของ F3a): อาจารย์ · วิชา/ตอน · เดิม → ใหม่ · ห้อง · เหตุผล · ผลเช็คชนล่าสุด · อนุมัติ / ปฏิเสธ (ต้องใส่เหตุผล)

**Dashboard (นักศึกษา, PersonalDashboard, อาจารย์) และ "คาบวันนี้":** ใช้ `weekOccurrences` ของสัปดาห์นี้

**ไม่ทำ:** หน้าประวัติการย้ายแยก · export .ics · ย้ายหลายคาบพร้อมกัน · อีเมล · งดคาบ

## 6. การทดสอบ

- **Backend unit** (`class-move-rules.ts`): `occurrenceExists` (วันในสัปดาห์ตามวันไทย) · `editable` (ขอบ = วันนี้พอดี) · `busyOn(date, slots, moves)` (ประจำ − ย้ายออก + ย้ายเข้า) · overlap ขอบชนพอดีไม่นับ
- **Backend API** (สร้างข้อมูลใหม่ทุกเทสต์): staff ย้าย → approved + แจ้ง · อาจารย์ขอวิชาตัวเอง → pending + staff ได้แจ้ง · วิชาคนอื่น/นักศึกษา → 403 · ห้องชน (ประจำ และคาบที่ย้ายมา) → 409 · ห้องว่างเพราะคาบประจำย้ายออก → ผ่าน · อาจารย์ชน → 409 · นักศึกษาชน → 201 + studentClashes · คาบต้นทางผิด / วันไม่ใช่อนาคต → 400 · ย้ายซ้ำ → cancelled + ใหม่ · pending ค้าง → staff 409 · ยกเลิกก่อน/หลังถึงวัน (`vi.setSystemTime`) · อนุมัติตอนห้องไม่ว่างแล้ว → 409 ยัง pending · ปฏิเสธ → แจ้งอาจารย์ · ถอน approved → 409 · `PATCH /courses` ทับคาบที่มีการย้ายค้าง → 409 / คาบอื่น → ผ่าน · `POST` พร้อมกัน 2 อัน → 201 + 409
- **Frontend unit:** `weekOf` · `weekOccurrences` (ย้ายออก, ย้ายเข้า, ข้ามสัปดาห์, ช่องจางไม่กินเลน)
- **E2E:** staff ย้ายในโหมดรายสัปดาห์ → นักศึกษาเห็นช่องจาง + คาบที่ย้ายมา + แจ้งเตือน · อาจารย์ขอ → staff อนุมัติในแผง → ตารางอาจารย์เปลี่ยน · ฟอร์ม 🔴 ปุ่มกดไม่ได้ / 🟡 กดได้ · ลากถาวรคาบที่มีการย้ายค้าง → ขึ้นรายการ · ข้อมูลที่สร้าง park ไป academicYear 2500 ตอนจบ

## 7. ลำดับงาน (แผนเดียว ~6 task)

1. migration `ClassMove` + `class-move-rules.ts`
2. API สร้าง / เช็ค / อ่าน
3. API อนุมัติ / ปฏิเสธ / ถอน / ยกเลิก + แจ้งเตือน
4. ตัวกันการย้ายถาวรใน `PATCH /courses`
5. `weekOccurrences` + ตารางรายสัปดาห์ + dashboard
6. ฟอร์ม + หน้า staff + แผงคำขอ

commit แยก backend (1–4) / frontend (5–6) · migration apply กับ dev ด้วย `prisma migrate deploy` เท่านั้น
