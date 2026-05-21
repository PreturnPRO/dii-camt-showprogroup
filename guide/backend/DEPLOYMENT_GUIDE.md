# คู่มือติดตั้งและ Deploy DII CAMT ShowPro ขึ้น VPS

คู่มือนี้ครอบคลุมตั้งแต่การตั้งค่าโปรเจกต์บนเครื่องพัฒนา ไปจนถึงการเปิดใช้งานจริงบน VPS ด้วย Ubuntu, PostgreSQL, Nginx, PM2 และ SSL

> ตัวอย่างนี้ใช้โดเมน `showpro.example.com` ให้เปลี่ยนเป็นโดเมนจริงของคุณทุกจุด

## 1. โครงสร้างระบบ

ระบบนี้แยกเป็น 2 ส่วนหลัก

- Frontend: React + Vite อยู่ที่ root project
- Backend: Express + Prisma + PostgreSQL อยู่ที่ `backend/`

พอร์ตมาตรฐานตอนพัฒนา:

- Frontend dev: `http://localhost:8080`
- Backend API: `http://localhost:4000`
- API base path: `/api`
- Socket.IO: ใช้ origin เดียวกับ backend

## 2. สิ่งที่ต้องมี

บนเครื่องพัฒนา:

- Node.js 20 LTS หรือใหม่กว่า
- npm
- Git
- Docker Desktop หรือ PostgreSQL local

บน VPS:

- Ubuntu 22.04 หรือ 24.04
- RAM อย่างน้อย 2 GB
- Node.js 20 LTS
- PostgreSQL 16 หรือ Docker PostgreSQL
- Nginx
- PM2
- โดเมนที่ชี้ A record มาที่ IP ของ VPS

## 3. ตั้งค่า Local Development

ติดตั้ง dependency ฝั่ง frontend:

```powershell
npm install
```

ติดตั้ง dependency ฝั่ง backend:

```powershell
npm run backend:install
```

คัดลอก env:

```powershell
Copy-Item .env.example .env
Copy-Item backend\.env.example backend\.env
```

ตั้งค่า `.env` ฝั่ง frontend:

```env
VITE_API_BASE_URL=http://localhost:4000/api
```

ตั้งค่า `backend/.env` สำหรับ local:

```env
NODE_ENV=development
PORT=4000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/showpro?schema=public"
JWT_SECRET="replace-with-a-long-random-secret-at-least-16-chars"
JWT_EXPIRES_IN=7d
CORS_ORIGIN="http://localhost:8080,http://localhost:5173,http://127.0.0.1:8080,http://127.0.0.1:5173"
UPLOAD_DIR="storage/uploads"
PRIVATE_FILE_TTL_MINUTES=30
AUTOMATION_POLL_SECONDS=60
PDF_FONT_PATH=
```

สร้าง JWT secret ใหม่:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

นำค่าที่ได้ไปแทน `JWT_SECRET`

## 4. เปิด Database ตอนพัฒนา

ใช้ Docker Compose ที่อยู่ใน `backend/`:

```powershell
cd backend
docker compose up -d
cd ..
```

สร้าง Prisma Client และ push schema:

```powershell
npm run backend:generate
npm run backend:push
```

ใส่ข้อมูลตัวอย่าง:

```powershell
npm run backend:seed
```

บัญชี demo ใช้รหัสผ่าน `Password123!`

- `admin@showpro.local`
- `staff@showpro.local`
- `narin@showpro.local`
- `talent@northernsoft.local`
- `alice@student.showpro.local`

## 5. รันระบบบนเครื่อง

เปิด backend:

```powershell
npm run backend:dev
```

เปิด frontend อีก terminal:

```powershell
npm run dev
```

เข้าใช้งาน:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:4000/health`
- API docs JSON: `http://localhost:4000/api/docs.json`

## 6. ตรวจความพร้อมก่อน Deploy

รันชุดตรวจทั้งหมด:

```powershell
npm run check
```

ตรวจช่องโหว่ dependency:

```powershell
npm audit
npm audit --prefix backend
```

ผลที่ควรได้:

- TypeScript ผ่าน
- Frontend build ผ่าน
- Backend validate ผ่าน
- Prisma schema valid
- Audit ไม่มี vulnerability ที่ต้องแก้ก่อน production

## 7. เตรียม VPS

SSH เข้า VPS:

```bash
ssh root@YOUR_SERVER_IP
```

อัปเดตระบบ:

```bash
apt update && apt upgrade -y
```

ติดตั้งเครื่องมือพื้นฐาน:

```bash
apt install -y git curl ufw nginx
```

ตั้ง firewall:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

## 8. ติดตั้ง Node.js

