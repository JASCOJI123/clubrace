# DRIVER HUB — Deploy on Render (Free Tier)

> **Ogohlantirish:** Render bepul rejasida xizmatlar harakatsiz bo'lsa **uxlab
> qoladi** (~15 daqiqadan keyin). Mini App qayta ochilsa, qayta ishga tushadi.
> Lekin bot va worker cron ishlamasligi mumkin. Keyinchalik pullik rejaga o'tish
> mumkin ($7/oydag'i Starter plan).

---

## Variant 1 — Blueprint (tezroq)

Repo'ni GitHub'ga push qiling. Render'da **New → Blueprint** → repo'ni tanlang.
`render.yaml` avtomatik aniqlanadi.

Render quyidagilarni yaratadi:
| Xizmat | Vazifasi |
|---|---|
| `driverhub-api` | API + Mini App + Admin (bitta Docker container) |
| `driverhub-worker` | Background cron ishlari (notification, score, report) |
| `driverhub-db` | PostgreSQL (bepul, 90 kun saqlanadi — keyin o'chadi) |

### Birinchi ishga tushirish

Blueprint yaratilgandan keyin:
1. Dashboard'da `driverhub-api` xizmatini oching.
2. **Environment** bo'limiga qo'shing (agar `sync: false` qilingan bo'lsa):
   - `TELEGRAM_BOT_TOKEN` — @BotFather dan olingan token
   - `TELEGRAM_WEBAPP_URL` — Render beradigan URL: `https://driverhub-api.onrender.com`
   - `CORS_ORIGINS` — xuddi shu URL
3. Database URL avtomatik generatsiya qilinadi (`driverhub-db` xizmatidan). Agar
   `DATABASE_URL` ko'rinmasa, uni qo'lda qo'shing:
   `Internal Database URL` → `driverhub-db` → **Connect to external**
   → `EXTERNAL DATABASE URL` ni ko'chirib qo'ying.
4. **Manual Deploy → Deploy latest commit** — birinchi deploy avtomatik
   `prisma migrate deploy` + bootstrap ishga tushiradi.

---

## Variant 2 — Dashboard'da qo'lda (Blueprint'siz)

### 1. GitHub'ga push

```bash
git remote add origin https://github.com/<SIZ>/clubrace.git
git push -u origin main
```

### 2. Database yaratish

Render → **New → PostgreSQL** → Free plan → **Create Database**
→ **Connect** → **EXTERNAL DATABASE URL** ni ko'chirib oling.

### 3. API xizmati (Mini App + Admin + REST)

Render → **New → Web Service** → **Build Command:** `bash render-build.sh`

| Sozlama | Qiymat |
|---|---|
| Name | `driverhub-api` |
| Runtime | Docker |
| Build Command | `bash render-build.sh` |
| Start Command | `sh -c "npx prisma migrate deploy && npx tsx packages/database/src/bootstrap.ts && node apps/api/dist/server.js"` |
| Plan | Free |
| Port | 4000 |

**Environment:**
- `NODE_ENV` = `production`
- `DEMO_MODE` = `false`
- `API_HOST` = `0.0.0.0`
- `DATABASE_URL` = (EXTERNAL DATABASE URL from step 2)
- `TELEGRAM_BOT_TOKEN` = (BotFather token)
- `TELEGRAM_WEBAPP_URL` = `https://driverhub-api.onrender.com` (deploy keyin URL o'zgaradi)
- `JWT_SECRET` = (kuchli random: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`)
- `ADMIN_EMAIL` = `admin@driverhub.uz`
- `ADMIN_PASSWORD` = (o'zingiznikini kiriting)
- `CORS_ORIGINS` = `https://driverhub-api.onrender.com`

### 4. Worker xizmati (cron ishlari)

Render → **New → Web Service** → **Build Command:** `bash render-build.sh`

| Sozlama | Qiymat |
|---|---|
| Name | `driverhub-worker` |
| Runtime | Docker |
| Build Command | `bash render-build.sh` |
| Start Command | `node apps/worker/dist/index.js` |
| Plan | Free |

**Environment:** API xizmatidagi bilan bir xil, lekin:
- `API_HOST` — kerak emas
- `DEMO_MODE`, `CORS_ORIGINS` — kerak emas

### 5. Deploy

Har bir xizmat uchun **Manual Deploy → Deploy latest commit** bosing.

---

## Bot qo'shish (ixtiyoriy, pullik kerak)

Bot long-polling rejasida 24/7 ishlash uchun doimiy ishlab turishi kerak.
Bepul Render'da bu ishlamaydi.

Bot xizmatini qo'shish uchun:
1. **New → Web Service** → `bash render-build.sh`
2. Start Command: `node apps/bot/dist/bot.js`
3. Plan: **Starter** ($7/oy) yoki boshqa free-tier tashqi xizmat.

---

## Tekshirish (checklist)

Deploy tugagandan keyin:

1. `https://driverhub-api.onrender.com/` → Mini App HTML ko'rinishi kerak
2. `https://driverhub-api.onrender.com/admin/` → Admin panel ochilishi kerak
3. `https://driverhub-api.onrender.com/api/health` → JSON javob
4. `https://driverhub-api.onrender.com/docs` → Swagger API hujjatlari

Telegram BotFather'ga URL'ni qo'shing:
- **My Bots → Bot Settings → Menu Button → WebApp URL**
  = `https://driverhub-api.onrender.com`

---

## Yangilash

Har qanday `git push` dan keyin Render avtomatik qayta deploy qiladi (agar
**Auto Deploy** yoqilgan bo'lsa). Yoki **Manual Deploy → Deploy latest commit**.

---

## Muhim eslatmalar

| Masala | Yechim |
|---|---|
| Render bepul DB 90 kunda o'chadi | Periodik backup oling yoki pullik DB o'ting |
| Bot 24/7 ishlash uchun pullik kerak | Starter plan ($7/oy) yoki Oracle VM |
| Birinchi ochilish sekin | Render cold start (~30-60s). Keyingilari tezroq |
| `TELEGRAM_WEBAPP_URL` deploy keyin o'zgaradi | Avtomatik URL ni BotFather'ga qo'shing |