# Walkthrough: นำเข้ารายวิชาด้วย CSV/Excel

## รูปแบบไฟล์

รองรับไฟล์ `.csv`, `.xlsx`, `.xls` โดยใช้ worksheet แรก และแถวแรกต้องเป็น header

คอลัมน์ที่แนะนำ:

```csv
code,name,nameThai,credits,semester,academicYear,year,lecturerId,maxStudents,minStudents,description,syllabus
DII101,Digital Industry Fundamentals,พื้นฐานอุตสาหกรรมดิจิทัล,3,1,2569,1,LECTURER_PROFILE_ID,60,1,Introductory course,Course outline
```

คอลัมน์บังคับ:

- `code`
- `name`
- `nameThai`
- `credits`
- `semester`
- `academicYear`
- `year`

ถ้าไม่ใส่ `lecturerId` ระบบจะใช้ “ผู้สอนเริ่มต้นสำหรับไฟล์นำเข้า” ที่เลือกในหน้า Courses

## วิธีใช้งาน

1. เข้าเมนู Staff > หลักสูตร & รายวิชา
2. กด `Template` เพื่อดาวน์โหลดไฟล์ตัวอย่าง
3. เปิดไฟล์ด้วย Excel หรือ Google Sheets แล้วกรอกข้อมูลรายวิชา
4. เลือกผู้สอนเริ่มต้นในกล่อง Walkthrough ถ้าไฟล์ไม่ได้ใส่ `lecturerId`
5. กด `นำเข้า CSV/Excel` แล้วเลือกไฟล์
6. ระบบจะสร้างรายวิชาใหม่ผ่าน API และข้ามแถวที่รหัสวิชาซ้ำกับข้อมูลเดิม

## หมายเหตุ

- `lecturerId` ต้องเป็น ID ของ LecturerProfile ไม่ใช่ user email
- ไฟล์ Excel ใช้ sheet แรกเท่านั้น
- แถวที่ไม่มี `code`, `name`, หรือ `nameThai` จะไม่นำเข้า
