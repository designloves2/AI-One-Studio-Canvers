# 설치형 데스크톱 앱 (Tauri) — 만드는 법 · 웹 세션 전달용

기존 웹앱(React + Vite + `serve.mjs`)은 **한 줄도 바꾸지 않고**, Tauri(Rust) 껍데기로 감싸 `.exe` 설치 파일로 만든다.
`start.bat` 실행도 그대로 쓸 수 있다. 이 저장소(Canvers)에 이미 적용되어 있으니 파일을 그대로 보고 따라 하면 된다.

## 구조 (한 줄 요약)
설치 파일 안에 **Node 실행 파일 + serve.mjs + server-lib + dist(빌드된 화면)** 가 들어 있다.
앱을 켜면 Rust 껍데기가 Node 서버를 숨김 창으로 띄우고(포트 **8775**, 고정), 창이 그 주소를 연다. 앱을 닫으면 서버도 끝난다.

| 파일 | 역할 |
|---|---|
| `src-tauri/src/lib.rs` | 서버 띄우기, 창 열기, 한 번만 실행(두 번째 실행은 기존 창으로), 업데이트 확인 |
| `src-tauri/tauri.conf.json` | 앱 이름·아이콘·설치 방식(NSIS, 사용자 단위), 업데이트 주소와 공개 키 |
| `src-tauri/shell/index.html` | 서버가 뜰 때까지 보이는 "시작하는 중" 화면 |
| `src-tauri/Cargo.toml` | Rust 의존성 (tauri, updater, dialog, single-instance) |
| `scripts/prepare-app.mjs` | `src-tauri/bundle/` 에 node.exe·serve.mjs·server-lib·dist 를 모음 |
| `scripts/release-app.mjs` | 설치 파일 + `latest.json` 을 GitHub 릴리즈에 올림 |
| `package.json` | `app:build`(설치 파일 만들기), `app:dev`(설치 없이 시험) 스크립트, `@tauri-apps/cli` |

## 사용자 데이터 위치
서버는 환경변수 `CANVERS_DIR`, `CANVERS_DIRECTOR_DIR`, `CANVERS_PROJECTS_DIR` 로 저장 폴더를 바꿀 수 있다(원래 있던 기능).
앱은 이를 `%APPDATA%\cloud.tjtj.canvers\{canvases,director,projects}` 로 지정한다 → 앱을 지우거나 업데이트해도 작업물이 남는다.
기존 `start.bat` 쪽 작업물을 쓰려면 그 폴더의 `projects/ director/ canvases/` 를 위 위치로 복사한다.
> 웹 세션 주의: 서버가 저장 위치를 환경변수로 받지 않는다면 먼저 그것부터 만들 것(경로 상수를 `process.env.X ?? 기본값` 으로).

## 백엔드가 다른 PC / 도메인 / 터널일 때 (연결 설정)
처음 실행하면 연결 화면(`/canvers/connect`)이 뜬다. **접속 주소**(도메인·터널·IP:포트)를 넣으면 자동으로 알아본다:
1. 먼저 **Canvers 서버**인지 본다(`GET /canvers/target`) → 맞으면 창이 그 주소를 그대로 연다(로그인이 있으면 창 안에서 로그인, 로그인 상태는 창이 기억).
2. 아니면 **ComfyUI**인지 본다(`GET /system_stats`) → 맞으면 앱 안 서버가 그 주소로 중계한다(https/wss 지원, 서비스 토큰 헤더 지원).
3. Cloudflare Access 같은 로그인 벽이면 → 창에서 열어 로그인하게 한다. ComfyUI 쪽을 로그인 없이 쓰려면 화면의 "서비스 토큰"(Client ID/Secret)을 넣는다.
- 선택은 `%APPDATA%\cloud.tjtj.canvers\connection.json` 에 저장되고(`{mode: local|proxy|remote, address, id, secret}`), 다음 실행부터 자동 적용된다. 메뉴 **연결 → 연결 설정…** 으로 언제든 다시 고른다.
- 코드: `server-lib/connection.mjs`(알아보기·저장·설정 화면), `serve.mjs`(https/wss 중계, 헤더), `lib.rs`(`start_url`, 메뉴).
- 참고: 서버 중계는 원래 `http://` 만 됐다. 웹 세션은 `serve.mjs` 의 중계(요청 + WebSocket upgrade)에 https/tls 와 추가 헤더를 넣어야 한다.

