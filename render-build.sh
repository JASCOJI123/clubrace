#!/usr/bin/env bash
# ============================================================================
# Render.com build command — set this as the "Build Command" in the dashboard
# when creating a "Public Git repository" service.
#
# Usage in Render dashboard:
#   Language:    Docker
#   Build Cmd:  bash render-build.sh
#   Start Cmd:  sh -c "npx prisma migrate deploy && npx tsx packages/database/src/bootstrap.ts && node apps/api/dist/server.js"
#   (worker Start Cmd: node apps/worker/dist/index.js)
# ============================================================================

set -euo pipefail

echo "=== DRIVER HUB — Render build ==="
npm install
npx prisma generate
npm run build
echo "=== Build complete ==="