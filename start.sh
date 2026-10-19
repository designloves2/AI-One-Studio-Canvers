#!/usr/bin/env bash
cd "$(dirname "$0")"
[ -d node_modules ] || npm install
[ -d dist ] || npm run build
export COMFY_URL="${COMFY_URL:-http://127.0.0.1:8188}"
echo "ComfyUI: $COMFY_URL"
exec node serve.mjs
