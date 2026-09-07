#!/bin/sh
# Driver Hub API start script.
# Kept as a real file (instead of a chained `dockerCommand: "a && b && c"` string)
# because Render's Blueprint dockerCommand parsing does not reliably preserve
# quoting/`&&` operators for docker-runtime services.
set -e

npx prisma migrate deploy
npx tsx packages/database/src/bootstrap.ts
exec node apps/api/dist/server.js
