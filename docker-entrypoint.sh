#!/bin/sh
set -e

echo "[ENTRYPOINT] Corriendo migraciones pendientes..."
node scripts/run-migrations-dist.js

echo "[ENTRYPOINT] Iniciando backend..."
exec node dist/main
