#!/usr/bin/env bash
cd "$(dirname "$0")"
echo "[1/2] checking packages…"; npm install --no-audit --no-fund --loglevel=error
echo "[2/2] building the latest UI (also after git pull)…"; npm run build
export COMFY_URL="${COMFY_URL:-http://127.0.0.1:8188}"
echo "ComfyUI: $COMFY_URL"
exec node serve.mjs
