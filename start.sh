#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -d .git ] && { echo "[1/3] git pull…"; git pull --ff-only || echo "(git pull skipped)"; }
echo "[2/3] checking packages…"; npm install --no-audit --no-fund --loglevel=error
echo "[3/3] building the latest UI…"; npm run build
export COMFY_URL="${COMFY_URL:-http://127.0.0.1:8188}"
echo "ComfyUI: $COMFY_URL"
exec node serve.mjs
