# คู่มือ Deploy DII CAMT ShowPro ขึ้น Vercel

คู่มือนี้อธิบายว่าถ้าจะ deploy โปรเจกต์นี้ขึ้น Vercel ต้องเปลี่ยนหรือแก้ไขอะไรบ้าง โดยอ้างอิงจากโครงสร้างปัจจุบัน:

- Frontend: React + Vite อยู่ที่ root project
- Backend: Express + Prisma + PostgreSQL อยู่ใน `backend/`
- Frontend เรียก API ผ่าน `VITE_API_BASE_URL`
- Backend ใช้ JWT, CORS, Prisma, Socket.IO และ file upload

## สรุปสั้น ๆ

ถ้าจะใช้ Vercel แบบตรงที่สุด แนะนำให้ deploy เฉพาะ frontend ขึ้น Vercel แล้วให้ backend อยู่ที่ VPS, Render, Railway, Fly.io หรือบริการ Node.js ที่รัน process ยาวได้

ไม่แนะนำให้เอา backend ปัจจุบันขึ้น Vercel Serverless ตรง ๆ เพราะ backend นี้มี:

- Express server แยก process
- Socket.IO realtime connection
- local upload directory ผ่าน `UPLOAD_DIR`
- background automation/polling
- Prisma ต่อ PostgreSQL

สิ่งเหล่านี้เหมาะกับ server ที่รันยาวมากกว่า serverless function

## สิ่งที่ต้องแก้/ตั้งค่าก่อนขึ้น Vercel

### 1. ต้องมี `vercel.json`

โปรเจกต์นี้ใช้ React Router ถ้าเปิดหน้าตรง ๆ เช่น `/login`, `/dashboard`, `/students` บน Vercel อาจเจอ 404 หลัง refresh ได้ จึงต้องมี rewrite กลับไปที่ `index.html`

ไฟล์ที่ต้องมีที่ root project:

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 2. ตั้งค่า Environment Variable บน Vercel

ใน Vercel Dashboard ไปที่:

`Project Settings` -> `Environment Variables`

เพิ่มค่า:

```env
VITE_API_BASE_URL=https://api.example.com/api
```

ให้เปลี่ยน `https://api.example.com/api` เป็น URL backend จริง เช่น:

```env
VITE_API_BASE_URL=https://showpro-api.example.com/api
```

หรือถ้า backend อยู่ path เดียวกับ domain หลักผ่าน reverse proxy:

```env
VITE_API_BASE_URL=https://showpro.example.com/api
```

ข้อควรระวัง: ตัวแปร `VITE_*` จะถูกฝังเข้าไปตอน build ถ้าเปลี่ยนค่าแล้วต้อง redeploy frontend ใหม่

### 3. ตั้งค่า CORS ที่ backend

ใน `backend/.env` ของ server ที่รัน backend ต้องเพิ่ม domain ของ Vercel ใน `CORS_ORIGIN`

ตัวอย่าง production:

```env
CORS_ORIGIN="https://showpro.example.com,https://dii-camt-showprogroup.vercel.app"
```

ถ้าใช้ custom domain แล้ว แนะนำให้ใส่ custom domain เป็นหลัก:

```env
CORS_ORIGIN="https://showpro.example.com"
```

หลังแก้ `CORS_ORIGIN` ต้อง restart backend

### 4. ตั้งค่า Vercel Build Settings

ในหน้า Vercel Project Settings ให้ใช้ค่าต่อไปนี้:

```text
Framework Preset: Vite
Root Directory: ./
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

ถ้า Vercel ตรวจเจอเองเป็น Vite อยู่แล้วไม่ต้องแก้มาก แต่ควรตรวจว่า Output Directory เป็น `dist`

### 5. Backend ต้อง deploy แยก

ตัวเลือกที่แนะนำ:

- VPS เดิมตามคู่มือ `VPS_DEPLOYMENT_GUIDE_TH.md`
- Render Web Service
- Railway
- Fly.io
- DigitalOcean App Platform

Backend ต้องมี environment ประมาณนี้:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/showpro?schema=public"
JWT_SECRET="GENERATE_A_LONG_RANDOM_SECRET_HERE"
JWT_EXPIRES_IN=7d
CORS_ORIGIN="https://showpro.example.com"
UPLOAD_DIR="storage/uploads"
PRIVATE_FILE_TTL_MINUTES=30
AUTOMATION_POLL_SECONDS=60
PDF_FONT_PATH=
```

