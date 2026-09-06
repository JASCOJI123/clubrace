# DRIVER HUB — Render + UptimeRobot (24/7 bepul)

> Render bepul rejada xizmatlar **~15 daqiqadan keyin uxlaydi**.
> **UptimeRobot** (bepul) har 5 daqiqada health endpoint'ni ping qilib, xizmatni
> doimiy jonli tutadi. Barcha xizmatlar 24/7 ishlaydi.

---

## Arxitektura (3 xizmat + DB)

```
UptimeRobot ──ping 5min──→ API    (Mini App + Admin + REST)
UptimeRobot ──ping 5min──→ Bot    (Telegram webhook)
UptimeRobot ──ping 5min──→ Worker (cron: notifications, score, reports)
                          ↓
                      PostgreSQL (bepul)
```

---

## 1. GitHub'ga push

```bash
git add -A
git commit -m "Render deploy: render.yaml + UptimeRobot"
git push origin main
```

## 2. Render Blueprint

1. [render.com](https://render.com) → **New** → **Blueprint**
2. GitHub repo'ni tanlang → **Apply**
3. Render 4 ta xizmat yaratadi:
   - `driverhub-api` — API + Mini App + Admin
   - `driverhub-bot` — Telegram bot (webhook)
   - `driverhub-worker` — Background cron ishlari
   - `driverhub-db` — PostgreSQL (bepul, 90 kun saqlanadi)

## 3. Environment Variables (har bir xizmat uchun)

### driverhub-api (asosiy)

| Variable | Qiymat |
|---|---|
| `DATABASE_URL` | Avtomatik (fromDatabase) |
| `TELEGRAM_BOT_TOKEN` | @BotFather dan token |
| `TELEGRAM_WEBAPP_URL` | `https://driverhub-api.onrender.com` (deploy keyin o'zgaradi) |
| `CORS_ORIGINS` | `https://driverhub-api.onrender.com` |
| `JWT_SECRET` | Avtomatik generatsiya |
| `ADMIN_EMAIL` | `admin@driverhub.uz` |
| `ADMIN_PASSWORD` | O'z kuchingizdagi parol |

### driverhub-bot

| Variable | Qiymat |
|---|---|
| `DATABASE_URL` | Avtomatik (fromDatabase) |
| `TELEGRAM_BOT_TOKEN` | xuddi shu token |
| `WEBHOOK_URL` | **Deploy keyin URL olinganidan keyin:** `https://driverhub-bot.onrender.com` |
| `WEBHOOK_SECRET` | Avtomatik generatsiya |

### driverhub-worker

| Variable | Qiymat |
|---|---|
| `DATABASE_URL` | Avtomatik (fromDatabase) |
| `TELEGRAM_BOT_TOKEN` | xuddi shu token (notification uchun) |

## 4. Bot Webhook sozlash

Bot webhook mode'da ishlaydi. Deploy tugagandan keyin:

1. `driverhub-bot` xizmati URL'ini oling: `https://driverhub-bot.onrender.com`
2. Bot xizmati env'iga qo'shing: `WEBHOOK_URL=https://driverhub-bot.onrender.com`
3. **Manual Deploy → Deploy latest commit** — bot webhook'ni ro'yxatdan o'tkazadi
4. Tekshiring: `curl https://driverhub-bot.onrender.com/health` → `{"ok":true}`

## 5. UptimeRobot sozlash (24/7 uchun muhim!)

[uptimerobot.com](https://uptimerobot.com) → bepul account oching → **Add New Monitor**:

### Monitor 1 — API
| Sozlama | Qiymat |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | `driverhub-api` |
| URL | `https://driverhub-api.onrender.com/health` |
| Monitoring Interval | 5 minutes |

### Monitor 2 — Bot
| Sozlama | Qiymat |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | `driverhub-bot` |
| URL | `https://driverhub-bot.onrender.com/health` |
| Monitoring Interval | 5 minutes |

### Monitor 3 — Worker
| Sozlama | Qiymat |
|---|---|
| Monitor Type | HTTP(s) |
| Friendly Name | `driverhub-worker` |
| URL | `https://driverhub-worker.onrender.com/health` |
| Monitoring Interval | 5 minutes |

> **Natija:** UptimeRobot har 5 daqiqada 3 ta URL'ni ping qiladi.
> Render har bir ping'dan keyin xizmatni "jonlantiradi" — uxlab qolmaydi.

## 6. Telegram BotFather sozlash

1. [@BotFather](https://t.me/BotFather) → `/mybots` → botingizni tanlang
2. **Bot Settings → Menu Button → WebApp URL**
   = `https://driverhub-api.onrender.com`
3. **Bot Settings → Commands** — buyruqlar avtomatik ro'yxatdan o'tgan

## 7. Tekshirish checklist

| Tekshiruv | Kutilgan natija |
|---|---|
| `curl https://driverhub-api.onrender.com/health` | `{"status":"ok","service":"driverhub-api"}` |
| `curl https://driverhub-bot.onrender.com/health` | `{"ok":true}` |
| `curl https://driverhub-worker.onrender.com/health` | `{"status":"ok","service":"driverhub-worker"}` |
| `curl https://driverhub-api.onrender.com/api/health` | JSON javob |
| Browser: `https://driverhub-api.onrender.com/` | Mini App HTML |
| Browser: `https://driverhub-api.onrender.com/admin/` | Admin panel login |
| Browser: `https://driverhub-api.onrender.com/docs` | Swagger API |
| UptimeRobot dashboard | 3 ta monitor yashil (Up) |
| Telegram → bot → /start | Bot javob beradi |

---

## Muhim eslatmalar

| Masala | Yechim |
|---|---|
| Birinchi ochilish sekin (~60s) | Render cold start — normal, keyingilari tezroq |
| DB 90 kunda o'chadi | Periodik backup oling yoki pullik DB o'ting |
| `TELEGRAM_WEBAPP_URL` deploy keyin o'zgaradi | BotFather'ga yangi URL ni qo'shing |
| Bot webhook avtomatik ro'yxatdan o'tmaydi | `WEBHOOK_URL` env'ini qo'shing + qayta deploy |
| Pullik to'lovlar faqat admin orqali | `PAYMENT_PROVIDER=local` — haqiqiy pul o'tkazmasdan |

---

## Yangilash

Har qanday `git push` dan keyin Render avtomatik qayta deploy qiladi
(agar **Auto Deploy** yoqilgan bo'lsa). Yoki **Manual Deploy → Deploy latest commit**.