## 만드는 순서
1. 준비물: Rust(`rustc`, MSVC 툴체인), Node, WebView2(Windows 11 에 기본). `npm i -D @tauri-apps/cli@2`.
2. `src-tauri/` 를 이 저장소 것에서 복사해 이름·식별자(`identifier`)·포트·창 크기·서버 파일 이름만 바꾼다.
   - 포트는 **고정**해야 한다(저장된 설정이 주소 단위라 포트가 바뀌면 설정이 사라진다). Canvers 8775, 웹 세션은 다른 번호를 고를 것.
3. 아이콘: `npx tauri icon public/logo.svg -o src-tauri/icons` (png/svg 원본 한 장).
4. 업데이트 서명 키 만들기(한 번만):
   ```
   npx tauri signer generate -w C:\Users\<이름>\.tauri\<앱>.key --password <비밀번호> --ci
   ```
   - 출력된 `.key.pub` 내용을 `tauri.conf.json` 의 `plugins.updater.pubkey` 에 넣는다(공개 키라 저장소에 넣어도 된다).
   - **비공개 키(.key)와 비밀번호는 저장소에 절대 넣지 말 것.** 잃어버리면 이미 설치된 앱에 업데이트를 보낼 수 없다 → 따로 백업.
5. 설치 파일 만들기:
   ```
   $env:TAURI_SIGNING_PRIVATE_KEY = Get-Content <키 경로> -Raw
   $env:TAURI_SIGNING_PRIVATE_KEY_PASSWORD = '<비밀번호>'
   npm run app:build
   ```
   결과: `src-tauri/target/release/bundle/nsis/AI ONE Studio Canvers_<버전>_x64-setup.exe` (+ `.sig`). 첫 빌드는 Rust 컴파일로 몇 분 걸린다.
   - 버전은 `package.json` 의 `version` 을 그대로 쓴다(`tauri.conf.json` 의 `"version": "../package.json"`).

## 자동 업데이트
- 앱이 켜질 때마다 `https://github.com/<소유자>/<저장소>/releases/latest/download/latest.json` 을 읽는다.
- 더 높은 버전이 있으면 "새 버전 X.Y.Z 가 있습니다. 지금 설치할까요?" 창이 뜨고, "지금 설치"를 누르면 내려받아 설치 후 앱이 다시 켜진다.
- **릴리즈를 만들 때마다** 다음을 해야 한다(설치 파일 + `latest.json` 이 최신 릴리즈에 있어야 업데이트가 동작):
  1. 버전 올리기 → `npm run app:build`(서명 환경변수 필요)
  2. `gh release create vX.Y.Z ...` (기존 릴리즈 절차)
  3. `node scripts/release-app.mjs` ← 설치 파일과 `latest.json` 을 그 릴리즈에 올림
- `latest.json` 이 없는 릴리즈가 "latest" 가 되면 그 동안 업데이트 확인이 조용히 실패한다.

## 함정 (겪은 것)
- PowerShell `Set-Content -Encoding utf8` 는 파일 앞에 BOM 을 붙여 `package.json` 이 깨진다 → Write 도구나 BOM 없는 저장을 쓸 것.
- 리소스 경로 앞의 `\\?\` 는 Node 스크립트 경로에서 문제가 되어 `lib.rs` 의 `plain()` 으로 떼어 낸다.
- 서버가 `0.0.0.0` 으로 열려 있어 터널(`canvers.tjtj.cloud`)도 그대로 쓸 수 있지만, 설치형 앱 서버 포트(8775)를 터널에 연결해야 한다.
- 설치는 사용자 단위(`installMode: currentUser`)라 관리자 권한이 필요 없다. 코드 서명(SmartScreen 경고 제거)은 따로 인증서가 필요해 지금은 안 함 → 처음 설치할 때 "추가 정보 → 실행" 이 나올 수 있다.
