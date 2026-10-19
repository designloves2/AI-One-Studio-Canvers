@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [1/2] 패키지 확인 중...
call npm install --no-audit --no-fund --loglevel=error
echo [2/2] 화면을 최신 상태로 빌드합니다... (git pull 후에도 항상 최신)
call npm run build
if "%COMFY_URL%"=="" set COMFY_URL=http://127.0.0.1:8188
echo ComfyUI 주소: %COMFY_URL%
start "" http://localhost:5917
node serve.mjs
