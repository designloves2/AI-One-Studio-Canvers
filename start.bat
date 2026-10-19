@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist node_modules (
  echo [1/2] 처음 실행: 패키지를 설치합니다...
  call npm install
)
if not exist dist (
  echo [2/2] 화면을 빌드합니다...
  call npm run build
)
if "%COMFY_URL%"=="" set COMFY_URL=http://127.0.0.1:8188
echo ComfyUI 주소: %COMFY_URL%
start "" http://localhost:5917
node serve.mjs
