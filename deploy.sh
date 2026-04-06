#!/bin/bash
# Bimano CRM — One-Command Deploy Script
# Usage: bash deploy.sh
# Run from: /home/user/bimano-crm (project root)

set -e

echo "========================================"
echo "  Bimano CRM — Production Deploy"
echo "========================================"

# ── Backend dependencies ──────────────────
echo ""
echo "[1/4] Installing backend dependencies..."
cd backend
npm install --omit=dev
cd ..

# ── Database migration ────────────────────
echo ""
echo "[2/4] Running database migrations..."
cd backend
NODE_ENV=production node src/database/migrate.js
cd ..

# ── Frontend build ────────────────────────
echo ""
echo "[3/4] Building frontend..."
cd frontend
npm install
npm run build
cd ..

# ── PM2 start / restart ───────────────────
echo ""
echo "[4/4] Starting/restarting PM2..."
if pm2 describe bimano-crm > /dev/null 2>&1; then
  pm2 restart bimano-crm --update-env
else
  pm2 start ecosystem.config.js --env production
fi

pm2 save

echo ""
echo "========================================"
echo "  Deploy complete!"
echo "  Health check: curl http://localhost:5000/api/health"
echo "========================================"
