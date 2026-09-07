# syntax=docker/dockerfile:1

# ============================================================================
# DRIVER HUB — production image (Oracle Always Free VM / any Docker host)
# One image builds the whole monorepo and serves all three processes:
#   api    → Fastify: Mini App (/) + Admin (/admin) + REST API + uploads
#   bot    → Telegraf long-polling
#   worker → BullMQ + node-cron
# ============================================================================

# ---------- BUILD STAGE ----------
FROM node:24-slim AS build
WORKDIR /app

# Prisma needs OpenSSL to detect the correct engine binary target
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

# Copy the whole repo (node_modules / dist / .env / uploads excluded via .dockerignore)
COPY . .

# Install all workspace deps (runs the prisma & esbuild postinstall scripts)
RUN npm ci

# Generate the Prisma client for the deployed schema
RUN npx prisma generate

# Build every workspace: TS (api/bot/worker/packages) + Vite (web dist + admin dist)
RUN npm run build

# ---------- RUNTIME STAGE ----------
# DevDeps (prisma CLI, tsx) stay in the image so `prisma migrate deploy` and the
# idempotent bootstrap can run on boot. Acceptable size trade for reliability.
FROM node:24-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production

# Prisma's query engine needs OpenSSL available at runtime too (bot/worker/api all use @prisma/client)
RUN apt-get update -y && apt-get install -y openssl && rm -rf /var/lib/apt/lists/*

COPY --from=build /app ./

EXPOSE 4000

# Default command (the compose `api` service overrides this to run migrations first).
CMD ["node", "apps/api/dist/server.js"]