และต้องรันคำสั่ง:

```bash
npm ci --prefix backend
npm run backend:generate
npm run backend:push
npm run backend:build
npm run start --prefix backend
```

ถ้าใช้ VPS/PM2:

```bash
cd backend
pm2 start dist/src/server.js --name showpro-api
pm2 save
```

### 6. Database ต้องเป็น PostgreSQL ที่เข้าถึงจาก backend ได้

ถ้า backend อยู่คนละเครื่องกับ database ให้ตั้ง `DATABASE_URL` เป็น connection string ของ database จริง

ตัวเลือก database:

- PostgreSQL บน VPS
- Supabase Postgres
- Neon
- Railway Postgres
- Render PostgreSQL

ถ้าใช้ Neon/Supabase และเปิด SSL ให้ตรวจ connection string จาก provider โดยตรง

### 7. File upload ต้องระวัง

Backend ปัจจุบันเก็บไฟล์ไว้ใน local directory:

```env
UPLOAD_DIR="storage/uploads"
```

ถ้า backend อยู่บน VPS แบบมี disk ถาวร ใช้แบบนี้ได้ แต่ต้อง backup folder นี้ด้วย

ถ้า backend อยู่บน platform ที่ filesystem ไม่ถาวร เช่น serverless หรือ container ที่ redeploy แล้วไฟล์หาย ควรย้าย upload ไปเก็บที่ object storage เช่น:

- S3
- Cloudflare R2
- Supabase Storage
- DigitalOcean Spaces

## ขั้นตอน Deploy Frontend ขึ้น Vercel

1. Push code ขึ้น GitHub

```powershell
git add .
git commit -m "Add Vercel deployment config"
git push
```

2. ไปที่ Vercel แล้วกด `Add New Project`

3. เลือก repository นี้

4. ตั้งค่า build:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm ci
```

5. เพิ่ม Environment Variable:

```env
VITE_API_BASE_URL=https://YOUR_BACKEND_DOMAIN/api
```

6. กด Deploy

7. หลัง deploy เสร็จ ให้เอา Vercel domain ไปใส่ใน backend `CORS_ORIGIN`

ตัวอย่าง:

```env
CORS_ORIGIN="https://dii-camt-showprogroup.vercel.app"
```

8. Restart backend

9. ทดสอบหน้าเว็บ:

- `https://YOUR_VERCEL_DOMAIN/`
- `https://YOUR_VERCEL_DOMAIN/login`
- refresh หน้า `/login` ต้องไม่ 404
- ทดสอบ login/register
- เปิด DevTools แล้วดูว่า API เรียกไปที่ backend production ไม่ใช่ `localhost:4000`

## Checklist ก่อนใช้งานจริง

- [ ] มี `vercel.json` สำหรับ React Router fallback
- [ ] Vercel ตั้ง `VITE_API_BASE_URL` เป็น backend production URL แล้ว
- [ ] Backend ตั้ง `CORS_ORIGIN` เป็น Vercel/custom domain แล้ว
- [ ] Backend ใช้ HTTPS
- [ ] Database production พร้อมใช้งาน
- [ ] รัน Prisma generate และ push/migrate แล้ว
- [ ] `JWT_SECRET` เป็นค่าใหม่สำหรับ production
- [ ] ไม่ commit `.env` หรือ `backend/.env`
- [ ] ถ้ามี upload file ต้องมีแผนเก็บไฟล์ถาวรและ backup
- [ ] ทดสอบ refresh ทุก route สำคัญแล้วไม่เจอ 404
- [ ] ทดสอบ login/register และ API สำคัญแล้ว

## ถ้าต้องการให้ทั้ง frontend และ backend อยู่บน Vercel จริง ๆ

ทำได้ แต่ต้อง refactor backend พอสมควร:

- แปลง Express routes เป็น Vercel Serverless Functions หรือ framework ที่รองรับ serverless
- ตัดหรือเปลี่ยน Socket.IO เพราะ serverless ไม่เหมาะกับ long-lived WebSocket
- ย้าย file upload ไป object storage
- เปลี่ยน background automation เป็น cron job หรือ external worker
- ตรวจ Prisma connection pooling โดยเฉพาะถ้าใช้ serverless

สำหรับ repo เวอร์ชันปัจจุบัน แนวทางที่เสถียรกว่าคือ:

```text
Vercel = Frontend
VPS/Render/Railway/Fly.io = Backend
PostgreSQL managed service หรือ PostgreSQL บน VPS = Database
```

