# บันทึกการ Setup ระบบบนเครื่อง Local

## ปัญหาที่เจอและวิธีแก้

### 1. Authentication failed against database (P1000)

**สาเหตุ:** `backend/.env.example` ใช้ credentials `showpro:showpro` แต่ `docker-compose.yml` สร้าง PostgreSQL ด้วย user `postgres` / password `postgres`

**แก้ไข:** เปิด `backend/.env` แล้วเปลี่ยน `DATABASE_URL`:

```env
# จาก
DATABASE_URL=postgresql://showpro:showpro@localhost:5432/showpro?schema=public

# เป็น
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/showpro?schema=public
```

---

### 2. ZodError: Invalid url (PASSWORD_RESET_WEBHOOK_URL)

**สาเหตุ:** ฟิลด์ `PASSWORD_RESET_WEBHOOK_URL` ใน `backend/.env` ว่างอยู่ แต่ Zod schema บังคับให้เป็น URL ที่ valid

**แก้ไข:** เปิด `backend/.env` แล้วใส่ค่า placeholder:

```env
PASSWORD_RESET_WEBHOOK_URL=http://localhost
```

---

## ขั้นตอน Setup ทั้งหมด (ทำครั้งแรกครั้งเดียว)

```powershell
# 1. Copy env files
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env

# 2. แก้ไข backend\.env ตามด้านบน (2 จุด)

# 3. เปิด PostgreSQL
cd backend
docker compose up -d
cd ..

# 4. ติดตั้ง dependencies
npm install
npm run backend:install

# 5. Setup ฐานข้อมูล
npm run backend:generate
npm run backend:push
npm run backend:seed
```

---

## วิธีรันระบบ (ทุกครั้งที่จะใช้งาน)

เปิด **2 terminal**:

**Terminal 1 — Backend:**
```powershell
cd "C:\Users\porde\Desktop\DII sHOWPRO\dii-camt-showprogroup"
npm run backend:dev
```

**Terminal 2 — Frontend:**
```powershell
cd "C:\Users\porde\Desktop\DII sHOWPRO\dii-camt-showprogroup"
npm run dev
```

---

## URLs

| Service | URL |
|---|---|
| Frontend | http://localhost:8080 |
| Backend API | http://localhost:4000/api |
| Backend Health | http://localhost:4000/health |
| API Docs (Swagger) | http://localhost:4000/api/docs |

---

## Demo Accounts (รหัสผ่านทุกบัญชี: `Password123!`)

| Role | Email |
|---|---|
| Admin | admin@showpro.local |
| Staff | staff@showpro.local |
| Lecturer | narin@showpro.local |
| Company | talent@northernsoft.local |
| Student | alice@student.showpro.local |
