# คู่มือ Deploy DII CAMT ShowPro ขึ้น Render

คู่มือนี้อธิบายวิธี deploy โปรเจ็กต์นี้ขึ้น Render โดยอิงจากโครงสร้างปัจจุบันของ repo:

- Frontend: React + Vite ที่ root project
- Backend: Express + Prisma + PostgreSQL ที่ `backend/`
- Frontend เรียก API ผ่าน `VITE_API_BASE_URL`
- Backend ใช้ JWT, CORS, Socket.IO, Prisma และไฟล์อัปโหลด

## สรุปสั้น ๆ

วิธีที่เหมาะกับ repo นี้บน Render คือแยกเป็น 3 ส่วน:

- Frontend เป็น Render Static Site
- Backend เป็น Render Web Service
- Database เป็น Render PostgreSQL หรือ PostgreSQL ภายนอก

ไม่แนะนำให้พยายามยัดทุกอย่างลง service เดียว เพราะ backend นี้มี:

- Express server ที่รันยาว
- Socket.IO realtime connection
- automation/background process
- file upload ที่เขียนลง disk
- Prisma ต่อกับ PostgreSQL

## สิ่งที่ต้องเตรียม

ก่อน deploy ควรมี:

- GitHub repository ที่ push โค้ดเรียบร้อยแล้ว
- Render account
- URL ของ frontend และ backend ที่จะใช้จริง
- PostgreSQL database สำหรับ production
- ค่า `JWT_SECRET` ใหม่สำหรับ production

## ค่า Environment ที่ backend ใช้

จากโค้ด backend ปัจจุบัน ตัวแปรสำคัญคือ:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend.onrender.com
UPLOAD_DIR=storage/uploads
PRIVATE_FILE_TTL_MINUTES=30
AUTOMATION_POLL_SECONDS=60
PDF_FONT_PATH=
```

หมายเหตุ:

- Render จะกำหนด `PORT` ให้กับ Web Service เองได้ และ backend ของโปรเจ็กต์นี้อ่านค่าจาก environment อยู่แล้ว
- ถ้าใช้ upload แบบ local บน Render ให้ระวังว่า filesystem ปกติเป็นแบบชั่วคราว ควรใช้ Persistent Disk หรือย้ายไฟล์ไป object storage

## 1) Deploy Frontend เป็น Render Static Site

### ตั้งค่าใน Render

สร้าง Static Site ใหม่แล้วเลือก repository นี้ จากนั้นตั้งค่าประมาณนี้:

```text
Root Directory: .
Build Command: npm ci && npm run build
Publish Directory: dist
```

### ตั้งค่า Environment Variable ฝั่ง Frontend

ในหน้าตั้งค่า Environment Variables เพิ่ม:

```env
VITE_API_BASE_URL=https://your-backend.onrender.com/api
```

ถ้าใช้ custom domain กับ backend ให้ใส่ URL ของ backend จริงแทนโดเมน Render

### ตั้งค่า SPA fallback

ถ้าโปรเจ็กต์ใช้ React Router และมีหน้าเช่น `/login`, `/dashboard`, `/students` ให้ตั้งค่า rewrite/redirect ของ Static Site ให้ทุก path กลับไปที่ `index.html`

ถ้าไม่ตั้งค่านี้ refresh หน้า deep link อาจเจอ 404

## 2) Deploy Backend เป็น Render Web Service

### ตั้งค่าใน Render

สร้าง Web Service ใหม่แล้วเลือก repository เดิม จากนั้นตั้งค่า:

```text
Root Directory: backend
Build Command: npm ci && npx prisma generate && npm run build
Start Command: npm start
```

### เหตุผลที่ใช้คำสั่งนี้

- `npx prisma generate` สร้าง Prisma Client ให้พร้อมใช้งาน
- `npm run build` คอมไพล์ TypeScript ไปที่ `dist/`
- `npm start` รันไฟล์ที่ build แล้วจาก `dist/src/server.js`

### ตั้งค่า Environment Variable ฝั่ง Backend

```env
NODE_ENV=production
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public
JWT_SECRET=replace-with-a-long-random-secret-at-least-16-chars
JWT_EXPIRES_IN=7d
CORS_ORIGIN=https://your-frontend.onrender.com
UPLOAD_DIR=storage/uploads
PRIVATE_FILE_TTL_MINUTES=30
AUTOMATION_POLL_SECONDS=60
PDF_FONT_PATH=
```

### ค่าที่ต้องระวัง

- `DATABASE_URL` ต้องชี้ไปยังฐานข้อมูล production จริง
- `CORS_ORIGIN` ต้องใส่โดเมนของ frontend ที่ deploy บน Render หรือ custom domain
- ถ้า backend จะรับไฟล์ต่อเนื่อง ควรใช้ Persistent Disk หรือ storage ภายนอก เพราะ disk ปกติบน platform อาจไม่ถาวร

## 3) Deploy Database

ตัวเลือกที่ง่ายสุดคือใช้ Render PostgreSQL

### ถ้าใช้ Render PostgreSQL

1. สร้าง PostgreSQL service บน Render
2. คัดลอก Internal Database URL หรือ External Database URL
3. นำค่าไปใส่ใน `DATABASE_URL` ของ backend

### ซิงก์ schema ครั้งแรก

โปรเจ็กต์นี้ยังไม่มี migrations ใน `backend/prisma/` ดังนั้นวิธีตรงสุดคือใช้:

```powershell
npx prisma db push --schema backend/prisma/schema.prisma
```

รันคำสั่งนี้หลังตั้ง `DATABASE_URL` production แล้ว เพื่อให้ schema ในฐานข้อมูลตรงกับโค้ด

ถ้าต้องการ workflow ที่เป็น migration มากขึ้นในอนาคต ค่อยสร้าง migration แยกเพิ่มภายหลัง

## 4) ลำดับการ deploy ที่แนะนำ

1. Push โค้ดขึ้น GitHub
2. สร้าง Render PostgreSQL
3. สร้าง Render Web Service สำหรับ backend
4. ตั้ง `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN` ให้ backend
5. รัน `npx prisma db push` เพื่อสร้าง schema ครั้งแรก
6. สร้าง Render Static Site สำหรับ frontend
7. ตั้ง `VITE_API_BASE_URL` ให้ชี้ไป backend production
8. Deploy ทั้งสอง service อีกครั้งเมื่อ env พร้อม

## 5) ตรวจสอบหลัง deploy

หลังระบบขึ้นแล้ว ให้ทดสอบอย่างน้อย:

- เปิดหน้าเว็บหลักได้
- Refresh หน้า `/login` หรือ route อื่น ๆ แล้วไม่เจอ 404
- Login ได้และเรียก API ได้จริง
- เรียก `https://your-backend.onrender.com/health` แล้วได้สถานะปกติ
- Socket.IO หรือ realtime ที่ใช้ในระบบยังเชื่อมต่อได้
- ถ้ามีอัปโหลดไฟล์ ให้ลองอัปโหลดและดาวน์โหลดจริง

