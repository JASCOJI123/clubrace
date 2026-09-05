#!/usr/bin/env bash
# ============================================================================
# DRIVER HUB — Oracle Cloud Always Free VM bootstrap (idempotent)
#
# Usage (as root, or prefix with `sudo`):
#   REPO_URL=https://github.com/YOUR_USER/clubrace.git bash setup-oracle.sh
#
# What it does:
#   1. Ensures Docker + the compose plugin are installed.
#   2. Clones the repo (or updates it if already present).
#   3. Creates docker/.env from docker/.env.prod.example, generating strong
#      secrets and prompting for the values you must supply.
#   4. Builds and starts the whole stack (db, redis, api, bot, worker, tunnel).
#   5. Prints the URLs and next steps.
#
# Safe to re-run: everything is idempotent.
# ============================================================================
set -euo pipefail

REPO_URL="${REPO_URL:-}"
APP_DIR="${APP_DIR:-/srv/driverhub}"
COMPOSE_SERVICE_LINE="    docker/compose plugin" # informational

echo "=== DRIVER HUB — Oracle VM bootstrap ==="

# ---------- 1. Docker ----------
if ! command -v docker &>/dev/null; then
  echo ">> Docker topilmadi, o‘rnatilmoqda..."
  curl -fsSL https://get.docker.com | sh
  systemctl enable --now docker || service docker start
fi
if ! docker compose version &>/dev/null; then
  echo "!! Docker compose plugin topilmadi." >&2
  echo "   O‘rnating: sudo apt-get update && sudo apt-get install docker-compose-plugin" >&2
  exit 1
fi
echo "✅ Docker: $(docker --version)"
echo "✅ Compose: $(docker compose version --short)"

# ---------- 2. Repo ----------
if [ -z "$REPO_URL" ]; then
  echo "REPO_URL ko‘rsatilmagan." >&2
  echo "Masalan: REPO_URL=https://github.com/SIZINGIZ/clubrace.git bash setup-oracle.sh" >&2
  exit 1
fi

mkdir -p "$APP_DIR"
if [ -d "$APP_DIR/.git" ]; then
  echo ">> Repo allaqachon mavjud, yangilanmoqda ($APP_DIR)..."
  git -C "$APP_DIR" pull --ff-only
else
  echo ">> Repo klon qilinmoqda -> $APP_DIR"
  git clone "$REPO_URL" "$APP_DIR"
fi
cd "$APP_DIR"

# ---------- 3. Docker/.env ----------
ENV_FILE="$APP_DIR/docker/.env"
if [ ! -f "$ENV_FILE" ]; then
  echo ">> docker/.env yaratilmoqda..."
  cp docker/.env.prod.example "$ENV_FILE"

  # Strong random secrets
  DB_PASS=$(openssl rand -hex 16)
  JWT=$(openssl rand -hex 48)
  ADMIN_PASS=$(openssl rand -base64 24 | tr -d '/+=' | head -c 24)

  # PostgreSQL password (used by both db service and DATABASE_URL)
  sed -i "s|REPLACE_WITH_STRONG_PASSWORD|${DB_PASS}|g" "$ENV_FILE"
  sed -i "s|REPLACE_WITH_STRONG_JWT_SECRET|${JWT}|g" "$ENV_FILE"
  sed -i "s|REPLACE_WITH_STRONG_ADMIN_PASSWORD|${ADMIN_PASS}|g" "$ENV_FILE"

  # Interactive prompts for the values only YOU can know
  read -r -p "Telegram bot token (BotFather -> /newbot, bo‘sh qoldirsa bot o‘chadi): " TG_TOKEN
  read -r -p "Mini App public HTTPS URL (masalan https://app.yourdomain.com): " WEBAPP_URL
  read -r -p "Cloudflare Tunnel token (Zero Trust -> Tunnels -> create): " CF_TOKEN
  read -r -p "Admin email [admin@driverhub.uz]: " ADMIN_EMAIL
  if [ -z "$TG_TOKEN" ]; then sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=|" "$ENV_FILE"; else
    sed -i "s|^TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=${TG_TOKEN}|" "$ENV_FILE"; fi
  [ -n "$WEBAPP_URL" ] && sed -i "s|^TELEGRAM_WEBAPP_URL=.*|TELEGRAM_WEBAPP_URL=${WEBAPP_URL}|" "$ENV_FILE"
  [ -n "$WEBAPP_URL" ] && sed -i "s|^CORS_ORIGINS=.*|CORS_ORIGINS=${WEBAPP_URL}|" "$ENV_FILE"
  [ -n "$CF_TOKEN" ]   && sed -i "s|^CLOUDFLARE_TUNNEL_TOKEN=.*|CLOUDFLARE_TUNNEL_TOKEN=${CF_TOKEN}|" "$ENV_FILE"
  [ -n "$ADMIN_EMAIL" ] && sed -i "s|^ADMIN_EMAIL=.*|ADMIN_EMAIL=${ADMIN_EMAIL}|" "$ENV_FILE"

  echo ""
  echo ">> Muhim: admin parol saqlangan: ${ADMIN_PASS}"
  echo "   (docker/.env faylidan ham ko‘rish mumkin)"
else
  echo ">> docker/.env allaqachon mavjud — o‘zgartirilmaydi."
fi

# ---------- 4. Start the stack ----------
echo ">> Stack build + start qilinmoqda (birinchi marta bir necha daqiqa davom etadi)..."
docker compose -f docker/docker-compose.prod.yml up -d --build

# ---------- 5. Report ----------
echo ""
echo "============================================================"
echo "✅ DRIVER HUB ishga tushdi!"
echo "  API/Mini App : http://localhost:${API_PORT:-4000}/"
echo "  Admin        : http://localhost:${API_PORT:-4000}/admin/"
echo "  Swagger      : http://localhost:${API_PORT:-4000}/docs"
echo ""
echo "Holat:   docker compose -f docker/docker-compose.prod.yml ps"
echo "Loglar:  docker compose -f docker/docker-compose.prod.yml logs -f"
echo ""
echo "Keyingi qadamlar (docs/deploy-oracle.md):"
echo "  1. Cloudflare tunnel ishlayotganini tekshiring (korxona panelida)."
echo "  2. TELEGRAM_WEBAPP_URL + bot tugmasi: @BotFather -> /newapp yoki"
echo "     /mybots -> sizning bot -> Bot Settings -> Menu Button."
echo "  3. Admin: https://<DOMAIN>/admin/  login = ADMIN_EMAIL"
echo "============================================================"