ติดตั้ง Node.js 20 LTS:

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
node -v
npm -v
```

ติดตั้ง PM2:

```bash
npm install -g pm2
pm2 -v
```

## 9. ติดตั้ง PostgreSQL บน VPS

ทางเลือกที่แนะนำสำหรับ VPS เดี่ยวคือ PostgreSQL package:

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

สร้าง database และ user:

```bash
sudo -u postgres psql
```

ใน psql:

```sql
CREATE DATABASE showpro;
CREATE USER showpro_user WITH ENCRYPTED PASSWORD 'CHANGE_THIS_STRONG_DB_PASSWORD';
GRANT ALL PRIVILEGES ON DATABASE showpro TO showpro_user;
\q
```

ให้สิทธิ์ schema:

```bash
sudo -u postgres psql -d showpro
```

ใน psql:

```sql
GRANT ALL ON SCHEMA public TO showpro_user;
ALTER SCHEMA public OWNER TO showpro_user;
\q
```

DATABASE_URL ที่ใช้บน VPS:

```env
DATABASE_URL="postgresql://showpro_user:CHANGE_THIS_STRONG_DB_PASSWORD@localhost:5432/showpro?schema=public"
```

## 10. Clone โปรเจกต์บน VPS

สร้างโฟลเดอร์แอป:

```bash
mkdir -p /var/www
cd /var/www
git clone YOUR_GIT_REPOSITORY_URL showpro
cd showpro
```

ติดตั้ง dependency:

```bash
npm ci
npm ci --prefix backend
```

ถ้า repository ยังไม่มี lockfile ที่ตรงกับเครื่อง production ให้ใช้:

```bash
npm install
npm install --prefix backend
```

## 11. ตั้งค่า Environment บน VPS

สร้าง frontend env:

```bash
nano .env
```

ใส่:

```env
VITE_API_BASE_URL=https://showpro.example.com/api
```

สร้าง backend env:

```bash
nano backend/.env
```

ใส่:

```env
NODE_ENV=production
PORT=4000
DATABASE_URL="postgresql://showpro_user:CHANGE_THIS_STRONG_DB_PASSWORD@localhost:5432/showpro?schema=public"
JWT_SECRET="GENERATE_A_LONG_RANDOM_SECRET_HERE"
JWT_EXPIRES_IN=7d
CORS_ORIGIN="https://showpro.example.com"
UPLOAD_DIR="storage/uploads"
PRIVATE_FILE_TTL_MINUTES=30
AUTOMATION_POLL_SECONDS=60
PDF_FONT_PATH=
```

สร้าง JWT secret บน VPS:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

สร้าง upload directory:

```bash
mkdir -p backend/storage/uploads
```

## 12. เตรียม Database Production

Generate Prisma Client:

```bash
npm run backend:generate
```

Push schema:

```bash
npm run backend:push
```

Seed demo data เฉพาะกรณีต้องการข้อมูลเริ่มต้น:

```bash
npm run backend:seed
```

สำหรับ production จริง ควรเปลี่ยนรหัสผ่าน demo user ทันทีหลัง seed หรือไม่ seed demo data เลย

## 13. Build Frontend และ Backend

รันตรวจ:

```bash
npm run check
```

Build frontend:

```bash
npm run build
```

Build backend:

```bash
npm run backend:build
```

หลัง build จะได้:

- Frontend static files ที่ `dist/`
- Backend compiled files ที่ `backend/dist/`

## 14. รัน Backend ด้วย PM2

เริ่ม backend:

```bash
cd /var/www/showpro/backend
pm2 start dist/src/server.js --name showpro-api
pm2 save
pm2 startup
```

คำสั่ง `pm2 startup` จะพิมพ์คำสั่งออกมาอีกบรรทัด ให้ copy คำสั่งนั้นไปรันหนึ่งครั้ง

ตรวจสถานะ:

```bash
pm2 status
pm2 logs showpro-api
```

ทดสอบ backend:

```bash
curl http://localhost:4000/health
```

ควรได้ JSON ที่มี `"success": true`

## 15. ตั้งค่า Nginx

สร้าง config:

```bash
nano /etc/nginx/sites-available/showpro
```

ใส่ config นี้ และเปลี่ยนโดเมน:

```nginx
server {
    listen 80;
    server_name showpro.example.com;

    root /var/www/showpro/dist;
    index index.html;

    client_max_body_size 25M;

    location /api/ {
        proxy_pass http://127.0.0.1:4000/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:4000/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

เปิด site:

```bash
ln -s /etc/nginx/sites-available/showpro /etc/nginx/sites-enabled/showpro
nginx -t
systemctl reload nginx
```

ทดสอบ:

```bash
curl http://showpro.example.com/health
curl http://showpro.example.com/api
```

## 16. ติดตั้ง SSL ด้วย Certbot

ติดตั้ง certbot:

```bash
apt install -y certbot python3-certbot-nginx
```

ออก SSL:

```bash
certbot --nginx -d showpro.example.com
```

ทดสอบ auto-renew:

```bash
certbot renew --dry-run
```

หลังได้ SSL ให้ตรวจว่า frontend env ใช้ `https`:

```env
VITE_API_BASE_URL=https://showpro.example.com/api
```

ถ้าเปลี่ยน env หลัง build ต้อง build frontend ใหม่:

```bash
cd /var/www/showpro
npm run build
systemctl reload nginx
```

## 17. ขั้นตอน Deploy รอบถัดไป

เมื่อมีโค้ดใหม่:

```bash
cd /var/www/showpro
git pull
npm ci
npm ci --prefix backend
npm run backend:generate
npm run backend:push
npm run check
npm run build
npm run backend:build
pm2 restart showpro-api
systemctl reload nginx
```

ถ้ามี migration workflow ในอนาคต ให้ใช้ migration แทน `db push`:

```bash
npm run prisma:migrate --prefix backend
```

## 18. ตรวจหลัง Deploy

เปิดใน browser:

- `https://showpro.example.com`
- `https://showpro.example.com/login`
- `https://showpro.example.com/register`
- `https://showpro.example.com/api/docs.json`

ทดสอบ API:

```bash
curl https://showpro.example.com/health
curl https://showpro.example.com/api
```

ทดสอบ login ด้วยบัญชีที่มีอยู่ หรือบัญชี admin ที่ seed ไว้

ดู backend logs:

```bash
pm2 logs showpro-api
```

ดู Nginx logs:

```bash
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log
```

## 19. Backup Database

สร้างโฟลเดอร์ backup:

```bash
mkdir -p /var/backups/showpro
```

Backup:

```bash
PGPASSWORD='CHANGE_THIS_STRONG_DB_PASSWORD' pg_dump -h localhost -U showpro_user showpro > /var/backups/showpro/showpro-$(date +%F-%H%M).sql
```

Restore:

```bash
PGPASSWORD='CHANGE_THIS_STRONG_DB_PASSWORD' psql -h localhost -U showpro_user showpro < /var/backups/showpro/showpro-YYYY-MM-DD-HHMM.sql
```

แนะนำให้ตั้ง cron backup รายวัน:

```bash
crontab -e
```

เพิ่ม:

```cron
0 2 * * * PGPASSWORD='CHANGE_THIS_STRONG_DB_PASSWORD' pg_dump -h localhost -U showpro_user showpro > /var/backups/showpro/showpro-$(date +\%F-\%H\%M).sql
```

## 20. จุดที่ต้องระวัง

- ห้าม commit `backend/.env` หรือ `.env` ขึ้น Git
- `CORS_ORIGIN` ต้องตรงกับ origin จริง เช่น `https://showpro.example.com`
- `VITE_API_BASE_URL` ถูกฝังตอน build frontend ถ้าเปลี่ยนค่าต้อง build ใหม่
- ถ้าใช้ HTTPS แล้ว frontend เรียก HTTP จะโดน browser block mixed content
- ถ้าใช้ seed demo data บน production ให้เปลี่ยนรหัสผ่าน demo user ทันที
- อัปโหลดไฟล์จะเก็บใน `backend/storage/uploads` ต้อง backup โฟลเดอร์นี้ด้วย
- ถ้า database อยู่คนละเครื่อง ให้เปิด firewall เฉพาะ IP ของ VPS เท่านั้น

## 21. Troubleshooting

### CORS error ตอนเรียก API

ตรวจ `backend/.env`:

```env
CORS_ORIGIN="https://showpro.example.com"
```

จากนั้น restart backend:

```bash
pm2 restart showpro-api
```

ทดสอบ preflight:

```bash
curl -i -X OPTIONS https://showpro.example.com/api/auth/register \
  -H "Origin: https://showpro.example.com" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type"
```

ควรเห็น:

```text
Access-Control-Allow-Origin: https://showpro.example.com
```

### Backend ต่อ database ไม่ได้

ตรวจ:

```bash
systemctl status postgresql
cat backend/.env
npm run backend:validate
```

ทดสอบเชื่อมต่อ:

```bash
cd /var/www/showpro/backend
echo "SELECT 1;" | npx prisma db execute --schema prisma/schema.prisma --stdin
```

### หน้า refresh แล้ว 404

เกิดจาก React Router ต้องให้ Nginx fallback ไป `index.html`

ตรวจว่ามีบล็อกนี้:

```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

### Socket.IO ไม่เชื่อมต่อ

ตรวจ Nginx ต้องมี `/socket.io/` พร้อม headers:

```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

### PM2 process หายหลัง reboot

รัน:

```bash
pm2 save
pm2 startup
```

แล้ว copy คำสั่งที่ PM2 แสดงออกมาไปรัน

## 22. Checklist ก่อนเปิดใช้งานจริง

- [ ] โดเมนชี้มาที่ VPS แล้ว
- [ ] SSL ใช้งานได้
- [ ] `VITE_API_BASE_URL` เป็น HTTPS domain จริง
- [ ] `CORS_ORIGIN` เป็น HTTPS domain จริง
- [ ] `JWT_SECRET` เป็น secret ใหม่และยาวพอ
- [ ] `npm run check` ผ่าน
- [ ] `npm audit` และ `npm audit --prefix backend` ไม่มีช่องโหว่สำคัญ
- [ ] Database schema ถูก push/migrate แล้ว
- [ ] Admin account ใช้งานได้
- [ ] เปลี่ยนรหัสผ่านบัญชี demo แล้ว หรือไม่ seed demo data
- [ ] Upload directory มีอยู่และ backup ได้
- [ ] PM2 restart หลัง reboot ได้
- [ ] Nginx reload ผ่าน `nginx -t`
- [ ] Backup database ตั้งเวลาแล้ว