## 6) ปัญหาที่พบบ่อย

### frontend เรียก localhost แทน backend production

สาเหตุ:

- ลืมตั้ง `VITE_API_BASE_URL`
- ตั้งแล้วแต่ยังไม่ได้ redeploy frontend เพราะ `VITE_*` ถูก bake ตอน build

### เปิดหน้า route แล้วเจอ 404

สาเหตุ:

- ยังไม่ได้ตั้ง SPA rewrite ให้ Render Static Site

### backend ต่อ database ไม่ได้

สาเหตุที่เจอบ่อย:

- `DATABASE_URL` ผิด
- database ยังไม่พร้อมใช้งาน
- firewall หรือ network ของ provider บล็อกการเชื่อมต่อ

### ไฟล์อัปโหลดหายหลัง deploy ใหม่

สาเหตุ:

- ใช้ filesystem ปกติของ Render ซึ่งไม่ถาวร

วิธีแก้:

- ใช้ Persistent Disk
- หรือย้ายไฟล์ไป object storage เช่น S3, R2, Supabase Storage

### Socket.IO ไม่เสถียร

สาเหตุที่เป็นไปได้:

- ใช้ plan ที่ service sleep ได้
- reverse proxy หรือ CORS ไม่ตรง

วิธีแก้:

- ใช้ Web Service ที่ always on
- ตรวจ `CORS_ORIGIN` ให้ตรงกับ frontend domain

## 7) ถ้าต้องการให้ใช้งานจริงแบบ production

ถ้าเป็นระบบที่ต้องเปิดตลอดและมี realtime แนะนำ:

- Frontend: Render Static Site
- Backend: Render Web Service แบบ always on
- Database: Render PostgreSQL หรือ managed PostgreSQL
- File storage: Persistent Disk หรือ object storage

แนวทางนี้เหมาะกับโค้ดปัจจุบันมากที่สุด และไม่ต้อง refactor backend หนักเหมือนการย้ายไป serverless

## Checklist สุดท้าย

- [ ] ตั้ง `VITE_API_BASE_URL` เป็น backend production แล้ว
- [ ] ตั้ง `DATABASE_URL` ถูกต้องแล้ว
- [ ] ตั้ง `JWT_SECRET` ใหม่สำหรับ production แล้ว
- [ ] ตั้ง `CORS_ORIGIN` ให้ตรงกับ frontend แล้ว
- [ ] รัน `npx prisma db push` กับฐานข้อมูล production แล้ว
- [ ] ตั้ง SPA rewrite สำหรับ frontend แล้ว
- [ ] ทดสอบ `health` endpoint แล้ว
- [ ] ทดสอบ login, API หลัก และ upload file แล้ว
