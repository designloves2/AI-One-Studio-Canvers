@echo off
chcp 65001 >nul
cd /d "%~dp0"
if exist .git (
  echo [1/3] 최신 버전을 받습니다... git pull
  git pull --ff-only
)
echo [2/3] 패키지 확인 중...
call npm install --no-audit --no-fund --loglevel=error
echo [3/3] 화면을 새로 빌드합니다...
call npm run build
if "%COMFY_URL%"=="" set COMFY_URL=http://127.0.0.1:8188
echo ComfyUI 주소: %COMFY_URL%
start "" http://127.0.0.1:8765
node serve.mjs
